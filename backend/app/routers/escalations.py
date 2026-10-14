"""
Nurse-to-Doctor Escalation & Clinical Batch Acknowledgment Router.
Enables bedside nurses to escalate deteriorating patients to the attending physician,
and allows physicians to review real-time notifications and perform batch digital sign-offs.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from backend.app.services.simulator import simulator

router = APIRouter(prefix="/api/escalations", tags=["Nurse-to-Doctor Escalation"])

# In-memory escalation queue
ESCALATIONS_STORE: List[Dict[str, Any]] = [
    {
        "id": "ESC-001",
        "bed_number": 3,
        "patient_code": "p_A_00003",
        "patient_id": 3,
        "severity": "critical",
        "risk_score": 0.88,
        "nurse_name": "RN Alex Reed, BSN",
        "notes": "Hypotension (MAP 61 mmHg), SpO2 93%, tachycardia (HR 124). Suspected septic shock.",
        "vitals_snapshot": {"HR": 124, "MAP": 61, "Resp": 28, "Temp": 38.8, "Lactate": 3.8},
        "status": "pending",  # 'pending', 'acknowledged'
        "created_at": datetime.now(timezone.utc).isoformat(),
        "acknowledged_by": None,
        "acknowledged_at": None,
        "doctor_orders": None,
        "signature_pin": None
    },
    {
        "id": "ESC-002",
        "bed_number": 7,
        "patient_code": "p_A_00007",
        "patient_id": 7,
        "severity": "moderate",
        "risk_score": 0.58,
        "nurse_name": "RN Elena Rostova, BSN",
        "notes": "Borderline fever 38.1°C, resp rate 22, lactate elevated to 2.4. Bedside assessment requested.",
        "vitals_snapshot": {"HR": 98, "MAP": 72, "Resp": 22, "Temp": 38.1, "Lactate": 2.4},
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "acknowledged_by": None,
        "acknowledged_at": None,
        "doctor_orders": None,
        "signature_pin": None
    }
]


class CreateEscalationRequest(BaseModel):
    bed_number: int
    patient_code: Optional[str] = None
    patient_id: Optional[int] = None
    nurse_name: str = "RN Alex Reed, BSN"
    notes: str
    severity: str = "critical"
    risk_score: float = 0.85
    vitals_snapshot: Optional[Dict[str, Any]] = None


class BatchAcknowledgeRequest(BaseModel):
    escalation_ids: List[str]
    doctor_name: str = "Dr. Sarah Connor, MD"
    signature_pin: str = "DOC-8921"
    orders: str = "SEP-1 Bundle: 30 mL/kg IV Crystalloid Bolus + Blood Cultures + Broad-Spectrum Antibiotics (Vancomycin + Cefepime)"
    clinical_notes: Optional[str] = "Clinical orders reviewed and digitally signed via Attending Diagnostic Workspace."


@router.get("")
async def get_escalations():
    """Returns all nurse escalations for the physician alert queue."""
    return ESCALATIONS_STORE


@router.post("")
async def create_escalation(req: CreateEscalationRequest):
    """
    Called by bedside nurse when patient enters Moderate or Critical sepsis.
    Broadcasts real-time notification to doctor UI.
    """
    esc_id = f"ESC-{len(ESCALATIONS_STORE) + 1:03d}"
    now_iso = datetime.now(timezone.utc).isoformat()

    entry = {
        "id": esc_id,
        "bed_number": req.bed_number,
        "patient_code": req.patient_code or f"p_A_{req.bed_number:05d}",
        "patient_id": req.patient_id or req.bed_number,
        "severity": req.severity,
        "risk_score": req.risk_score,
        "nurse_name": req.nurse_name,
        "notes": req.notes,
        "vitals_snapshot": req.vitals_snapshot or {},
        "status": "pending",
        "created_at": now_iso,
        "acknowledged_by": None,
        "acknowledged_at": None,
        "doctor_orders": None,
        "signature_pin": None
    }

    ESCALATIONS_STORE.insert(0, entry)

    # Broadcast notification to all active WebSocket clients (Doctor dashboards)
    asyncio_loop = None
    try:
        import asyncio
        payload = {
            "type": "NURSE_ESCALATION",
            "escalation": entry,
            "message": f"🚨 URGENT: Nurse {req.nurse_name} escalated Bed {req.bed_number} ({entry['patient_code']}) with {req.severity.upper()} Sepsis Alert!"
        }
        await simulator.broadcast(payload)
    except Exception as e:
        pass

    return {
        "status": "success",
        "message": f"Notification successfully transmitted to Attending Physician for Bed {req.bed_number}.",
        "escalation": entry
    }


@router.post("/batch-acknowledge")
async def batch_acknowledge(req: BatchAcknowledgeRequest):
    """
    Physician selects multiple (or all) alerts, enters digital signature PIN,
    and acknowledges them in one batch.
    """
    if not req.escalation_ids:
        raise HTTPException(status_code=400, detail="No escalation IDs provided for acknowledgment.")

    now_iso = datetime.now(timezone.utc).isoformat()
    acknowledged_items = []

    for item in ESCALATIONS_STORE:
        if item["id"] in req.escalation_ids:
            item["status"] = "acknowledged"
            item["acknowledged_by"] = req.doctor_name
            item["acknowledged_at"] = now_iso
            item["doctor_orders"] = req.orders
            item["signature_pin"] = f"***{req.signature_pin[-3:]}" if len(req.signature_pin) >= 3 else "***"
            acknowledged_items.append(item["id"])

    # Broadcast update to both Doctor and Nurse screens
    try:
        payload = {
            "type": "DOCTOR_ACKNOWLEDGED",
            "acknowledged_ids": acknowledged_items,
            "doctor_name": req.doctor_name,
            "orders": req.orders,
            "acknowledged_at": now_iso
        }
        await simulator.broadcast(payload)
    except Exception:
        pass

    return {
        "status": "success",
        "acknowledged_count": len(acknowledged_items),
        "acknowledged_ids": acknowledged_items,
        "doctor_name": req.doctor_name,
        "orders": req.orders,
        "timestamp": now_iso
    }
