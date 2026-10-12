"""
Official PhysioNet / Computing in Cardiology Challenge 2019 Utility Score
and Clinical ICU Evaluation Metrics Suite.
Reference: Reyna et al., Critical Care Medicine 2020.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
from sklearn.metrics import roc_auc_score, average_precision_score, f1_score, brier_score_loss


def compute_physionet_utility_matrix(
    t_sepsis: Optional[int],
    length_of_stay: int
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes the 1D utility reward vectors for positive prediction (u_1)
    and negative prediction (u_0) for each hour t in [1, length_of_stay].
    """
    u_1 = np.zeros(length_of_stay, dtype=float)
    u_0 = np.zeros(length_of_stay, dtype=float)

    if t_sepsis is None or t_sepsis > length_of_stay or t_sepsis <= 0:
        # Non-septic patient:
        # Positive prediction is false alarm: -0.05
        # Negative prediction is true negative: 0.0
        u_1[:] = -0.05
        u_0[:] = 0.0
        return u_1, u_0

    # Septic patient onset at hour t_sepsis (1-indexed)
    for t_idx in range(length_of_stay):
        t = t_idx + 1  # 1-indexed hour
        dt = t - t_sepsis

        # Reward/penalty for positive prediction (u_1)
        if dt < -12:
            # Too early: linear penalty from -0.05 to 0.0
            u_1[t_idx] = -0.05
        elif -12 <= dt < -6:
            # Linear rise from 0.0 to 1.0 (sub-optimal early alert)
            u_1[t_idx] = (dt + 12) / 6.0
        elif -6 <= dt <= 0:
            # Optimal early warning window: maximum reward +1.0
            u_1[t_idx] = 1.0
        elif 0 < dt <= 3:
            # Post-onset alert: linearly declining from +1.0 to 0.0
            u_1[t_idx] = 1.0 - (dt / 3.0)
        else:
            # dt > 3: late alert, zero utility
            u_1[t_idx] = 0.0

        # Reward/penalty for negative prediction (u_0)
        if -6 <= dt <= 3:
            # False negative in critical treatment window: penalty down to -2.0
            if dt <= 0:
                u_0[t_idx] = -2.0 * ((dt + 6) / 6.0)
            else:
                u_0[t_idx] = -2.0 * (1.0 - dt / 3.0)
        else:
            u_0[t_idx] = 0.0

    return u_1, u_0


def evaluate_physionet_utility(
    patients_labels: List[np.ndarray],
    patients_preds: List[np.ndarray],
    onset_hours: List[Optional[int]]
) -> Dict[str, float]:
    """
    Computes total and normalized PhysioNet 2019 Utility Score across a patient cohort.
    
    Args:
        patients_labels: List of 1D binary arrays (SepsisLabel) per patient.
        patients_preds: List of 1D binary alert arrays (0 or 1) per patient.
        onset_hours: Clinical onset hour per patient (or None if negative).
        
    Returns:
        Dict with total_utility, optimal_utility, baseline_utility, normalized_utility.
    """
    total_u = 0.0
    optimal_u = 0.0
    no_pred_u = 0.0

    for labels, preds, t_sep in zip(patients_labels, patients_preds, onset_hours):
        L = len(labels)
        if L == 0:
            continue

        u_1, u_0 = compute_physionet_utility_matrix(t_sep, L)

        # Actual classifier utility
        patient_u = np.sum(preds * u_1 + (1 - preds) * u_0)
        total_u += patient_u

        # Oracle optimal classifier utility (predict 1 where u_1 > u_0, 0 elsewhere)
        opt_preds = (u_1 > u_0).astype(float)
        optimal_u += np.sum(opt_preds * u_1 + (1 - opt_preds) * u_0)

        # Inactive baseline (all zeros)
        no_pred_u += np.sum(u_0)

    denom = optimal_u - no_pred_u
    normalized_u = (total_u - no_pred_u) / denom if denom > 0 else 0.0

    return {
        "total_utility": round(float(total_u), 4),
        "optimal_utility": round(float(optimal_u), 4),
        "baseline_utility": round(float(no_pred_u), 4),
        "normalized_utility": round(float(normalized_u), 4)
    }


def compute_expected_calibration_error(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10
) -> float:
    """Computes Expected Calibration Error (ECE)."""
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(y_true)

    for i in range(n_bins):
        in_bin = (y_prob >= bin_edges[i]) & (y_prob < bin_edges[i + 1])
        bin_size = np.sum(in_bin)
        if bin_size > 0:
            avg_prob = np.mean(y_prob[in_bin])
            avg_true = np.mean(y_true[in_bin])
            ece += (bin_size / n) * np.abs(avg_prob - avg_true)

    return round(float(ece), 4)


def compute_clinical_evaluation_suite(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    y_pred: np.ndarray,
    patient_ids: List[str],
    patient_lengths: List[int],
    onset_hours: List[Optional[int]]
) -> Dict[str, Any]:
    """
    Computes complete clinical evaluation metrics:
    AUROC, AUPRC, Utility Score, F1, False Alarms per Patient-Day, Median Lead Time, ECE, Log-Loss.
    """
    auroc = roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0.5
    auprc = average_precision_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0.0
    f1 = f1_score(y_true, y_pred, zero_division=0)
    ece = compute_expected_calibration_error(y_true, y_prob)
    brier = round(float(brier_score_loss(y_true, y_prob)), 4)

    # Segment predictions by patient for PhysioNet utility & alarm dynamics
    pat_labels = []
    pat_preds = []
    start = 0
    total_patient_days = sum(patient_lengths) / 24.0
    false_alarms_count = 0
    lead_times = []

    for idx, (L, t_sep) in enumerate(zip(patient_lengths, onset_hours)):
        end = start + L
        p_y = y_true[start:end]
        p_pred = y_pred[start:end]
        pat_labels.append(p_y)
        pat_preds.append(p_pred)

        # False alarms calculation
        if t_sep is None:
            false_alarms_count += np.sum(p_pred)
        else:
            # Alarms prior to t_sep - 12 are premature false alarms
            early_fa = np.sum(p_pred[:max(0, t_sep - 12)])
            false_alarms_count += early_fa

            # Lead time for first alarm
            alert_hours = np.where(p_pred == 1)[0] + 1
            if len(alert_hours) > 0 and alert_hours[0] <= t_sep:
                lead_times.append(float(t_sep - alert_hours[0]))

        start = end

    utility_res = evaluate_physionet_utility(pat_labels, pat_preds, onset_hours)
    false_alarms_per_day = round(float(false_alarms_count / total_patient_days), 3) if total_patient_days > 0 else 0.0
    median_lead_hours = round(float(np.median(lead_times)), 1) if len(lead_times) > 0 else 0.0

    return {
        "auroc": round(float(auroc), 4),
        "auprc": round(float(auprc), 4),
        "utility_score": utility_res["normalized_utility"],
        "total_utility": utility_res["total_utility"],
        "f1_score": round(float(f1), 4),
        "false_alarms_per_patient_day": false_alarms_per_day,
        "median_hours_early": median_lead_hours,
        "ece": ece,
        "brier_score": brier,
        "total_hours_evaluated": int(len(y_true)),
        "total_patients": int(len(patient_lengths))
    }


def compute_physionet_utility(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.45
) -> float:
    """
    Computes normalized PhysioNet 2019 Utility Score for binary predictions.
    Rewards early/true detection (+1.0), penalizes false alarms (-0.05),
    and heavily penalizes missed sepsis (-2.0).
    """
    y_true = np.asarray(y_true, dtype=int).ravel()
    y_prob = np.asarray(y_prob, dtype=float).ravel()
    y_pred = (y_prob >= threshold).astype(int)

    tp = np.sum((y_true == 1) & (y_pred == 1))
    fp = np.sum((y_true == 0) & (y_pred == 1))
    fn = np.sum((y_true == 1) & (y_pred == 0))
    tn = np.sum((y_true == 0) & (y_pred == 0))

    # Raw utility
    total_u = (tp * 1.0) + (fp * -0.05) + (fn * -2.0) + (tn * 0.0)
    # Inactive baseline (all zeros): predicts 0 everywhere
    baseline_u = (tp + fn) * -2.0
    # Oracle optimal (predicts 1 on all sepsis, 0 on non-sepsis)
    optimal_u = (tp + fn) * 1.0

    denom = optimal_u - baseline_u
    if denom <= 0:
        return 0.0

    norm_u = (total_u - baseline_u) / denom
    return round(float(norm_u), 4)


def compute_classification_metrics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.45
) -> Dict[str, float]:
    """Computes comprehensive classification metrics (AUROC, AUPRC, F1, ECE, Sens, Spec)."""
    y_true = np.asarray(y_true, dtype=int).ravel()
    y_prob = np.asarray(y_prob, dtype=float).ravel()
    y_pred = (y_prob >= threshold).astype(int)

    has_both_classes = len(np.unique(y_true)) > 1
    auroc = roc_auc_score(y_true, y_prob) if has_both_classes else 0.5
    auprc = average_precision_score(y_true, y_prob) if has_both_classes else 0.0
    f1 = f1_score(y_true, y_pred, zero_division=0)
    ece = compute_expected_calibration_error(y_true, y_prob)

    tp = np.sum((y_true == 1) & (y_pred == 1))
    fn = np.sum((y_true == 1) & (y_pred == 0))
    tn = np.sum((y_true == 0) & (y_pred == 0))
    fp = np.sum((y_true == 0) & (y_pred == 1))

    sens = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    spec = (tn / (tn + fp)) if (tn + fp) > 0 else 0.0

    return {
        "auroc": round(float(auroc), 4),
        "auprc": round(float(auprc), 4),
        "f1_score": round(float(f1), 4),
        "sensitivity": round(float(sens), 4),
        "specificity": round(float(spec), 4),
        "ece": round(float(ece), 4)
    }
