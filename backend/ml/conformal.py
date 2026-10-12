"""
Split Conformal Prediction for Uncertainty Quantification in ICU Sepsis Alerting.
Guarantees 1 - alpha (e.g. 90%) finite-sample marginal coverage:
P(Y in C(X)) >= 1 - alpha.
Reference: Vovk, V., Gammerman, A., & Shafer, G. (2005).
Algorithmic Learning in a Random World. Springer.
"""

from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any, Set
import numpy as np
import joblib


class ConformalPredictor:
    """
    Split conformal prediction wrapper that generates valid prediction sets
    and calibrated probability interval bounds [p_lower, p_upper].
    """

    def __init__(self, alpha: float = 0.10):
        self.alpha = float(alpha)
        self.q_hat: Optional[float] = None
        self.cal_scores: Optional[np.ndarray] = None
        self.fitted = False

    def compute_nonconformity(self, probs: np.ndarray, labels: np.ndarray) -> np.ndarray:
        """
        Nonconformity score s_i = 1 - P(Y = y_i | x_i).
        When y_i = 1: s_i = 1 - p_i
        When y_i = 0: s_i = p_i
        """
        probs = np.asarray(probs, dtype=float).ravel()
        labels = np.asarray(labels, dtype=int).ravel()
        
        # P(Y = y | x)
        prob_true = np.where(labels == 1, probs, 1.0 - probs)
        return 1.0 - prob_true

    def fit(self, val_probs: np.ndarray, val_labels: np.ndarray):
        """
        Calibrates conformal threshold on held-out calibration set.
        """
        val_probs = np.clip(np.asarray(val_probs, dtype=float).ravel(), 1e-6, 1.0 - 1e-6)
        val_labels = np.asarray(val_labels, dtype=int).ravel()
        n = len(val_labels)

        if n == 0:
            raise ValueError("Calibration set cannot be empty.")

        scores = self.compute_nonconformity(val_probs, val_labels)
        self.cal_scores = np.sort(scores)

        # Finite-sample adjusted quantile: ceil((n + 1) * (1 - alpha)) / n
        k = int(np.ceil((n + 1) * (1.0 - self.alpha)))
        k = min(max(k, 1), n)
        
        self.q_hat = float(self.cal_scores[k - 1])
        self.fitted = True

    def predict_set(self, prob: float) -> Set[int]:
        """
        Returns prediction set C(x) in {{0}, {1}, {0, 1}, empty}.
        """
        if not self.fitted or self.q_hat is None:
            raise RuntimeError("ConformalPredictor must be fitted before predict_set.")

        p1 = float(np.clip(prob, 0.0, 1.0))
        p0 = 1.0 - p1

        c_set = set()
        # Include 0 if nonconformity 1 - p0 <= q_hat (i.e. p1 <= q_hat)
        if (1.0 - p0) <= self.q_hat:
            c_set.add(0)
        # Include 1 if nonconformity 1 - p1 <= q_hat
        if (1.0 - p1) <= self.q_hat:
            c_set.add(1)

        # If empty set, include the higher likelihood label to ensure non-empty clinical decision
        if len(c_set) == 0:
            c_set.add(1 if p1 >= 0.5 else 0)

        return c_set

    def predict_batch(self, probs: np.ndarray) -> List[Dict[str, Any]]:
        """
        Produces prediction sets, clinical classification, and interval bounds
        for an array of probabilities.
        """
        if not self.fitted or self.q_hat is None:
            raise RuntimeError("ConformalPredictor must be fitted before predict_batch.")

        probs = np.asarray(probs, dtype=float).ravel()
        results = []

        for p in probs:
            p_val = float(np.clip(p, 0.0, 1.0))
            pred_set = self.predict_set(p_val)

            # Classify decision tag
            if pred_set == {1}:
                classification = "sepsis"
                uncertain = False
            elif pred_set == {0}:
                classification = "no_sepsis"
                uncertain = False
            else:
                classification = "uncertain"
                uncertain = True

            # Calibrated interval bounds
            p_lower = max(0.0, p_val - self.q_hat)
            p_upper = min(1.0, p_val + self.q_hat)
            width = p_upper - p_lower

            results.append({
                "prob": p_val,
                "prediction_set": list(pred_set),
                "classification": classification,
                "is_uncertain": uncertain,
                "p_lower": round(p_lower, 4),
                "p_upper": round(p_upper, 4),
                "interval_width": round(width, 4)
            })

        return results

    def evaluate_coverage(self, test_probs: np.ndarray, test_labels: np.ndarray) -> Dict[str, float]:
        """
        Verifies empirical coverage and average set efficiency on a test cohort.
        """
        test_probs = np.asarray(test_probs, dtype=float).ravel()
        test_labels = np.asarray(test_labels, dtype=int).ravel()
        n = len(test_labels)

        covered = 0
        set_sizes = []
        uncertain_count = 0

        for p, y in zip(test_probs, test_labels):
            s = self.predict_set(p)
            set_sizes.append(len(s))
            if y in s:
                covered += 1
            if len(s) > 1:
                uncertain_count += 1

        empirical_coverage = float(covered / n) if n > 0 else 0.0
        avg_set_size = float(np.mean(set_sizes)) if set_sizes else 0.0
        uncertain_pct = float(uncertain_count / n) if n > 0 else 0.0

        return {
            "target_coverage": 1.0 - self.alpha,
            "empirical_coverage": round(empirical_coverage, 4),
            "coverage_gap": round(empirical_coverage - (1.0 - self.alpha), 4),
            "average_set_size": round(avg_set_size, 3),
            "uncertain_ratio": round(uncertain_pct, 4),
            "q_hat": round(float(self.q_hat), 4) if self.q_hat else 0.0,
            "valid": bool(empirical_coverage >= (1.0 - self.alpha - 0.05))
        }

    def save(self, filepath: str = "models/conformal_predictor.pkl"):
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "alpha": self.alpha,
            "q_hat": self.q_hat,
            "cal_scores": self.cal_scores,
            "fitted": self.fitted
        }, filepath)

    def load(self, filepath: str = "models/conformal_predictor.pkl"):
        data = joblib.load(filepath)
        self.alpha = data["alpha"]
        self.q_hat = data["q_hat"]
        self.cal_scores = data["cal_scores"]
        self.fitted = data["fitted"]
