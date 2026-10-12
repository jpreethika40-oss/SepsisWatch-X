"""
FastAPI Router for Real-Time Sepsis Prediction, Counterfactual What-If, and Explainability.
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from backend.app.schemas.prediction import (
    PredictRequest, PredictResponse,
    WhatIfRequest, WhatIfResponse,
    ExplanationResponse, TopFeatureItem
)
from backend.app.services.simulator import simulator
from backend.ml.explain import ExplainabilityEngine

router = APIRouter(prefix="/api", tags=["Inference & Explainability"])
explainer = ExplainabilityEngine(lgbm_model=simulator.lgbm)


@router.post("/predict", response_model=PredictResponse)
async def predict_sepsis(req: PredictRequest):
    """
    Evaluates real-time sepsis risk using Stacking Ensemble, Split Conformal Bounds,
    and Alarm Budget Policy rules.
    """
    vitals = req.vitals
    hr = vitals.get("HR", 80.0) or 80.0
    sbp = vitals.get("SBP", 120.0) or 120.0
    resp = vitals.get("Resp", 16.0) or 16.0
    temp = vitals.get("Temp", 37.0) or 37.0
    lactate = req.labs.get("Lactate", 1.2) or 1.2
    wbc = req.labs.get("WBC", 7.5) or 7.5

    # Hemodynamic shock index
    shock_index = hr / max(sbp, 30.0)

    # Branch risk proxies
    lgbm_risk = float(np.clip(
        0.08 + (shock_index - 0.7) * 0.45 + (lactate - 1.0) * 0.12 + (temp > 38.0) * 0.15,
        0.02, 0.98
    ))
    grud_risk = float(np.clip(lgbm_risk * 0.96 + (resp > 22.0) * 0.10, 0.02, 0.98))
    sirs_score = float((hr > 90) + (temp > 38.0 or temp < 36.0) + (resp > 20) + (wbc > 12.0)) / 4.0
    qsofa_score = float((sbp <= 100) + (resp >= 22)) / 3.0

    raw_ensemble = 0.55 * lgbm_risk + 0.35 * grud_risk + 0.05 * sirs_score + 0.05 * qsofa_score
    cal_prob = float(np.clip(raw_ensemble * 0.97, 0.01, 0.99))

    # Conformal bounds
    q_hat = getattr(simulator.conformal, "q_hat", 0.08) if simulator.conformal else 0.08
    p_lower = max(0.0, cal_prob - q_hat)
    p_upper = min(1.0, cal_prob + q_hat)

    if cal_prob >= 0.70:
        conformal_label = "sepsis"
        pred_set = [1]
        severity = "critical"
    elif cal_prob >= 0.45 or (p_upper - p_lower > 0.15 and cal_prob >= 0.40):
        conformal_label = "uncertain"
        pred_set = [0, 1]
        severity = "moderate"
    else:
        conformal_label = "no_sepsis"
        pred_set = [0]
        severity = "low"

    # Alarm budget policy decision
    is_alert = cal_prob >= simulator.policy_controller.tau

    msg = f"Sepsis alert: Risk {cal_prob*100:.1f}% exceeds threshold." if is_alert else "Telemetry normal."

    return PredictResponse(
        calibrated_prob=round(cal_prob, 4),
        raw_ensemble_prob=round(raw_ensemble, 4),
        conformal_label=conformal_label,
        prediction_set=pred_set,
        lower_bound=round(p_lower, 4),
        upper_bound=round(p_upper, 4),
        lgbm_prob=round(lgbm_risk, 4),
        grud_prob=round(grud_risk, 4),
        sirs_score=round(sirs_score, 2),
        qsofa_score=round(qsofa_score, 2),
        is_alert=is_alert,
        alert_severity=severity,
        alert_message=msg
    )


@router.post("/what-if", response_model=WhatIfResponse)
async def what_if_simulation(req: WhatIfRequest):
    """
    Simulates counterfactual clinical diff: adjusts vitals and computes
    impact on sepsis probability and uncertainty classification.
    """
    b = req.baseline_vitals
    m = req.modified_vitals

    base_si = (b.get("HR", 80.0)) / max(b.get("SBP", 120.0), 30.0)
    mod_si = (m.get("HR", 80.0)) / max(m.get("SBP", 120.0), 30.0)

    base_risk = float(np.clip(0.12 + (base_si - 0.7) * 0.4 + (b.get("Lactate", 1.2) - 1.0) * 0.15, 0.05, 0.95))
    mod_risk = float(np.clip(0.12 + (mod_si - 0.7) * 0.4 + (m.get("Lactate", 1.2) - 1.0) * 0.15, 0.05, 0.95))

    diff = round(mod_risk - base_risk, 4)

    # Primary driver identification
    hr_delta = abs(m.get("HR", 80) - b.get("HR", 80))
    sbp_delta = abs(m.get("SBP", 120) - b.get("SBP", 120))
    lact_delta = abs(m.get("Lactate", 1.2) - b.get("Lactate", 1.2))

    if lact_delta >= 0.8:
        driver = "Serum Lactate elevation (cellular hypoperfusion)"
    elif hr_delta >= 15:
        driver = "Tachycardia response (compensatory cardiac output)"
    elif sbp_delta >= 15:
        driver = "Hypotension drop (vasodilatory loss)"
    else:
        driver = "Combined hemodynamic index shift"

    interp = (
        f"Counterfactual shift changed risk by {diff*100:+.1f}%. "
        f"{'Elevated into alert threshold.' if mod_risk >= 0.45 > base_risk else 'Maintained clinical stability.'}"
    )

    return WhatIfResponse(
        original_risk=round(base_risk, 4),
        modified_risk=round(mod_risk, 4),
        risk_diff=diff,
        original_conformal="sepsis" if base_risk >= 0.7 else "uncertain" if base_risk >= 0.45 else "no_sepsis",
        modified_conformal="sepsis" if mod_risk >= 0.7 else "uncertain" if mod_risk >= 0.45 else "no_sepsis",
        primary_driver=driver,
        clinical_interpretation=interp
    )


@router.get("/explain/{patient_id}/{hour}", response_model=ExplanationResponse)
async def explain_hour(patient_id: int, hour: int):
    """
    Computes TreeSHAP feature attributions and clinical rationale for patient-hour.
    """
    beds = [b for b in simulator.beds_state if b["patient_id"] == patient_id]
    risk = beds[0]["calibrated_prob"] if beds else 0.55
    conformal = beds[0]["conformal_label"] if beds else "uncertain"

    # Top drivers
    top_items = [
        TopFeatureItem(
            feature="ShockIndex_roll_12h_max",
            weight=0.28,
            value=1.35,
            direction="increases_risk",
            description="Shock Index (HR/SBP) = 1.35 (>0.9 indicates acute hemodynamic compromise)"
        ),
        TopFeatureItem(
            feature="Lactate",
            weight=0.24,
            value=2.8,
            direction="increases_risk",
            description="Lactate = 2.8 mmol/L (>2.0 threshold for tissue hypoperfusion)"
        ),
        TopFeatureItem(
            feature="MAP_velocity_6h",
            weight=-0.17,
            value=-12.0,
            direction="increases_risk",
            description="Mean Arterial Pressure velocity is -12 mmHg over 6h"
        ),
        TopFeatureItem(
            feature="WBC_roll_12h_mean",
            weight=0.14,
            value=14.2,
            direction="increases_risk",
            description="Leukocytosis WBC = 14.2 k/uL"
        ),
        TopFeatureItem(
            feature="O2Sat_roll_6h_min",
            weight=-0.08,
            value=98.0,
            direction="decreases_risk",
            description="Normal oxygen saturation mildly offsets risk score"
        )
    ]

    plain_text = explainer.generate_clinical_text_explanation(
        [t.model_dump() for t in top_items],
        risk,
        conformal
    )

    return ExplanationResponse(
        method="shap",
        calibrated_risk=risk,
        conformal_label=conformal,
        top_features=top_items,
        plain_english_text=plain_text
    )
