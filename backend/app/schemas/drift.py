"""
Pydantic v2 Schemas for Population Stability and Distribution Drift Reports.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel


class KSStatItem(BaseModel):
    stat: float
    p_value: float


class DriftReportSchema(BaseModel):
    overall_status: str  # "green", "amber", "red"
    max_psi: float
    hospital_shift_detected: bool
    feature_psi: Dict[str, float]
    ks_stats: Dict[str, KSStatItem]
    sample_size: int
    shift_injected: bool
    updated_at: str


class InjectShiftRequest(BaseModel):
    inject: bool
