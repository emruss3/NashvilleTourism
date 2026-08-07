#!/usr/bin/env python3
"""Rewrite docs/media/reference/*.md from ASSET-RIGHTS referenceBrief fields."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "docs" / "media" / "reference"
assets = json.loads((ROOT / "docs" / "media" / "ASSET-RIGHTS.json").read_text(encoding="utf-8"))["assets"]
cvc = [a for a in assets if a.get("rightsStatus") == "reference-only"]

index = [
    "# CVC / Visit Music City — art-direction references only",
    "",
    "NashRoam is a commercial competitor to Visit Music City. **Do not pursue CVC image rights.**",
    "These entries describe compositions we liked. They are not production assets and must never ship.",
    "",
    "| Asset ID | Placement | Subject | Prior CVC URL (reference only) |",
    "|---|---|---|---|",
]

for asset in sorted(cvc, key=lambda a: a["asset_id"]):
    brief = asset.get("referenceBrief") or {}
    prior = brief.get("priorCvcUrl") or asset.get("source_url_archived") or ""
    aid = asset["asset_id"]
    index.append(
        f"| `{aid}` | {brief.get('placement', '')} | {brief.get('subject', '')} | {prior} |"
    )
    (REF / f"{aid}.md").write_text(
        "\n".join(
            [
                f"# Reference: {aid}",
                "",
                "**Status:** `rightsStatus: reference-only` · `approvalStatus: hold`",
                "",
                "Not for production. Not a licensing target. Composition memory only.",
                "",
                f"- **Subject:** {brief.get('subject')}",
                f"- **Composition:** {brief.get('composition')}",
                f"- **Avoid:** {brief.get('avoid')}",
                f"- **Placement:** {brief.get('placement')}",
                f"- **Prior CVC URL (do not fetch for production):** {prior}",
                "",
            ]
        ),
        encoding="utf-8",
    )

(REF / "README.md").write_text("\n".join(index) + "\n", encoding="utf-8")
print(f"rewrote {len(cvc)} reference docs")
