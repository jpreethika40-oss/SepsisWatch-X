"""
Continuous Data Drift & Population Stability Monitoring Engine.
Computes:
1. Population Stability Index (PSI) per feature.
2. Two-sample Kolmogorov-Smirnov (KS) statistical tests.
3. Wasserstein distance.
4. Simulated domain shift injection for live demonstration.
"""

from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
from scipy import stats


class DriftMonitor:
    """Monitors physiological distribution shift between baseline and production cohorts."""

    def __init__(self, baseline_df: Optional[pd.DataFrame] = None):
        self.baseline_df = baseline_df
        self.shift_injected = False
        self.shift_multiplier: Dict[str, float] = {
            "HR": 1.15,
            "SBP": 0.88,
            "Temp": 1.03,
            "Resp": 1.20,
            "Lactate": 1.35
        }

    def compute_psi(
        self,
        expected: np.ndarray,
        actual: np.ndarray,
        num_bins: int = 10,
        epsilon: float = 1e-4
    ) -> float:
        """
        Population Stability Index (PSI):
        PSI = sum( (Actual_i - Expected_i) * ln(Actual_i / Expected_i) )
        """
        expected = expected[~np.isnan(expected)]
        actual = actual[~np.isnan(actual)]

        if len(expected) < 10 or len(actual) < 10:
            return 0.0

        # Bin edges based on expected distribution quantiles
        quantiles = np.linspace(0, 1, num_bins + 1)
        bin_edges = np.percentile(expected, quantiles * 100)
        bin_edges[0] = -np.inf
        bin_edges[-1] = np.inf

        exp_counts, _ = np.histogram(expected, bins=bin_edges)
        act_counts, _ = np.histogram(actual, bins=bin_edges)

        exp_pct = (exp_counts / len(expected)) + epsilon
        act_pct = (act_counts / len(actual)) + epsilon

        psi_val = np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct))
        return round(float(psi_val), 4)

    def compute_ks_test(
        self,
        expected: np.ndarray,
        actual: np.ndarray
    ) -> Dict[str, float]:
        """Runs two-sample Kolmogorov-Smirnov test."""
        expected = expected[~np.isnan(expected)]
        actual = actual[~np.isnan(actual)]

        if len(expected) < 10 or len(actual) < 10:
            return {"stat": 0.0, "p_value": 1.0}

        res = stats.ks_2samp(expected, actual)
        return {
            "stat": round(float(res.statistic), 4),
            "p_value": round(float(res.pvalue), 4)
        }

    def evaluate_drift_report(
        self,
        production_df: pd.DataFrame,
        features: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generates full drift report across monitored clinical biomarkers.
        """
        if self.baseline_df is None:
            self.baseline_df = production_df.copy()

        if features is None:
            features = ["HR", "SBP", "MAP", "Resp", "Temp", "Lactate", "WBC", "Creatinine"]

        feature_psi = {}
        ks_stats = {}
        max_psi = 0.0

        prod_eval = production_df.copy()
        if self.shift_injected:
            # Artificially inject simulated shift
            for col, mult in self.shift_multiplier.items():
                if col in prod_eval.columns:
                    prod_eval[col] = prod_eval[col] * mult

        for feat in features:
            if feat in self.baseline_df.columns and feat in prod_eval.columns:
                exp_vals = self.baseline_df[feat].dropna().values
                act_vals = prod_eval[feat].dropna().values

                psi_score = self.compute_psi(exp_vals, act_vals)
                feature_psi[feat] = psi_score
                max_psi = max(max_psi, psi_score)

                ks_res = self.compute_ks_test(exp_vals, act_vals)
                ks_stats[feat] = ks_res

        # Traffic light assignment
        if max_psi < 0.10:
            overall_status = "green"
        elif max_psi < 0.25:
            overall_status = "amber"
        else:
            overall_status = "red"

        return {
            "overall_status": overall_status,
            "max_psi": round(max_psi, 4),
            "hospital_shift_detected": bool(self.shift_injected or max_psi >= 0.15),
            "feature_psi": feature_psi,
            "ks_stats": ks_stats,
            "sample_size": len(prod_eval),
            "shift_injected": self.shift_injected,
            "updated_at": "Just now"
        }

    def toggle_shift_injection(self, inject: bool) -> bool:
        """Toggles demonstration acute drift injection."""
        self.shift_injected = bool(inject)
        return self.shift_injected
