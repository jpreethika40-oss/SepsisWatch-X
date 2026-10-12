"""
SepsisWatch-X Data Loader and Provenance Management.
Loads PhysioNet/CinC 2019 .psv patient files from Hospital A and Hospital B,
parses metadata and labels, manages patient-level split manifests,
and computes missingness statistics.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
import yaml

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
DEMOGRAPHICS = ["Age", "Gender", "Unit1", "Unit2", "HospAdmTime", "ICULOS"]


class DataLoader:
    """Manages raw ICU data loading, validation, and patient splits."""
    
    def __init__(self, config_path: str = "config/config.yaml"):
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)
            
        self.data_cfg = self.config.get("data", {})
        self.raw_a_dir = Path(self.data_cfg.get("raw_set_a_dir", "data/raw/setA"))
        self.raw_b_dir = Path(self.data_cfg.get("raw_set_b_dir", "data/raw/setB"))
        self.splits_path = Path(self.data_cfg.get("splits_dir", "data/splits")) / "splits.json"
        self.synthetic_marker = Path("data/.synthetic_data_active")

    @property
    def is_synthetic(self) -> bool:
        """Returns True if the active dataset is synthetic, False if real PhysioNet."""
        return self.synthetic_marker.exists()

    def list_patients(self, hospital: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists available patient files with hospital tagging."""
        patients = []
        
        if hospital in (None, "setA") and self.raw_a_dir.exists():
            for p_file in sorted(self.raw_a_dir.glob("*.psv")):
                patients.append({
                    "patient_id": p_file.stem,
                    "hospital": "setA",
                    "file_path": str(p_file)
                })
                
        if hospital in (None, "setB") and self.raw_b_dir.exists():
            for p_file in sorted(self.raw_b_dir.glob("*.psv")):
                patients.append({
                    "patient_id": p_file.stem,
                    "hospital": "setB",
                    "file_path": str(p_file)
                })
                
        return patients

    def load_patient(self, patient_id: str, hospital: Optional[str] = None) -> pd.DataFrame:
        """Loads a single patient's raw hourly observations as a DataFrame."""
        if hospital == "setA":
            p_file = self.raw_a_dir / f"{patient_id}.psv"
        elif hospital == "setB":
            p_file = self.raw_b_dir / f"{patient_id}.psv"
        else:
            p_file = self.raw_a_dir / f"{patient_id}.psv"
            if not p_file.exists():
                p_file = self.raw_b_dir / f"{patient_id}.psv"

        if not p_file.exists():
            raise FileNotFoundError(f"Patient file not found: {patient_id}")
            
        df = pd.read_csv(p_file, sep="|")
        df["patient_id"] = patient_id
        df["hospital"] = "setA" if "setA" in str(p_file) else "setB"
        return df

    def load_splits(self) -> Dict[str, Any]:
        """Loads train / val / held-out test splits."""
        if not self.splits_path.exists():
            raise FileNotFoundError(f"Split file missing at {self.splits_path}. Run make_synthetic.py first.")
            
        with open(self.splits_path, "r") as f:
            return json.load(f)

    def verify_split_leakage(self) -> bool:
        """Verifies strictly zero patient overlap between train, val, and test splits."""
        splits = self.load_splits()
        train_set = set(splits.get("train", []))
        val_set = set(splits.get("val", []))
        test_set = set(splits.get("test", []))
        
        train_val_overlap = train_set.intersection(val_set)
        train_test_overlap = train_set.intersection(test_set)
        val_test_overlap = val_set.intersection(test_set)
        
        assert len(train_val_overlap) == 0, f"Train/Val patient leakage detected: {train_val_overlap}"
        assert len(train_test_overlap) == 0, f"Train/Test patient leakage detected: {train_test_overlap}"
        assert len(val_test_overlap) == 0, f"Val/Test patient leakage detected: {val_test_overlap}"
        return True

    def compute_missingness_eda(self) -> Dict[str, Any]:
        """Calculates missingness statistics and distribution for Hospital A and B."""
        patients_a = self.list_patients("setA")
        patients_b = self.list_patients("setB")
        
        def analyze_group(patient_list):
            if not patient_list:
                return {}
            dfs = [pd.read_csv(p["file_path"], sep="|") for p in patient_list[:50]]
            combined = pd.concat(dfs, ignore_index=True)
            total_hours = len(combined)
            missing_pct = {col: round(float(combined[col].isna().sum() / total_hours * 100), 2) for col in ALL_COLUMNS if col in combined.columns}
            septic_hours = int(combined["SepsisLabel"].sum())
            return {
                "total_patients_sampled": len(dfs),
                "total_hours": total_hours,
                "sepsis_prevalence_pct": round(float(septic_hours / total_hours * 100), 2),
                "missingness_by_feature": missing_pct,
                "mean_stay_hours": round(float(total_hours / len(dfs)), 1)
            }

        stats_a = analyze_group(patients_a)
        stats_b = analyze_group(patients_b)
        
        return {
            "is_synthetic": self.is_synthetic,
            "hospital_A": stats_a,
            "hospital_B": stats_b,
            "features_summary": {
                "vitals_count": len(VITALS),
                "labs_count": len(LABS),
                "demographics_count": len(DEMOGRAPHICS)
            }
        }

    def load_all_patients(self) -> Dict[str, pd.DataFrame]:
        """Loads all available patients into a dictionary mapping patient_id -> DataFrame."""
        p_list = self.list_patients()
        patients = {}
        for p_info in p_list:
            pid = p_info["patient_id"]
            try:
                patients[pid] = self.load_patient(pid, p_info.get("hospital"))
            except Exception:
                pass
        return patients

    def get_split_patient_ids(self) -> Tuple[List[str], List[str], List[str]]:
        """Returns tuple of (train_ids, val_ids, test_ids)."""
        splits = self.load_splits()
        return splits.get("train", []), splits.get("val", []), splits.get("test", [])


# Alias for backward and forward compatibility
PhysioNetDataLoader = DataLoader
