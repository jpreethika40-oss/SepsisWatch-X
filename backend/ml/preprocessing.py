"""
SepsisWatch-X Preprocessing Pipeline:
Forward-fill within patient, binary observation masks, time-since-last-measurement (delta-t),
and leak-free standard scaling.
"""

import os
import joblib
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import yaml

from backend.ml.data_loader import VITALS, LABS, DEMOGRAPHICS, ALL_COLUMNS

FEATURE_COLS = VITALS + LABS


class PreprocessingPipeline:
    """Manages missingness representation, delta-t computation, and scaling."""

    def __init__(self, config_path: str = "config/config.yaml"):
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)

        self.scalers: Dict[str, StandardScaler] = {}
        self.medians: Dict[str, float] = {}
        self.fitted = False

    def fit(self, df_train: pd.DataFrame, hospital: Optional[str] = None):
        """Fits baseline feature medians and scalers on training cohort strictly."""
        hosp_key = hospital or "global"
        
        # 1. Compute empirical medians for features
        meds = {}
        for col in FEATURE_COLS:
            if col in df_train.columns:
                val = df_train[col].median()
                meds[col] = float(val) if not pd.isna(val) else 0.0
        self.medians[hosp_key] = meds

        # 2. Impute with median and fit StandardScaler
        present_cols = [c for c in FEATURE_COLS if c in df_train.columns]
        if present_cols:
            df_imputed = df_train[present_cols].copy()
            for col in present_cols:
                df_imputed[col] = df_imputed[col].fillna(meds[col])

            scaler = StandardScaler()
            scaler.fit(df_imputed)
            self.scalers[hosp_key] = scaler
        self.fitted = True

    def transform_patient(
        self,
        patient_df: pd.DataFrame,
        hospital: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Transforms a single patient time-series:
        1. Computes binary observation masks M_col
        2. Computes time-since-last-measurement delta_t_col
        3. Forward-fills values within patient
        4. Imputes unmeasured initial values with training medians
        """
        hosp_key = hospital if hospital in self.scalers else "global"
        meds = self.medians.get(hosp_key, self.medians.get("global", {}))

        df = patient_df.copy().sort_values("ICULOS").reset_index(drop=True)
        n_hours = len(df)

        transformed = df.copy()
        new_cols = {}

        for col in FEATURE_COLS:
            if col not in df.columns:
                continue

            vals = df[col].values
            mask = (~pd.isna(vals)).astype(float)
            new_cols[f"mask_{col}"] = mask

            # Time since last measurement (delta_t)
            delta_t = np.zeros(n_hours, dtype=float)
            last_seen = 0.0
            first_seen = False

            for t in range(n_hours):
                if mask[t] == 1.0:
                    last_seen = 0.0
                    first_seen = True
                else:
                    if first_seen:
                        last_seen += 1.0
                    else:
                        last_seen = float(t + 1)
                delta_t[t] = last_seen

            new_cols[f"dt_{col}"] = delta_t

            # Forward-fill within patient
            ffilled = df[col].ffill()
            default_med = meds.get(col, 0.0)
            transformed[col] = ffilled.fillna(default_med)

        # Concatenate all mask and dt columns at once to prevent fragmentation
        new_df = pd.DataFrame(new_cols, index=transformed.index)
        return pd.concat([transformed, new_df], axis=1)

    def transform_cohort(
        self,
        patients_dfs: List[pd.DataFrame],
        hospital: Optional[str] = None
    ) -> pd.DataFrame:
        """Processes a list of patient DataFrames into a unified DataFrame."""
        processed_list = [self.transform_patient(pdf, hospital) for pdf in patients_dfs]
        return pd.concat(processed_list, ignore_index=True)

    def save(self, filepath: str = "models/preprocessor.pkl"):
        """Saves fitted scalers and medians to disk."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"scalers": self.scalers, "medians": self.medians, "fitted": self.fitted}, filepath)

    def load(self, filepath: str = "models/preprocessor.pkl"):
        """Loads preprocessor artifacts."""
        data = joblib.load(filepath)
        self.scalers = data["scalers"]
        self.medians = data["medians"]
        self.fitted = data["fitted"]
