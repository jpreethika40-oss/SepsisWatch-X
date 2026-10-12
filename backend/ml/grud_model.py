"""
PyTorch 2.x Implementation of GRU-D (Gated Recurrent Unit with Decay).
Reference: Che, Z., Purushotham, S., Cho, K., Sontag, D., & Liu, Y. (2018).
Recurrent Neural Networks for Multivariate Time Series with Missing Values.
Scientific Reports, 8(1), 6085.
"""

import math
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader


class TemporalDecay(nn.Module):
    """Computes exponential temporal decay factors gamma_t in (0, 1]."""

    def __init__(self, input_dim: int, output_dim: int):
        super().__init__()
        self.W = nn.Parameter(torch.Tensor(output_dim, input_dim))
        self.b = nn.Parameter(torch.Tensor(output_dim))
        self.reset_parameters()

    def reset_parameters(self):
        stdv = 1.0 / math.sqrt(self.W.size(1))
        self.W.data.uniform_(-stdv, stdv)
        self.b.data.fill_(0)

    def forward(self, delta_t: torch.Tensor) -> torch.Tensor:
        # delta_t shape: [batch, input_dim]
        # gamma = exp( -relu(W * delta_t + b) )
        gamma = torch.exp(-F.relu(F.linear(delta_t, self.W, self.b)))
        return gamma


class GRUDCell(nn.Module):
    """Single-step GRU-D recurrent cell with input and hidden decay."""

    def __init__(self, input_dim: int, hidden_dim: int):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim

        # Decay modules
        self.decay_x = TemporalDecay(input_dim, input_dim)
        self.decay_h = TemporalDecay(input_dim, hidden_dim)

        # GRU Gates (Inputs: x_decayed, h_decayed, mask)
        # Total input dimension for gates: input_dim + hidden_dim + input_dim
        combined_dim = input_dim * 2 + hidden_dim

        self.w_z = nn.Linear(combined_dim, hidden_dim)
        self.w_r = nn.Linear(combined_dim, hidden_dim)
        self.w_h = nn.Linear(input_dim * 2 + hidden_dim, hidden_dim)

    def forward(
        self,
        x_last: torch.Tensor,
        m: torch.Tensor,
        dt: torch.Tensor,
        x_mean: torch.Tensor,
        h_prev: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        # 1. Decay input toward empirical mean
        gamma_x = self.decay_x(dt)
        x_decayed = m * x_last + (1.0 - m) * (gamma_x * x_last + (1.0 - gamma_x) * x_mean)

        # 2. Decay hidden state toward 0
        gamma_h = self.decay_h(dt)
        h_decayed = gamma_h * h_prev

        # 3. Concatenate [x_decayed, h_decayed, m]
        inputs_combined = torch.cat([x_decayed, h_decayed, m], dim=1)

        # 4. Standard GRU equations
        z = torch.sigmoid(self.w_z(inputs_combined))
        r = torch.sigmoid(self.w_r(inputs_combined))

        inputs_candidate = torch.cat([x_decayed, r * h_decayed, m], dim=1)
        h_candidate = torch.tanh(self.w_h(inputs_candidate))

        h_new = (1.0 - z) * h_decayed + z * h_candidate
        return h_new, x_decayed


class GRUDModel(nn.Module):
    """Full recurrent GRU-D network with classification head."""

    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 64,
        num_layers: int = 1,
        dropout: float = 0.2,
        x_mean: Optional[np.ndarray] = None
    ):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Register empirical feature mean buffer
        mean_tensor = torch.zeros(input_dim) if x_mean is None else torch.tensor(x_mean, dtype=torch.float32)
        self.register_buffer("x_mean", mean_tensor)

        self.cells = nn.ModuleList([
            GRUDCell(input_dim if i == 0 else hidden_dim, hidden_dim)
            for i in range(num_layers)
        ])

        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1)
        )

    def forward(
        self,
        values: torch.Tensor,
        masks: torch.Tensor,
        delta_t: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            values: [batch, seq_len, input_dim]
            masks: [batch, seq_len, input_dim]
            delta_t: [batch, seq_len, input_dim]
        Returns:
            logits: [batch, seq_len, 1]
            last_hidden: [batch, hidden_dim]
        """
        batch_size, seq_len, _ = values.shape
        device = values.device

        # Initialize hidden states
        h = [torch.zeros(batch_size, self.hidden_dim, device=device) for _ in range(self.num_layers)]
        all_hidden_steps = []

        for t in range(seq_len):
            x_step = values[:, t, :]
            m_step = masks[:, t, :]
            dt_step = delta_t[:, t, :]

            curr_input = x_step
            curr_mask = m_step
            curr_dt = dt_step
            curr_mean = self.x_mean

            for layer_idx, cell in enumerate(self.cells):
                h[layer_idx], _ = cell(
                    curr_input, curr_mask, curr_dt, curr_mean, h[layer_idx]
                )
                curr_input = self.dropout(h[layer_idx])
                # For upper layers, mask and dt are dense
                curr_mask = torch.ones(batch_size, self.hidden_dim, device=device)
                curr_dt = torch.ones(batch_size, self.hidden_dim, device=device)
                curr_mean = torch.zeros(self.hidden_dim, device=device)

            all_hidden_steps.append(h[-1].unsqueeze(1))

        # [batch, seq_len, hidden_dim]
        seq_hidden = torch.cat(all_hidden_steps, dim=1)
        logits = self.classifier(seq_hidden)
        last_hidden = h[-1]

        return logits, last_hidden


class PatientSequenceDataset(Dataset):
    """PyTorch Dataset for padded ICU patient sequences."""

    def __init__(
        self,
        values_list: List[np.ndarray],
        masks_list: List[np.ndarray],
        delta_t_list: List[np.ndarray],
        labels_list: List[np.ndarray],
        hospital_list: Optional[List[int]] = None,
        max_seq_len: int = 48
    ):
        self.values = values_list
        self.masks = masks_list
        self.delta_t = delta_t_list
        self.labels = labels_list
        self.hospitals = hospital_list or [0] * len(values_list)
        self.max_len = max_seq_len

    def __len__(self):
        return len(self.values)

    def __getitem__(self, idx):
        v = self.values[idx]
        m = self.masks[idx]
        dt = self.delta_t[idx]
        y = self.labels[idx]
        hosp = self.hospitals[idx]

        L, D = v.shape
        crop_L = min(L, self.max_len)

        # Pad or truncate to max_len
        pad_v = np.zeros((self.max_len, D), dtype=np.float32)
        pad_m = np.zeros((self.max_len, D), dtype=np.float32)
        pad_dt = np.zeros((self.max_len, D), dtype=np.float32)
        pad_y = np.zeros(self.max_len, dtype=np.float32)
        seq_mask = np.zeros(self.max_len, dtype=np.float32)

        pad_v[:crop_L] = v[:crop_L]
        pad_m[:crop_L] = m[:crop_L]
        pad_dt[:crop_L] = dt[:crop_L]
        pad_y[:crop_L] = y[:crop_L]
        seq_mask[:crop_L] = 1.0

        return {
            "values": torch.tensor(pad_v, dtype=torch.float32),
            "masks": torch.tensor(pad_m, dtype=torch.float32),
            "delta_t": torch.tensor(pad_dt, dtype=torch.float32),
            "labels": torch.tensor(pad_y, dtype=torch.float32),
            "seq_mask": torch.tensor(seq_mask, dtype=torch.float32),
            "hospital": torch.tensor(hosp, dtype=torch.long),
            "actual_len": crop_L
        }
