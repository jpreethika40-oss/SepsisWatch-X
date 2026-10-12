"""
Rule-Based Clinical Baseline Models for Sepsis Detection:
1. SIRS (Systemic Inflammatory Response Syndrome) Criteria
2. qSOFA (Quick Sepsis-related Organ Failure Assessment) Criteria
"""

import numpy as np
import pandas as pd
from typing import Dict, Tuple, Any


class SIRSRuleModel:
    """Evaluates the 4-part SIRS criteria on hourly clinical records."""
    
    def predict_hour(self, row: Dict[str, Any]) -> Tuple[int, int]:
        """
        Returns (is_positive: 0 or 1, criteria_score: 0 to 4).
        SIRS positive if criteria_score >= 2.
        """
        score = 0
        
        # 1. Temperature: > 38.0 or < 36.0 C
        temp = row.get("Temp")
        if temp is not None and not pd.isna(temp):
            if temp > 38.0 or temp < 36.0:
                score += 1
                
        # 2. Heart Rate: > 90 bpm
        hr = row.get("HR")
        if hr is not None and not pd.isna(hr):
            if hr > 90:
                score += 1
                
        # 3. Respiratory Rate: > 20 bpm or PaCO2 < 32 mmHg
        resp = row.get("Resp")
        paco2 = row.get("PaCO2")
        resp_met = (resp is not None and not pd.isna(resp) and resp > 20)
        paco2_met = (paco2 is not None and not pd.isna(paco2) and paco2 < 32)
        if resp_met or paco2_met:
            score += 1
            
        # 4. WBC: > 12.0 or < 4.0 k/uL
        wbc = row.get("WBC")
        if wbc is not None and not pd.isna(wbc):
            if wbc > 12.0 or wbc < 4.0:
                score += 1
                
        is_positive = 1 if score >= 2 else 0
        return is_positive, score

    def predict_df(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Runs SIRS prediction across a DataFrame of patient hours."""
        preds = []
        scores = []
        for _, row in df.iterrows():
            is_pos, sc = self.predict_hour(row)
            preds.append(is_pos)
            scores.append(sc / 4.0) # normalized score [0, 1]
        return np.array(preds, dtype=int), np.array(scores, dtype=float)


class qSOFARuleModel:
    """Evaluates the 3-part qSOFA bedside criteria."""

    def predict_hour(self, row: Dict[str, Any]) -> Tuple[int, int]:
        """
        Returns (is_positive: 0 or 1, criteria_score: 0 to 3).
        qSOFA positive if criteria_score >= 2.
        """
        score = 0
        
        # 1. Respiratory Rate >= 22 /min
        resp = row.get("Resp")
        if resp is not None and not pd.isna(resp):
            if resp >= 22:
                score += 1
                
        # 2. Systolic Blood Pressure <= 100 mmHg
        sbp = row.get("SBP")
        if sbp is not None and not pd.isna(sbp):
            if sbp <= 100:
                score += 1
                
        # 3. Altered mental status surrogate (EtCO2 or severe base deficit)
        be = row.get("BaseExcess")
        if be is not None and not pd.isna(be) and be < -4.0:
            score += 1

        is_positive = 1 if score >= 2 else 0
        return is_positive, score

    def predict_df(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Runs qSOFA prediction across a DataFrame of patient hours."""
        preds = []
        scores = []
        for _, row in df.iterrows():
            is_pos, sc = self.predict_hour(row)
            preds.append(is_pos)
            scores.append(sc / 3.0) # normalized score [0, 1]
        return np.array(preds, dtype=int), np.array(scores, dtype=float)


# Aliases for backward and forward compatibility
SIRSModel = SIRSRuleModel
QSOFAModel = qSOFARuleModel
QSOFARuleModel = qSOFARuleModel
