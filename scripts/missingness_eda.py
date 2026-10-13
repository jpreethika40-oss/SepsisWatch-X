"""
Missingness and Clinical Telemetry Exploratory Data Analysis (EDA).
Analyzes sparsity distributions, vital vs laboratory sampling frequencies,
and inter-hospital missingness shift between Hospital A and Hospital B.
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.ml.data_loader import DataLoader


def run_missingness_eda():
    loader = DataLoader()
    print("--> Loading ICU cohort data...")
    df = loader.load_all()
    
    print("\n" + "=" * 70)
    print("  SEPSISWATCH-X CLINICAL TELEMETRY MISSINGNESS EDA")
    print("=" * 70)
    
    total_rows = len(df)
    total_patients = df["patient_id"].nunique()
    print(f"Total Patient Hours: {total_rows:,}")
    print(f"Total Unique Patients: {total_patients}")
    print(f"Hospital A Patients: {df[df['hospital'] == 'setA']['patient_id'].nunique()}")
    print(f"Hospital B Patients: {df[df['hospital'] == 'setB']['patient_id'].nunique()}")
    
    # Missingness by feature category
    vital_cols = [c for c in loader.vital_cols if c in df.columns]
    lab_cols = [c for c in loader.lab_cols if c in df.columns]
    
    print("\n--- Vital Signs Missingness (%) ---")
    vital_missing = (df[vital_cols].isna().mean() * 100).sort_values()
    for col, pct in vital_missing.items():
        print(f"  {col:<12}: {pct:5.1f}%")
        
    print("\n--- Key Laboratory Missingness (%) ---")
    lab_missing = (df[lab_cols].isna().mean() * 100).sort_values()
    for col, pct in list(lab_missing.items())[:12]:
        print(f"  {col:<12}: {pct:5.1f}%")
        
    # Inter-hospital missingness disparity
    print("\n--- Inter-Hospital Missingness Comparison (Set A vs Set B) ---")
    comparison = []
    for col in vital_cols[:5] + lab_cols[:5]:
        miss_A = df[df["hospital"] == "setA"][col].isna().mean() * 100
        miss_B = df[df["hospital"] == "setB"][col].isna().mean() * 100
        comparison.append({
            "Feature": col,
            "Set A (%)": f"{miss_A:.1f}%",
            "Set B (%)": f"{miss_B:.1f}%",
            "Delta": f"{abs(miss_A - miss_B):.1f}%"
        })
    comp_df = pd.DataFrame(comparison)
    print(comp_df.to_string(index=False))
    
    # Verification of zero patient leakage across splits
    leakage_ok = loader.verify_split_leakage()
    print(f"\n--> Zero-patient-leakage check: {'PASSED' if leakage_ok else 'FAILED'}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_missingness_eda()
