"""
Alarm Budget Controller for Clinical Alert Fatigue Mitigation.
Controls:
- Risk threshold tau (e.g. 0.45)
- Persistence k (e.g. 2 consecutive hours above tau)
- Cooldown c (e.g. 6 hours lockout after alert)
- Patient cap M (e.g. max 3 alerts per ICU admission)
"""

from typing import Dict, List, Tuple, Optional, Any, Union
import numpy as np
import pandas as pd


class AlarmBudgetController:
    """
    Enforces clinical policy constraints on raw or calibrated model risk streams
    to prevent alarm fatigue while maximizing early detection utility.
    """

    def __init__(
        self,
        tau: float = 0.45,
        k: int = 2,
        cooldown: int = 6,
        max_alarms: int = 3
    ):
        self.tau = float(tau)
        self.k = int(k)
        self.cooldown = int(cooldown)
        self.max_alarms = int(max_alarms)

    def process_patient_stream(self, risk_series: Union[List[float], np.ndarray]) -> List[Dict[str, Any]]:
        """
        Processes sequential hourly predictions for a single patient.
        Returns hourly alarm status and suppression reasons.
        """
        risks = np.asarray(risk_series, dtype=float)
        n_hours = len(risks)

        results = []
        consecutive_above = 0
        cooldown_remaining = 0
        total_alarms_fired = 0

        for t in range(n_hours):
            p = float(risks[t])
            if p >= self.tau:
                consecutive_above += 1
            else:
                consecutive_above = 0

            # Eligibility criteria: risk exceeds tau for k consecutive hours
            eligible = (consecutive_above >= self.k)

            is_alert = False
            suppressed_cooldown = False
            suppressed_cap = False

            if eligible:
                if cooldown_remaining > 0:
                    suppressed_cooldown = True
                elif total_alarms_fired >= self.max_alarms:
                    suppressed_cap = True
                else:
                    is_alert = True
                    total_alarms_fired += 1
                    cooldown_remaining = self.cooldown

            if cooldown_remaining > 0 and not is_alert:
                cooldown_remaining -= 1

            results.append({
                "hour": t + 1,
                "risk": round(p, 4),
                "consecutive_above": consecutive_above,
                "eligible": eligible,
                "is_alert": is_alert,
                "suppressed_cooldown": suppressed_cooldown,
                "suppressed_cap": suppressed_cap,
                "cooldown_remaining": cooldown_remaining,
                "total_alarms_so_far": total_alarms_fired
            })

        return results

    def evaluate_cohort(
        self,
        patients_risks: Dict[str, np.ndarray],
        patients_labels: Dict[str, np.ndarray]
    ) -> Dict[str, float]:
        """
        Evaluates alarm policy across a cohort of patient time-series.
        Computes total alarms, false alarms per patient-day, sensitivity, and lead time.
        """
        total_patients = len(patients_risks)
        if total_patients == 0:
            return {"alarms_per_patient_day": 0.0, "sensitivity": 0.0, "total_alarms": 0}

        total_alarms = 0
        false_alarms = 0
        total_patient_hours = 0
        septic_patients = 0
        detected_septic = 0
        lead_times = []

        for pid, risks in patients_risks.items():
            labels = np.asarray(patients_labels.get(pid, np.zeros_like(risks)), dtype=int)
            total_patient_hours += len(risks)
            is_septic = bool(np.any(labels == 1))
            if is_septic:
                septic_patients += 1

            stream_res = self.process_patient_stream(risks)
            patient_alerted = False
            first_alert_hour = None

            for row in stream_res:
                t_idx = row["hour"] - 1
                if row["is_alert"]:
                    total_alarms += 1
                    if first_alert_hour is None:
                        first_alert_hour = t_idx

                    # Check if alert occurred in sepsis window (or within 6h before onset)
                    onset_hour = int(np.argmax(labels == 1)) if is_septic else -1
                    if not is_septic:
                        false_alarms += 1
                    elif onset_hour >= 0 and t_idx > (onset_hour + 24):
                        false_alarms += 1

            if is_septic and first_alert_hour is not None:
                onset_hour = int(np.argmax(labels == 1))
                # Lead time: hours before clinical onset
                lead = onset_hour - first_alert_hour
                if lead >= -6:  # Alert before or within initial onset
                    detected_septic += 1
                    lead_times.append(lead)

        patient_days = max(total_patient_hours / 24.0, 1.0)
        alarms_per_day = total_alarms / patient_days
        false_alarms_per_day = false_alarms / patient_days
        sensitivity = (detected_septic / septic_patients) if septic_patients > 0 else 0.0
        mean_lead = float(np.mean(lead_times)) if lead_times else 0.0

        return {
            "total_alarms": int(total_alarms),
            "false_alarms": int(false_alarms),
            "total_patient_days": round(patient_days, 1),
            "alarms_per_patient_day": round(alarms_per_day, 3),
            "false_alarms_per_patient_day": round(false_alarms_per_day, 3),
            "sensitivity": round(sensitivity, 4),
            "mean_lead_time_hours": round(mean_lead, 2),
            "detected_septic_patients": detected_septic,
            "total_septic_patients": septic_patients
        }

    @staticmethod
    def sweep_tradeoff_curve(
        patients_risks: Dict[str, np.ndarray],
        patients_labels: Dict[str, np.ndarray],
        tau_range: Optional[List[float]] = None
    ) -> List[Dict[str, Any]]:
        """
        Sweeps tau over [0.2, 0.8] with fixed clinical persistence k=2, cooldown=6, cap=3
        to map out the operational Sensitivity vs False Alarm Rate curve.
        """
        if tau_range is None:
            tau_range = [0.20, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.70, 0.80]

        curve = []
        for t_val in tau_range:
            ctrl = AlarmBudgetController(tau=t_val, k=2, cooldown=6, max_alarms=3)
            metrics = ctrl.evaluate_cohort(patients_risks, patients_labels)
            curve.append({
                "tau": round(t_val, 2),
                "sensitivity": metrics["sensitivity"],
                "false_alarms_per_day": metrics["false_alarms_per_patient_day"],
                "total_alarms": metrics["total_alarms"],
                "mean_lead_time": metrics["mean_lead_time_hours"]
            })

        return curve
