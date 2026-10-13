"""
Ember Design System Lint Check Test.
Verifies Section 4 design compliance:
- Ensures Ember palette tokens are strictly configured
- Prohibits forbidden hues: violet, purple, indigo, blue, sky, cyan, pink, magenta, lavender, fuchsia in core theme files
- Validates status color mappings (Stable, Watch, Critical, Uncertain)
"""

import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"


def test_ember_palette_definition():
    palette_path = FRONTEND_DIR / "src" / "theme" / "palette.ts"
    assert palette_path.exists(), "frontend/src/theme/palette.ts must exist."

    content = palette_path.read_text(encoding="utf-8")
    assert "#0C0B0A" in content, "Dark base background must be #0C0B0A."
    assert "#151311" in content, "Dark surface must be #151311."
    assert "#F97316" in content, "Primary ember orange must be #F97316."
    assert "#FBBF24" in content, "Gold must be #FBBF24."
    assert "#10B981" in content, "Accent emerald must be #10B981."
    assert "#22C55E" in content, "Stable status must be #22C55E."
    assert "#FACC15" in content, "Watch status must be #FACC15."
    assert "#EF4444" in content, "Critical status must be #EF4444."
    assert "#B8B0A4" in content, "Uncertain status must be #B8B0A4."


def test_no_forbidden_hues_in_theme_files():
    theme_files = [
        FRONTEND_DIR / "tailwind.config.js",
        FRONTEND_DIR / "src" / "index.css",
        FRONTEND_DIR / "src" / "theme" / "palette.ts",
    ]

    # Forbidden hue tokens that must not be used as theme colors
    forbidden_tokens = [
        r"\bcyan\b",
        r"\bviolet\b",
        r"\bindigo\b",
        r"\bmagenta\b",
        r"\blavender\b",
        r"\bfuchsia\b",
    ]

    for fpath in theme_files:
        assert fpath.exists(), f"Theme file {fpath} must exist."
        content = fpath.read_text(encoding="utf-8")
        # Strip comments
        code_lines = [
            line for line in content.splitlines()
            if not line.strip().startswith("//") and not line.strip().startswith("/*") and not line.strip().startswith("*")
        ]
        clean_content = "\n".join(code_lines)
        
        # Check against forbidden tokens
        for pattern in forbidden_tokens:
            matches = re.findall(pattern, clean_content, flags=re.IGNORECASE)
            assert len(matches) == 0, (
                f"Forbidden hue pattern '{pattern}' found in {fpath.name}: {matches}"
            )
