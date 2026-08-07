#!/usr/bin/env python3
"""Append venue photography rows to ASSET-RIGHTS.json / .csv."""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "docs" / "media" / "ASSET-RIGHTS.json"
CSV_PATH = ROOT / "docs" / "media" / "ASSET-RIGHTS.csv"
REPORT = ROOT / "tmp" / "venue-sources" / "install-report.json"

ROWS = [
    {
        "asset_id": "venue-ryman-auditorium",
        "output_path": "public/media/venues/ryman-auditorium-1600.webp",
        "recommended_use": "Venue card: Ryman Auditorium",
        "alt_text": "A spotlight cuts across the historic stage and wooden pews inside Ryman Auditorium.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/ryman-auditorium-spotlight.jpg",
        "source_filename": "ryman-auditorium-spotlight.jpg",
        "original_title": "Ryman Auditorium spotlight on stage",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library original (not featured_promo derivative). Formal usage authorization still required.",
        "derivative_notes": "3:2 cover crop from 2000×1334 original; WebP 640/960/1600. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "venue-station-inn",
        "output_path": "public/media/venues/station-inn-1600.webp",
        "recommended_use": "Venue card: Station Inn",
        "alt_text": "The Station Inn bluegrass venue in the Gulch surrounded by newer Nashville development.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/Station-Inn.jpg",
        "source_filename": "Station-Inn.jpg",
        "original_title": "Station Inn",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library original (not featured_promo derivative). Formal usage authorization still required.",
        "derivative_notes": "3:2 cover crop from 3300×2200 original; WebP 640/960/1600. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "venue-bluebird-cafe",
        "output_path": "public/media/venues/bluebird-cafe-1600.webp",
        "recommended_use": "Venue card: Bluebird Cafe",
        "alt_text": "Songwriters performing in the round for an intimate audience at The Bluebird Cafe in Nashville.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/bluebird-cafe-nightlife.jpg",
        "source_filename": "bluebird-cafe-nightlife.jpg",
        "original_title": "Songwriters performing at The Bluebird Cafe",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library original (not list_item_desktop derivative). Formal usage authorization still required.",
        "derivative_notes": "3:2 cover crop from 2000×1333 original; WebP 640/960/1600. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "venue-the-pinnacle",
        "output_path": "public/media/venues/the-pinnacle-1600.webp",
        "recommended_use": "Venue card: The Pinnacle",
        "alt_text": "A live concert inside The Pinnacle at Nashville Yards.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/listing_images/nashvilletn-ThePinnacle_20250227_0694-Enhanced-NR-ALIVECOVERAGE_E3FF3820-0459-4208-9CB5A9B1D35FA3C0_f4f4d347-fb25-47dd-a838a3318b368369.jpg",
        "source_filename": "nashvilletn-ThePinnacle_20250227_0694-Enhanced-NR-ALIVECOVERAGE_E3FF3820-0459-4208-9CB5A9B1D35FA3C0_f4f4d347-fb25-47dd-a838a3318b368369.jpg",
        "original_title": "The Pinnacle live concert",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC listing original (not listing_slide_small). Real concert photography, not a rendering. Formal usage authorization still required.",
        "derivative_notes": "3:2 cover crop from 1920×1079 original; WebP 640/960/1600. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "venue-ascend-amphitheater",
        "output_path": "public/media/venues/ascend-amphitheater-1600.webp",
        "recommended_use": "Venue card: Ascend Amphitheater",
        "alt_text": "A live show at Ascend Amphitheater on Nashville's downtown riverfront.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/listing_images/nashvilletn-6047_Ascend-AMP-1_368f0b6b-5056-b3a8-49c7657f38d578b4_0.jpg",
        "source_filename": "nashvilletn-6047_Ascend-AMP-1_368f0b6b-5056-b3a8-49c7657f38d578b4_0.jpg",
        "original_title": "Ascend Amphitheater",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC listing original (not listing_slide_small). Formal usage authorization still required.",
        "derivative_notes": "3:2 cover crop from 1620×1080 original preserving stage/audience/skyline context; WebP 640/960/1600. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "venue-bridgestone-arena",
        "output_path": "public/media/venues/bridgestone-arena-1600.webp",
        "recommended_use": "Venue card: Bridgestone Arena",
        "alt_text": "A packed concert crowd inside Bridgestone Arena in downtown Nashville.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/listing_images/nashvilletn-3---Bridgestone-Arena-Concert-Crowd_4872294D-4E0E-47F1-99A459C082131E28_06c54a0f-dac2-46a7-9842f115ebde89ab_0.jpg",
        "source_filename": "nashvilletn-3---Bridgestone-Arena-Concert-Crowd_4872294D-4E0E-47F1-99A459C082131E28_06c54a0f-dac2-46a7-9842f115ebde89ab_0.jpg",
        "original_title": "Bridgestone Arena Concert Crowd",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC concert-crowd gallery original. Not exterior, Predators, SEC, or Rodeo imagery. Published master is 1080×1080; largest 3:2 export is 1080×720. No upscaling. Formal usage authorization still required.",
        "derivative_notes": "3:2 cover crop from 1080×1080 original; WebP 640/960/1080. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "venue-the-truth",
        "output_path": "public/media/venues/the-truth-1600.webp",
        "recommended_use": "Venue card: The Truth",
        "alt_text": "Architectural rendering of The Truth music venue in Wedgewood-Houston, with its brick facade, arched windows and illuminated entrance.",
        "focal": "center",
        "source_type": "Official venue architectural rendering",
        "source_site": "The Truth / Live Nation",
        "source_page": "https://booking.thetruthnashville.com/",
        "source_url": "https://booking.thetruthnashville.com/wp-content/uploads/2025/10/The-Truth-Exterior-2048x1165.webp",
        "source_filename": "The-Truth-Exterior-2048x1165.webp",
        "original_title": "The Truth exterior architectural rendering",
        "license": None,
        "credit": "The Truth / Live Nation (architectural rendering)",
        "rights_status": "pending-authorization",
        "restrictions": "Must be labeled as an architectural rendering until real photography replaces it. Related announcement: https://www.ajcpt.com/firm/news/livenation-the-truth-billboard. Formal usage authorization still required.",
        "derivative_notes": "3:2 cover crop from official 2048×1165 rendering; WebP 640/960/1600. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
]


def main() -> None:
    report = {row["id"]: row for row in json.loads(REPORT.read_text(encoding="utf-8"))}
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    existing = {a["asset_id"] for a in data["assets"]}

    for row in ROWS:
        key = row["asset_id"].replace("venue-", "")
        if key in report:
            row["source_sha256"] = report[key]["source_sha256"]
        if row["asset_id"] in existing:
            data["assets"] = [row if a["asset_id"] == row["asset_id"] else a for a in data["assets"]]
        else:
            data["assets"].append(row)

    JSON_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    fieldnames = [
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
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for asset in data["assets"]:
            writer.writerow(asset)
    print("assets", len(data["assets"]))


if __name__ == "__main__":
    main()
