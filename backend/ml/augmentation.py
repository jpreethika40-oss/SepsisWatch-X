"""
Data Augmentation Module for Sequence (GRU-D) and Tabular (LightGBM) Branches:
1. Sequence Augmentation: Gaussian jitter, random masking dropout, temporal window cropping.
2. Tabular Augmentation: Mixup and synthetic minority over-sampling.
"""

import numpy as np
import pandas as pd
from typing import Tuple, List, Optional


class SequenceAugmenter:
    """Applies physiological data augmentations to hourly sequences for GRU-D."""

    def __init__(
        self,
        jitter_std: float = 0.03,
        mask_dropout_prob: float = 0.15,
        min_window_length: int = 12
    ):
        self.jitter_std = jitter_std
        self.mask_dropout_prob = mask_dropout_prob
        self.min_window_length = min_window_length

    def augment_sequence(
        self,
        values: np.ndarray,
        masks: np.ndarray,
        delta_t: np.ndarray,
        labels: np.ndarray,
        rng: Optional[np.random.Generator] = None
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Applies jitter to observed measurements, drops out observed masks,
        and recalculates delta_t vectors.
        """
        if rng is None:
            rng = np.random.default_rng()

        L, D = values.shape
        aug_vals = values.copy()
        aug_masks = masks.copy()
        aug_delta_t = delta_t.copy()

        # 1. Gaussian jitter on observed values only
        noise = rng.normal(0, self.jitter_std, size=(L, D))
        aug_vals = aug_vals + (noise * aug_masks * aug_vals)

        # 2. Random masking dropout (simulate missing tests)
        dropout_mask = rng.random(size=(L, D)) > self.mask_dropout_prob
        aug_masks = aug_masks * dropout_mask.astype(float)

        # 3. Recalculate delta_t based on dropped masks
        for d in range(D):
            last_seen = 0.0
            first_seen = False
            for t in range(L):
                if aug_masks[t, d] == 1.0:
                    last_seen = 0.0
                    first_seen = True
                else:
                    last_seen = last_seen + 1.0 if first_seen else float(t + 1)
                aug_delta_t[t, d] = last_seen

        return aug_vals, aug_masks, aug_delta_t, labels

    def crop_window(
        self,
        values: np.ndarray,
        masks: np.ndarray,
        delta_t: np.ndarray,
        labels: np.ndarray,
        rng: Optional[np.random.Generator] = None
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Crops a random temporal sub-window from a long ICU stay."""
        if rng is None:
            rng = np.random.default_rng()

        L = values.shape[0]
        if L <= self.min_window_length:
            return values, masks, delta_t, labels

        crop_len = rng.integers(self.min_window_length, L + 1)
        start_idx = rng.integers(0, L - crop_len + 1)
        end_idx = start_idx + crop_len

        return (
            values[start_idx:end_idx],
            masks[start_idx:end_idx],
            delta_t[start_idx:end_idx],
            labels[start_idx:end_idx]
        )


def tabular_mixup_augmentation(
    X: np.ndarray,
    y: np.ndarray,
    alpha: float = 0.2,
    ratio: float = 0.25,
    seed: int = 42
) -> Tuple[np.ndarray, np.ndarray]:
    """Generates synthetic minority examples using feature-space mixup."""
    rng = np.random.default_rng(seed)
    pos_idx = np.where(y == 1)[0]
    if len(pos_idx) < 2:
        return X, y

    n_synth = int(len(pos_idx) * ratio)
    synth_X = []
    synth_y = []

    for _ in range(n_synth):
        i1, i2 = rng.choice(pos_idx, size=2, replace=False)
        lam = rng.beta(alpha, alpha)
        mixed_x = lam * X[i1] + (1 - lam) * X[i2]
        synth_X.append(mixed_x)
        synth_y.append(1)

    X_aug = np.vstack([X, np.array(synth_X)])
    y_aug = np.concatenate([y, np.array(synth_y)])
    return X_aug, y_aug
