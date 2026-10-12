"""
Database Seeding Script for SepsisWatch-X.
Populates standard user accounts, baseline policy configuration,
model registry entries, and an initial active 12-patient ICU ward.
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime
import pandas as pd
from passlib.context import CryptContext

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.db.session import init_db_sync, SyncSessionLocal
from backend.app.db.models import (
    User, UserRole, Patient, Observation, PolicyConfig,
    ModelRegistryCache, ModelStage, SimulatorState
)
from backend.ml.data_loader import DataLoader

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def seed_database():
    print("--> Initializing tables in database...")
    init_db_sync()

    with SyncSessionLocal() as session:
        # 1. Seed Users
        existing_users = session.query(User).count()
        if existing_users == 0:
            print("--> Seeding default accounts (admin, clinician, viewer)...")
            users = [
                User(
                    email="admin@sepsiswatch.org",
                    hashed_password=hash_password("Admin123!"),
                    role=UserRole.ADMIN,
                    full_name="Dr. Sarah Connor (Chief of ICU)",
                    is_active=True
                ),
                User(
                    email="clinician@sepsiswatch.org",
                    hashed_password=hash_password("Clinician123!"),
                    role=UserRole.CLINICIAN,
                    full_name="Dr. Marcus Wright (Attending Physician)",
                    is_active=True
                ),
                User(
                    email="viewer@sepsiswatch.org",
                    hashed_password=hash_password("Viewer123!"),
                    role=UserRole.VIEWER,
                    full_name="Nurse Alex Reed (Telemetry)",
                    is_active=True
                )
            ]
            session.add_all(users)
            session.commit()
            print("    Successfully seeded 3 default users.")
        else:
            print(f"    Users table already populated ({existing_users} users).")

        # 2. Seed Default Policy Config
        existing_policy = session.query(PolicyConfig).filter(PolicyConfig.is_active == True).first()
        if not existing_policy:
            print("--> Seeding default alarm-budget policy configuration...")
            policy = PolicyConfig(
                version="v1.0.0-default",
                risk_threshold=0.45,
                persistence_hours=2,
                cooldown_hours=6,
                max_alarms_per_patient=4,
                is_active=True,
                estimated_sensitivity=0.84,
                alarms_per_patient_day=0.92
            )
            session.add(policy)
            session.commit()
            print("    Successfully seeded default policy.")

        # 3. Seed Model Registry Cache
        existing_models = session.query(ModelRegistryCache).count()
        if existing_models == 0:
            print("--> Seeding Model Registry cache...")
            models = [
                ModelRegistryCache(
                    model_name="LightGBM-Tabular",
                    version="1.0.0",
                    stage=ModelStage.PRODUCTION,
                    auroc=0.841,
                    auprc=0.362,
                    utility_score=0.412,
                    artifact_path="models/lgbm_model.pkl",
                    is_current=True
                ),
                ModelRegistryCache(
                    model_name="GRU-D-Recurrent",
                    version="1.0.0",
                    stage=ModelStage.PRODUCTION,
                    auroc=0.835,
                    auprc=0.354,
                    utility_score=0.408,
                    artifact_path="models/grud_model.pt",
                    is_current=True
                ),
                ModelRegistryCache(
                    model_name="DANN-Domain-Adapted-Fusion",
                    version="1.0.0",
                    stage=ModelStage.PRODUCTION,
                    auroc=0.864,
                    auprc=0.418,
                    utility_score=0.452,
                    artifact_path="models/fusion_dann.pkl",
                    is_current=True
                )
            ]
            session.add_all(models)
            session.commit()
            print("    Successfully seeded model registry cache.")

        # 4. Seed 12-Bed ICU Ward Cohort
        existing_patients = session.query(Patient).count()
        if existing_patients == 0:
            print("--> Seeding 12 ICU ward beds with active patient records...")
            loader = DataLoader()
            available = loader.list_patients()
            if available:
                selected_sample = available[:12]
                beds_json = []
                for idx, p_info in enumerate(selected_sample, start=1):
                    df = loader.load_patient(p_info["patient_id"], p_info["hospital"])
                    row0 = df.iloc[0]
                    patient = Patient(
                        patient_code=p_info["patient_id"],
                        hospital=p_info["hospital"],
                        age=float(row0.get("Age", 60.0)),
                        gender=int(row0.get("Gender", 1)),
                        unit1=float(row0.get("Unit1", 1.0)),
                        unit2=float(row0.get("Unit2", 0.0)),
                        hosp_adm_time=float(row0.get("HospAdmTime", -12.0)),
                        is_active=True,
                        bed_number=idx
                    )
                    session.add(patient)
                    session.flush()

                    # Add initial observations up to hour 4
                    for h_idx, h_row in df.iloc[:4].iterrows():
                        vitals_data = {v: (float(h_row[v]) if not pd.isna(h_row[v]) else None) for v in loader.data_cfg.get("vitals", []) if v in h_row}
                        labs_data = {l: (float(h_row[l]) if not pd.isna(h_row[l]) else None) for l in loader.data_cfg.get("labs", []) if l in h_row}
                        obs = Observation(
                            patient_id=patient.id,
                            hour=int(h_row["ICULOS"]),
                            vitals_json=vitals_data,
                            labs_json=labs_data,
                            sepsis_true_label=int(h_row["SepsisLabel"])
                        )
                        session.add(obs)

                    beds_json.append({
                        "bed_number": idx,
                        "patient_id": patient.id,
                        "patient_code": patient.patient_code,
                        "hospital": patient.hospital,
                        "current_hour": 4,
                        "risk": 0.15,
                        "status": "normal"
                    })

                # Seed Simulator State
                sim_state = session.query(SimulatorState).filter(SimulatorState.id == 1).first()
                if not sim_state:
                    sim_state = SimulatorState(
                        id=1,
                        current_hour=4,
                        active_beds_json=beds_json,
                        is_running=False,
                        drift_injected=False
                    )
                    session.add(sim_state)

                session.commit()
                print("    Successfully seeded 12 ICU patients and initial observations.")
            else:
                print("    No patient files found. Run make_synthetic.py first.")

    print("--> Database seeding complete!")


if __name__ == "__main__":
    seed_database()
