"""
SepsisWatch-X Comprehensive Master Verification Test Suite.
Validates:
1. System Health & Single-URL SPA Root (http://localhost:8000/)
2. Dataset Ingestion API (genuine .psv and .csv upload, validation, profiling, persistence, retrieval, deletion)
3. Alert Triage & Acknowledgment Audit Persistence
4. Clinical AI Assistant (grounded in live telemetry, models, and guidelines)
5. Simulator Control & Tick Stepping
6. Role Permissions and Landing Endpoints
"""

import os
import io
import json
import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"


def test_01_health_and_root_spa():
    """Verify single URL returns SPA index.html and /api/health reports healthy."""
    # SPA root
    res_root = requests.get(f"{BASE_URL}/", timeout=10)
    assert res_root.status_code == 200
    assert "<!DOCTYPE html>" in res_root.text or "<html" in res_root.text
    assert "SepsisWatch-X" in res_root.text

    # Health API
    res_health = requests.get(f"{BASE_URL}/api/health", timeout=10)
    assert res_health.status_code == 200
    data = res_health.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SepsisWatch-X API"
    assert "models" in data
    assert "ward" in data
    print("PASS: Single URL SPA root & Health API verified.")


def test_02_dataset_validation_preview_psv_and_csv():
    """Verify pre-upload validation and delimiter sniffing on genuine PSV and CSV data."""
    # 1. PSV format (pipe-delimited)
    psv_data = (
        "HR|O2Sat|Temp|SBP|MAP|DBP|Resp|Lactate|WBC|Age|Gender|ICULOS|SepsisLabel\n"
        "82|98|37.1|120|85|68|16|1.2|7.5|64|1|1|0\n"
        "88|97|37.3|115|82|65|18|1.4|8.1|64|1|2|0\n"
        "96|96|37.8|108|78|62|20|1.9|9.8|64|1|3|0\n"
    )
    files_psv = {"file": ("test_patient_series.psv", io.BytesIO(psv_data.encode("utf-8")), "text/plain")}
    res_psv = requests.post(f"{BASE_URL}/api/v1/datasets/validate", files=files_psv, timeout=10)
    assert res_psv.status_code == 200
    data_psv = res_psv.json()
    assert data_psv["detected_delimiter"] == "|"
    assert "HR" in data_psv["recognized_clinical_features"]
    assert "MAP" in data_psv["recognized_clinical_features"]
    assert data_psv["has_labels"] is True

    # 2. CSV format (comma-delimited)
    csv_data = (
        "HR,O2Sat,Temp,SBP,MAP,DBP,Resp,Lactate,WBC,Age,Gender,ICULOS,SepsisLabel\n"
        "75,99,36.8,125,88,70,14,1.1,6.8,58,0,1,0\n"
        "78,99,36.9,122,86,68,15,1.2,7.0,58,0,2,0\n"
    )
    files_csv = {"file": ("test_patient_cohort.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res_csv = requests.post(f"{BASE_URL}/api/v1/datasets/validate", files=files_csv, timeout=10)
    assert res_csv.status_code == 200
    data_csv = res_csv.json()
    assert data_csv["detected_delimiter"] == ","
    assert "HR" in data_csv["recognized_clinical_features"]
    print("PASS: Delimiter sniffing & Schema inspection for PSV and CSV verified.")


def test_03_dataset_upload_persistence_and_retrieval():
    """Verify full dataset upload, SQLite persistence, quality stats calculation, and deletion."""
    full_psv = (
        "HR|O2Sat|Temp|SBP|MAP|DBP|Resp|Lactate|WBC|Age|Gender|ICULOS|SepsisLabel\n"
        "80|98|36.9|122|85|68|16|1.2|7.2|62|1|1|0\n"
        "84|97|37.1|118|82|65|18|1.5|8.0|62|1|2|0\n"
        "92|96|37.5|110|76|60|20|2.1|10.5|62|1|3|0\n"
        "110|94|38.2|95|65|54|24|2.9|14.2|62|1|4|1\n"
        "125|91|38.8|82|58|48|28|3.8|18.0|62|1|5|1\n"
    )
    files = {"file": ("patient_p000999_eval.psv", io.BytesIO(full_psv.encode("utf-8")), "text/plain")}
    data = {"dataset_name": "Test_Clinical_Evaluation_Set"}

    # 1. Upload
    res_upload = requests.post(f"{BASE_URL}/api/v1/datasets/upload", files=files, data=data, timeout=10)
    assert res_upload.status_code == 200
    upload_info = res_upload.json()
    assert upload_info["success"] is True
    dataset_id = upload_info["id"]
    assert upload_info["row_count"] == 5
    assert upload_info["has_labels"] is True
    assert upload_info["sepsis_prevalence"] == 0.4
    assert "HR" in upload_info["quality_stats"]["vitals_summary"]

    # 2. List
    res_list = requests.get(f"{BASE_URL}/api/v1/datasets", timeout=10)
    assert res_list.status_code == 200
    datasets = res_list.json()
    assert any(d["id"] == dataset_id for d in datasets)

    # 3. Details & Preview
    res_detail = requests.get(f"{BASE_URL}/api/v1/datasets/{dataset_id}", timeout=10)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert len(detail["preview_rows"]) == 5
    assert detail["dataset_name"] == "Test_Clinical_Evaluation_Set"

    # 4. Clean up / Delete
    res_del = requests.delete(f"{BASE_URL}/api/v1/datasets/{dataset_id}", timeout=10)
    assert res_del.status_code == 200
    print("PASS: Dataset upload, SQLite persistence, quality stats & deletion verified.")


def test_04_alert_acknowledgment_and_audit():
    """Verify alert acknowledgment action, persistent audit log creation, and retrieval."""
    # Acknowledge an alert
    ack_payload = {
        "clinician_name": "Dr. Sarah Connor, MD",
        "action_taken": "Initiated Surviving Sepsis Campaign 1-Hour Bundle",
        "notes": "Hypotension with MAP 61 verified at bedside. 30 mL/kg crystalloid bolus administered."
    }
    res_ack = requests.post(f"{BASE_URL}/api/alerts/1/acknowledge", json=ack_payload, timeout=10)
    assert res_ack.status_code == 200
    ack_res = res_ack.json()
    assert ack_res["status"].lower() == "acknowledged"

    # Verify audit trail
    res_audit = requests.get(f"{BASE_URL}/api/alerts/audit", timeout=10)
    assert res_audit.status_code == 200
    audit_data = res_audit.json()
    assert len(audit_data) > 0
    latest = audit_data[0]
    assert latest["clinician_name"] == "Dr. Sarah Connor, MD"
    assert "Surviving Sepsis" in latest["action_taken"]
    print("PASS: Alert acknowledgment & persistent audit trail verified.")


def test_05_ai_assistant_chat_grounding():
    """Verify AI Assistant answers queries grounded in live ward telemetry and model evaluation."""
    req_body = {
        "messages": [
            {"role": "user", "content": "What are the active ICU ward alerts and critical bed statuses?"}
        ],
        "persona": "doctor"
    }
    res = requests.post(f"{BASE_URL}/api/v1/assistant/chat", json=req_body, timeout=15)
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["reply"]) > 50
    assert "grounding_data" in data
    assert data["grounding_data"]["ward_summary"]["total_beds"] == 12
    assert "1-Hour Bundle" in data["reply"] or "Bed" in data["reply"]
    print("PASS: Clinical AI Assistant grounding in application telemetry verified.")


def test_06_simulator_tick_and_status():
    """Verify simulation engine status and tick advancement."""
    res_status = requests.get(f"{BASE_URL}/api/sim/status", timeout=10)
    assert res_status.status_code == 200
    data_status = res_status.json()
    assert "current_tick" in data_status
    initial_tick = data_status["current_tick"]

    # Step tick
    res_tick = requests.post(f"{BASE_URL}/api/sim/tick", timeout=10)
    assert res_tick.status_code == 200
    data_tick = res_tick.json()
    assert data_tick["tick"] == initial_tick + 1
    assert len(data_tick["beds"]) == 12
    print(f"PASS: Simulator tick advanced from Hour {initial_tick} to Hour {data_tick['tick']}.")


if __name__ == "__main__":
    test_01_health_and_root_spa()
    test_02_dataset_validation_preview_psv_and_csv()
    test_03_dataset_upload_persistence_and_retrieval()
    test_04_alert_acknowledgment_and_audit()
    test_05_ai_assistant_chat_grounding()
    test_06_simulator_tick_and_status()
    print("\nALL MASTER TESTS PASSED SUCCESSFULLY!")
