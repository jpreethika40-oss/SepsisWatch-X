"""
Pydantic v2 Schemas for Alarm Budget Policy and Trade-Off Optimization.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class PolicySchema(BaseModel):
    version: str = "v1.0.0-tuned"
    risk_threshold: float = Field(0.45, ge=0.0, le=1.0)
    persistence_hours: int = Field(2, ge=1, le=12)
    cooldown_hours: int = Field(6, ge=0, le=24)
    max_alarms_per_patient: int = Field(4, ge=1, le=20)
    estimated_sensitivity: float = 0.84
    alarms_per_patient_day: float = 0.92


class PolicyUpdateRequest(BaseModel):
    risk_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    persistence_hours: Optional[int] = Field(None, ge=1, le=12)
    cooldown_hours: Optional[int] = Field(None, ge=0, le=24)
    max_alarms_per_patient: Optional[int] = Field(None, ge=1, le=20)


class TradeoffCurvePoint(BaseModel):
    tau: float
    sensitivity: float
    false_alarms_per_day: float
    total_alarms: int
    mean_lead_time: float
