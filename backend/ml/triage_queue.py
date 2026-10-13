"""
Ward Triage Queue & Ward-Level Alarm Budget Controller.
Prioritizes patients across an entire ICU ward based on risk velocity, time-to-threshold,
and trust score, while enforcing a shared ward-level alarm budget (e.g., max N alerts/hour).
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import numpy as np


class WardTriageQueue:
    """Manages patient risk prioritization and ward-level alarm rate limiting."""

    def __init__(self, max_ward_alerts_per_hour: int = 4):
        self.max_ward_alerts_per_hour = max_ward_alerts_per_hour
        self.recent_alerts_count = 0
        self.snoozed_patients: Dict[str, int] = {}  # patient_id -> hours_remaining

    def update_snooze_status(self):
        """Decrements snooze timers on each simulation/live tick."""
        expired = []
        for pid, hrs in self.snoozed_patients.items():
            if hrs <= 1:
                expired.append(pid)
            else:
                self.snoozed_patients[pid] = hrs - 1
        for pid in expired:
            del self.snoozed_patients[pid]

    def snooze_patient(self, patient_id: str, duration_hours: int = 2):
        """Snoozes alerts for a patient for designated duration."""
        self.snoozed_patients[patient_id] = duration_hours

    def rank_ward_patients(
        self,
        patients_telemetry: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Ranks ICU ward patients by clinical priority.

        Each item in patients_telemetry should have:
            - patient_id: str
            - bed_id: str
            - current_risk: float (0.0 to 1.0)
            - risk_velocity: float (rate of risk increase per hour)
            - trust_score: float (0 to 100)
            - time_to_threshold_hours: Optional[float]
            - has_active_alert: bool
        """
        self.update_snooze_status()

        ranked = []
        for p in patients_telemetry:
            pid = p["patient_id"]
            risk = p.get("current_risk", 0.0)
            velocity = p.get("risk_velocity", 0.0)
            trust = p.get("trust_score", 50.0)
            ttt = p.get("time_to_threshold_hours", 12.0)
            is_snoozed = pid in self.snoozed_patients

            # Priority Score Calculation:
            # High risk + high positive velocity + imminent threshold + high trust
            urgency_factor = max(0.0, (12.0 - min(12.0, ttt)) / 12.0) if ttt is not None else 0.2
            priority_score = (
                risk * 45.0 +
                max(0.0, velocity) * 20.0 +
                urgency_factor * 20.0 +
                (trust / 100.0) * 15.0
            )

            if is_snoozed:
                priority_score *= 0.3  # De-prioritize snoozed patients

            if risk >= 0.70:
                acuity = "Critical"
            elif risk >= 0.45:
                acuity = "Watch"
            else:
                acuity = "Stable"

            ranked.append({
                **p,
                "priority_score": round(priority_score, 1),
                "acuity": acuity,
                "is_snoozed": is_snoozed,
                "snooze_hours_left": self.snoozed_patients.get(pid, 0)
            })

        # Sort descending by priority score
        ranked.sort(key=lambda x: x["priority_score"], reverse=True)

        # Apply ward-level alarm budget
        alerts_permitted = 0
        for item in ranked:
            if item.get("current_risk", 0.0) >= 0.45 and not item["is_snoozed"]:
                if alerts_permitted < self.max_ward_alerts_per_hour:
                    item["budget_status"] = "Dispatched"
                    alerts_permitted += 1
                else:
                    item["budget_status"] = "Suppressed (Ward Budget Cap)"
            else:
                item["budget_status"] = "Normal Monitoring"

        return ranked
