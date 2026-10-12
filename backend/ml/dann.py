"""
Domain-Adversarial Neural Network (DANN) for Cross-Hospital Transfer.
Reference: Ganin, Y., Ustinova, E., Ajakan, H., Germain, P., Larochelle, H.,
Laviolette, F., Marchand, M., & Lempitsky, V. (2016).
Domain-Adversarial Training of Neural Networks. JMLR 17(59):1-35.
"""

from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.autograd import Function

from backend.ml.grud_model import GRUDModel
from backend.ml.preprocessing import FEATURE_COLS


class GradientReversalFunction(Function):
    """
    Gradient Reversal Layer (GRL).
    Forward pass: Identity mapping.
    Backward pass: Multiplies gradients by -alpha.
    """

    @staticmethod
    def forward(ctx, x: torch.Tensor, alpha: float) -> torch.Tensor:
        ctx.alpha = alpha
        return x.view_as(x)

    @staticmethod
    def backward(ctx, grad_output: torch.Tensor) -> Tuple[torch.Tensor, None]:
        output = grad_output.neg() * ctx.alpha
        return output, None


class GradientReversal(nn.Module):
    """Module wrapper for GradientReversalFunction."""

    def __init__(self, alpha: float = 1.0):
        super().__init__()
        self.alpha = alpha

    def set_alpha(self, alpha: float):
        self.alpha = float(alpha)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return GradientReversalFunction.apply(x, self.alpha)


def compute_dann_lambda(progress: float, gamma: float = 10.0) -> float:
    """
    Dynamic logarithmic/sigmoid lambda schedule:
    lambda(p) = 2 / (1 + exp(-gamma * p)) - 1
    where p in [0, 1] is training progress.
    """
    p = float(np.clip(progress, 0.0, 1.0))
    return float(2.0 / (1.0 + np.exp(-gamma * p)) - 1.0)


class DomainDiscriminator(nn.Module):
    """
    Adversarial discriminator classifying hospital source (e.g., Hospital A vs Hospital B).
    """

    def __init__(self, hidden_dim: int = 64, dropout: float = 0.2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(16, 1)
        )

    def forward(self, h: torch.Tensor) -> torch.Tensor:
        return self.net(h)


class DANNModel(nn.Module):
    """
    Full DANN Architecture:
    - Backbone Feature Extractor (GRU-D)
    - Task Classifier (Sepsis early warning logits)
    - Domain Discriminator with Gradient Reversal Layer
    """

    def __init__(
        self,
        input_dim: int = 34,
        hidden_dim: int = 64,
        num_layers: int = 1,
        dropout: float = 0.2,
        x_mean: Optional[np.ndarray] = None
    ):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim

        # Backbone temporal model
        self.grud = GRUDModel(
            input_dim=input_dim,
            hidden_dim=hidden_dim,
            num_layers=num_layers,
            dropout=dropout,
            x_mean=x_mean
        )

        self.grl = GradientReversal(alpha=1.0)
        self.domain_discriminator = DomainDiscriminator(hidden_dim=hidden_dim, dropout=dropout)

    def set_grl_alpha(self, alpha: float):
        """Updates reversal strength according to progress schedule."""
        self.grl.set_alpha(alpha)

    def extract_features(
        self,
        values: torch.Tensor,
        masks: torch.Tensor,
        delta_t: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Returns:
            seq_logits: [batch, seq_len, 1]
            last_hidden: [batch, hidden_dim]
        """
        return self.grud(values, masks, delta_t)

    def forward(
        self,
        values: torch.Tensor,
        masks: torch.Tensor,
        delta_t: torch.Tensor,
        alpha: Optional[float] = None
    ) -> Dict[str, torch.Tensor]:
        """
        Forward pass computing task logits, domain logits, and representations.
        """
        if alpha is not None:
            self.set_grl_alpha(alpha)

        # 1. Feature extraction through GRU-D
        task_logits, last_hidden = self.grud(values, masks, delta_t)

        # 2. Domain classification with gradient reversal
        reversed_features = self.grl(last_hidden)
        domain_logits = self.domain_discriminator(reversed_features)

        return {
            "task_logits": task_logits,           # [batch, seq_len, 1]
            "domain_logits": domain_logits,       # [batch, 1]
            "latent_features": last_hidden        # [batch, hidden_dim]
        }
