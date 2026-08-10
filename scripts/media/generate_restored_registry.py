#!/usr/bin/env python3
"""Generate src/lib/media-restored.ts from RESTORE-MANIFEST.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "docs" / "media" / "RESTORE-MANIFEST.json"
OUT = ROOT / "src" / "lib" / "media-restored.ts"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    lines = [
        "/** Auto-generated from docs/media/RESTORE-MANIFEST.json — do not edit by hand. */",
        "import type { MediaAsset } from './media-types';",
        "",
        "export const restoredMedia = {",
    ]
    for asset in sorted(data["assets"], key=lambda a: a["key"]):
        lic = asset["license"]
        credit = asset["credit"]
        # Prefer short credit for UI
        if len(credit) > 120:
            credit = credit[:117] + "..."
        src_set = asset.get("srcSet") or ""
        note = asset.get("modificationNote") or ""
        licence_line = f"{lic} — {asset['sourceUrl']}"
        if note:
            licence_line += f" ({note})"
        lines.append(f"  '{esc(asset['key'])}': {{")
        lines.append(f"    src: '{esc(asset['local_jpg'])}',")
        if src_set:
            lines.append(f"    srcSet: '{esc(src_set)}',")
        lines.append(f"    alt: '{esc(asset['alt'])}',")
        lines.append(f"    credit: '{esc(credit)}',")
        lines.append(f"    licence: '{esc(licence_line)}',")
        lines.append(f"    width: {asset['width']},")
        lines.append(f"    height: {asset['height']},")
        lines.append("  },")
    lines.append("} as const satisfies Record<string, MediaAsset>;")
    lines.append("")
    lines.append("export const RESTORED_MEDIA_KEYS = Object.keys(restoredMedia) as Array<keyof typeof restoredMedia>;")
    lines.append("")

    # Adobe placeholders — purchase required, not production-eligible
    adobe = [
        ("guide/where-to-stay", "/media/guides/where-to-stay-nashville.jpg",
         "Downtown Nashville skyline along the Cumberland at blue hour.", "1103549851"),
        ("guide/best-things-to-do", "/media/guides/best-things-to-do-nashville.jpg",
         "Nashville skyline and John Seigenthaler Pedestrian Bridge at dusk.", "238367153"),
        ("guide/weekend-itinerary", "/media/guides/nashville-weekend-itinerary.jpg",
         "Nashville Tennessee skyline.", "179552781"),
        ("guide/bachelorette", "/media/guides/nashville-bachelorette-guide.jpg",
         "Friends celebrating together at a rooftop bachelorette party.", "205821520"),
        ("guide/with-kids", "/media/guides/nashville-with-kids.jpg",
         "A family spending time together outdoors in a city park.", "254050330"),
        ("attractions/shelby-bottoms-greenway", "/media/attractions/shelby-bottoms-greenway.jpg",
         "Pathways along Shelby Bottoms Greenway in Nashville.", "259662137"),
        ("stay/boutique-hotels-downtown", "/media/stay/boutique-hotels-downtown.jpg",
         "Interior of a luxury hotel lobby reception area.", "117735176"),
        ("stay/group-rentals", "/media/stay/group-rentals.jpg",
         "Group of friends enjoying a vacation together.", "171188671"),
        ("stay/luxury-resorts-opryland", "/media/stay/luxury-resorts-opryland.jpg",
         "A large resort hotel atrium.", "116459645"),
        ("stay/hotels-with-pools", "/media/stay/hotels-with-pools.jpg",
         "Relaxing in a rooftop pool with a city skyline view at dusk.", "1642501680"),
        ("hero/nashroam-skyline", "/media/hero/nashroam-skyline-hero.jpg",
         "Nashville, Tennessee skyline over the Cumberland River.", "823396314"),
        ("hub/hotels-index", "/media/hubs/hotels-index.jpg",
         "Downtown Nashville skyline.", "118131119"),
        ("hub/where-to-stay", "/media/hubs/where-to-stay.jpg",
         "Downtown Nashville skyline along the Cumberland at blue hour.", "1103549851"),
        # Distinct keys — do not overwrite cleared hub tile photography (hub/tours, hub/weekend).
        ("hub/tours-lead", "/media/hubs/tours-lead.jpg",
         "Nashville pedestrian bridge and skyline at sunset.", "90286481"),
        ("hub/weekend-lead", "/media/hubs/weekend-lead.jpg",
         "Nashville downtown skyline at twilight.", "242230333"),
        ("hub/events-lead", "/media/hubs/events-lead.jpg",
         "Nashville skyline at blue hour.", "309003897"),
        ("hub/events-this-weekend", "/media/hubs/events-this-weekend.jpg",
         "Nashville skyline at evening.", "73314740"),
        ("hub/plan-lead", "/media/hubs/plan-lead.jpg",
         "Downtown Nashville skyline and Cumberland River.", "268082470"),
    ]
    lines.append("/** Adobe Stock IDs pending Eric purchase — never render until licensed original is on disk. */")
    lines.append("export const adobePurchaseMedia = {")
    for key, src, alt, aid in adobe:
        lines.append(f"  '{key}': {{")
        lines.append(f"    src: '{src}',")
        lines.append(f"    alt: '{esc(alt)}',")
        lines.append(f"    credit: 'Adobe Stock #{aid} (purchase required)',")
        lines.append(
            f"    licence: 'Adobe Stock #{aid} — purchase-required; do not use preview; reject Editorial Use Only',",
        )
        lines.append("    width: 1600,")
        lines.append("    height: 900,")
        lines.append("  },")
    lines.append("} as const satisfies Record<string, MediaAsset>;")
    lines.append("")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
