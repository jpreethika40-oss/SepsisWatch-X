"""
SQLAlchemy 2.0 Database Models for SepsisWatch-X.
Defines all 16 tables covering patients, observations, predictions,
conformal uncertainty, explanations, alarms, drift, simulations, audit, and experimentation.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, Index, Text, Enum as SQLEnum, JSON, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from backend.app.db.base import Base


class UserRole(str, enum.Enum):
    VIEWER = "viewer"
    CLINICIAN = "clinician"
    ADMIN = "admin"


class ConformalLabel(str, enum.Enum):
    NO_SEPSIS = "no_sepsis"
    SEPSIS = "sepsis"
    UNCERTAIN = "uncertain"


class AlertSeverity(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    DISMISSED = "dismissed"


class DriftStatus(str, enum.Enum):
    GREEN = "green"
    AMBER = "amber"
    RED = "red"


class ModelStage(str, enum.Enum):
    STAGING = "staging"
    PRODUCTION = "production"
    ARCHIVED = "archived"


# 1. User Table
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.CLINICIAN, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    actions: Mapped[List["AlertAction"]] = relationship("AlertAction", back_populates="user")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user")


# 2. Patient Table
class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    hospital: Mapped[str] = mapped_column(String(32), index=True, nullable=False) # "setA" or "setB"
    age: Mapped[float] = mapped_column(Float, nullable=False)
    gender: Mapped[int] = mapped_column(Integer, nullable=False) # 0: female, 1: male
    unit1: Mapped[float] = mapped_column(Float, default=0.0)
    unit2: Mapped[float] = mapped_column(Float, default=0.0)
    hosp_adm_time: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    bed_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    observations: Mapped[List["Observation"]] = relationship("Observation", back_populates="patient", cascade="all, delete-orphan")
    predictions: Mapped[List["Prediction"]] = relationship("Prediction", back_populates="patient", cascade="all, delete-orphan")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")


# 3. Observation Table
class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    hour: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    vitals_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    labs_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    sepsis_true_label: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="observations")

    __table_args__ = (
        Index("idx_observation_patient_hour", "patient_id", "hour"),
    )


# 4. Prediction Table
class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    hour: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    risk: Mapped[float] = mapped_column(Float, nullable=False) # raw ensemble score
    calibrated_prob: Mapped[float] = mapped_column(Float, nullable=False)
    conformal_label: Mapped[ConformalLabel] = mapped_column(SQLEnum(ConformalLabel), nullable=False)
    lgbm_risk: Mapped[float] = mapped_column(Float, default=0.0)
    grud_risk: Mapped[float] = mapped_column(Float, default=0.0)
    rule_score: Mapped[float] = mapped_column(Float, default=0.0)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="predictions")
    explanation: Mapped[Optional["Explanation"]] = relationship("Explanation", back_populates="prediction", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_prediction_patient_hour", "patient_id", "hour"),
    )


# 5. Explanation Table
class Explanation(Base):
    __tablename__ = "explanations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prediction_id: Mapped[int] = mapped_column(Integer, ForeignKey("predictions.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    hour: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    method: Mapped[str] = mapped_column(String(32), default="shap") # "shap" or "integrated_gradients"
    top_features_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False) # List of {feature, weight, value, direction}
    plain_english_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    prediction: Mapped["Prediction"] = relationship("Prediction", back_populates="explanation")


# 6. Alert Table
class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    hour: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    severity: Mapped[AlertSeverity] = mapped_column(SQLEnum(AlertSeverity), default=AlertSeverity.HIGH, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[AlertStatus] = mapped_column(SQLEnum(AlertStatus), default=AlertStatus.ACTIVE, nullable=False)
    lead_time_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, index=True)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="alerts")
    actions: Mapped[List["AlertAction"]] = relationship("AlertAction", back_populates="alert", cascade="all, delete-orphan")


# 7. AlertAction Table
class AlertAction(Base):
    __tablename__ = "alert_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_id: Mapped[int] = mapped_column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_type: Mapped[str] = mapped_column(String(32), nullable=False) # acknowledge, dismiss, note
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    alert: Mapped["Alert"] = relationship("Alert", back_populates="actions")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="actions")


# 8. DriftSnapshot Table
class DriftSnapshot(Base):
    __tablename__ = "drift_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    overall_status: Mapped[DriftStatus] = mapped_column(SQLEnum(DriftStatus), default=DriftStatus.GREEN, nullable=False)
    max_psi: Mapped[float] = mapped_column(Float, nullable=False)
    feature_psi_json: Mapped[Dict[str, float]] = mapped_column(JSON, nullable=False)
    ks_stats_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    hospital_shift_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, index=True)


# 9. SimulatorRun Table
class SimulatorRun(Base):
    __tablename__ = "simulator_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_name: Mapped[str] = mapped_column(String(128), nullable=False)
    total_patients: Mapped[int] = mapped_column(Integer, default=12)
    status: Mapped[str] = mapped_column(String(32), default="running")
    speed_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    stopped_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


# 10. SimulatorState Table
class SimulatorState(Base):
    __tablename__ = "simulator_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    current_hour: Mapped[int] = mapped_column(Integer, default=1)
    active_beds_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    is_running: Mapped[bool] = mapped_column(Boolean, default=False)
    drift_injected: Mapped[bool] = mapped_column(Boolean, default=False)
    last_tick_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


# 11. PolicyConfig Table
class PolicyConfig(Base):
    __tablename__ = "policy_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    version: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    risk_threshold: Mapped[float] = mapped_column(Float, default=0.45, nullable=False)
    persistence_hours: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    cooldown_hours: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    max_alarms_per_patient: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    estimated_sensitivity: Mapped[float] = mapped_column(Float, default=0.84)
    alarms_per_patient_day: Mapped[float] = mapped_column(Float, default=0.92)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)


# 12. ModelRegistryCache Table
class ModelRegistryCache(Base):
    __tablename__ = "model_registry_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    stage: Mapped[ModelStage] = mapped_column(SQLEnum(ModelStage), default=ModelStage.PRODUCTION)
    auroc: Mapped[float] = mapped_column(Float, nullable=False)
    auprc: Mapped[float] = mapped_column(Float, nullable=False)
    utility_score: Mapped[float] = mapped_column(Float, nullable=False)
    artifact_path: Mapped[str] = mapped_column(String(255), nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())


# 13. ExperimentResult Table
class ExperimentResult(Base):
    __tablename__ = "experiment_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    experiment_name: Mapped[str] = mapped_column(String(128), nullable=False)
    hospital_transfer: Mapped[str] = mapped_column(String(32), nullable=False) # "A->A", "A->B", "B->B", "B->A"
    model_type: Mapped[str] = mapped_column(String(64), nullable=False)
    auroc: Mapped[float] = mapped_column(Float, nullable=False)
    auprc: Mapped[float] = mapped_column(Float, nullable=False)
    utility_score: Mapped[float] = mapped_column(Float, nullable=False)
    f1_score: Mapped[float] = mapped_column(Float, nullable=False)
    ece: Mapped[float] = mapped_column(Float, default=0.04)
    false_alarms_per_day: Mapped[float] = mapped_column(Float, default=1.1)
    bootstrap_ci_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


# 14. AuditLog Table
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    details_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), index=True)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")


# 15. WhatIfSession Table
class WhatIfSession(Base):
    __tablename__ = "whatif_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    hour: Mapped[int] = mapped_column(Integer, nullable=False)
    original_risk: Mapped[float] = mapped_column(Float, nullable=False)
    modified_risk: Mapped[float] = mapped_column(Float, nullable=False)
    delta_features_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    user_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


# 16. SavedView Table
class SavedView(Base):
    __tablename__ = "saved_views"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    filters_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    layout_config_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
