"""
Alert Trust Score Engine (0 - 100).
Calculates multidimensional trust for early-warning sepsis alerts to eliminate alert fatigue.

Components:
1. Calibration Component (0-25): Posterior probability proximity to empirical reliability curve.
2. Conformal Component (0-20): Conformal confidence band certainty (penalizes 'Uncertain' sets).
3. Data Completeness Component (0-20): Fraction of non-missing vital signs and timely labs.
4. Drift Stability Component (0-15): Population stability penalty if current telemetry exhibits drift.
5. Model Agreement Component (0-20): Concordance between Tabular LightGBM and Recurrent GRU-D branches.
"""

from typing import Dict, Any, Optional
import numpy as np


class TrustScoreEngine:
    """Calculates granular 0-100 Alert Trust Score with component breakdown."""

    @staticmethod
    def compute_trust_score(
        calibrated_prob: float,
        conformal_label: str,
        input_completeness: float,
        drift_status: str = "green",
        lgbm_prob: Optional[float] = None,
        grud_prob: Optional[float] = None,
        ece: float = 0.024
    ) -> Dict[str, Any]:
        """
        Computes composite Alert Trust Score.

        Args:
            calibrated_prob: Isotonically calibrated risk probability [0.0, 1.0].
            conformal_label: Split conformal prediction label ('Sepsis', 'Non-Sepsis', 'Uncertain').
            input_completeness: Ratio of non-null physiological inputs in recent window [0.0, 1.0].
            drift_status: Population drift state ('green', 'amber', 'red').
            lgbm_prob: Tabular LightGBM risk probability.
            grud_prob: Recurrent GRU-D risk probability.
            ece: Expected Calibration Error of the ensemble.

        Returns:
            Dict containing composite score (0-100), trust tier, and sub-component contributions.
        """
        # 1. Calibration Component (0 to 25 pts)
        # Higher score if probability has low calibration error and is decisive
        cal_penalty = min(20.0, ece * 100.0)
        decisiveness = abs(calibrated_prob - 0.5) * 2.0  # 0 at threshold 0.5, 1 at 0 or 1
        comp_calibration = max(5.0, 25.0 - cal_penalty * 0.5) * (0.6 + 0.4 * decisiveness)
        comp_calibration = float(np.clip(comp_calibration, 0.0, 25.0))

        # 2. Conformal Component (0 to 20 pts)
        if conformal_label.lower() in ("sepsis", "non-sepsis"):
            comp_conformal = 20.0
        elif conformal_label.lower() == "uncertain":
            comp_conformal = 6.0  # Heavy penalty for uncertain conformal prediction
        else:
            comp_conformal = 14.0

        # 3. Input Completeness Component (0 to 20 pts)
        # Scales with observed vitals & timely labs
        comp_completeness = float(np.clip(input_completeness * 20.0, 0.0, 20.0))

        # 4. Drift Stability Component (0 to 15 pts)
        drift_lower = drift_status.lower()
        if drift_lower == "green":
            comp_drift = 15.0
        elif drift_lower == "amber":
            comp_drift = 9.0
        elif drift_lower == "red":
            comp_drift = 3.0
        else:
            comp_drift = 12.0

        # 5. Model Agreement Component (0 to 20 pts)
        if lgbm_prob is not None and grud_prob is not None:
            delta = abs(lgbm_prob - grud_prob)
            comp_agreement = float(np.clip(20.0 * (1.0 - delta), 2.0, 20.0))
        else:
            comp_agreement = 15.0

        # Composite total (0 - 100)
        total_score = round(comp_calibration + comp_conformal + comp_completeness + comp_drift + comp_agreement, 1)
        total_score = float(np.clip(total_score, 0.0, 100.0))

        # Trust Tier Assignment
        if total_score >= 80.0:
            tier = "High Trust"
        elif total_score >= 60.0:
            tier = "Moderate Trust"
        else:
            tier = "Low Trust"

        return {
            "trust_score": total_score,
            "tier": tier,
            "breakdown": {
                "calibration": round(comp_calibration, 1),
                "conformal": round(comp_conformal, 1),
                "completeness": round(comp_completeness, 1),
                "drift_stability": round(comp_drift, 1),
                "model_agreement": round(comp_agreement, 1)
            },
            "recommendation": (
                "Verified high-confidence alert. Immediate bedside triage indicated."
                if tier == "High Trust"
                else (
                    "Moderate confidence. Correlate with clinical trajectory and repeat lactate."
                    if tier == "Moderate Trust"
                    else "Low trust alert due to missing data, drift, or branch divergence. Verify telemetry."
                )
            )
        }
