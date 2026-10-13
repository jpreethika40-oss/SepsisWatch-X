"""
Incident Replay & Shift Handover Briefing Router.
Provides case audits for late/missed cases, shift handover briefing generation, and PDF export.
"""

from typing import Dict, List, Any, Optional
import io
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from backend.ml.incident_replay import IncidentReplayEngine
from backend.ml.handover import HandoverBriefingGenerator
from backend.app.services.simulator import simulator

router = APIRouter(prefix="/api", tags=["Incident Replay & Shift Handover"])

# Sample audit incidents
INCIDENTS_CATALOG = [
    {
        "incident_id": "INC-2026-001",
        "patient_id": 3,
        "title": "Severe Septic Shock Progression (Bed 3)",
        "actual_onset_hour": 14,
        "outcome": "Resuscitated & Stabilized",
        "severity": "Critical"
    },
    {
        "incident_id": "INC-2026-002",
        "patient_id": 7,
        "title": "Occult Inflammatory Response with Delayed Fever (Bed 7)",
        "actual_onset_hour": 18,
        "outcome": "Resolved without Shock",
        "severity": "Watch"
    }
]

HANDOVER_CACHE: Dict[str, Dict[str, Any]] = {}


class GenerateHandoverRequest(BaseModel):
    shift_name: str = "Evening to Night Shift Transition"
    nurse_supervisor: str = "Dr. J. Preethika, MD (Lead Intensivist)"


@router.get("/incidents")
async def list_incidents():
    """Returns catalog of historical late or complex sepsis cases available for forensic replay."""
    return INCIDENTS_CATALOG


@router.get("/incidents/{incident_id}/replay")
async def replay_incident(incident_id: str):
    """Replays hourly physiological and model sequence for a designated clinical case."""
    inc = next((i for i in INCIDENTS_CATALOG if i["incident_id"] == incident_id), None)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    # Reconstruct hourly timeline
    timeline = []
    onset_h = inc["actual_onset_hour"]
    for h in range(1, onset_h + 4):
        risk = min(0.92, 0.15 + (h / onset_h) * 0.70)
        timeline.append({
            "hour": h,
            "calibrated_prob": round(risk, 3),
            "alert_dispatched": bool(risk >= 0.45 and h >= onset_h - 4),
            "budget_suppressed": bool(h == onset_h - 5),
            "trust_score": 82.0,
            "top_feature": "MAP_velocity_6h" if h >= onset_h - 2 else "ShockIndex"
        })

    audit_summary = IncidentReplayEngine.audit_patient_case(timeline, actual_onset_hour=onset_h)
    return {
        "incident": inc,
        "audit_summary": audit_summary
    }


@router.get("/handover/latest")
async def get_latest_handover():
    """Returns the most recently compiled shift handover briefing."""
    if HANDOVER_CACHE:
        return list(HANDOVER_CACHE.values())[-1]

    snapshot = simulator.get_ward_snapshot()
    ward_pts = [
        {
            "patient_id": str(s["id"]),
            "bed_id": s["bed_number"],
            "current_risk": s["calibrated_prob"],
            "risk_velocity": 0.05 if s["id"] == 3 else 0.0,
            "has_active_alert": s["calibrated_prob"] >= 0.45,
            "trust_score": 85.0
        }
        for s in snapshot
    ]
    hnd = HandoverBriefingGenerator.generate_shift_handover(ward_pts)
    HANDOVER_CACHE[hnd["handover_id"]] = hnd
    return hnd


@router.post("/handover/generate")
async def generate_handover(req: GenerateHandoverRequest):
    """Synthesizes live ward state into an official clinical shift briefing."""
    snapshot = simulator.get_ward_snapshot()
    ward_pts = [
        {
            "patient_id": str(s["id"]),
            "bed_id": s["bed_number"],
            "current_risk": s["calibrated_prob"],
            "risk_velocity": 0.06 if s["id"] == 3 else (0.02 if s["id"] == 7 else -0.01),
            "has_active_alert": s["calibrated_prob"] >= 0.45,
            "trust_score": 86.0
        }
        for s in snapshot
    ]
    hnd = HandoverBriefingGenerator.generate_shift_handover(
        ward_pts,
        shift_name=req.shift_name,
        nurse_supervisor=req.nurse_supervisor
    )
    HANDOVER_CACHE[hnd["handover_id"]] = hnd
    return hnd


@router.get("/handover/{handover_id}.pdf")
async def export_handover_pdf(handover_id: str):
    """Generates formatted clinical shift handover PDF briefing."""
    hnd = HANDOVER_CACHE.get(handover_id, await get_latest_handover())

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Ember background
    c.setFillColor(colors.HexColor("#0C0B0A"))
    c.rect(0, 0, width, height, fill=True, stroke=False)

    c.setFillColor(colors.HexColor("#F97316"))
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, height - 60, "ICU CLINICAL SHIFT HANDOVER BRIEFING")

    c.setFillColor(colors.HexColor("#FBBF24"))
    c.setFont("Helvetica", 11)
    c.drawString(50, height - 85, f"Shift: {hnd.get('shift_name', 'ICU Shift Handover')}")
    c.drawString(50, height - 105, f"Supervisor: {hnd.get('clinician', 'Dr. J. Preethika, MD')}  |  ID: {handover_id}")

    # Narrative panel
    c.setFillColor(colors.HexColor("#151311"))
    c.roundRect(50, height - 210, width - 100, 85, 6, fill=True, stroke=True)

    c.setFillColor(colors.HexColor("#F3EEE8"))
    c.setFont("Helvetica", 9)
    y_text = height - 145
    narrative = hnd.get("narrative_summary", "")
    for line in narrative.split(". "):
        if line.strip():
            c.drawString(65, y_text, line.strip() + ".")
            y_text -= 16

    # Acuity census
    c.setFillColor(colors.HexColor("#FBBF24"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 235, "WARD CENSUS & PRIORITY ESCALATIONS")

    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#F3EEE8"))
    counts = hnd.get("census_counts", {})
    c.drawString(70, height - 260, f"Total Beds: {counts.get('total_patients', 12)}  |  Critical: {counts.get('critical', 1)}  |  Watch: {counts.get('watch', 2)}  |  Stable: {counts.get('stable', 9)}")

    y_pos = height - 290
    c.setFillColor(colors.HexColor("#EF4444"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(70, y_pos, "Accelerating Risk Patients:")
    y_pos -= 20

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#F3EEE8"))
    for rp in hnd.get("rising_patients", [])[:4]:
        c.drawString(85, y_pos, f"• {rp['bed_id']} (Pt {rp['patient_id']}): Risk {rp['current_risk']} (+{rp['velocity_per_hr']}/hr) - Trust: {rp['trust_score']}%")
        y_pos -= 18

    c.showPage()
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Handover_{handover_id}.pdf"}
    )
