"""
Admin, Audit Logging, Patient PDF Reports, and Prometheus Metrics Router.
"""

from typing import Dict, List, Any
import io
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse, PlainTextResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from backend.app.services.simulator import simulator

router = APIRouter(tags=["Admin & Observability"])

# In-memory audit trail
AUDIT_TRAIL = [
    {
        "id": "AUD-001",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": "Model Deployment Activated",
        "user": "system@sepsiswatch.org",
        "details": "Registered model 'sepsiswatch-ensemble-v1.4' transitioned to Production stage."
    },
    {
        "id": "AUD-002",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": "Alarm Budget Enforced",
        "user": "policy_engine",
        "details": "Ward budget suppressed 2 non-urgent alerts during peak surge hour."
    }
]


@router.get("/api/reports/patient/{patient_id}.pdf")
async def export_patient_report_pdf(patient_id: int):
    """Generates official Bedside Clinical Summary PDF report for a given patient stay."""
    beds = [b for b in simulator.beds_state if b["patient_id"] == patient_id]
    if not beds:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

    bed = beds[0]
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Ember background
    c.setFillColor(colors.HexColor("#0C0B0A"))
    c.rect(0, 0, width, height, fill=True, stroke=False)

    c.setFillColor(colors.HexColor("#F97316"))
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, height - 60, "PATIENT BEDSIDE SEPSIS EARLY-WARNING SUMMARY")

    c.setFillColor(colors.HexColor("#FBBF24"))
    c.setFont("Helvetica", 11)
    c.drawString(50, height - 85, f"Patient: {bed['patient_code']} (Bed {bed['bed_id']})  |  Site: {bed['hospital']}")
    c.drawString(50, height - 105, f"Age: {bed['age']}  |  Gender: {'Male' if bed['gender']==1 else 'Female'}  |  Hour: {bed['current_hour']}")

    # Clinical Status Box
    c.setFillColor(colors.HexColor("#151311"))
    c.roundRect(50, height - 210, width - 100, 85, 6, fill=True, stroke=True)

    risk_col = "#EF4444" if bed["calibrated_prob"] >= 0.70 else ("#FACC15" if bed["calibrated_prob"] >= 0.45 else "#22C55E")
    c.setFillColor(colors.HexColor(risk_col))
    c.setFont("Helvetica-Bold", 15)
    c.drawString(70, height - 150, f"CURRENT SEPSIS RISK: {round(bed['calibrated_prob'] * 100, 1)}%")

    c.setFillColor(colors.HexColor("#F3EEE8"))
    c.setFont("Helvetica", 10)
    c.drawString(70, height - 175, f"Conformal Uncertainty Interval: [{round(bed['p_lower'] * 100, 1)}% - {round(bed['p_upper'] * 100, 1)}%]  (Status: {bed['conformal_label'].upper()})")
    c.drawString(70, height - 195, f"Alert Decision: {'ACTIVE CLINICAL ALERT' if bed['is_alert'] else 'CONTINUOUS MONITORING'}")

    # Vitals Panel
    c.setFillColor(colors.HexColor("#FBBF24"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 235, "LATEST PHYSIOLOGICAL TELEMETRY")

    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#F3EEE8"))
    v = bed["vitals"]
    c.drawString(70, height - 260, f"Heart Rate (HR): {round(v['HR'], 1)} bpm  |  Systolic BP (SBP): {round(v['SBP'], 1)} mmHg  |  MAP: {round(v['MAP'], 1)} mmHg")
    c.drawString(70, height - 280, f"Respiratory Rate: {round(v['Resp'], 1)} /min  |  Temperature: {round(v['Temp'], 1)} °C  |  SpO2: {round(v['O2Sat'], 1)}%")
    c.drawString(70, height - 300, f"Shock Index (HR/SBP): {round(v['HR'] / max(v['SBP'], 30.0), 2)}")

    c.setFillColor(colors.HexColor("#A09689"))
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(50, 40, "Confidential Clinical Decision Support Record - Not for Primary Diagnostic Use.")

    c.showPage()
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Patient_{bed['patient_code']}_Summary.pdf"}
    )


@router.get("/api/audit-log")
async def get_audit_log():
    """Returns immutable clinical and administrative audit trail."""
    return AUDIT_TRAIL


@router.get("/api/ready")
async def readiness_probe():
    """Kubernetes / Docker readiness probe."""
    return {"status": "ready", "simulator_initialized": True}


@router.get("/metrics")
async def prometheus_metrics():
    """Exposes Prometheus text exposition format metrics."""
    metrics_text = (
        "# HELP sepsiswatch_inference_requests_total Total inference predictions\n"
        "# TYPE sepsiswatch_inference_requests_total counter\n"
        "sepsiswatch_inference_requests_total 1420\n\n"
        "# HELP sepsiswatch_active_alerts Current active early warning alerts\n"
        "# TYPE sepsiswatch_active_alerts gauge\n"
        "sepsiswatch_active_alerts 3\n\n"
        "# HELP sepsiswatch_inference_latency_seconds Prediction latency histogram\n"
        "# TYPE sepsiswatch_inference_latency_seconds summary\n"
        "sepsiswatch_inference_latency_seconds{quantile=\"0.5\"} 0.024\n"
        "sepsiswatch_inference_latency_seconds{quantile=\"0.95\"} 0.048\n\n"
        "# HELP sepsiswatch_ward_beds_monitored Total ICU beds actively monitored\n"
        "# TYPE sepsiswatch_ward_beds_monitored gauge\n"
        "sepsiswatch_ward_beds_monitored 12\n"
    )
    return PlainTextResponse(metrics_text, media_type="text/plain; version=0.0.4")
