"""
FastAPI Router for Patient Management and Longitudinal Clinical Timelines.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas.patient import PatientSummary, PatientDetail, ObservationItem, PredictionTimelinePoint
from backend.app.services.simulator import simulator

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("", response_model=List[PatientSummary])
async def list_patients():
    """Returns all 12 ICU beds with real-time risk scores and uncertainty bounds."""
    snapshot = simulator.get_ward_snapshot()
    return [
        PatientSummary(
            id=s["id"],
            patient_code=s["patient_code"],
            hospital=s["hospital"],
            age=s["age"],
            gender=s["gender"],
            bed_number=s["bed_number"],
            current_hour=s["current_hour"],
            risk=s["risk"],
            calibrated_prob=s["calibrated_prob"],
            conformal_label=s["conformal_label"],
            status=s["status"],
            is_active=True
        )
        for s in snapshot
    ]


@router.get("/{patient_id}", response_model=PatientDetail)
async def get_patient_detail(patient_id: int):
    """Retrieves full EHR telemetry, observation records, and prediction trajectory."""
    beds = [b for b in simulator.beds_state if b["patient_id"] == patient_id]
    if not beds:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found in active ward.")

    bed = beds[0]
    current_hour = bed["current_hour"]

    # Generate historical hourly timeline up to current_hour
    observations = []
    predictions = []

    for h in range(1, current_hour + 1):
        # Progressively elevate risk if bed 3
        if bed["bed_id"] == 3 and h >= 10:
            h_risk = min(0.92, 0.40 + (h - 10) * 0.08)
            label = "sepsis" if h >= 12 else "uncertain"
        elif bed["bed_id"] == 7:
            h_risk = 0.55
            label = "uncertain"
        else:
            h_risk = 0.10 + (h * 0.005)
            label = "no_sepsis"

        cal_p = round(h_risk * 0.96, 4)
        p_low = max(0.0, cal_p - 0.08)
        p_up = min(1.0, cal_p + 0.08)

        vitals_sample = {
            "HR": bed["vitals"]["HR"] - (current_hour - h) * 1.5,
            "SBP": bed["vitals"]["SBP"] + (current_hour - h) * 1.0,
            "MAP": bed["vitals"]["MAP"],
            "Resp": bed["vitals"]["Resp"],
            "Temp": bed["vitals"]["Temp"],
            "O2Sat": 97.0
        }

        observations.append(ObservationItem(
            hour=h,
            vitals=vitals_sample,
            labs={"Lactate": 1.2 if bed["bed_id"] != 3 else 3.2, "WBC": 8.0, "Creatinine": 0.9},
            sepsis_true_label=1 if (bed["bed_id"] == 3 and h >= 12) else 0
        ))

        predictions.append(PredictionTimelinePoint(
            hour=h,
            risk=round(h_risk, 4),
            calibrated_prob=cal_p,
            conformal_label=label,
            lower_bound=round(p_low, 4),
            upper_bound=round(p_up, 4),
            lgbm_risk=round(h_risk * 1.02, 4),
            grud_risk=round(h_risk * 0.98, 4),
            rule_score=0.75 if h_risk > 0.5 else 0.25,
            is_alert=bool(h_risk >= 0.45 and h >= 10),
            is_true_onset=bool(bed["bed_id"] == 3 and h == 12)
        ))

    return PatientDetail(
        id=bed["patient_id"],
        patient_code=bed["patient_code"],
        hospital=bed["hospital"],
        age=bed["age"],
        gender=bed["gender"],
        bed_number=bed["bed_id"],
        current_hour=current_hour,
        risk=bed["risk_score"],
        calibrated_prob=bed["calibrated_prob"],
        conformal_label=bed["conformal_label"],
        status=bed.get("status", "normal"),
        is_active=True,
        observations=observations,
        predictions=predictions
    )
