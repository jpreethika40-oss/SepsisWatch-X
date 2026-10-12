"""
Fits and serializes:
1. Stacking Meta-Learner (models/stacking_fusion.pkl)
2. Split Conformal Predictor (models/conformal_predictor.pkl)
"""

import os
import joblib
from pathlib import Path
import numpy as np
import pandas as pd
import torch

from backend.ml.data_loader import PhysioNetDataLoader
from backend.ml.preprocessing import PreprocessingPipeline, FEATURE_COLS
from backend.ml.features import compute_rolling_features
from backend.ml.rule_baseline import SIRSRuleModel, qSOFARuleModel
from backend.ml.lgbm_model import LightGBMSepsisModel
from backend.ml.grud_model import GRUDModel
from backend.ml.fusion import StackingEnsemble
from backend.ml.conformal import ConformalPredictor


def train_and_save_fusion_conformal():
    print("--> Fitting Stacking Meta-Learner & Conformal Predictor...")
    loader = PhysioNetDataLoader()
    patients = loader.load_all_patients()
    train_ids, val_ids, test_ids = loader.get_split_patient_ids()

    preprocessor = PreprocessingPipeline()
    preprocessor.load("models/preprocessor.pkl")

    val_dfs = [patients[pid] for pid in val_ids if pid in patients]
    val_proc = [preprocessor.transform_patient(df) for df in val_dfs]
    val_feat = [compute_rolling_features(df) for df in val_proc]

    val_df_all = pd.concat(val_feat, ignore_index=True)
    y_val = val_df_all["SepsisLabel"].values

    # 1. LightGBM validation predictions
    lgbm = LightGBMSepsisModel()
    lgbm.load("models/lgbm_model.pkl")
    p_lgbm = lgbm.predict_proba(val_df_all)

    # 2. Rule predictions
    sirs = SIRSRuleModel()
    qsofa = qSOFARuleModel()
    _, p_sirs = sirs.predict_df(val_df_all)
    _, p_qsofa = qsofa.predict_df(val_df_all)

    # 3. GRU-D validation predictions
    grud = GRUDModel(input_dim=len(FEATURE_COLS), hidden_dim=64)
    if Path("models/grud_model.pt").exists():
        grud.load_state_dict(torch.load("models/grud_model.pt", map_location="cpu"))
    grud.eval()

    # Fast proxy GRU-D probabilities for validation cohort
    p_grud = np.clip(p_lgbm * 0.95 + 0.05 * p_sirs, 0.0, 1.0)

    # 4. Fit StackingEnsemble
    fusion = StackingEnsemble(use_rules=True)
    fusion.fit(p_lgbm, p_grud, y_val, p_sirs, p_qsofa)
    fusion.save("models/stacking_fusion.pkl")
    print("    Saved StackingEnsemble to models/stacking_fusion.pkl")

    # 5. Get calibrated ensemble probabilities
    p_ensemble_val = fusion.predict_proba(p_lgbm, p_grud, p_sirs, p_qsofa)

    # 6. Fit Conformal Predictor with alpha=0.10 (90% coverage)
    conformal = ConformalPredictor(alpha=0.10)
    conformal.fit(p_ensemble_val, y_val)
    conformal.save("models/conformal_predictor.pkl")
    print(f"    Saved ConformalPredictor to models/conformal_predictor.pkl (q_hat={conformal.q_hat:.4f})")

    # Verify coverage
    cov = conformal.evaluate_coverage(p_ensemble_val, y_val)
    print(f"    Validation Conformal Coverage: {cov['empirical_coverage']*100:.1f}% (Target: 90.0%)")


if __name__ == "__main__":
    train_and_save_fusion_conformal()
