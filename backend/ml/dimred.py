"""
Dimensionality Reduction Module: PCA, t-SNE, and UMAP Projections.
Analyzes latent clinical manifolds and verifies domain adaptation invariance
(Before DANN domain divergence vs After DANN invariant manifold).
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import umap


class DimensionalityReducer:
    """Computes 2D and 3D PCA, t-SNE, and UMAP projections on clinical embeddings."""

    def __init__(self, random_state: int = 42):
        self.random_state = random_state

    def fit_transform_pca(self, X: np.ndarray, n_components: int = 3) -> Dict[str, Any]:
        """Principal Component Analysis with explained variance ratios."""
        pca = PCA(n_components=n_components, random_state=self.random_state)
        coords = pca.fit_transform(X)
        return {
            "coordinates": coords,
            "explained_variance_ratio": pca.explained_variance_ratio_.tolist(),
            "total_variance_explained": float(np.sum(pca.explained_variance_ratio_))
        }

    def fit_transform_tsne(self, X: np.ndarray, n_components: int = 2, perplexity: float = 30.0) -> np.ndarray:
        """t-Distributed Stochastic Neighbor Embedding."""
        # Use initial PCA to 30 dims if input dimension is large
        if X.shape[1] > 30:
            X = PCA(n_components=30, random_state=self.random_state).fit_transform(X)

        tsne = TSNE(
            n_components=n_components,
            perplexity=min(perplexity, max(float(len(X) - 1) / 3.0, 5.0)),
            random_state=self.random_state,
            max_iter=1000
        )
        return tsne.fit_transform(X)

    def fit_transform_umap(self, X: np.ndarray, n_components: int = 2, n_neighbors: int = 15) -> np.ndarray:
        """Uniform Manifold Approximation and Projection (UMAP)."""
        reducer = umap.UMAP(
            n_components=n_components,
            n_neighbors=min(n_neighbors, len(X) - 1),
            min_dist=0.1,
            random_state=self.random_state
        )
        return reducer.fit_transform(X)

    def compute_all_projections(
        self,
        X_before: np.ndarray,
        X_after: np.ndarray,
        labels: np.ndarray,
        hospitals: List[str]
    ) -> Dict[str, Any]:
        """
        Computes 2D & 3D PCA, t-SNE, and UMAP for both before and after DANN adaptation.
        """
        pca_before = self.fit_transform_pca(X_before, n_components=3)
        pca_after = self.fit_transform_pca(X_after, n_components=3)

        tsne_before = self.fit_transform_tsne(X_before, n_components=2)
        tsne_after = self.fit_transform_tsne(X_after, n_components=2)

        umap_before = self.fit_transform_umap(X_before, n_components=2)
        umap_after = self.fit_transform_umap(X_after, n_components=2)

        return {
            "pca": {
                "before": pca_before["coordinates"].tolist(),
                "after": pca_after["coordinates"].tolist(),
                "var_before": pca_before["explained_variance_ratio"],
                "var_after": pca_after["explained_variance_ratio"]
            },
            "tsne": {
                "before": tsne_before.tolist(),
                "after": tsne_after.tolist()
            },
            "umap": {
                "before": umap_before.tolist(),
                "after": umap_after.tolist()
            },
            "labels": labels.tolist(),
            "hospitals": list(hospitals)
        }

    def export_embeddings_json(self, projections: Dict[str, Any], filepath: str = "results/embeddings.json"):
        """Saves calculated projections to JSON."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, "w") as f:
            json.dump(projections, f, indent=2)
