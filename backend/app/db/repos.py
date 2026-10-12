"""
Repository Pattern Implementation for SepsisWatch-X Database Access.
Provides clean async abstractions for patients, observations, predictions, alerts, drift, and simulation.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy import select, update, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.models import (
    User, Patient, Observation, Prediction, Explanation, Alert,
    AlertAction, DriftSnapshot, SimulatorRun, SimulatorState,
    PolicyConfig, ModelRegistryCache, ExperimentResult, AuditLog,
    WhatIfSession, AlertStatus, DriftStatus
)


class PatientRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, patient_id: int) -> Optional[Patient]:
        res = await self.session.execute(select(Patient).where(Patient.id == patient_id))
        return res.scalar_one_or_none()

    async def get_by_code(self, patient_code: str) -> Optional[Patient]:
        res = await self.session.execute(select(Patient).where(Patient.patient_code == patient_code))
        return res.scalar_one_or_none()

    async def list_active(self, limit: int = 50) -> List[Patient]:
        res = await self.session.execute(
            select(Patient).where(Patient.is_active == True).order_by(Patient.bed_number).limit(limit)
        )
        return list(res.scalars().all())

    async def create(self, **kwargs) -> Patient:
        patient = Patient(**kwargs)
        self.session.add(patient)
        await self.session.commit()
        await self.session.refresh(patient)
        return patient

    async def bulk_create(self, patients_data: List[Dict[str, Any]]) -> List[Patient]:
        patients = [Patient(**p) for p in patients_data]
        self.session.add_all(patients)
        await self.session.commit()
        return patients


class ObservationRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def bulk_create(self, observations_data: List[Dict[str, Any]]):
        obs = [Observation(**o) for o in observations_data]
        self.session.add_all(obs)
        await self.session.commit()

    async def get_patient_timeline(self, patient_id: int) -> List[Observation]:
        res = await self.session.execute(
            select(Observation).where(Observation.patient_id == patient_id).order_by(Observation.hour)
        )
        return list(res.scalars().all())


class PredictionRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_prediction(
        self,
        patient_id: int,
        hour: int,
        risk: float,
        calibrated_prob: float,
        conformal_label: str,
        model_version: str,
        latency_ms: float = 0.0,
        lgbm_risk: float = 0.0,
        grud_risk: float = 0.0,
        rule_score: float = 0.0,
        top_features: Optional[List[Dict[str, Any]]] = None,
        plain_english_text: Optional[str] = None
    ) -> Prediction:
        pred = Prediction(
            patient_id=patient_id,
            hour=hour,
            risk=risk,
            calibrated_prob=calibrated_prob,
            conformal_label=conformal_label,
            model_version=model_version,
            latency_ms=latency_ms,
            lgbm_risk=lgbm_risk,
            grud_risk=grud_risk,
            rule_score=rule_score
        )
        self.session.add(pred)
        await self.session.flush()

        if top_features and plain_english_text:
            exp = Explanation(
                prediction_id=pred.id,
                patient_id=patient_id,
                hour=hour,
                top_features_json=top_features,
                plain_english_text=plain_english_text
            )
            self.session.add(exp)

        await self.session.commit()
        await self.session.refresh(pred)
        return pred

    async def get_timeline(self, patient_id: int) -> List[Prediction]:
        res = await self.session.execute(
            select(Prediction)
            .where(Prediction.patient_id == patient_id)
            .options(selectinload(Prediction.explanation))
            .order_by(Prediction.hour)
        )
        return list(res.scalars().all())


class AlertRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_alert(
        self,
        patient_id: int,
        hour: int,
        severity: str,
        risk_score: float,
        message: str,
        lead_time_hours: Optional[float] = None
    ) -> Alert:
        alert = Alert(
            patient_id=patient_id,
            hour=hour,
            severity=severity,
            risk_score=risk_score,
            message=message,
            lead_time_hours=lead_time_hours,
            status=AlertStatus.ACTIVE
        )
        self.session.add(alert)
        await self.session.commit()
        await self.session.refresh(alert)
        return alert

    async def list_active(self) -> List[Alert]:
        res = await self.session.execute(
            select(Alert).where(Alert.status == AlertStatus.ACTIVE).order_by(desc(Alert.created_at))
        )
        return list(res.scalars().all())

    async def acknowledge(self, alert_id: int, user_id: Optional[int], notes: Optional[str]) -> bool:
        res = await self.session.execute(select(Alert).where(Alert.id == alert_id))
        alert = res.scalar_one_or_none()
        if not alert:
            return False

        alert.status = AlertStatus.ACKNOWLEDGED
        action = AlertAction(alert_id=alert_id, user_id=user_id, action_type="acknowledge", notes=notes)
        self.session.add(action)
        await self.session.commit()
        return True


class PolicyRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_active(self) -> Optional[PolicyConfig]:
        res = await self.session.execute(
            select(PolicyConfig).where(PolicyConfig.is_active == True).order_by(desc(PolicyConfig.id)).limit(1)
        )
        return res.scalar_one_or_none()

    async def update_policy(
        self,
        risk_threshold: float,
        persistence_hours: int,
        cooldown_hours: int,
        max_alarms_per_patient: int,
        estimated_sensitivity: float = 0.85,
        alarms_per_patient_day: float = 0.90
    ) -> PolicyConfig:
        await self.session.execute(update(PolicyConfig).values(is_active=False))
        new_cfg = PolicyConfig(
            version=f"v{int(datetime.utcnow().timestamp())}",
            risk_threshold=risk_threshold,
            persistence_hours=persistence_hours,
            cooldown_hours=cooldown_hours,
            max_alarms_per_patient=max_alarms_per_patient,
            is_active=True,
            estimated_sensitivity=estimated_sensitivity,
            alarms_per_patient_day=alarms_per_patient_day
        )
        self.session.add(new_cfg)
        await self.session.commit()
        await self.session.refresh(new_cfg)
        return new_cfg


class DriftRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def record_snapshot(
        self,
        overall_status: DriftStatus,
        max_psi: float,
        feature_psi: Dict[str, float],
        ks_stats: Dict[str, Any],
        sample_size: int,
        hospital_shift: bool = False
    ) -> DriftSnapshot:
        snap = DriftSnapshot(
            overall_status=overall_status,
            max_psi=max_psi,
            feature_psi_json=feature_psi,
            ks_stats_json=ks_stats,
            sample_size=sample_size,
            hospital_shift_detected=hospital_shift
        )
        self.session.add(snap)
        await self.session.commit()
        await self.session.refresh(snap)
        return snap

    async def get_latest(self) -> Optional[DriftSnapshot]:
        res = await self.session.execute(
            select(DriftSnapshot).order_by(desc(DriftSnapshot.created_at)).limit(1)
        )
        return res.scalar_one_or_none()
