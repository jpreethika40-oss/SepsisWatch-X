"""
Unit and Integration Tests for SepsisWatch-X FastAPI Endpoints:
- Healthcheck & Provenance
- 12-Bed Patients Listing & Longitudinal Timelines
- Live Inference (/api/predict) with Conformal Bounds
- Counterfactual Simulation (/api/what-if)
- Clinical Explainability (/api/explain)
- Alarm Budget Policy (/api/policy)
- Data Drift Monitoring (/api/drift)
- Cross-Hospital Scoreboard (/api/scoreboard)
- Simulation Tick & Ward Streaming
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SepsisWatch-X API"
    assert "models" in data
    assert data["ward"]["active_beds"] == 12


def test_list_patients():
    response = client.get("/api/patients")
    assert response.status_code == 200
    patients = response.json()
    assert len(patients) == 12
    for p in patients:
        assert "bed_number" in p
        assert "risk" in p
        assert "calibrated_prob" in p
        assert p["conformal_label"] in {"no_sepsis", "sepsis", "uncertain"}


def test_get_patient_detail():
    response = client.get("/api/patients/1")
    assert response.status_code == 200
    detail = response.json()
    assert detail["id"] == 1
    assert "observations" in detail
    assert "predictions" in detail
    assert len(detail["predictions"]) > 0


def test_predict_endpoint():
    payload = {
        "patient_id": "test_pt_1",
        "hospital": "setA",
        "hour": 4,
        "vitals": {
            "HR": 124.0,
            "SBP": 88.0,
            "MAP": 62.0,
            "Resp": 26.0,
            "Temp": 38.6,
            "O2Sat": 94.0
        },
        "labs": {
            "Lactate": 3.4,
            "WBC": 16.2
        }
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["calibrated_prob"] <= 1.0
    assert data["conformal_label"] in {"no_sepsis", "sepsis", "uncertain"}
    assert data["lower_bound"] <= data["calibrated_prob"] <= data["upper_bound"]
    assert "is_alert" in data
    assert data["is_alert"] is True  # Critical vitals should trigger alert


def test_what_if_endpoint():
    payload = {
        "patient_id": "test_pt_1",
        "hour": 4,
        "baseline_vitals": {
            "HR": 75.0,
            "SBP": 120.0,
            "Lactate": 1.1
        },
        "modified_vitals": {
            "HR": 120.0,
            "SBP": 85.0,
            "Lactate": 3.2
        },
        "hospital": "setA"
    }
    response = client.post("/api/what-if", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["modified_risk"] > data["original_risk"]
    assert data["risk_diff"] > 0
    assert "primary_driver" in data


def test_explain_endpoint():
    response = client.get("/api/explain/3/10")
    assert response.status_code == 200
    data = response.json()
    assert data["method"] == "shap"
    assert len(data["top_features"]) > 0
    assert len(data["plain_english_text"]) > 10


def test_policy_endpoints():
    # GET policy
    res_get = client.get("/api/policy")
    assert res_get.status_code == 200
    pol = res_get.json()
    assert pol["risk_threshold"] == 0.45

    # PUT policy
    res_put = client.put("/api/policy", json={"risk_threshold": 0.48, "cooldown_hours": 8})
    assert res_put.status_code == 200
    updated = res_put.json()
    assert updated["risk_threshold"] == 0.48
    assert updated["cooldown_hours"] == 8

    # Reset
    client.put("/api/policy", json={"risk_threshold": 0.45, "cooldown_hours": 6})

    # GET tradeoff
    res_trade = client.get("/api/policy/tradeoff")
    assert res_trade.status_code == 200
    curve = res_trade.json()
    assert len(curve) > 0
    assert "sensitivity" in curve[0]


def test_drift_endpoints():
    # GET drift
    res_drift = client.get("/api/drift")
    assert res_drift.status_code == 200
    data = res_drift.json()
    assert data["overall_status"] in {"green", "amber", "red"}
    assert "HR" in data["feature_psi"]

    # Inject shift
    res_inj = client.post("/api/drift/inject", json={"inject": True})
    assert res_inj.status_code == 200
    data_inj = res_inj.json()
    assert data_inj["shift_injected"] is True
    assert data_inj["overall_status"] == "red"

    # Reset shift
    client.post("/api/drift/inject", json={"inject": False})


def test_scoreboard_and_figures():
    res_sb = client.get("/api/scoreboard")
    assert res_sb.status_code == 200
    data = res_sb.json()
    assert "evaluation_matrix" in data
    assert "benchmarks_comparison" in data

    res_fig = client.get("/api/figures")
    assert res_fig.status_code == 200
    figs = res_fig.json()
    assert len(figs) == 11


def test_sim_tick():
    res_tick = client.post("/api/sim/tick")
    assert res_tick.status_code == 200
    data = res_tick.json()
    assert data["status"] == "ok"
    assert len(data["beds"]) == 12


def test_auth_endpoints():
    # Login with default clinician
    res = client.post("/api/auth/login", json={"email": "clinician@sepsiswatch.org", "password": "sepsiswatch2026"})
    assert res.status_code == 200
    token_data = res.json()
    assert "access_token" in token_data
    assert token_data["user"]["role"] == "clinician"

    # Profile lookup
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_data['access_token']}"})
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert me_data["email"] == "clinician@sepsiswatch.org"


def test_alerts_and_triage_endpoints():
    # Alerts list & stats
    res = client.get("/api/alerts")
    assert res.status_code == 200

    res_stats = client.get("/api/alerts/stats")
    assert res_stats.status_code == 200
    assert "false_alarms_per_patient_day" in res_stats.json()

    # Triage queue
    res_q = client.get("/api/triage/queue")
    assert res_q.status_code == 200
    queue = res_q.json()
    assert len(queue) == 12

    # Acknowledge, snooze, escalate, assign
    res_ack = client.post("/api/alerts/ALT-3-12/acknowledge", json={"action_taken": "Bedside exam completed"})
    assert res_ack.status_code == 200

    res_snooze = client.post("/api/triage/3/snooze", json={"duration_hours": 2, "reason": "Exam in progress"})
    assert res_snooze.status_code == 200

    res_esc = client.post("/api/triage/3/escalate", json={"escalation_tier": "RRT", "urgency_notes": "Hypotension"})
    assert res_esc.status_code == 200

    res_assign = client.post("/api/triage/3/assign", json={"assigned_clinician_id": "c1", "assigned_clinician_name": "Dr. Preethika", "bed_id": "Bed-03"})
    assert res_assign.status_code == 200


def test_patient_sub_endpoints():
    for sub in ["timeline", "forecast", "counterfactual", "data-quality", "phenotype", "similar"]:
        res = client.get(f"/api/patients/1/{sub}")
        assert res.status_code == 200, f"Failed on sub-endpoint {sub}: {res.text}"


def test_models_and_simulator_endpoints():
    # Models
    res_m = client.get("/api/models")
    assert res_m.status_code == 200
    assert len(res_m.json()) >= 1

    res_comp = client.post("/api/models/compare", json={"vitals": {"HR": 110, "SBP": 90, "Resp": 24}})
    assert res_comp.status_code == 200

    res_sw = client.post("/api/domain/switch", json={"target_hospital": "Hospital B", "enable_site_recalibration": True})
    assert res_sw.status_code == 200

    # Simulator controls
    res_start = client.post("/api/simulator/start")
    assert res_start.status_code == 200

    res_pause = client.post("/api/simulator/pause")
    assert res_pause.status_code == 200

    res_stress = client.post("/api/stress/run", json={"scenario": "sensor_dropout"})
    assert res_stress.status_code == 200

    res_s_results = client.get("/api/stress/results")
    assert res_s_results.status_code == 200
    assert "composite_resilience_score" in res_s_results.json()


def test_selfwatch_and_passport_endpoints():
    res_sw = client.get("/api/selfwatch")
    assert res_sw.status_code == 200

    res_fn = client.get("/api/fairness")
    assert res_fn.status_code == 200

    res_pass = client.post("/api/passport/analyze", json={"site_name": "Test Hospital", "sample_size": 50})
    assert res_pass.status_code == 200
    pid = res_pass.json()["passport_id"]

    res_pass_pdf = client.get(f"/api/passport/{pid}.pdf")
    assert res_pass_pdf.status_code == 200
    assert res_pass_pdf.headers["content-type"] == "application/pdf"


def test_incidents_handover_and_science_endpoints():
    # Incidents
    res_inc = client.get("/api/incidents")
    assert res_inc.status_code == 200
    res_rep = client.get("/api/incidents/INC-2026-001/replay")
    assert res_rep.status_code == 200

    # Handover
    res_hnd = client.get("/api/handover/latest")
    assert res_hnd.status_code == 200
    h_id = res_hnd.json()["handover_id"]

    res_hnd_pdf = client.get(f"/api/handover/{h_id}.pdf")
    assert res_hnd_pdf.status_code == 200
    assert res_hnd_pdf.headers["content-type"] == "application/pdf"

    # Science
    res_met = client.get("/api/metrics")
    assert res_met.status_code == 200

    res_bench = client.get("/api/benchmarks")
    assert res_bench.status_code == 200

    res_err = client.get("/api/errors")
    assert res_err.status_code == 200

    res_emb = client.get("/api/embeddings")
    assert res_emb.status_code == 200

    # Patient PDF Report
    res_pt_pdf = client.get("/api/reports/patient/1.pdf")
    assert res_pt_pdf.status_code == 200
    assert res_pt_pdf.headers["content-type"] == "application/pdf"

    # Audit log, ready, metrics
    assert client.get("/api/audit-log").status_code == 200
    assert client.get("/api/ready").status_code == 200
    assert client.get("/metrics").status_code == 200
