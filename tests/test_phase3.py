"""
Unit and Integration Tests for SepsisWatch-X Phase 3 ML Components:
- GRU-D Temporal Network
- DANN (Domain Adversarial Neural Network) & Gradient Reversal Layer (GRL)
- Stacking Meta-Learner with Isotonic Calibration
- Split Conformal Prediction (90% finite-sample coverage)
- Alarm Budget Controller (persistence, cooldown, per-patient cap)
- Dimensionality Reduction (PCA, t-SNE, UMAP)
"""

import os
import pytest
import numpy as np
try:
    import torch
    import torch.nn as nn
    from backend.ml.grud_model import GRUDModel, PatientSequenceDataset
    from backend.ml.dann import DANNModel, GradientReversalFunction, compute_dann_lambda
    HAS_TORCH = True
except (ImportError, OSError):
    HAS_TORCH = False

from backend.ml.fusion import StackingEnsemble
from backend.ml.conformal import ConformalPredictor
from backend.ml.alert_policy import AlarmBudgetController
from backend.ml.dimred import DimensionalityReducer

if not HAS_TORCH:
    pytestmark = pytest.mark.skip(reason="PyTorch native DLL not loadable on current OS environment")


class TestGRUDModel:
    """Tests for GRU-D temporal neural architecture."""

    def test_grud_forward_backward(self):
        batch_size = 4
        seq_len = 12
        input_dim = 34
        hidden_dim = 32

        model = GRUDModel(input_dim=input_dim, hidden_dim=hidden_dim, num_layers=1)
        vals = torch.randn(batch_size, seq_len, input_dim)
        masks = torch.ones(batch_size, seq_len, input_dim)
        delta_t = torch.ones(batch_size, seq_len, input_dim)

        logits, last_hidden = model(vals, masks, delta_t)

        assert logits.shape == (batch_size, seq_len, 1)
        assert last_hidden.shape == (batch_size, hidden_dim)

        # Backward test
        loss = logits.sum()
        loss.backward()

        for name, param in model.named_parameters():
            if param.requires_grad:
                assert param.grad is not None
                assert not torch.isnan(param.grad).any()


class TestDANNModel:
    """Tests for DANN domain adaptation and GRL."""

    def test_gradient_reversal_sign_flip(self):
        x = torch.tensor([2.0, -3.0], requires_grad=True)
        alpha = 0.5
        out = GradientReversalFunction.apply(x, alpha)
        loss = (out * torch.tensor([1.0, 1.0])).sum()
        loss.backward()

        # Backward must multiply gradient by -alpha
        expected_grad = torch.tensor([-0.5, -0.5])
        assert torch.allclose(x.grad, expected_grad)

    def test_dann_lambda_schedule(self):
        l_start = compute_dann_lambda(0.0)
        l_mid = compute_dann_lambda(0.5)
        l_end = compute_dann_lambda(1.0)

        assert abs(l_start - 0.0) < 1e-4
        assert 0.0 < l_mid < 1.0
        assert l_end > 0.95

    def test_dann_forward_pass(self):
        batch_size = 4
        seq_len = 10
        input_dim = 34
        hidden_dim = 32

        model = DANNModel(input_dim=input_dim, hidden_dim=hidden_dim)
        vals = torch.randn(batch_size, seq_len, input_dim)
        masks = torch.ones(batch_size, seq_len, input_dim)
        delta_t = torch.ones(batch_size, seq_len, input_dim)

        out = model(vals, masks, delta_t, alpha=0.5)

        assert "task_logits" in out
        assert "domain_logits" in out
        assert "latent_features" in out

        assert out["task_logits"].shape == (batch_size, seq_len, 1)
        assert out["domain_logits"].shape == (batch_size, 1)
        assert out["latent_features"].shape == (batch_size, hidden_dim)


class TestStackingEnsemble:
    """Tests for Stacking Meta-Learner and calibration."""

    def test_stacking_fit_and_predict(self, tmp_path):
        n = 100
        np.random.seed(42)
        y = np.random.binomial(1, 0.2, size=n)
        p_lgbm = np.clip(y * 0.6 + np.random.uniform(0, 0.4, size=n), 0, 1)
        p_grud = np.clip(y * 0.5 + np.random.uniform(0, 0.5, size=n), 0, 1)
        p_sirs = y * 0.4 + 0.1
        p_qsofa = y * 0.3 + 0.1

        ensemble = StackingEnsemble(use_rules=True)
        ensemble.fit(p_lgbm, p_grud, y, p_sirs, p_qsofa)

        preds = ensemble.predict_proba(p_lgbm[:10], p_grud[:10], p_sirs[:10], p_qsofa[:10])
        assert len(preds) == 10
        assert np.all(preds >= 0.0)
        assert np.all(preds <= 1.0)

        # Persistence
        save_file = str(tmp_path / "fusion.pkl")
        ensemble.save(save_file)
        loaded = StackingEnsemble()
        loaded.load(save_file)
        assert loaded.fitted is True


class TestSplitConformalPrediction:
    """Tests for Split Conformal uncertainty bounds."""

    def test_conformal_coverage_guarantee(self, tmp_path):
        np.random.seed(42)
        n_cal = 200
        n_test = 200

        y_cal = np.random.binomial(1, 0.25, size=n_cal)
        probs_cal = np.clip(y_cal * 0.6 + np.random.uniform(0.1, 0.3, size=n_cal), 0.01, 0.99)

        cp = ConformalPredictor(alpha=0.10)  # 90% target coverage
        cp.fit(probs_cal, y_cal)

        assert cp.q_hat is not None
        assert 0.0 < cp.q_hat <= 1.0

        # Evaluate on test set
        y_test = np.random.binomial(1, 0.25, size=n_test)
        probs_test = np.clip(y_test * 0.6 + np.random.uniform(0.1, 0.3, size=n_test), 0.01, 0.99)

        cov_metrics = cp.evaluate_coverage(probs_test, y_test)
        # Check empirical coverage is near 90%
        assert cov_metrics["empirical_coverage"] >= 0.85

        # Check interval bounds
        batch_out = cp.predict_batch(probs_test[:5])
        for item in batch_out:
            assert item["p_lower"] <= item["prob"] <= item["p_upper"]
            assert item["classification"] in {"sepsis", "no_sepsis", "uncertain"}

        # Check persistence
        save_file = str(tmp_path / "conformal.pkl")
        cp.save(save_file)
        loaded = ConformalPredictor()
        loaded.load(save_file)
        assert loaded.fitted is True


class TestAlarmBudgetController:
    """Tests for clinical alarm suppression rules."""

    def test_persistence_cooldown_and_cap(self):
        controller = AlarmBudgetController(tau=0.45, k=2, cooldown=3, max_alarms=2)

        # Risk stream:
        # Hour 1: 0.50 (k=1 -> No alert yet)
        # Hour 2: 0.55 (k=2 -> ALERT 1 FIRES!)
        # Hour 3: 0.60 (In cooldown -> Suppressed)
        # Hour 4: 0.65 (In cooldown -> Suppressed)
        # Hour 5: 0.70 (In cooldown -> Suppressed)
        # Hour 6: 0.50 (Eligible -> ALERT 2 FIRES!)
        # Hour 7: 0.80 (In cooldown -> Suppressed)
        # Hour 10: 0.85 (Cap reached -> Suppressed by cap)
        risks = [0.50, 0.55, 0.60, 0.65, 0.70, 0.50, 0.80, 0.20, 0.50, 0.85]

        res = controller.process_patient_stream(risks)

        # Hour 1
        assert res[0]["is_alert"] is False
        assert res[0]["consecutive_above"] == 1

        # Hour 2
        assert res[1]["is_alert"] is True
        assert res[1]["consecutive_above"] == 2

        # Hour 3
        assert res[2]["is_alert"] is False
        assert res[2]["suppressed_cooldown"] is True

        # Total alarms fired should be exactly 2 (max_alarms)
        fired_alarms = sum(1 for r in res if r["is_alert"])
        assert fired_alarms == 2

    def test_cohort_evaluation_and_sweep(self):
        cohort_risks = {
            "p1": np.array([0.1, 0.2, 0.5, 0.6, 0.2]),
            "p2": np.array([0.1, 0.1, 0.1, 0.1, 0.1])
        }
        cohort_labels = {
            "p1": np.array([0, 0, 1, 1, 1]),
            "p2": np.array([0, 0, 0, 0, 0])
        }

        curve = AlarmBudgetController.sweep_tradeoff_curve(cohort_risks, cohort_labels)
        assert len(curve) > 0
        assert "sensitivity" in curve[0]
        assert "false_alarms_per_day" in curve[0]


class TestDimensionalityReduction:
    """Tests for PCA, t-SNE, UMAP."""

    def test_projections(self):
        np.random.seed(42)
        X = np.random.randn(50, 16)
        reducer = DimensionalityReducer(random_state=42)

        pca_out = reducer.fit_transform_pca(X, n_components=3)
        assert pca_out["coordinates"].shape == (50, 3)
        assert len(pca_out["explained_variance_ratio"]) == 3

        tsne_out = reducer.fit_transform_tsne(X, n_components=2)
        assert tsne_out.shape == (50, 2)

        umap_out = reducer.fit_transform_umap(X, n_components=2)
        assert umap_out.shape == (50, 2)
