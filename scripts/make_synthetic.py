"""
High-Fidelity Synthetic PhysioNet/CinC 2019 ICU Patient Dataset Generator
Generates pipe-delimited .psv files for Hospital A and Hospital B with realistic
sepsis progression dynamics, high physiological missingness, cross-hospital domain shifts,
and patient-level split manifests.
"""

import os
import json
import math
import random
import argparse
from pathlib import Path
import numpy as np
import pandas as pd

ALL_COLUMNS = [
    "HR", "O2Sat", "Temp", "SBP", "MAP", "DBP", "Resp", "EtCO2",
    "BaseExcess", "HCO3", "FiO2", "pH", "PaCO2", "SaO2", "AST", "BUN",
    "Alkalinephos", "Calcium", "Chloride", "Creatinine", "Bilirubin_direct",
    "Glucose", "Lactate", "Magnesium", "Phosphate", "Potassium", "Bilirubin_total",
    "TroponinI", "Hct", "Hgb", "PTT", "WBC", "Fibrinogen", "Platelets",
    "Age", "Gender", "Unit1", "Unit2", "HospAdmTime", "ICULOS", "SepsisLabel"
]

VITALS = ["HR", "O2Sat", "Temp", "SBP", "MAP", "DBP", "Resp", "EtCO2"]
LABS = [
    "BaseExcess", "HCO3", "FiO2", "pH", "PaCO2", "SaO2", "AST", "BUN",
    "Alkalinephos", "Calcium", "Chloride", "Creatinine", "Bilirubin_direct",
    "Glucose", "Lactate", "Magnesium", "Phosphate", "Potassium", "Bilirubin_total",
    "TroponinI", "Hct", "Hgb", "PTT", "WBC", "Fibrinogen", "Platelets"
]

# Baseline physiological ranges (mean, std)
NORMAL_VITALS = {
    "HR": (78.0, 11.0),
    "O2Sat": (98.0, 1.5),
    "Temp": (36.8, 0.4),
    "SBP": (120.0, 14.0),
    "MAP": (84.0, 10.0),
    "DBP": (66.0, 8.0),
    "Resp": (16.0, 2.5),
    "EtCO2": (35.0, 4.0),
}

NORMAL_LABS = {
    "BaseExcess": (0.0, 2.0),
    "HCO3": (24.0, 2.5),
    "FiO2": (0.28, 0.08),
    "pH": (7.40, 0.04),
    "PaCO2": (40.0, 4.0),
    "SaO2": (97.0, 2.0),
    "AST": (28.0, 12.0),
    "BUN": (16.0, 6.0),
    "Alkalinephos": (75.0, 20.0),
    "Calcium": (8.9, 0.6),
    "Chloride": (102.0, 3.5),
    "Creatinine": (0.95, 0.3),
    "Bilirubin_direct": (0.2, 0.1),
    "Glucose": (115.0, 25.0),
    "Lactate": (1.2, 0.4),
    "Magnesium": (2.0, 0.25),
    "Phosphate": (3.4, 0.5),
    "Potassium": (4.1, 0.4),
    "Bilirubin_total": (0.8, 0.3),
    "TroponinI": (0.03, 0.02),
    "Hct": (36.0, 4.0),
    "Hgb": (12.2, 1.4),
    "PTT": (28.0, 4.0),
    "WBC": (7.5, 2.2),
    "Fibrinogen": (280.0, 60.0),
    "Platelets": (220.0, 50.0),
}

# Observation probabilities per hour (sparsity)
VITAL_OBS_PROB = {
    "HR": 0.95, "O2Sat": 0.92, "Temp": 0.35, "SBP": 0.90,
    "MAP": 0.90, "DBP": 0.90, "Resp": 0.92, "EtCO2": 0.15
}

LAB_OBS_PROB = {
    "Glucose": 0.28, "Potassium": 0.20, "Lactate": 0.12, "WBC": 0.14,
    "Hgb": 0.15, "Hct": 0.15, "Platelets": 0.12, "Creatinine": 0.15,
    "BUN": 0.15, "pH": 0.12, "PaCO2": 0.10, "BaseExcess": 0.10,
    "HCO3": 0.12, "FiO2": 0.15, "SaO2": 0.08, "Calcium": 0.10,
    "Chloride": 0.12, "Magnesium": 0.10, "Phosphate": 0.08, "AST": 0.05,
    "Alkalinephos": 0.05, "Bilirubin_total": 0.05, "PTT": 0.08,
    "Bilirubin_direct": 0.02, "TroponinI": 0.03, "Fibrinogen": 0.02
}


def generate_patient(
    patient_id: str,
    hospital: str,
    sepsis_risk: bool,
    seed: int
) -> pd.DataFrame:
    """Generates an hourly time series for a single patient."""
    rng = np.random.default_rng(seed)
    
    # Stay length between 14 and 65 hours
    length_of_stay = rng.integers(14, 65)
    
    # Demographics
    # Hospital domain shift: Hospital A older, Hospital B younger & different unit distribution
    if hospital == "setA":
        age = float(np.clip(rng.normal(64, 13), 18, 92))
        unit1 = 1.0 if rng.random() < 0.65 else 0.0
        unit2 = 1.0 - unit1
        hosp_adm_time = -float(rng.uniform(0.5, 48.0))
        hosp_shift_factor = 1.0
    else:  # Hospital B
        age = float(np.clip(rng.normal(57, 16), 18, 90))
        unit1 = 1.0 if rng.random() < 0.35 else 0.0
        unit2 = 1.0 - unit1
        hosp_adm_time = -float(rng.uniform(0.1, 72.0))
        hosp_shift_factor = 1.05  # slightly higher baseline heart rates/labs
        
    gender = 1.0 if rng.random() < 0.54 else 0.0
    
    # Sepsis timing
    if sepsis_risk:
        onset_hour = rng.integers(max(7, int(length_of_stay * 0.4)), length_of_stay - 2)
        # SepsisLabel is 1 starting 6 hours before onset per PhysioNet 2019 criteria
        label_start_hour = max(1, onset_hour - 6)
    else:
        onset_hour = 9999
        label_start_hour = 9999

    # Generate trajectories
    rows = []
    
    # Patient baseline offsets
    patient_vitals_baseline = {
        v: NORMAL_VITALS[v][0] * (1.0 + rng.normal(0, 0.06)) * (hosp_shift_factor if v in ["HR", "Resp"] else 1.0)
        for v in VITALS
    }
    patient_labs_baseline = {
        l: NORMAL_LABS[l][0] * (1.0 + rng.normal(0, 0.08))
        for l in LABS
    }
    
    curr_vitals = dict(patient_vitals_baseline)
    curr_labs = dict(patient_labs_baseline)

    for h in range(1, length_of_stay + 1):
        iculos = h
        is_sepsis_hour = (h >= label_start_hour)
        
        # Sepsis deterioration dynamics
        sepsis_severity = 0.0
        if h >= label_start_hour:
            # Escalating severity as onset approaches and passes
            hours_from_window = (h - label_start_hour) / 8.0
            sepsis_severity = min(2.5, hours_from_window + rng.normal(0, 0.1))

        # Update physiological state with auto-regressive drift + sepsis shock
        # Vitals:
        curr_vitals["HR"] += rng.normal(0, 1.2) + (3.5 * sepsis_severity if sepsis_severity > 0 else 0)
        curr_vitals["HR"] = np.clip(curr_vitals["HR"], 45, 175)
        
        curr_vitals["SBP"] += rng.normal(0, 1.8) - (4.0 * sepsis_severity if sepsis_severity > 0 else 0)
        curr_vitals["SBP"] = np.clip(curr_vitals["SBP"], 55, 210)
        
        curr_vitals["DBP"] = np.clip(curr_vitals["SBP"] * 0.62 + rng.normal(0, 2), 35, 120)
        curr_vitals["MAP"] = (curr_vitals["SBP"] + 2 * curr_vitals["DBP"]) / 3.0
        
        curr_vitals["Resp"] += rng.normal(0, 0.6) + (1.2 * sepsis_severity if sepsis_severity > 0 else 0)
        curr_vitals["Resp"] = np.clip(curr_vitals["Resp"], 8, 42)
        
        curr_vitals["Temp"] += rng.normal(0, 0.08) + (0.22 * sepsis_severity if sepsis_severity > 0 else 0)
        curr_vitals["Temp"] = np.clip(curr_vitals["Temp"], 35.0, 40.5)
        
        curr_vitals["O2Sat"] += rng.normal(0, 0.3) - (0.8 * sepsis_severity if sepsis_severity > 0 else 0)
        curr_vitals["O2Sat"] = np.clip(curr_vitals["O2Sat"], 78, 100)
        
        curr_vitals["EtCO2"] += rng.normal(0, 0.4)
        
        # Labs:
        curr_labs["Lactate"] += rng.normal(0, 0.04) + (0.35 * sepsis_severity if sepsis_severity > 0 else 0)
        curr_labs["Lactate"] = np.clip(curr_labs["Lactate"], 0.4, 14.0)
        
        curr_labs["WBC"] += rng.normal(0, 0.15) + (1.5 * sepsis_severity if sepsis_severity > 0 else 0)
        curr_labs["WBC"] = np.clip(curr_labs["WBC"], 1.5, 45.0)
        
        curr_labs["Creatinine"] += (0.12 * sepsis_severity if sepsis_severity > 0 else rng.normal(0, 0.02))
        curr_labs["Creatinine"] = np.clip(curr_labs["Creatinine"], 0.4, 7.5)
        
        curr_labs["BaseExcess"] += (-0.6 * sepsis_severity if sepsis_severity > 0 else rng.normal(0, 0.1))
        curr_labs["pH"] += (-0.02 * sepsis_severity if sepsis_severity > 0 else rng.normal(0, 0.005))

        # Sample observation masks
        row = {}
        for v in VITALS:
            prob = VITAL_OBS_PROB[v]
            if rng.random() < prob:
                row[v] = round(float(curr_vitals[v]), 2)
            else:
                row[v] = np.nan
                
        for l in LABS:
            # During sepsis, clinician orders labs more frequently
            prob = LAB_OBS_PROB[l] * (1.6 if sepsis_severity > 0.5 else 1.0)
            if rng.random() < prob:
                row[l] = round(float(curr_labs[l]), 2)
            else:
                row[l] = np.nan
                
        row["Age"] = round(age, 2)
        row["Gender"] = int(gender)
        row["Unit1"] = float(unit1)
        row["Unit2"] = float(unit2)
        row["HospAdmTime"] = round(hosp_adm_time, 2)
        row["ICULOS"] = int(iculos)
        row["SepsisLabel"] = 1 if is_sepsis_hour else 0
        
        rows.append(row)
        
    df = pd.DataFrame(rows, columns=ALL_COLUMNS)
    return df


def generate_dataset(
    output_base: str = "data",
    num_patients_per_hospital: int = 120,
    sepsis_ratio: float = 0.08,
    seed: int = 42
):
    """Generates synthetic dataset for both hospital setA and setB."""
    base_path = Path(output_base)
    set_a_dir = base_path / "raw" / "setA"
    set_b_dir = base_path / "raw" / "setB"
    splits_dir = base_path / "splits"
    
    set_a_dir.mkdir(parents=True, exist_ok=True)
    set_b_dir.mkdir(parents=True, exist_ok=True)
    splits_dir.mkdir(parents=True, exist_ok=True)
    
    random.seed(seed)
    np.random.seed(seed)
    
    manifest = {
        "is_synthetic": True,
        "seed": seed,
        "hospitals": ["setA", "setB"],
        "num_patients_per_hospital": num_patients_per_hospital,
        "sepsis_ratio": sepsis_ratio,
        "columns": ALL_COLUMNS,
        "patients": []
    }
    
    all_patients_A = []
    all_patients_B = []
    
    print(f"--> Generating synthetic Hospital A (setA) data ({num_patients_per_hospital} patients)...")
    for i in range(1, num_patients_per_hospital + 1):
        pid = f"p_A_{i:05d}"
        has_sepsis = (random.random() < sepsis_ratio)
        df = generate_patient(pid, "setA", has_sepsis, seed + i * 7)
        file_path = set_a_dir / f"{pid}.psv"
        df.to_csv(file_path, sep="|", index=False)
        all_patients_A.append({
            "patient_id": pid,
            "hospital": "setA",
            "has_sepsis": has_sepsis,
            "hours": len(df),
            "file": str(file_path)
        })
        
    print(f"--> Generating synthetic Hospital B (setB) data ({num_patients_per_hospital} patients)...")
    for i in range(1, num_patients_per_hospital + 1):
        pid = f"p_B_{i:05d}"
        has_sepsis = (random.random() < sepsis_ratio)
        df = generate_patient(pid, "setB", has_sepsis, seed + 10000 + i * 7)
        file_path = set_b_dir / f"{pid}.psv"
        df.to_csv(file_path, sep="|", index=False)
        all_patients_B.append({
            "patient_id": pid,
            "hospital": "setB",
            "has_sepsis": has_sepsis,
            "hours": len(df),
            "file": str(file_path)
        })

    # Partition by patient ensuring ZERO overlap across train, val, held-out test
    def partition_patients(patients, p_seed=42):
        rng = random.Random(p_seed)
        # Stratify by sepsis presence
        positives = [p for p in patients if p["has_sepsis"]]
        negatives = [p for p in patients if not p["has_sepsis"]]
        rng.shuffle(positives)
        rng.shuffle(negatives)
        
        n_pos = len(positives)
        n_neg = len(negatives)
        
        train_p = positives[:int(0.70 * n_pos)] + negatives[:int(0.70 * n_neg)]
        val_p = positives[int(0.70 * n_pos):int(0.85 * n_pos)] + negatives[int(0.70 * n_neg):int(0.85 * n_neg)]
        test_p = positives[int(0.85 * n_pos):] + negatives[int(0.85 * n_neg):]
        
        rng.shuffle(train_p)
        rng.shuffle(val_p)
        rng.shuffle(test_p)
        return train_p, val_p, test_p

    train_A, val_A, test_A = partition_patients(all_patients_A, seed + 101)
    train_B, val_B, test_B = partition_patients(all_patients_B, seed + 202)
    
    combined_train = [p["patient_id"] for p in train_A + train_B]
    combined_val = [p["patient_id"] for p in val_A + val_B]
    combined_test = [p["patient_id"] for p in test_A + test_B]

    # Save split manifests
    split_info = {
        "train": combined_train,
        "val": combined_val,
        "test": combined_test,
        "hospital_A": {
            "train": [p["patient_id"] for p in train_A],
            "val": [p["patient_id"] for p in val_A],
            "test": [p["patient_id"] for p in test_A],
        },
        "hospital_B": {
            "train": [p["patient_id"] for p in train_B],
            "val": [p["patient_id"] for p in val_B],
            "test": [p["patient_id"] for p in test_B],
        }
    }
    
    with open(splits_dir / "splits.json", "w") as f:
        json.dump(split_info, f, indent=2)
        
    # Provenance marker file
    with open(base_path / ".synthetic_data_active", "w") as f:
        f.write("SYNTHETIC_DATA_ACTIVE=true\n")
        
    metadata = {
        "status": "ready",
        "is_synthetic": True,
        "generated_timestamp": "2026-10-12T19:30:00Z",
        "total_patients": len(all_patients_A) + len(all_patients_B),
        "total_setA": len(all_patients_A),
        "total_setB": len(all_patients_B),
        "total_septic_A": sum(1 for p in all_patients_A if p["has_sepsis"]),
        "total_septic_B": sum(1 for p in all_patients_B if p["has_sepsis"]),
        "train_patients_count": len(combined_train),
        "val_patients_count": len(combined_val),
        "test_patients_count": len(combined_test),
        "note": "Synthetic data created for complete offline execution. Benchmark rubric numbers must use real data run."
    }
    
    with open(base_path / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"--> Synthetic generation complete! Total: {metadata['total_patients']} patients across Hospital A and B.")
    print(f"--> Split breakdown: Train={len(combined_train)}, Val={len(combined_val)}, Test={len(combined_test)}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic PhysioNet 2019 dataset.")
    parser.add_argument("--output", type=str, default="data", help="Output directory")
    parser.add_argument("--patients", type=int, default=120, help="Patients per hospital")
    parser.add_argument("--sepsis_ratio", type=float, default=0.08, help="Fraction of septic patients")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()
    
    generate_dataset(
        output_base=args.output,
        num_patients_per_hospital=args.patients,
        sepsis_ratio=args.sepsis_ratio,
        seed=args.seed
    )
