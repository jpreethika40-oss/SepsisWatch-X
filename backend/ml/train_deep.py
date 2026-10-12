"""
Deep Temporal & Domain Adaptation Training Pipeline (GRU-D & DANN).
Trains:
1. Pure GRU-D temporal model on ICU time-series.
2. DANN (Domain-Adversarial Neural Network) with Gradient Reversal Layer for Hospital A -> B invariance.
Logs metrics to MLflow and serializes PyTorch checkpoints.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import mlflow

from backend.ml.data_loader import PhysioNetDataLoader
from backend.ml.preprocessing import PreprocessingPipeline, FEATURE_COLS
from backend.ml.grud_model import GRUDModel, PatientSequenceDataset
from backend.ml.dann import DANNModel, compute_dann_lambda
from backend.ml.utility_score import compute_physionet_utility, compute_classification_metrics

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TrainDeep")

# Device configuration (CPU-compatible fallback mode)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def extract_patient_tensors(
    patient_df: pd.DataFrame
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, int]:
    """
    Extracts aligned (values, masks, delta_t, labels, hospital_int) arrays from a preprocessed patient DataFrame.
    """
    mask_cols = [f"mask_{c}" for c in FEATURE_COLS]
    dt_cols = [f"dt_{c}" for c in FEATURE_COLS]

    values = patient_df[FEATURE_COLS].values.astype(np.float32)
    masks = patient_df[mask_cols].values.astype(np.float32)
    delta_t = patient_df[dt_cols].values.astype(np.float32)
    labels = patient_df["SepsisLabel"].values.astype(np.float32)

    hosp_str = patient_df["Hospital"].iloc[0] if "Hospital" in patient_df.columns else "setA"
    hosp_int = 1 if "setB" in str(hosp_str) else 0

    return values, masks, delta_t, labels, hosp_int


def build_sequence_dataset(
    patient_dfs: List[pd.DataFrame],
    max_seq_len: int = 48
) -> PatientSequenceDataset:
    """Builds PatientSequenceDataset from a list of preprocessed patient DataFrames."""
    vals_list, masks_list, dts_list, labels_list, hosps_list = [], [], [], [], []

    for pdf in patient_dfs:
        v, m, dt, y, h = extract_patient_tensors(pdf)
        vals_list.append(v)
        masks_list.append(m)
        dts_list.append(dt)
        labels_list.append(y)
        hosps_list.append(h)

    return PatientSequenceDataset(
        values_list=vals_list,
        masks_list=masks_list,
        delta_t_list=dts_list,
        labels_list=labels_list,
        hospital_list=hosps_list,
        max_seq_len=max_seq_len
    )


def compute_masked_bce_loss(
    logits: torch.Tensor,
    targets: torch.Tensor,
    mask: torch.Tensor,
    pos_weight: float = 8.0
) -> torch.Tensor:
    """Computes sequence-masked binary cross entropy loss with class balancing."""
    pw = torch.tensor([pos_weight], device=logits.device)
    loss_fn = nn.BCEWithLogitsLoss(pos_weight=pw, reduction="none")
    
    # logits: [batch, seq_len, 1] -> squeeze to [batch, seq_len]
    flat_logits = logits.squeeze(-1)
    elementwise_loss = loss_fn(flat_logits, targets)
    
    # Apply seq_mask
    masked_loss = elementwise_loss * mask
    total_valid = mask.sum().clamp(min=1.0)
    return masked_loss.sum() / total_valid


def evaluate_deep_model(
    model: nn.Module,
    dataloader: DataLoader,
    is_dann: bool = False
) -> Dict[str, float]:
    """Evaluates GRU-D or DANN model on a dataloader cohort."""
    model.eval()
    all_probs = []
    all_targets = []

    with torch.no_grad():
        for batch in dataloader:
            vals = batch["values"].to(DEVICE)
            masks = batch["masks"].to(DEVICE)
            dts = batch["delta_t"].to(DEVICE)
            targets = batch["labels"].to(DEVICE)
            seq_masks = batch["seq_mask"].to(DEVICE)

            if is_dann:
                out = model(vals, masks, dts, alpha=0.0)
                logits = out["task_logits"].squeeze(-1)
            else:
                logits, _ = model(vals, masks, dts)
                logits = logits.squeeze(-1)

            probs = torch.sigmoid(logits)

            # Collect unmasked valid timepoints
            for i in range(len(targets)):
                length = int(batch["actual_len"][i].item())
                all_probs.extend(probs[i, :length].cpu().numpy().tolist())
                all_targets.extend(targets[i, :length].cpu().numpy().tolist())

    y_prob = np.array(all_probs)
    y_true = np.array(all_targets)

    metrics = compute_classification_metrics(y_true, y_prob, threshold=0.45)
    metrics["utility_score"] = compute_physionet_utility(y_true, y_prob, threshold=0.45)
    return metrics


def train_grud_model(
    train_loader: DataLoader,
    val_loader: DataLoader,
    input_dim: int = 34,
    hidden_dim: int = 64,
    epochs: int = 15,
    lr: float = 1e-3,
    weight_decay: float = 1e-4,
    save_path: str = "models/grud_model.pt"
) -> GRUDModel:
    """Trains baseline GRU-D temporal model."""
    logger.info(f"Training GRU-D model on {DEVICE} for {epochs} epochs...")
    model = GRUDModel(input_dim=input_dim, hidden_dim=hidden_dim, dropout=0.2).to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)

    best_utility = -999.0

    for epoch in range(epochs):
        model.train()
        epoch_loss = 0.0

        for batch in train_loader:
            vals = batch["values"].to(DEVICE)
            masks = batch["masks"].to(DEVICE)
            dts = batch["delta_t"].to(DEVICE)
            targets = batch["labels"].to(DEVICE)
            seq_masks = batch["seq_mask"].to(DEVICE)

            optimizer.zero_grad()
            logits, _ = model(vals, masks, dts)
            loss = compute_masked_bce_loss(logits, targets, seq_masks, pos_weight=8.0)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            optimizer.step()

            epoch_loss += loss.item()

        val_metrics = evaluate_deep_model(model, val_loader, is_dann=False)
        logger.info(
            f"GRU-D Epoch {epoch+1}/{epochs} - Loss: {epoch_loss/len(train_loader):.4f} "
            f"- Val Utility: {val_metrics['utility_score']:.4f} - AUROC: {val_metrics['auroc']:.4f}"
        )

        if val_metrics["utility_score"] > best_utility:
            best_utility = val_metrics["utility_score"]
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), save_path)

    # Load best checkpoint
    if os.path.exists(save_path):
        model.load_state_dict(torch.load(save_path, map_location=DEVICE))
    return model


def train_dann_model(
    train_loader: DataLoader,
    val_loader: DataLoader,
    input_dim: int = 34,
    hidden_dim: int = 64,
    epochs: int = 15,
    lr: float = 1e-3,
    weight_decay: float = 1e-4,
    save_path: str = "models/dann_model.pt"
) -> DANNModel:
    """Trains DANN domain-adversarial model with Gradient Reversal Layer."""
    logger.info(f"Training DANN domain-adaptation model on {DEVICE} for {epochs} epochs...")
    model = DANNModel(input_dim=input_dim, hidden_dim=hidden_dim, dropout=0.2).to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    domain_criterion = nn.BCEWithLogitsLoss()

    best_utility = -999.0
    total_steps = epochs * len(train_loader)
    step_count = 0

    for epoch in range(epochs):
        model.train()
        total_task_loss = 0.0
        total_domain_loss = 0.0

        for batch in train_loader:
            vals = batch["values"].to(DEVICE)
            masks = batch["masks"].to(DEVICE)
            dts = batch["delta_t"].to(DEVICE)
            targets = batch["labels"].to(DEVICE)
            seq_masks = batch["seq_mask"].to(DEVICE)
            hosp_targets = batch["hospital"].float().unsqueeze(1).to(DEVICE)

            progress = float(step_count / max(total_steps, 1))
            alpha_p = compute_dann_lambda(progress, gamma=10.0)

            optimizer.zero_grad()
            out = model(vals, masks, dts, alpha=alpha_p)

            # Task loss (weighted binary cross entropy on valid patient timepoints)
            task_loss = compute_masked_bce_loss(out["task_logits"], targets, seq_masks, pos_weight=8.0)

            # Domain loss (hospital A vs hospital B classification)
            domain_loss = domain_criterion(out["domain_logits"], hosp_targets)

            # Total adversarial loss
            total_loss = task_loss + (alpha_p * domain_loss)
            total_loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            optimizer.step()

            total_task_loss += task_loss.item()
            total_domain_loss += domain_loss.item()
            step_count += 1

        val_metrics = evaluate_deep_model(model, val_loader, is_dann=True)
        logger.info(
            f"DANN Epoch {epoch+1}/{epochs} - TaskLoss: {total_task_loss/len(train_loader):.4f} "
            f"- DomainLoss: {total_domain_loss/len(train_loader):.4f} "
            f"- Val Utility: {val_metrics['utility_score']:.4f} - AUROC: {val_metrics['auroc']:.4f}"
        )

        if val_metrics["utility_score"] > best_utility:
            best_utility = val_metrics["utility_score"]
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), save_path)

    if os.path.exists(save_path):
        model.load_state_dict(torch.load(save_path, map_location=DEVICE))
    return model


def run_deep_training():
    """Executes full deep learning training pipeline with MLflow tracking."""
    mlflow.set_experiment("SepsisWatchX-DeepModels")

    # 1. Load data splits
    loader = PhysioNetDataLoader()
    patients_dict = loader.load_all_patients()
    train_ids, val_ids, test_ids = loader.get_split_patient_ids()

    train_dfs = [patients_dict[pid] for pid in train_ids if pid in patients_dict]
    val_dfs = [patients_dict[pid] for pid in val_ids if pid in patients_dict]
    test_dfs = [patients_dict[pid] for pid in test_ids if pid in patients_dict]

    logger.info(f"Loaded cohorts: Train={len(train_dfs)}, Val={len(val_dfs)}, Test={len(test_dfs)}")

    # 2. Preprocess patients
    preprocessor = PreprocessingPipeline()
    preprocessor.fit(pd.concat(train_dfs, ignore_index=True))
    preprocessor.save("models/preprocessor.pkl")

    proc_train = [preprocessor.transform_patient(df) for df in train_dfs]
    proc_val = [preprocessor.transform_patient(df) for df in val_dfs]
    proc_test = [preprocessor.transform_patient(df) for df in test_dfs]

    # 3. Create PyTorch datasets and DataLoaders
    train_dataset = build_sequence_dataset(proc_train, max_seq_len=48)
    val_dataset = build_sequence_dataset(proc_val, max_seq_len=48)
    test_dataset = build_sequence_dataset(proc_test, max_seq_len=48)

    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=16, shuffle=False)

    # 4. Train GRU-D
    with mlflow.start_run(run_name="GRU-D-TemporalBaseline"):
        grud = train_grud_model(train_loader, val_loader, input_dim=len(FEATURE_COLS), epochs=10)
        grud_test_metrics = evaluate_deep_model(grud, test_loader, is_dann=False)
        for k, v in grud_test_metrics.items():
            if isinstance(v, (int, float)):
                mlflow.log_metric(f"test_{k}", v)
        logger.info(f"GRU-D Test Results: {grud_test_metrics}")

    # 5. Train DANN
    with mlflow.start_run(run_name="DANN-DomainAdversarial"):
        dann = train_dann_model(train_loader, val_loader, input_dim=len(FEATURE_COLS), epochs=10)
        dann_test_metrics = evaluate_deep_model(dann, test_loader, is_dann=True)
        for k, v in dann_test_metrics.items():
            if isinstance(v, (int, float)):
                mlflow.log_metric(f"test_{k}", v)
        logger.info(f"DANN Test Results: {dann_test_metrics}")

    return grud_test_metrics, dann_test_metrics


if __name__ == "__main__":
    run_deep_training()
