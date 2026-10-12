"""
Optuna Bayesian Hyperparameter Optimization for SepsisWatch-X Pipeline.
Finds optimal hyperparameters maximizing official PhysioNet 2019 Utility Score.
Saves study history to results/optuna_study.json and logs to MLflow.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any
import numpy as np
import pandas as pd
import optuna
import lightgbm as lgb
import mlflow

from backend.ml.data_loader import PhysioNetDataLoader
from backend.ml.preprocessing import PreprocessingPipeline
from backend.ml.features import compute_rolling_features
from backend.ml.utility_score import compute_physionet_utility

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("OptunaTune")

# Suppress Optuna verbosity
optuna.logging.set_verbosity(optuna.logging.WARNING)


def objective(trial: optuna.Trial, X_train, y_train, X_val, y_val) -> float:
    """Optuna objective function maximizing PhysioNet utility score."""
    params = {
        "objective": "binary",
        "metric": "binary_logloss",
        "boosting_type": "gbdt",
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
        "num_leaves": trial.suggest_int("num_leaves", 15, 63),
        "max_depth": trial.suggest_int("max_depth", 3, 10),
        "min_child_samples": trial.suggest_int("min_child_samples", 10, 50),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
        "scale_pos_weight": trial.suggest_float("scale_pos_weight", 3.0, 12.0),
        "n_estimators": trial.suggest_int("n_estimators", 40, 150),
        "random_state": 42,
        "verbose": -1,
        "n_jobs": 2
    }

    model = lgb.LGBMClassifier(**params)
    model.fit(X_train, y_train)

    val_probs = model.predict_proba(X_val)[:, 1]
    tau = trial.suggest_float("alert_threshold", 0.35, 0.55)
    utility = compute_physionet_utility(y_val, val_probs, threshold=tau)

    return float(utility)


def run_optuna_tuning(n_trials: int = 15, output_path: str = "results/optuna_study.json") -> Dict[str, Any]:
    """Runs Optuna hyperparameter optimization study."""
    logger.info(f"Initiating Optuna Bayesian optimization ({n_trials} trials)...")

    # 1. Load data
    loader = PhysioNetDataLoader()
    patients_dict = loader.load_all_patients()
    train_ids, val_ids, _ = loader.get_split_patient_ids()

    train_dfs = [patients_dict[pid] for pid in train_ids if pid in patients_dict]
    val_dfs = [patients_dict[pid] for pid in val_ids if pid in patients_dict]

    preprocessor = PreprocessingPipeline()
    preprocessor.fit(pd.concat(train_dfs, ignore_index=True))

    proc_train = [preprocessor.transform_patient(df) for df in train_dfs]
    proc_val = [preprocessor.transform_patient(df) for df in val_dfs]

    feat_train = [compute_rolling_features(df) for df in proc_train]
    feat_val = [compute_rolling_features(df) for df in proc_val]

    df_train = pd.concat(feat_train, ignore_index=True)
    df_val = pd.concat(feat_val, ignore_index=True)

    drop_cols = {"PatientID", "patient_id", "Hospital", "hospital", "SepsisLabel", "Hour", "ICULOS"}
    feature_cols = [
        c for c in df_train.columns
        if c not in drop_cols and pd.api.types.is_numeric_dtype(df_train[c])
    ]

    X_train = df_train[feature_cols].values
    y_train = df_train["SepsisLabel"].values
    X_val = df_val[feature_cols].values
    y_val = df_val["SepsisLabel"].values

    # 2. Optimize with TPE
    sampler = optuna.samplers.TPESampler(seed=42)
    study = optuna.create_study(direction="maximize", sampler=sampler)
    study.optimize(lambda t: objective(t, X_train, y_train, X_val, y_val), n_trials=n_trials)

    logger.info(f"Best Optuna Trial #{study.best_trial.number} - Best Utility: {study.best_value:.4f}")
    logger.info(f"Best Parameters: {study.best_params}")

    # 3. Format trials history
    trials_history = []
    for t in study.trials:
        trials_history.append({
            "trial": t.number + 1,
            "utility": round(float(t.value), 4) if t.value is not None else 0.0,
            "params": t.params,
            "state": str(t.state)
        })

    study_summary = {
        "best_trial_number": study.best_trial.number + 1,
        "best_utility_score": round(float(study.best_value), 4),
        "best_params": study.best_params,
        "total_trials": len(study.trials),
        "trials": trials_history
    }

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(study_summary, f, indent=2)

    logger.info(f"Saved Optuna study results to {output_path}")
    return study_summary


if __name__ == "__main__":
    run_optuna_tuning(n_trials=10)
