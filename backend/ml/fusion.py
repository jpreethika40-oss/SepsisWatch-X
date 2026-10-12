"""
Stacking Meta-Learner with Probability Calibration and Site-Specific Recalibration.
Ensembles predictions from:
- Tabular Branch (LightGBM)
- Temporal Branch (GRU-D / DANN)
- Rule Baselines (SIRS, qSOFA)
"""

from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any, Union
import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.isotonic import IsotonicRegression


class StackingEnsemble:
    """
    Combines predictions from multiple distinct clinical paradigms into
    a unified, well-calibrated posterior probability P(Sepsis | x).
    """

    def __init__(self, use_rules: bool = True):
        self.use_rules = use_rules
        # Meta-learner: non-negative weights via L-BFGS or balanced regularized logistic regression
        self.meta_learner = LogisticRegression(
            C=1.0,
            penalty="l2",
            solver="lbfgs",
            class_weight="balanced",
            max_iter=1000
        )
        self.global_calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        self.site_calibrators: Dict[str, IsotonicRegression] = {}
        self.fitted = False

    def _prepare_matrix(
        self,
        p_lgbm: np.ndarray,
        p_grud: np.ndarray,
        p_sirs: Optional[np.ndarray] = None,
        p_qsofa: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Assembles feature matrix for meta-learner."""
        p_lgbm = np.asarray(p_lgbm, dtype=float).reshape(-1, 1)
        p_grud = np.asarray(p_grud, dtype=float).reshape(-1, 1)

        cols = [p_lgbm, p_grud]

        if self.use_rules:
            if p_sirs is None:
                p_sirs = np.zeros_like(p_lgbm)
            else:
                p_sirs = np.asarray(p_sirs, dtype=float).reshape(-1, 1)

            if p_qsofa is None:
                p_qsofa = np.zeros_like(p_lgbm)
            else:
                p_qsofa = np.asarray(p_qsofa, dtype=float).reshape(-1, 1)

            cols.extend([p_sirs, p_qsofa])

        return np.hstack(cols)

    def fit(
        self,
        p_lgbm_val: np.ndarray,
        p_grud_val: np.ndarray,
        y_val: np.ndarray,
        p_sirs_val: Optional[np.ndarray] = None,
        p_qsofa_val: Optional[np.ndarray] = None,
        hospital_ids: Optional[List[str]] = None
    ):
        """
        Fits meta-learner on out-of-fold validation predictions and fits global isotonic calibrator.
        """
        X_val = self._prepare_matrix(p_lgbm_val, p_grud_val, p_sirs_val, p_qsofa_val)
        y_val = np.asarray(y_val, dtype=int).ravel()

        # 1. Fit meta-learner
        self.meta_learner.fit(X_val, y_val)
        meta_raw = self.meta_learner.predict_proba(X_val)[:, 1]

        # 2. Fit global isotonic calibrator
        self.global_calibrator.fit(meta_raw, y_val)

        # 3. Fit site-specific calibrators if hospital IDs are supplied
        if hospital_ids is not None:
            hosp_arr = np.asarray(hospital_ids)
            for site in np.unique(hosp_arr):
                idx = (hosp_arr == site)
                if np.sum(idx) >= 30 and len(np.unique(y_val[idx])) > 1:
                    sc = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
                    sc.fit(meta_raw[idx], y_val[idx])
                    self.site_calibrators[str(site)] = sc

        self.fitted = True

    def fit_site_recalibration(
        self,
        site_name: str,
        p_lgbm: np.ndarray,
        p_grud: np.ndarray,
        y_site: np.ndarray,
        p_sirs: Optional[np.ndarray] = None,
        p_qsofa: Optional[np.ndarray] = None
    ):
        """Adapts calibration mapping specifically to target hospital cohort."""
        if not self.fitted:
            raise RuntimeError("Base ensemble must be fitted before site recalibration.")

        raw_meta = self.predict_raw(p_lgbm, p_grud, p_sirs, p_qsofa)
        sc = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        sc.fit(raw_meta, y_site)
        self.site_calibrators[site_name] = sc

    def predict_raw(
        self,
        p_lgbm: np.ndarray,
        p_grud: np.ndarray,
        p_sirs: Optional[np.ndarray] = None,
        p_qsofa: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Returns uncalibrated logistic meta-learner posterior probabilities."""
        if not self.fitted:
            raise RuntimeError("StackingEnsemble is not fitted.")
        X = self._prepare_matrix(p_lgbm, p_grud, p_sirs, p_qsofa)
        return self.meta_learner.predict_proba(X)[:, 1]

    def predict_proba(
        self,
        p_lgbm: np.ndarray,
        p_grud: np.ndarray,
        p_sirs: Optional[np.ndarray] = None,
        p_qsofa: Optional[np.ndarray] = None,
        hospital: Optional[str] = None
    ) -> np.ndarray:
        """
        Returns calibrated posterior probabilities P(Sepsis=1 | x).
        If hospital is supplied and site calibrator exists, uses site-specific mapping.
        """
        raw_preds = self.predict_raw(p_lgbm, p_grud, p_sirs, p_qsofa)

        if hospital and hospital in self.site_calibrators:
            return self.site_calibrators[hospital].predict(raw_preds)
        return self.global_calibrator.predict(raw_preds)

    def get_weights(self) -> Dict[str, float]:
        """Returns linear meta-learner coefficients for transparency."""
        if not self.fitted:
            return {}
        names = ["LightGBM", "GRU-D"]
        if self.use_rules:
            names.extend(["SIRS", "qSOFA"])
        coefs = self.meta_learner.coef_[0]
        return {name: float(w) for name, w in zip(names, coefs)}

    def save(self, filepath: str = "models/stacking_fusion.pkl"):
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "use_rules": self.use_rules,
            "meta_learner": self.meta_learner,
            "global_calibrator": self.global_calibrator,
            "site_calibrators": self.site_calibrators,
            "fitted": self.fitted
        }, filepath)

    def load(self, filepath: str = "models/stacking_fusion.pkl"):
        data = joblib.load(filepath)
        self.use_rules = data["use_rules"]
        self.meta_learner = data["meta_learner"]
        self.global_calibrator = data["global_calibrator"]
        self.site_calibrators = data["site_calibrators"]
        self.fitted = data["fitted"]
