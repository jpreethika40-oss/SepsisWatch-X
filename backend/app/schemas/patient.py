"""
Pydantic v2 Schemas for Patient Management and Clinical Timelines.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class PatientBase(BaseModel):
    patient_code: str
    hospital: str = "setA"
    age: float = 65.0
    gender: int = 1
    unit1: Optional[int] = 1
    unit2: Optional[int] = 0
    hosp_adm_time: Optional[float] = -12.0
    bed_number: int = 1


class PatientSummary(PatientBase):
    id: int
    is_active: bool = True
    current_hour: int = 4
    risk: float = 0.12
    calibrated_prob: float = 0.11
    conformal_label: str = "no_sepsis"
    status: str = "normal"  # normal, caution, critical
    diagnosis: Optional[str] = "ICU Inpatient"
    active_treatments: Optional[str] = "Standard Monitoring"
    vitals: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class ObservationItem(BaseModel):
    hour: int
    vitals: Dict[str, Optional[float]]
    labs: Dict[str, Optional[float]]
    sepsis_true_label: int = 0


class PredictionTimelinePoint(BaseModel):
    hour: int
    risk: float
    calibrated_prob: float
    conformal_label: str  # no_sepsis, sepsis, uncertain
    lower_bound: float
    upper_bound: float
    lgbm_risk: float
    grud_risk: float
    rule_score: float
    is_alert: bool
    is_true_onset: bool


class PatientDetail(PatientSummary):
    observations: List[ObservationItem] = []
    predictions: List[PredictionTimelinePoint] = []
