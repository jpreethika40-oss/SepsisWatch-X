"""
Training and Evaluation Orchestration for LightGBM Tabular Branch.
Integrates DataLoader, PreprocessingPipeline, FeatureEngineer,
evaluates PhysioNet Utility Score and AUROC, and logs run to MLflow.
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
import mlflow
import yaml

# Ensure project root in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.ml.data_loader import DataLoader
from backend.ml.preprocessing import PreprocessingPipeline
from backend.ml.features import FeatureEngineer
from backend.ml.lgbm_model import LightGBMBranch
from backend.ml.utility_score import compute_clinical_evaluation_suite


def run_train_lgbm(
    subset_patients: Optional[int] = None,
    experiment_name: str = "SepsisWatchX-LightGBM"
) -> Dict[str, Any]:
    print(f"--> Initializing LightGBM Training Pipeline (Experiment: {experiment_name})...")
    
    # 1. Load Data and Splits
    loader = DataLoader()
    splits = loader.load_splits()
    
    train_pids = splits["train"]
    val_pids = splits["val"]
    test_pids = splits["test"]

    if subset_patients is not None:
        train_pids = train_pids[:subset_patients]
        val_pids = val_pids[:max(5, int(subset_patients * 0.2))]
        test_pids = test_pids[:max(5, int(subset_patients * 0.2))]
        print(f"    Subsetting cohort: Train={len(train_pids)}, Val={len(val_pids)}, Test={len(test_pids)}")

    # Load patient DataFrames
    print(f"--> Loading {len(train_pids)} train and {len(val_pids)} validation patients...")
    train_dfs = [loader.load_patient(pid) for pid in train_pids]
    val_dfs = [loader.load_patient(pid) for pid in val_pids]
    test_dfs = [loader.load_patient(pid) for pid in test_pids]

    # 2. Preprocess (Fit strictly on train cohort)
    print("--> Fitting PreprocessingPipeline (forward-fill, masks, delta-t)...")
    preproc = PreprocessingPipeline()
    train_raw_concat = pd.concat(train_dfs, ignore_index=True)
    preproc.fit(train_raw_concat)
    
    train_preproc_dfs = [preproc.transform_patient(df) for df in train_dfs]
    val_preproc_dfs = [preproc.transform_patient(df) for df in val_dfs]
    test_preproc_dfs = [preproc.transform_patient(df) for df in test_dfs]

    # 3. Extract Hand-Crafted Rolling Features
    print("--> Extracting rolling 6h/12h aggregations, shock index, and vital deltas...")
    feat_eng = FeatureEngineer()
    train_feat_dfs = [feat_eng.extract_patient_features(df) for df in train_preproc_dfs]
    val_feat_dfs = [feat_eng.extract_patient_features(df) for df in val_preproc_dfs]
    test_feat_dfs = [feat_eng.extract_patient_features(df) for df in test_preproc_dfs]

    df_train = pd.concat(train_feat_dfs, ignore_index=True)
    df_val = pd.concat(val_feat_dfs, ignore_index=True)
    df_test = pd.concat(test_feat_dfs, ignore_index=True)

    # Exclude metadata and target columns from feature matrix
    ignore_cols = {"patient_id", "hospital", "SepsisLabel"}
    feature_cols = [c for c in df_train.columns if c not in ignore_cols]

    X_train = df_train[feature_cols]
    y_train = df_train["SepsisLabel"].values.astype(int)

    X_val = df_val[feature_cols]
    y_val = df_val["SepsisLabel"].values.astype(int)

    X_test = df_test[feature_cols]
    y_test = df_test["SepsisLabel"].values.astype(int)

    print(f"    Feature matrix shape: Train={X_train.shape}, Val={X_val.shape}, Test={X_test.shape}")

    # 4. Train LightGBM Branch
    print("--> Training LightGBM with Isotonic Calibration...")
    lgbm_branch = LightGBMBranch()
    train_summary = lgbm_branch.train(X_train, y_train, X_val, y_val, calibrate=True)

    # 5. Evaluate on Held-Out Test Cohort
    print("--> Evaluating on Held-Out Test Cohort...")
    test_probs = lgbm_branch.predict_proba(X_test, use_calibration=True)
    test_preds = lgbm_branch.predict(X_test, threshold=0.45)

    test_lengths = [len(df) for df in test_feat_dfs]
    test_onset_hours = []
    for df in test_feat_dfs:
        septic_hours = df.loc[df["SepsisLabel"] == 1, "ICULOS"].values
        # Clinical onset is 6 hours after first label 1 (or min label 1 + 6)
        t_sep = int(septic_hours[0] + 6) if len(septic_hours) > 0 else None
        test_onset_hours.append(t_sep)

    metrics = compute_clinical_evaluation_suite(
        y_true=y_test,
        y_prob=test_probs,
        y_pred=test_preds,
        patient_ids=test_pids,
        patient_lengths=test_lengths,
        onset_hours=test_onset_hours
    )

    print("\n================ TEST SET PERFORMANCE EVALUATION ================")
    print(f"  PhysioNet Utility Score: {metrics['utility_score']}")
    print(f"  AUROC:                   {metrics['auroc']}")
    print(f"  AUPRC:                   {metrics['auprc']}")
    print(f"  F1 Score (@ tau=0.45):   {metrics['f1_score']}")
    print(f"  False Alarms / Pt-Day:   {metrics['false_alarms_per_patient_day']}")
    print(f"  Median Hours Early:      {metrics['median_hours_early']} hrs")
    print(f"  ECE Calibration Error:   {metrics['ece']}")
    print("=================================================================\n")

    # 6. Save Model Artifacts
    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)
    lgbm_branch.save("models/lgbm_model.pkl")
    preproc.save("models/preprocessor.pkl")
    print("--> Model artifacts saved to models/lgbm_model.pkl and models/preprocessor.pkl")

    # 7. Log to MLflow
    try:
        mlflow.set_experiment(experiment_name)
        with mlflow.start_run(run_name="LightGBM-Rolling-Tabular-v1"):
            mlflow.log_params(lgbm_branch.params)
            mlflow.log_param("n_features", len(feature_cols))
            mlflow.log_param("train_patients", len(train_pids))
            mlflow.log_param("test_patients", len(test_pids))
            mlflow.log_metrics({
                "test_utility_score": metrics["utility_score"],
                "test_auroc": metrics["auroc"],
                "test_auprc": metrics["auprc"],
                "test_f1": metrics["f1_score"],
                "test_false_alarms_per_day": metrics["false_alarms_per_patient_day"],
                "test_ece": metrics["ece"]
            })
            mlflow.set_tag("model_type", "LightGBM")
            mlflow.set_tag("branch", "tabular")
            print("--> Experiment successfully logged to MLflow tracking store.")
    except Exception as e:
        print(f"    [Notice] MLflow logging skipped or deferred: {e}")

    return {
        "metrics": metrics,
        "n_features": len(feature_cols),
        "train_summary": train_summary
    }


if __name__ == "__main__":
    run_train_lgbm()
