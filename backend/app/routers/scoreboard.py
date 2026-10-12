"""
FastAPI Router for Cross-Hospital Transfer Matrix, Benchmarks, and Scientific Figures.
"""

import json
from pathlib import Path
from typing import Dict, Any, List
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["Scoreboard & Benchmarks"])


@router.get("/scoreboard")
async def get_scoreboard():
    """Returns cross-hospital transfer matrix results and CinC 2019 leaderboard comparisons."""
    matrix_path = Path("results/evaluation_matrix.json")
    comp_path = Path("results/benchmarks_comparison.json")

    matrix = {}
    if matrix_path.exists():
        with open(matrix_path, "r") as f:
            matrix = json.load(f)

    comp = {}
    if comp_path.exists():
        with open(comp_path, "r") as f:
            comp = json.load(f)

    return {
        "evaluation_matrix": matrix,
        "benchmarks_comparison": comp
    }


@router.get("/figures")
async def get_figures():
    """Returns metadata and scientific insights for all 11 analytical figures."""
    insights_path = Path("results/figure_insights.json")
    if insights_path.exists():
        with open(insights_path, "r") as f:
            return json.load(f)
    return []
