"""
Trajectory Phenotypes & Dynamic Time Warping (DTW) Clinical Clustering.
Discovers longitudinal patient risk sub-phenotypes and retrieves nearest-neighbor
reference trajectories across historic ICU stays.
"""

from typing import Dict, List, Any, Tuple, Optional
import numpy as np


PHENOTYPE_PROFILES = [
    {
        "id": "phenotype_1",
        "name": "Fulminant Hyper-Acute Shock",
        "description": "Rapid acceleration from baseline to severe shock within <6 hours. Marked by tachycardia and steep MAP collapse.",
        "prevalence_pct": 14.5,
        "clinical_urgency": "Immediate Vasopressor & Resuscitation Protocol"
    },
    {
        "id": "phenotype_2",
        "name": "Indolent Subacute Deterioration",
        "description": "Gradual, insidious progression over 18-36 hours with subtle lactate rise and respiratory creep.",
        "prevalence_pct": 28.0,
        "clinical_urgency": "Close Bedside Telemetry & Early Antibiotic Review"
    },
    {
        "id": "phenotype_3",
        "name": "Transient Inflammatory Flare",
        "description": "Transient febrile or post-surgical inflammatory spike that spontaneously stabilizes without sepsis progression.",
        "prevalence_pct": 22.5,
        "clinical_urgency": "Avoid Over-Treatment / Monitor without Reflex Alerts"
    },
    {
        "id": "phenotype_4",
        "name": "Stable Convalescent Trajectory",
        "description": "Continuous low risk trajectory with stable cardiopulmonary indices throughout ICU stay.",
        "prevalence_pct": 35.0,
        "clinical_urgency": "Routine Floor Step-Down Candidate"
    }
]


class TrajectoryPhenotyping:
    """Classifies risk sequences into clinical phenotypes and identifies similar patient trajectories."""

    @staticmethod
    def dtw_distance(s1: np.ndarray, s2: np.ndarray) -> float:
        """Computes Dynamic Time Warping (DTW) distance between two 1D sequences."""
        n, m = len(s1), len(s2)
        if n == 0 or m == 0:
            return 999.0

        dtw_matrix = np.full((n + 1, m + 1), np.inf)
        dtw_matrix[0, 0] = 0.0

        for i in range(1, n + 1):
            for j in range(1, m + 1):
                cost = abs(s1[i - 1] - s2[j - 1])
                dtw_matrix[i, j] = cost + min(
                    dtw_matrix[i - 1, j],      # insertion
                    dtw_matrix[i, j - 1],      # deletion
                    dtw_matrix[i - 1, j - 1]   # match
                )

        return float(dtw_matrix[n, m])

    @classmethod
    def classify_trajectory(
        cls,
        risk_sequence: List[float]
    ) -> Dict[str, Any]:
        """
        Assigns trajectory to the closest prototype phenotype.
        """
        arr = np.array(risk_sequence, dtype=float)
        if len(arr) == 0:
            arr = np.array([0.05])

        max_risk = float(np.max(arr))
        mean_risk = float(np.mean(arr))
        delta = float(arr[-1] - arr[0]) if len(arr) > 1 else 0.0

        # Phenotype heuristics
        if max_risk >= 0.65 and delta >= 0.30:
            phenotype = PHENOTYPE_PROFILES[0]  # Fulminant
        elif max_risk >= 0.45 and delta > 0.05 and len(arr) >= 6:
            phenotype = PHENOTYPE_PROFILES[1]  # Indolent
        elif max_risk >= 0.40 and arr[-1] < 0.25:
            phenotype = PHENOTYPE_PROFILES[2]  # Transient Flare
        else:
            phenotype = PHENOTYPE_PROFILES[3]  # Stable

        return {
            "phenotype_id": phenotype["id"],
            "phenotype_name": phenotype["name"],
            "description": phenotype["description"],
            "clinical_urgency": phenotype["clinical_urgency"],
            "trajectory_metrics": {
                "peak_risk": round(max_risk, 3),
                "mean_risk": round(mean_risk, 3),
                "velocity": round(delta / max(1, len(arr)), 4)
            }
        }

    @classmethod
    def find_similar_patients(
        cls,
        query_trajectory: List[float],
        library_trajectories: List[Dict[str, Any]],
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Finds the top-K most similar historical patient stays using DTW distance.
        """
        q = np.array(query_trajectory, dtype=float)
        scored = []

        for item in library_trajectories:
            ref_seq = np.array(item.get("risk_trajectory", []), dtype=float)
            dist = cls.dtw_distance(q, ref_seq)
            similarity_pct = max(0.0, 100.0 * (1.0 - dist / (len(q) + len(ref_seq) + 1e-5)))

            scored.append({
                "patient_id": item["patient_id"],
                "similarity_score": round(similarity_pct, 1),
                "dtw_distance": round(dist, 3),
                "outcome": item.get("outcome", "Discharged Stable"),
                "clinical_onset_hour": item.get("onset_hour"),
                "trajectory": item.get("risk_trajectory", [])
            })

        scored.sort(key=lambda x: x["dtw_distance"])
        return scored[:top_k]
