"""
Pydantic v2 Schemas for Real-Time Inference, Counterfactual What-If, and Explainability.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    patient_id: Optional[str] = "patient_1"
    hospital: str = "setA"
    hour: int = 1
    vitals: Dict[str, Optional[float]] = Field(
        default_factory=lambda: {
            "HR": 85.0,
            "SBP": 120.0,
            "MAP": 85.0,
            "Resp": 16.0,
            "Temp": 37.0,
            "O2Sat": 98.0
        }
    )
    labs: Dict[str, Optional[float]] = Field(
        default_factory=lambda: {
            "Lactate": 1.2,
            "WBC": 7.5,
            "Creatinine": 0.9,
            "Platelets": 250.0
        }
    )
    demographics: Dict[str, Optional[float]] = Field(
        default_factory=lambda: {
            "Age": 65.0,
            "Gender": 1.0,
            "ICULOS": 1.0
        }
    )


class PredictResponse(BaseModel):
    calibrated_prob: float
    raw_ensemble_prob: float
    conformal_label: str  # "no_sepsis", "sepsis", "uncertain"
    prediction_set: List[int]
    lower_bound: float
    upper_bound: float
    lgbm_prob: float
    grud_prob: float
    sirs_score: float
    qsofa_score: float
    is_alert: bool
    alert_severity: str  # "low", "moderate", "high", "critical"
    alert_message: str


class WhatIfRequest(BaseModel):
    patient_id: Optional[str] = None
    hour: int = 4
    baseline_vitals: Dict[str, float]
    modified_vitals: Dict[str, float]
    hospital: str = "setA"


class WhatIfResponse(BaseModel):
    original_risk: float
    modified_risk: float
    risk_diff: float
    original_conformal: str
    modified_conformal: str
    primary_driver: str
    clinical_interpretation: str


class TopFeatureItem(BaseModel):
    feature: str
    weight: float
    value: float
    direction: str  # "increases_risk", "decreases_risk"
    description: Optional[str] = None


class ExplanationResponse(BaseModel):
    method: str  # "shap", "integrated_gradients"
    calibrated_risk: float
    conformal_label: str
    top_features: List[TopFeatureItem]
    plain_english_text: str
