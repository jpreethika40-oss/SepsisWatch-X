"""
Advanced Physiological Feature Engineering for Tabular LightGBM Branch.
Computes rolling 6h/12h aggregations, temporal velocity slopes, hemodynamic shock indices,
and vital deltas.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple

ROLLING_TARGETS = ["HR", "SBP", "MAP", "Resp", "Temp", "Lactate", "WBC", "Creatinine"]


def compute_linear_slope(series: pd.Series) -> float:
    """Computes rate-of-change (slope) across a sliding window."""
    vals = series.dropna().values
    n = len(vals)
    if n < 2:
        return 0.0
    x = np.arange(n)
    # Simple linear regression slope
    cov = np.cov(x, vals)[0, 1]
    var_x = np.var(x)
    return float(cov / var_x) if var_x > 0 else 0.0


class FeatureEngineer:
    """Generates rolling physiological and demographic features per patient."""

    def __init__(self, windows: List[int] = [6, 12]):
        self.windows = windows

    def extract_patient_features(self, patient_df: pd.DataFrame) -> pd.DataFrame:
        """Extracts engineered features for a single patient time-series."""
        df = patient_df.copy().sort_values("ICULOS").reset_index(drop=True)
        feat_df = df.copy()

        # 1. Physiological Shock Indices
        hr = df["HR"].fillna(75.0)
        sbp = df["SBP"].fillna(120.0).clip(lower=30.0)
        map_press = df["MAP"].fillna(85.0).clip(lower=20.0)
        age = df["Age"].fillna(60.0)

        feat_df["shock_index"] = hr / sbp
        feat_df["modified_shock_index"] = hr / map_press
        feat_df["age_shock_index"] = age * (hr / sbp)

        # BUN to Creatinine ratio
        if "BUN" in df.columns and "Creatinine" in df.columns:
            bun = df["BUN"].fillna(15.0)
            creat = df["Creatinine"].fillna(1.0).clip(lower=0.2)
            feat_df["bun_creat_ratio"] = bun / creat

        # 2. Rolling Window Features (6h and 12h)
        for w in self.windows:
            for col in ROLLING_TARGETS:
                if col not in df.columns:
                    continue

                roll = df[col].rolling(window=w, min_periods=1)
                feat_df[f"{col}_roll_{w}h_mean"] = roll.mean()
                feat_df[f"{col}_roll_{w}h_min"] = roll.min()
                feat_df[f"{col}_roll_{w}h_max"] = roll.max()
                feat_df[f"{col}_roll_{w}h_std"] = roll.std().fillna(0.0)

                # Linear slope over window
                feat_df[f"{col}_roll_{w}h_slope"] = (
                    df[col].rolling(window=w, min_periods=2)
                    .apply(compute_linear_slope, raw=False)
                    .fillna(0.0)
                )

        # 3. Vital Deltas (Current - 1h, Current - 6h)
        for col in ["HR", "SBP", "MAP", "Resp", "Temp"]:
            if col in df.columns:
                feat_df[f"{col}_delta_1h"] = df[col].diff(periods=1).fillna(0.0)
                feat_df[f"{col}_delta_6h"] = df[col].diff(periods=6).fillna(0.0)

        # 4. Cumulative Lab Ordering Activity (Clinical Vigilance Count)
        mask_cols = [c for c in df.columns if c.startswith("mask_")]
        if mask_cols:
            feat_df["lab_activity_12h"] = (
                df[mask_cols].sum(axis=1).rolling(window=12, min_periods=1).sum()
            )

        return feat_df

    def transform_cohort(self, patients_dfs: List[pd.DataFrame]) -> pd.DataFrame:
        """Extracts features across a cohort of patients."""
        extracted = [self.extract_patient_features(p) for p in patients_dfs]
        return pd.concat(extracted, ignore_index=True)


def compute_rolling_features(patient_df: pd.DataFrame) -> pd.DataFrame:
    """Convenience helper extracting rolling features for a single patient."""
    fe = FeatureEngineer()
    return fe.extract_patient_features(patient_df)
