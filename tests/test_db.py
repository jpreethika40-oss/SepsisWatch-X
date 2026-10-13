"""
Database and Repository Tests for SepsisWatch-X.
Validates table creation, model relationships, and async repository functions using SQLite in-memory.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.db.base import Base
from backend.app.db.models import (
    User, UserRole, Patient, Observation, Prediction, Alert,
    AlertSeverity, AlertStatus, ConformalLabel, DriftStatus
)
from backend.app.db.repos import (
    PatientRepo, ObservationRepo, PredictionRepo, AlertRepo, DriftRepo, PolicyRepo
)


@pytest_asyncio.fixture
async def async_test_session():
    """Provides an isolated in-memory SQLite database session for unit tests."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_patient_repo_create_and_list(async_test_session: AsyncSession):
    repo = PatientRepo(async_test_session)
    p = await repo.create(
        patient_code="test_p001",
        hospital="setA",
        age=65.5,
        gender=1,
        unit1=1.0,
        unit2=0.0,
        is_active=True,
        bed_number=1
    )
    assert p.id is not None
    assert p.patient_code == "test_p001"

    active_patients = await repo.list_active()
    assert len(active_patients) == 1
    assert active_patients[0].bed_number == 1


@pytest.mark.asyncio
async def test_prediction_and_explanation_creation(async_test_session: AsyncSession):
    p_repo = PatientRepo(async_test_session)
    patient = await p_repo.create(
        patient_code="test_p002",
        hospital="setB",
        age=52.0,
        gender=0,
        is_active=True,
        bed_number=2
    )

    pred_repo = PredictionRepo(async_test_session)
    pred = await pred_repo.create_prediction(
        patient_id=patient.id,
        hour=5,
        risk=0.72,
        calibrated_prob=0.68,
        conformal_label="sepsis",
        model_version="v1.0.0",
        latency_ms=45.2,
        lgbm_risk=0.70,
        grud_risk=0.74,
        rule_score=2.0,
        top_features=[{"feature": "HR", "weight": 0.42, "value": 118}],
        plain_english_text="Elevated heart rate (tachycardia) combined with declining blood pressure."
    )
    assert pred.id is not None
    assert pred.calibrated_prob == 0.68

    timeline = await pred_repo.get_timeline(patient.id)
    assert len(timeline) == 1
    assert timeline[0].explanation is not None
    assert "tachycardia" in timeline[0].explanation.plain_english_text


@pytest.mark.asyncio
async def test_alert_repo_and_acknowledgement(async_test_session: AsyncSession):
    p_repo = PatientRepo(async_test_session)
    patient = await p_repo.create(
        patient_code="test_p003",
        hospital="setA",
        age=71.0,
        gender=1,
        is_active=True,
        bed_number=3
    )

    alert_repo = AlertRepo(async_test_session)
    alert = await alert_repo.create_alert(
        patient_id=patient.id,
        hour=8,
        severity="critical",
        risk_score=0.88,
        message="Sepsis risk exceeded 0.85 threshold for 2 consecutive hours.",
        lead_time_hours=4.5
    )
    assert alert.id is not None
    assert alert.status == AlertStatus.ACTIVE

    active_alerts = await alert_repo.list_active()
    assert len(active_alerts) == 1

    success = await alert_repo.acknowledge(alert.id, user_id=None, notes="Blood cultures ordered.")
    assert success is True

    active_after = await alert_repo.list_active()
    assert len(active_after) == 0


@pytest.mark.asyncio
async def test_all_26_tables_schema_created(async_test_session: AsyncSession):
    required_tables = {
        "users", "patients", "observations", "predictions", "explanations",
        "counterfactuals", "forecasts", "alerts", "alert_actions", "triage_assignments",
        "drift_snapshots", "performance_snapshots", "recalibration_proposals", "site_passports",
        "fairness_snapshots", "incident_reports", "handover_briefings", "stress_runs",
        "simulator_runs", "simulator_state", "policy_configs", "model_registry_cache",
        "experiment_results", "audit_logs", "whatif_sessions", "saved_views"
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert required_tables.issubset(actual_tables), f"Missing tables: {required_tables - actual_tables}"
    assert len(actual_tables) >= 26
