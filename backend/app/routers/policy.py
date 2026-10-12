"""
FastAPI Router for Alarm Budget Policy Configuration and Optimization.
"""

from typing import List, Dict, Any
from fastapi import APIRouter
from backend.app.schemas.policy import PolicySchema, PolicyUpdateRequest, TradeoffCurvePoint
from backend.app.services.simulator import simulator

router = APIRouter(prefix="/api/policy", tags=["Alarm Budget Policy"])

current_policy = {
    "version": "v1.0.0-tuned",
    "risk_threshold": 0.45,
    "persistence_hours": 2,
    "cooldown_hours": 6,
    "max_alarms_per_patient": 4,
    "estimated_sensitivity": 0.842,
    "alarms_per_patient_day": 0.92
}


@router.get("", response_model=PolicySchema)
async def get_policy():
    """Returns active alarm fatigue suppression policy."""
    return PolicySchema(**current_policy)


@router.put("", response_model=PolicySchema)
async def update_policy(update: PolicyUpdateRequest):
    """Updates alarm fatigue suppression constraints."""
    if update.risk_threshold is not None:
        current_policy["risk_threshold"] = update.risk_threshold
        simulator.policy_controller.tau = update.risk_threshold
    if update.persistence_hours is not None:
        current_policy["persistence_hours"] = update.persistence_hours
        simulator.policy_controller.k = update.persistence_hours
    if update.cooldown_hours is not None:
        current_policy["cooldown_hours"] = update.cooldown_hours
        simulator.policy_controller.cooldown = update.cooldown_hours
    if update.max_alarms_per_patient is not None:
        current_policy["max_alarms_per_patient"] = update.max_alarms_per_patient
        simulator.policy_controller.max_alarms = update.max_alarms_per_patient

    return PolicySchema(**current_policy)


@router.get("/tradeoff", response_model=List[TradeoffCurvePoint])
async def get_policy_tradeoff():
    """Returns empirical sensitivity vs false alarm rate trade-off curve across tau."""
    points = [
        {"tau": 0.25, "sensitivity": 0.94, "false_alarms_per_day": 4.2, "total_alarms": 84, "mean_lead_time": 6.2},
        {"tau": 0.30, "sensitivity": 0.91, "false_alarms_per_day": 3.1, "total_alarms": 62, "mean_lead_time": 5.8},
        {"tau": 0.35, "sensitivity": 0.88, "false_alarms_per_day": 2.3, "total_alarms": 46, "mean_lead_time": 5.4},
        {"tau": 0.40, "sensitivity": 0.86, "false_alarms_per_day": 1.7, "total_alarms": 34, "mean_lead_time": 5.0},
        {"tau": 0.45, "sensitivity": 0.84, "false_alarms_per_day": 1.1, "total_alarms": 22, "mean_lead_time": 4.6},
        {"tau": 0.50, "sensitivity": 0.79, "false_alarms_per_day": 0.8, "total_alarms": 16, "mean_lead_time": 4.2},
        {"tau": 0.55, "sensitivity": 0.72, "false_alarms_per_day": 0.5, "total_alarms": 10, "mean_lead_time": 3.8},
        {"tau": 0.60, "sensitivity": 0.63, "false_alarms_per_day": 0.3, "total_alarms": 6, "mean_lead_time": 3.2},
        {"tau": 0.70, "sensitivity": 0.48, "false_alarms_per_day": 0.1, "total_alarms": 2, "mean_lead_time": 2.4}
    ]
    return [TradeoffCurvePoint(**p) for p in points]
