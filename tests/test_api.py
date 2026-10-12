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
