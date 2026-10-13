"""
Data Quality Radar & Telemetry Completeness Engine.
Quantifies bedside missingness, detects overdue/stale clinical observations,
and computes clinical telemetry completeness scores for patients and ICU wards.
"""

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd


# Staleness tolerance in hours
STALENESS_LIMITS_HOURS = {
    "HR": 2,
    "Resp": 2,
    "O2Sat": 2,
    "SBP": 2,
    "MAP": 2,
    "Temp": 4,
    "Lactate": 8,
    "WBC": 12,
    "Platelets": 12,
    "Creatinine": 12,
    "BUN": 12,
    "Glucose": 6,
    "BaseExcess": 8,
    "pH": 8,
    "PaCO2": 8
}


class DataQualityRadar:
    """Monitors telemetry timeliness and missingness penalties."""

    @staticmethod
    def evaluate_patient_quality(
        patient_history_df: pd.DataFrame,
        current_hour: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Assesses telemetry completeness and stale biomarker alerts for a single patient.
        """
        if patient_history_df.empty:
            return {
                "completeness_score": 0.0,
                "overdue_indicators": [],
                "vital_timeliness_pct": 0.0,
                "lab_timeliness_pct": 0.0,
                "missingness_penalty": 0.30
            }

        if current_hour is None:
            current_hour = int(patient_history_df["ICULOS"].max()) if "ICULOS" in patient_history_df else len(patient_history_df)

        overdue_list = []
        recent_df = patient_history_df.tail(12)  # Look at last 12 hours
        n_rows = len(recent_df)

        vitals_measured = 0
        vitals_total = 0
        labs_measured = 0
        labs_total = 0

        for feat, max_age in STALENESS_LIMITS_HOURS.items():
            if feat not in patient_history_df.columns:
                continue

            # Check last observed hour
            non_null_mask = ~patient_history_df[feat].isna()
            if non_null_mask.any():
                last_seen_idx = patient_history_df.loc[non_null_mask, "ICULOS"].max() if "ICULOS" in patient_history_df else patient_history_df[non_null_mask].index[-1]
                age = max(0, current_hour - int(last_seen_idx))
            else:
                age = 999  # Never measured

            is_overdue = age > max_age

            is_vital = feat in ("HR", "Resp", "O2Sat", "SBP", "MAP", "Temp")
            if is_vital:
                vitals_total += 1
                if not is_overdue:
                    vitals_measured += 1
            else:
                labs_total += 1
                if not is_overdue:
                    labs_measured += 1

            if is_overdue:
                overdue_list.append({
                    "feature": feat,
                    "hours_since_last_measurement": age if age < 900 else None,
                    "max_tolerated_staleness_hours": max_age,
                    "urgency": "High" if is_vital or feat == "Lactate" else "Medium",
                    "status": "Overdue" if age < 900 else "Never Documented"
                })

        vital_rate = (vitals_measured / max(1, vitals_total)) * 100.0
        lab_rate = (labs_measured / max(1, labs_total)) * 100.0

        # Weighted completeness: 60% vitals, 40% labs
        completeness = round(0.6 * vital_rate + 0.4 * lab_rate, 1)
        missingness_penalty = round(max(0.0, (100.0 - completeness) / 100.0 * 0.25), 3)

        return {
            "completeness_score": completeness,
            "vital_timeliness_pct": round(vital_rate, 1),
            "lab_timeliness_pct": round(lab_rate, 1),
            "missingness_penalty": missingness_penalty,
            "overdue_indicators": overdue_list,
            "status": "Optimal" if completeness >= 80 else ("Adequate" if completeness >= 60 else "Degraded Telemetry")
        }

    @staticmethod
    def generate_ward_heatmap(
        patients_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Aggregates ward-level matrix of feature coverage across beds.
        """
        ward_matrix = []
        for p in patients_data:
            pid = p["patient_id"]
            bed = p.get("bed_id", f"Bed-{pid[-2:]}")
            scores = p.get("quality_summary", {})
            ward_matrix.append({
                "patient_id": pid,
                "bed_id": bed,
                "completeness": scores.get("completeness_score", 75.0),
                "overdue_count": len(scores.get("overdue_indicators", []))
            })
        return ward_matrix
