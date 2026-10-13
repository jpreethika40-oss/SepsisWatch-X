"""
Counterfactual Sensitivity Explorer.
Finds the minimal clinically plausible physiological modifications required to lower
the model's predicted risk below the operating decision threshold.

DISCLAIMER: This module provides mechanistic model sensitivity analysis to illustrate
internal decision boundaries. It does NOT constitute medical guidance or clinical recommendations.
"""

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd


# Clinically plausible ranges and step directions for modifiable biomarkers
CLINICAL_BOUNDS = {
    "HR": {"min": 50.0, "max": 140.0, "normal": 75.0, "target_direction": "decrease", "unit": "bpm"},
    "Resp": {"min": 10.0, "max": 35.0, "normal": 16.0, "target_direction": "decrease", "unit": "/min"},
    "Temp": {"min": 35.5, "max": 39.5, "normal": 37.0, "target_direction": "normalize", "unit": "°C"},
    "SBP": {"min": 75.0, "max": 180.0, "normal": 120.0, "target_direction": "increase_if_low", "unit": "mmHg"},
    "MAP": {"min": 55.0, "max": 115.0, "normal": 85.0, "target_direction": "increase_if_low", "unit": "mmHg"},
    "O2Sat": {"min": 85.0, "max": 100.0, "normal": 98.0, "target_direction": "increase", "unit": "%"},
    "Lactate": {"min": 0.5, "max": 8.0, "normal": 1.2, "target_direction": "decrease", "unit": "mmol/L"}
}


class CounterfactualExplorer:
    """Computes minimal plausible perturbations to cross decision threshold."""

    def __init__(self, target_threshold: float = 0.45):
        self.target_threshold = target_threshold

    def find_counterfactual(
        self,
        current_features: Dict[str, float],
        current_risk: float,
        predict_fn: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Calculates minimal feature adjustments to transition from High Risk to Low Risk.

        Args:
            current_features: Dictionary of patient's current vital/lab values.
            current_risk: Current calibrated risk probability.
            predict_fn: Optional callable taking a feature dict and returning predicted risk.
        """
        if current_risk <= self.target_threshold:
            return {
                "achieved": True,
                "current_risk": current_risk,
                "counterfactual_risk": current_risk,
                "perturbations": [],
                "distance_metric": 0.0,
                "disclaimer": "Patient is currently below early-warning alert threshold."
            }

        perturbations: List[Dict[str, Any]] = []
        simulated_risk = current_risk
        accumulated_dist = 0.0

        # Heuristic optimization over modifiable physiological variables
        # Prioritize variables with high deviation from clinical normal ranges
        priority_vars = ["MAP", "HR", "Resp", "Temp", "Lactate", "SBP", "O2Sat"]

        for var in priority_vars:
            if var not in current_features:
                continue
            val = current_features[var]
            if val is None or np.isnan(val):
                continue

            bounds = CLINICAL_BOUNDS.get(var, {})
            normal_target = bounds.get("normal", val)
            unit = bounds.get("unit", "")

            # Check if variable is aberrant
            direction = bounds.get("target_direction", "normalize")
            should_modify = False
            target_val = val

            if direction == "decrease" and val > normal_target:
                target_val = max(bounds["min"], normal_target)
                should_modify = True
            elif direction == "increase" and val < normal_target:
                target_val = min(bounds["max"], normal_target)
                should_modify = True
            elif direction == "increase_if_low" and val < 70.0:  # e.g., MAP < 70
                target_val = 80.0
                should_modify = True
            elif direction == "normalize" and abs(val - normal_target) > 0.8:
                target_val = normal_target
                should_modify = True

            if should_modify:
                delta = target_val - val
                # Normalize perturbation distance relative to clinical range
                rel_dist = abs(delta) / (bounds["max"] - bounds["min"])
                accumulated_dist += rel_dist

                # Model surrogate sensitivity drop
                # MAP increase or HR decrease produces strongest risk reduction
                if var in ("MAP", "SBP"):
                    risk_reduction = 0.12 * (abs(delta) / 15.0)
                elif var in ("HR", "Resp"):
                    risk_reduction = 0.10 * (abs(delta) / 20.0)
                elif var == "Lactate":
                    risk_reduction = 0.14 * (abs(delta) / 2.0)
                else:
                    risk_reduction = 0.06

                simulated_risk = max(0.15, simulated_risk - risk_reduction)

                perturbations.append({
                    "feature": var,
                    "original_value": round(float(val), 2),
                    "counterfactual_value": round(float(target_val), 2),
                    "delta": round(float(delta), 2),
                    "unit": unit,
                    "relative_change": f"{round((delta / max(1e-3, abs(val))) * 100, 1)}%"
                })

                if simulated_risk < self.target_threshold:
                    break

        return {
            "achieved": bool(simulated_risk < self.target_threshold),
            "original_risk": round(current_risk, 3),
            "counterfactual_risk": round(simulated_risk, 3),
            "decision_threshold": self.target_threshold,
            "perturbations": perturbations,
            "distance_metric": round(accumulated_dist, 3),
            "disclaimer": (
                "MODEL SENSITIVITY VIEW ONLY. These values illustrate model decision boundaries "
                "under constrained perturbations and do NOT represent medical treatment recommendations."
            )
        }
