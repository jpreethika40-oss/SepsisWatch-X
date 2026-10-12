"""
LightGBM Tabular Branch for Sepsis Early Warning.
Trains gradient boosted trees on rolling physiological features with class weighting,
isotonic calibration, and feature importance extraction.
"""

import os
import joblib
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.isotonic import IsotonicRegression
import yaml


class LightGBMBranch:
    """LightGBM model wrapper for SepsisWatch-X tabular stream."""

    def __init__(self, config_path: str = "config/config.yaml"):
        with open(config_path, "r") as f:
            self.cfg = yaml.safe_load(f).get("models", {}).get("lgbm", {})

        self.params = {
            "objective": "binary",
            "metric": "auc",
            "boosting_type": "gbdt",
            "num_leaves": self.cfg.get("num_leaves", 31),
            "learning_rate": self.cfg.get("learning_rate", 0.05),
            "n_estimators": self.cfg.get("n_estimators", 150),
            "min_child_samples": self.cfg.get("min_child_samples", 20),
            "subsample": self.cfg.get("subsample", 0.8),
            "colsample_bytree": self.cfg.get("colsample_bytree", 0.8),
            "class_weight": self.cfg.get("class_weight", "balanced"),
            "random_state": self.cfg.get("random_state", 42),
            "n_jobs": -1,
            "verbose": -1,
        }

        self.model = lgb.LGBMClassifier(**self.params)
        self.feature_names: List[str] = []
        self.calibrator: Optional[IsotonicRegression] = None
        self.is_fitted = False

    def train(
        self,
        X_train: pd.DataFrame,
        y_train: np.ndarray,
        X_val: Optional[pd.DataFrame] = None,
        y_val: Optional[np.ndarray] = None,
        calibrate: bool = True
    ) -> Dict[str, Any]:
        """Trains the LightGBM classifier with early stopping and isotonic calibration."""
        self.feature_names = list(X_train.columns)

        callbacks = []
        eval_set = None
        if X_val is not None and y_val is not None:
            eval_set = [(X_val, y_val)]
            callbacks = [lgb.early_stopping(stopping_rounds=25, verbose=False)]

        self.model.fit(
            X_train,
            y_train,
            eval_set=eval_set,
            callbacks=callbacks
        )

        self.is_fitted = True

        # Post-hoc Isotonic Calibration
        if calibrate:
            calib_X = X_val if X_val is not None else X_train
            calib_y = y_val if y_val is not None else y_train
            raw_probs = self.model.predict_proba(calib_X)[:, 1]
            self.calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
            self.calibrator.fit(raw_probs, calib_y)

        # Feature Importances
        importances = dict(zip(self.feature_names, self.model.feature_importances_))
        sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)

        return {
            "n_features": len(self.feature_names),
            "best_iteration": getattr(self.model, "best_iteration_", self.params["n_estimators"]),
            "top_10_features": sorted_imp[:10]
        }

    def predict_proba(self, X: pd.DataFrame, use_calibration: bool = True) -> np.ndarray:
        """Returns risk probabilities for class 1 (sepsis)."""
        if not self.is_fitted:
            raise RuntimeError("LightGBMBranch model is not fitted yet.")

        # Ensure correct column alignment
        if isinstance(X, pd.DataFrame):
            X_aligned = X[self.feature_names] if set(self.feature_names).issubset(X.columns) else X
        else:
            X_aligned = X
        raw_probs = self.model.predict_proba(X_aligned)[:, 1]

        if use_calibration and self.calibrator is not None:
            calibrated = self.calibrator.predict(raw_probs)
            return np.clip(calibrated, 0.0, 1.0)
        return raw_probs

    def predict(self, X: pd.DataFrame, threshold: float = 0.45) -> np.ndarray:
        """Returns binary predictions at specified decision threshold."""
        probs = self.predict_proba(X)
        return (probs >= threshold).astype(int)

    def get_feature_importances(self) -> Dict[str, float]:
        """Returns feature importances mapped by feature name."""
        if not self.is_fitted:
            return {}
        imp = self.model.feature_importances_
        norm_imp = imp / (np.sum(imp) + 1e-9)
        return {name: float(norm_imp[i]) for i, name in enumerate(self.feature_names)}

    def save(self, filepath: str = "models/lgbm_model.pkl"):
        """Saves model and calibrator artifacts."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "model": self.model,
            "calibrator": self.calibrator,
            "feature_names": self.feature_names,
            "params": self.params,
            "is_fitted": self.is_fitted
        }, filepath)

    def load(self, filepath: str = "models/lgbm_model.pkl"):
        """Loads model artifacts."""
        data = joblib.load(filepath)
        self.model = data["model"]
        self.calibrator = data["calibrator"]
        self.feature_names = data["feature_names"]
        self.params = data["params"]
        self.is_fitted = data["is_fitted"]


# Alias for backward and forward compatibility
LightGBMSepsisModel = LightGBMBranch
