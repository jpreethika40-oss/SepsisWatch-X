"""
Migrates frontend pages to Ember Warm Palette:
- Replaces cyan and purple classes with Ember orange, gold, and warm neutral tokens
- Ensures zero forbidden hues remain in frontend/src/pages
"""

import re
from pathlib import Path

PAGES_DIR = Path("frontend/src/pages")

REPLACEMENTS = [
    # Cyan text, bg, border, glow
    (r"\btext-cyan-400\b", "text-orange-400"),
    (r"\btext-cyan-300\b", "text-amber-300"),
    (r"\btext-cyan-500\b", "text-orange-500"),
    (r"\btext-cyan-200\b", "text-amber-200"),
    (r"\bbg-cyan-500/10\b", "bg-orange-500/10"),
    (r"\bbg-cyan-500/15\b", "bg-orange-500/15"),
    (r"\bbg-cyan-500/20\b", "bg-orange-500/20"),
    (r"\bbg-cyan-500/25\b", "bg-orange-500/25"),
    (r"\bbg-cyan-500/30\b", "bg-orange-500/30"),
    (r"\bbg-cyan-500/40\b", "bg-orange-500/40"),
    (r"\bbg-cyan-500\b", "bg-orange-500"),
    (r"\bbg-cyan-400\b", "bg-amber-400"),
    (r"\bbg-cyan-950/20\b", "bg-amber-950/20"),
    (r"\bbg-cyan-950/40\b", "bg-amber-950/40"),
    (r"\bbg-cyan-950/60\b", "bg-amber-950/60"),
    (r"\bbg-cyan-950/80\b", "bg-amber-950/80"),
    (r"\bbg-cyan-950\b", "bg-amber-950"),
    (r"\bborder-cyan-500/10\b", "border-amber-500/10"),
    (r"\bborder-cyan-500/20\b", "border-amber-500/20"),
    (r"\bborder-cyan-500/30\b", "border-amber-500/30"),
    (r"\bborder-cyan-500/40\b", "border-amber-500/40"),
    (r"\bborder-cyan-500/50\b", "border-amber-500/50"),
    (r"\bborder-cyan-500\b", "border-amber-500"),
    (r"\bborder-cyan-400/40\b", "border-orange-500/40"),
    (r"\bborder-cyan-400\b", "border-orange-400"),
    (r"\baccent-cyan-400\b", "accent-orange-500"),
    (r"\bglow-cyan\b", "glow-ember"),
    (r"#06b6d4", "#F97316"),
    (r"#22d3ee", "#FBBF24"),
    (r"#0891b2", "#EA580C"),
    (r"#0e7490", "#C2410C"),
    (r"#67e8f9", "#FDE047"),

    # Purple text, bg, border
    (r"\btext-purple-400\b", "text-[#B8B0A4]"),
    (r"\btext-purple-300\b", "text-amber-300"),
    (r"\bbg-purple-950/40\b", "bg-amber-950/40"),
    (r"\bbg-purple-950/20\b", "bg-amber-950/20"),
    (r"\bbg-purple-950\b", "bg-amber-950"),
    (r"\bbg-purple-500/20\b", "bg-orange-500/20"),
    (r"\bborder-purple-500/40\b", "border-amber-500/40"),
    (r"\bborder-purple-500/30\b", "border-[#332E29]"),
    (r"\bborder-purple-500\b", "border-amber-500"),
    (r"#a855f7", "#B8B0A4"),
    (r"#c084fc", "#FBBF24"),
]

def migrate_pages():
    for fpath in PAGES_DIR.glob("*.tsx"):
        content = fpath.read_text(encoding="utf-8")
        updated = content
        for pattern, replacement in REPLACEMENTS:
            updated = re.sub(pattern, replacement, updated)
        if updated != content:
            fpath.write_text(updated, encoding="utf-8")
            print(f"Migrated: {fpath.name}")

if __name__ == "__main__":
    migrate_pages()
