#!/usr/bin/env python3
"""Replace the Ryman venue rights row only."""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "docs" / "media" / "ASSET-RIGHTS.json"
CSV_PATH = ROOT / "docs" / "media" / "ASSET-RIGHTS.csv"

ROW = {
    "asset_id": "venue-ryman-auditorium",
    "output_path": "public/media/venues/ryman-auditorium-1600.webp",
    "recommended_use": "Venue card: Ryman Auditorium",
    "alt_text": "A packed audience watches a live performance inside Nashville's historic Ryman Auditorium.",
    "focal": "center",
    "source_type": "Official venue website",
    "source_site": "Ryman Auditorium",
    "source_page": "https://www.ryman.com/story/nashville-8217-s-best-music-museum",
    "source_url": "https://www.ryman.com/wp-content/uploads/2022/01/Ryman-Live-Show-2.jpg",
    "source_filename": "Ryman-Live-Show-2.jpg",
    "original_title": "Ryman Live Show 2",
    "license": None,
    "credit": "Ryman Auditorium / official Ryman media",
    "rights_status": "pending-authorization",
    "restrictions": (
        "Official Ryman media from Catch a Show section of Nashville's Best Music Museum article. "
        "Replaces prior CVC empty-stage spotlight selection. Fastly IO reports origin master "
        "idim=648x431; no larger public original found for this exact filename. Do not upscale."
    ),
    "derivative_notes": (
        "3:2 center crop from official 648x431 master to 646x431; WebP slots 640/646/646 "
        "(named 640/960/1600). No upscaling. Downloaded 2026-08-06."
    ),
    "download_date": "2026-08-06",
    "source_sha256": "000b6005e7242b03045bfbd863091262e0ec82f63e309e34bdc4070bada5fbd6",
}


def main() -> None:
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    found = False
    assets = []
    for asset in data["assets"]:
        if asset.get("asset_id") == ROW["asset_id"]:
            assets.append(ROW)
            found = True
        else:
            assets.append(asset)
    if not found:
        assets.append(ROW)
    data["assets"] = assets
    JSON_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    fields = [
        "alt_text",
        "asset_id",
        "credit",
        "derivative_notes",
        "download_date",
        "focal",
        "license",
        "original_title",
        "output_path",
        "recommended_use",
        "restrictions",
        "rights_status",
        "source_filename",
        "source_page",
        "source_sha256",
        "source_site",
        "source_type",
        "source_url",
    ]
    with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for asset in data["assets"]:
            writer.writerow(asset)
    print("updated", ROW["asset_id"], "found=", found)


if __name__ == "__main__":
    main()
