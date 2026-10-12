"""
Phase 2 Unit Tests:
1. PhysioNet Utility Score vs Hand-Computed Examples
2. Rule Baseline Models (SIRS, qSOFA)
3. Preprocessing Pipeline (forward-fill, masks, delta-t)
4. Hand-Crafted Feature Engineering (shock index, rolling slope)
5. Sequence & Tabular Data Augmentation
6. Patient Split Leakage Verification
"""

import pytest
import numpy as np
import pandas as pd

from backend.ml.utility_score import (
    compute_physionet_utility_matrix,
    evaluate_physionet_utility,
    compute_expected_calibration_error
)
from backend.ml.rule_baseline import SIRSRuleModel, qSOFARuleModel
from backend.ml.preprocessing import PreprocessingPipeline
from backend.ml.features import FeatureEngineer
from backend.ml.augmentation import SequenceAugmenter, tabular_mixup_augmentation
from backend.ml.data_loader import DataLoader


def test_physionet_utility_hand_computed_cases():
    """Validates utility score rewards and penalties against canonical challenge rules."""
    L = 20
    t_sep = 15 # onset at hour 15

    u_1, u_0 = compute_physionet_utility_matrix(t_sep, L)

    # 1. Optimal window: between t_sep - 6 (hour 9) and t_sep (hour 15), u_1 must be +1.0
    for h in range(9, 16):
        t_idx = h - 1
        assert np.isclose(u_1[t_idx], 1.0), f"Hour {h} should have optimal reward 1.0, got {u_1[t_idx]}"

    # 2. Too early false alarm: before t_sep - 12 (hour 1, 2), u_1 must be -0.05
    assert np.isclose(u_1[0], -0.05), f"Early false alarm hour 1 should be -0.05, got {u_1[0]}"
    assert np.isclose(u_1[1], -0.05), f"Early false alarm hour 2 should be -0.05, got {u_1[1]}"

    # 3. Non-septic patient: all positive predictions should be penalized -0.05
    u_1_neg, u_0_neg = compute_physionet_utility_matrix(None, L)
    assert np.all(u_1_neg == -0.05)
    assert np.all(u_0_neg == 0.0)

    # 4. Normalized utility: oracle predictor must yield normalized utility exactly 1.0
    labels = np.zeros(L, dtype=int)
    labels[8:] = 1
    # Oracle predicts 1 during optimal reward window
    oracle_preds = (u_1 > u_0).astype(int)
    res = evaluate_physionet_utility([labels], [oracle_preds], [t_sep])
    assert np.isclose(res["normalized_utility"], 1.0)


def test_rule_baselines_sirs_and_qsofa():
    """Tests clinical decision boundaries for SIRS and qSOFA rules."""
    sirs = SIRSRuleModel()
    qsofa = qSOFARuleModel()

    # Normal patient
    normal_row = {"HR": 72.0, "Temp": 36.8, "Resp": 16.0, "WBC": 7.0, "SBP": 120.0}
    is_sirs, s_score = sirs.predict_hour(normal_row)
    is_qsofa, q_score = qsofa.predict_hour(normal_row)
    assert is_sirs == 0
    assert is_qsofa == 0

    # Severe septic patient: tachycardia (115), fever (38.8), tachypnea (26), leukocytosis (16.2), hypotension (85)
    septic_row = {"HR": 115.0, "Temp": 38.8, "Resp": 26.0, "WBC": 16.2, "SBP": 85.0}
    is_sirs_pos, s_score_pos = sirs.predict_hour(septic_row)
    is_qsofa_pos, q_score_pos = qsofa.predict_hour(septic_row)
    assert is_sirs_pos == 1
    assert s_score_pos == 4 # meets all 4 SIRS criteria
    assert is_qsofa_pos == 1
    assert q_score_pos >= 2 # meets Resp >= 22 and SBP <= 100


def test_preprocessing_masks_and_delta_t():
    """Validates binary mask creation, forward-fill, and delta-t progression."""
    preproc = PreprocessingPipeline()
    
    # Create sample patient DataFrame with intermittent observations
    data = {
        "ICULOS": [1, 2, 3, 4, 5],
        "HR": [80.0, np.nan, np.nan, 95.0, np.nan],
        "SBP": [120.0, 118.0, np.nan, np.nan, 110.0],
        "Age": [65.0] * 5,
        "Gender": [1] * 5,
        "Unit1": [1.0] * 5,
        "Unit2": [0.0] * 5,
        "HospAdmTime": [-5.0] * 5,
        "SepsisLabel": [0, 0, 0, 0, 0]
    }
    df = pd.DataFrame(data)

    preproc.fit(df)
    transformed = preproc.transform_patient(df)

    # 1. Mask checks for HR
    assert transformed["mask_HR"].iloc[0] == 1.0
    assert transformed["mask_HR"].iloc[1] == 0.0
    assert transformed["mask_HR"].iloc[2] == 0.0
    assert transformed["mask_HR"].iloc[3] == 1.0
    assert transformed["mask_HR"].iloc[4] == 0.0

    # 2. Delta-t checks: resets to 0 when observed, increments by 1
    assert transformed["dt_HR"].iloc[0] == 0.0 # observed
    assert transformed["dt_HR"].iloc[1] == 1.0 # 1h missing
    assert transformed["dt_HR"].iloc[2] == 2.0 # 2h missing
    assert transformed["dt_HR"].iloc[3] == 0.0 # observed again
    assert transformed["dt_HR"].iloc[4] == 1.0 # 1h missing

    # 3. Forward fill check: HR at hour 2 and 3 should equal 80.0
    assert transformed["HR"].iloc[1] == 80.0
    assert transformed["HR"].iloc[2] == 80.0
    assert transformed["HR"].iloc[3] == 95.0
    assert transformed["HR"].iloc[4] == 95.0


def test_feature_engineering_shock_index_and_rolling():
    """Validates physiological shock indices and rolling feature generation."""
    feat_eng = FeatureEngineer(windows=[6])
    
    data = {
        "ICULOS": list(range(1, 10)),
        "HR": [70.0, 75.0, 80.0, 85.0, 90.0, 100.0, 110.0, 115.0, 120.0],
        "SBP": [120.0, 118.0, 115.0, 110.0, 105.0, 100.0, 95.0, 90.0, 85.0],
        "MAP": [85.0, 84.0, 82.0, 80.0, 78.0, 75.0, 70.0, 68.0, 65.0],
        "Age": [60.0] * 9,
        "Resp": [16.0] * 9,
        "Temp": [37.0] * 9,
        "Lactate": [1.0] * 9,
        "WBC": [7.0] * 9,
        "Creatinine": [1.0] * 9
    }
    df = pd.DataFrame(data)

    feat_df = feat_eng.extract_patient_features(df)

    # 1. Shock index = HR / SBP
    expected_si_last = 120.0 / 85.0
    assert np.isclose(feat_df["shock_index"].iloc[-1], expected_si_last)

    # 2. Rolling max for HR over 6h window
    assert "HR_roll_6h_max" in feat_df.columns
    assert feat_df["HR_roll_6h_max"].iloc[-1] == 120.0

    # 3. Rolling slope for HR should be positive (deteriorating tachycardia)
    assert feat_df["HR_roll_6h_slope"].iloc[-1] > 0.0


def test_sequence_augmentation_shape_and_masks():
    """Tests that sequence augmentation maintains shapes and produces valid masks."""
    aug = SequenceAugmenter(jitter_std=0.03, mask_dropout_prob=0.2)
    L, D = 24, 10
    values = np.random.uniform(50, 120, size=(L, D))
    masks = np.ones((L, D))
    delta_t = np.zeros((L, D))
    labels = np.zeros(L)

    aug_v, aug_m, aug_dt, aug_l = aug.augment_sequence(values, masks, delta_t, labels)

    assert aug_v.shape == (L, D)
    assert aug_m.shape == (L, D)
    assert aug_dt.shape == (L, D)
    # Mask dropout should have turned some 1s into 0s
    assert np.sum(aug_m) < np.sum(masks)


def test_patient_split_leakage():
    """Guarantees strictly zero patient overlap between train, val, and test splits."""
    loader = DataLoader()
    assert loader.verify_split_leakage() is True
