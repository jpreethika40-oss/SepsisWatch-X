"""
Phase 4 Unit and Integration Tests for SepsisWatch-X Differentiator Modules:
- Alert Trust Score (0-100) & Sub-component Decomposition
- Ward Triage Queue & Ward-Level Alarm Budget
- Counterfactual Explorer & Constrained Perturbations
- 6-Hour Risk Forecast with Conformal Uncertainty Bands
- Data Quality Radar & Overdue Telemetry Audits
- Fairness Watch Subgroup Parity & Disparity Flagging
- Trajectory Phenotyping & DTW Reference Alignment
- Self-Watch Rolling Drift & Recalibration Proposals
- Site Passport External Deployment Readiness Assessment
- Incident Replay Forensic Root-Cause Analysis
- Benchmarks Runner & Error Analysis Suite
- Stress Lab Operational Fault Injection & Resilience Index
"""

import pytest
import numpy as np
import pandas as pd

from backend.ml.trust_score import TrustScoreEngine
from backend.ml.triage_queue import WardTriageQueue
from backend.ml.counterfactuals import CounterfactualExplorer
from backend.ml.forecast import RiskForecaster
from backend.ml.data_quality import DataQualityRadar
from backend.ml.fairness import FairnessAuditor
from backend.ml.phenotypes import TrajectoryPhenotyping
from backend.ml.self_watch import SelfWatchMonitor
from backend.ml.site_passport import SitePassportAnalyzer
from backend.ml.incident_replay import IncidentReplayEngine
from backend.ml.benchmark import generate_benchmark_comparison_matrix
from backend.ml.error_analysis import run_error_analysis
from backend.ml.stress_lab import StressLabEngine
from backend.ml.handover import HandoverBriefingGenerator


class TestAlertTrustScore:
    """Tests for Alert Trust Score engine."""

    def test_trust_score_bounds_and_tier(self):
        # High trust case: calibrated, certain, complete, green drift, branch agreement
        res_high = TrustScoreEngine.compute_trust_score(
            calibrated_prob=0.88,
            conformal_label="Sepsis",
            input_completeness=0.95,
            drift_status="green",
            lgbm_prob=0.86,
            grud_prob=0.90,
            ece=0.015
        )
        assert 0.0 <= res_high["trust_score"] <= 100.0
        assert res_high["tier"] == "High Trust"
        assert res_high["trust_score"] >= 80.0

        # Low trust case: uncertain, sparse inputs, red drift, model disagreement
        res_low = TrustScoreEngine.compute_trust_score(
            calibrated_prob=0.52,
            conformal_label="Uncertain",
            input_completeness=0.30,
            drift_status="red",
            lgbm_prob=0.75,
            grud_prob=0.25,
            ece=0.090
        )
        assert 0.0 <= res_low["trust_score"] <= 100.0
        assert res_low["tier"] == "Low Trust"
        assert res_low["trust_score"] < 60.0


class TestWardTriageQueue:
    """Tests for Ward Triage Queue prioritization and shared alarm budget."""

    def test_triage_prioritization_and_budget_suppression(self):
        queue = WardTriageQueue(max_ward_alerts_per_hour=2)

        patients = [
            {"patient_id": "P01", "bed_id": "Bed-01", "current_risk": 0.85, "risk_velocity": 0.08, "trust_score": 90.0, "time_to_threshold_hours": 0.5},
            {"patient_id": "P02", "bed_id": "Bed-02", "current_risk": 0.72, "risk_velocity": 0.05, "trust_score": 85.0, "time_to_threshold_hours": 1.2},
            {"patient_id": "P03", "bed_id": "Bed-03", "current_risk": 0.60, "risk_velocity": 0.02, "trust_score": 80.0, "time_to_threshold_hours": 2.5},
            {"patient_id": "P04", "bed_id": "Bed-04", "current_risk": 0.15, "risk_velocity": -0.01, "trust_score": 95.0, "time_to_threshold_hours": 12.0},
        ]

        ranked = queue.rank_ward_patients(patients)
        assert len(ranked) == 4
        # Top 2 should have high priority and be permitted
        assert ranked[0]["patient_id"] == "P01"
        assert ranked[0]["budget_status"] == "Dispatched"
        assert ranked[1]["budget_status"] == "Dispatched"
        # 3rd alert must be suppressed due to max budget of 2
        assert ranked[2]["budget_status"] == "Suppressed (Ward Budget Cap)"
        # 4th patient is low risk
        assert ranked[3]["budget_status"] == "Normal Monitoring"

    def test_snooze_functionality(self):
        queue = WardTriageQueue(max_ward_alerts_per_hour=5)
        queue.snooze_patient("P01", duration_hours=2)

        patients = [
            {"patient_id": "P01", "bed_id": "Bed-01", "current_risk": 0.85, "risk_velocity": 0.08, "trust_score": 90.0, "time_to_threshold_hours": 0.5},
            {"patient_id": "P02", "bed_id": "Bed-02", "current_risk": 0.80, "risk_velocity": 0.07, "trust_score": 88.0, "time_to_threshold_hours": 0.6},
        ]
        ranked = queue.rank_ward_patients(patients)
        p01_record = next(r for r in ranked if r["patient_id"] == "P01")
        assert p01_record["is_snoozed"] is True


class TestCounterfactualExplorer:
    """Tests for Counterfactual sensitivity analysis."""

    def test_counterfactual_optimization(self):
        explorer = CounterfactualExplorer(target_threshold=0.45)
        vitals = {
            "HR": 125.0,
            "Resp": 28.0,
            "Temp": 38.9,
            "SBP": 82.0,
            "MAP": 58.0,
            "O2Sat": 91.0,
            "Lactate": 3.8
        }
        res = explorer.find_counterfactual(vitals, current_risk=0.78)
        assert res["achieved"] is True
        assert res["counterfactual_risk"] < 0.45
        assert len(res["perturbations"]) > 0
        assert "MODEL SENSITIVITY VIEW ONLY" in res["disclaimer"]


class TestRiskForecaster:
    """Tests for 6-hour risk extrapolation."""

    def test_forecast_trajectory_and_intervals(self):
        forecaster = RiskForecaster(alert_threshold=0.45)
        recent_risks = [0.20, 0.28, 0.36, 0.42]

        fc = forecaster.forecast_trajectory(recent_risks, current_hour=14, horizon_hours=6)
        assert len(fc["forecast_points"]) == 6
        assert fc["trend_velocity_per_hour"] > 0
        assert fc["time_to_threshold_hours"] is not None

        for pt in fc["forecast_points"]:
            assert pt["lower_bound"] <= pt["mean_risk"] <= pt["upper_bound"]


class TestDataQualityRadar:
    """Tests for Telemetry Completeness and Overdue Lab Audits."""

    def test_overdue_biomarkers(self):
        # Create history with stale lactate (15 hours ago) and fresh HR
        df = pd.DataFrame({
            "ICULOS": [1, 5, 10, 20],
            "HR": [80, 85, 90, 95],
            "Resp": [16, 18, 20, 22],
            "O2Sat": [98, 97, 96, 95],
            "SBP": [120, 115, 110, 105],
            "MAP": [85, 80, 75, 70],
            "Temp": [37.0, 37.2, 37.5, 38.0],
            "Lactate": [1.1, np.nan, np.nan, np.nan]  # Measured at hour 1 only
        })

        res = DataQualityRadar.evaluate_patient_quality(df, current_hour=20)
        assert res["completeness_score"] > 0.0
        overdue_feats = [item["feature"] for item in res["overdue_indicators"]]
        assert "Lactate" in overdue_feats


class TestFairnessAuditor:
    """Tests for Demographic subgroup evaluation and disparity alerts."""

    def test_subgroup_evaluation(self):
        df = pd.DataFrame({
            "y_true": [1, 0, 1, 0, 1, 0, 1, 0],
            "y_pred": [1, 0, 1, 0, 1, 0, 0, 0],
            "y_prob": [0.8, 0.1, 0.75, 0.2, 0.85, 0.1, 0.3, 0.1],
            "Age": [45, 48, 62, 59, 72, 75, 85, 82],
            "Gender": [1, 0, 1, 0, 1, 0, 1, 0],
            "Unit1": [1, 1, 0, 0, 1, 1, 0, 0],
            "Unit2": [0, 0, 1, 1, 0, 0, 1, 1],
            "hospital": ["setA", "setA", "setA", "setA", "setB", "setB", "setB", "setB"]
        })

        res = FairnessAuditor.audit_subgroups(df)
        assert "subgroups" in res
        assert "age_band" in res["subgroups"]
        assert "hospital" in res["subgroups"]


class TestTrajectoryPhenotypes:
    """Tests for DTW distance and Phenotyping."""

    def test_dtw_and_classification(self):
        s1 = np.array([0.1, 0.2, 0.5, 0.8])
        s2 = np.array([0.1, 0.3, 0.6, 0.85])
        dist = TrajectoryPhenotyping.dtw_distance(s1, s2)
        assert dist < 0.5

        # Classify hyper-acute trajectory
        res = TrajectoryPhenotyping.classify_trajectory([0.1, 0.2, 0.6, 0.85])
        assert res["phenotype_id"] == "phenotype_1"


class TestSelfWatchAndSitePassport:
    """Tests for Self-Watch drift proposals and Site Passport transferability."""

    def test_self_watch_monitoring(self):
        monitor = SelfWatchMonitor(baseline_auroc=0.85, auroc_degradation_threshold=0.05)
        # Perfect predictions
        nominal = monitor.evaluate_rolling_window([1, 0, 1, 0] * 10, [0.9, 0.1, 0.85, 0.15] * 10, [1, 0, 1, 0] * 10)
        assert nominal["status"] == "Nominal"

        # Inverted predictions triggering degradation
        degraded = monitor.evaluate_rolling_window([1, 0, 1, 0] * 10, [0.2, 0.8, 0.1, 0.9] * 10, [0, 1, 0, 1] * 10)
        assert degraded["proposal_required"] is True
        assert degraded["proposal"]["auto_applied"] is False

    def test_site_passport_verdict(self):
        analyzer = SitePassportAnalyzer()
        df = pd.DataFrame({
            "HR": np.random.normal(80, 10, 100),
            "Resp": np.random.normal(18, 3, 100),
            "Temp": np.random.normal(37, 0.5, 100),
            "SBP": np.random.normal(120, 15, 100),
            "MAP": np.random.normal(85, 10, 100),
            "O2Sat": np.random.normal(98, 1, 100),
            "Lactate": np.random.normal(1.5, 0.4, 100),
            "WBC": np.random.normal(8.0, 2, 100),
            "Creatinine": np.random.normal(1.0, 0.2, 100),
            "Glucose": np.random.normal(110, 20, 100),
            "patient_id": [f"P_{i//20}" for i in range(100)]
        })
        res = analyzer.analyze_site_data(df, site_name="Hospital C Test")
        assert res["readiness_verdict"] in ("Ready", "Recalibrate first", "Not recommended")


class TestIncidentReplayAndStressLab:
    """Tests for Incident Replay and Stress Lab."""

    def test_incident_replay_findings(self):
        timeline = [
            {"hour": 1, "calibrated_prob": 0.20, "alert_dispatched": False, "trust_score": 80.0},
            {"hour": 2, "calibrated_prob": 0.48, "alert_dispatched": False, "trust_score": 75.0},
            {"hour": 3, "calibrated_prob": 0.55, "alert_dispatched": True, "trust_score": 82.0},
            {"hour": 4, "calibrated_prob": 0.70, "alert_dispatched": True, "trust_score": 85.0},
        ]
        audit = IncidentReplayEngine.audit_patient_case(timeline, actual_onset_hour=10)
        assert audit["first_alert_hour"] == 3
        assert audit["lead_time_hours"] == 7

    def test_stress_lab_composite(self):
        comp = StressLabEngine.compute_composite_resilience_score()
        assert 0.0 <= comp["composite_resilience_score"] <= 100.0
        assert comp["scenario_count"] == 5

    def test_handover_generation(self):
        ward = [
            {"patient_id": "P01", "bed_id": "Bed-01", "current_risk": 0.75, "risk_velocity": 0.06, "has_active_alert": True, "trust_score": 85.0},
            {"patient_id": "P02", "bed_id": "Bed-02", "current_risk": 0.20, "risk_velocity": -0.01, "has_active_alert": False, "trust_score": 90.0}
        ]
        hnd = HandoverBriefingGenerator.generate_shift_handover(ward)
        assert "handover_id" in hnd
        assert len(hnd["rising_patients"]) == 1
