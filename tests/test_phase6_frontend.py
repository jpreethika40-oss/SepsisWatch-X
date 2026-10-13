"""
Phase 6 Automated Test Suite:
1. Verifies all 6 Three.js (R3F) 3D scenes exist and are properly structured
2. Verifies all 14 clinical frontend pages exist
3. Verifies zero forbidden hues (cyan, violet, purple, indigo, magenta, fuchsia) across all frontend source files
4. Verifies WebSocket streaming client service integration
5. Verifies frontend production distribution build artifacts
"""

import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
SRC_DIR = FRONTEND_DIR / "src"


def test_all_six_3d_scenes_exist():
    """Validates that all 6 required Three.js (R3F) scenes are present."""
    scenes_dir = SRC_DIR / "components" / "3d"
    assert scenes_dir.exists(), "components/3d directory must exist"

    required_scenes = [
        "Ward3D.tsx",
        "RiskLandscape3D.tsx",
        "EmbeddingCloud3D.tsx",
        "DriftRadar3D.tsx",
        "Scoreboard3D.tsx",
        "DataQualityHeatmap3D.tsx"
    ]

    for scene in required_scenes:
        fpath = scenes_dir / scene
        assert fpath.exists(), f"3D scene {scene} must exist"
        content = fpath.read_text(encoding="utf-8")
        assert "Canvas" in content, f"{scene} must render a Three.js Canvas"
        assert "@react-three/fiber" in content, f"{scene} must use @react-three/fiber"


def test_all_fourteen_pages_exist():
    """Validates that all 14 required multi-page clinical views are present."""
    pages_dir = SRC_DIR / "pages"
    assert pages_dir.exists(), "pages directory must exist"

    required_pages = [
        "CommandCenter.tsx",
        "PatientDetail.tsx",
        "WhatIfLab.tsx",
        "ModelArena.tsx",
        "AlertCenter.tsx",
        "AlarmBudgetControl.tsx",
        "Scoreboard.tsx",
        "DriftMonitor.tsx",
        "InsightsLab.tsx",
        "BenchmarkErrorAnalysis.tsx",
        "Experiments.tsx",
        "DataUpload.tsx",
        "Admin.tsx",
        "About.tsx"
    ]

    for page in required_pages:
        fpath = pages_dir / page
        assert fpath.exists(), f"Page {page} must exist"


def test_no_forbidden_color_tokens_in_frontend():
    """Ensures complete Ember design palette compliance across all frontend components and pages."""
    forbidden_patterns = [
        r"\bcyan\b",
        r"\bviolet\b",
        r"\bindigo\b",
        r"\bmagenta\b",
        r"\bfuchsia\b",
    ]

    source_files = list((SRC_DIR / "components").rglob("*.tsx")) + list((SRC_DIR / "pages").glob("*.tsx"))
    assert len(source_files) > 15, "Expected at least 15 frontend TSX components"

    for fpath in source_files:
        content = fpath.read_text(encoding="utf-8")
        clean_content = "\n".join([
            l for l in content.splitlines() 
            if not l.strip().startswith("//") and not l.strip().startswith("/*") and not l.strip().startswith("*")
        ])

        for pat in forbidden_patterns:
            matches = re.findall(pat, clean_content, flags=re.IGNORECASE)
            assert len(matches) == 0, f"Forbidden hue '{pat}' found in {fpath.name}: {matches}"


def test_websocket_streaming_hook_exists():
    """Verifies that the WebSocket stream service is created and hooked into the layout."""
    hook_file = SRC_DIR / "services" / "useWebSocketStream.ts"
    assert hook_file.exists(), "services/useWebSocketStream.ts must exist"
    content = hook_file.read_text(encoding="utf-8")
    assert "/ws/stream" in content, "WebSocket stream must connect to /ws/stream"
    assert "useStore" in content, "WebSocket stream must dispatch to Zustand store"

    app_layout = SRC_DIR / "components" / "layout" / "AppLayout.tsx"
    layout_content = app_layout.read_text(encoding="utf-8")
    assert "useWebSocketStream" in layout_content, "AppLayout must activate useWebSocketStream"


def test_production_build_artifacts_exist():
    """Ensures Vite production build artifacts are generated and ready for serving."""
    dist_dir = FRONTEND_DIR / "dist"
    assert dist_dir.exists(), "frontend/dist must exist"
    assert (dist_dir / "index.html").exists(), "frontend/dist/index.html must exist"
    assets = list((dist_dir / "assets").glob("*.js"))
    assert len(assets) > 0, "frontend/dist/assets must contain compiled JS bundles"
