#!/usr/bin/env python3
"""Append attraction photography rows to ASSET-RIGHTS.json / .csv."""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "docs" / "media" / "ASSET-RIGHTS.json"
CSV_PATH = ROOT / "docs" / "media" / "ASSET-RIGHTS.csv"
REPORT = ROOT / "tmp" / "attraction-sources" / "install-report.json"

ROWS = [
    {
        "asset_id": "attraction-country-music-hall-of-fame",
        "output_path": "public/media/attractions/country-music-hall-of-fame-1600.webp",
        "recommended_use": "Attraction card: Country Music Hall of Fame and Museum",
        "alt_text": "The illuminated Country Music Hall of Fame and Museum in downtown Nashville with the Omni Nashville Hotel behind it.",
        "focal": "center",
        "source_type": "Official institution media kit",
        "source_site": "Country Music Hall of Fame and Museum",
        "source_page": "https://www.countrymusichalloffame.org/plan-your-visit/group-tours/group-marketing-kit",
        "source_url": "https://cmhof.imgix.net/wp-content/uploads/2022/05/27151223/398202162-museum-buyout.jpg",
        "source_filename": "398202162-museum-buyout.jpg",
        "original_title": "Exterior, night photo of the Country Music Hall of Fame and Museum with the Omni Hotel in the background.",
        "license": None,
        "credit": "The Country Music Hall Of Fame and Museum",
        "rights_status": "pending-authorization",
        "restrictions": "Official group marketing kit DOWNLOAD asset. Credit required as stated by CMHOF. Formal usage confirmation still required for commercial destination publishing.",
        "derivative_notes": "4:3 cover crop; WebP 640/960/1333 (native max; official download is 1500×1000). No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "attraction-parthenon",
        "output_path": "public/media/attractions/parthenon-1600.webp",
        "recommended_use": "Attraction card: The Parthenon",
        "alt_text": "The illuminated Parthenon reflected across Lake Watauga in Nashville’s Centennial Park at blue hour.",
        "focal": "center",
        "source_type": "Official institution photography",
        "source_site": "The Parthenon / Centennial Park Conservancy",
        "source_page": "https://www.nashvilleparthenon.com/",
        "source_url": "https://images.squarespace-cdn.com/content/v1/5e305abfabc0e4424fd1454a/5fbd701c-b940-4adb-b0a1-6fb66eb7fdd1/Sterling-E-Stevensparthenon-110-%283%29.jpg",
        "source_filename": "Sterling-E-Stevensparthenon-110-(3).jpg",
        "original_title": "Parthenon blue-hour exterior reflected across Lake Watauga",
        "license": None,
        "credit": "Sterling E. Stevens",
        "rights_status": "pending-authorization",
        "restrictions": "Authorized Parthenon / Conservancy file requested. Do not substitute Wikimedia or stock. Formal usage authorization still required.",
        "derivative_notes": "4:3 cover crop from 1920×1280 reference master; WebP 640/960/1600. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "attraction-nashville-farmers-market",
        "output_path": "public/media/attractions/nashville-farmers-market-1600.webp",
        "recommended_use": "Attraction card: Nashville Farmers’ Market",
        "alt_text": "Visitors dining inside the Nashville Farmers’ Market Market House.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/nashville-businesses/nashville-farmers-market/7531",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/listing_images/nashvilletn-3885_Farmers-Market-interior_36cada9a-5056-b3a8-4973de94ab1c1b2b_0.jpg",
        "source_filename": "nashvilletn-3885_Farmers-Market-interior_36cada9a-5056-b3a8-4973de94ab1c1b2b_0.jpg",
        "original_title": "People eat at tables in a large indoor dining area at the Nashville Farmers’ Market",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC listing original (not listing_slide_small). Formal usage authorization still required.",
        "derivative_notes": "4:3 cover crop from 1618×1080 original; WebP 640/960/1440. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "attraction-shelby-bottoms-greenway",
        "output_path": "public/media/attractions/shelby-bottoms-greenway-1600.webp",
        "recommended_use": "Attraction card: Shelby Bottoms Greenway",
        "alt_text": "A visitor walking a wooded trail at Shelby Bottoms Greenway in East Nashville.",
        "focal": "center",
        "source_type": "Municipal parks photography",
        "source_site": "Metro Nashville Parks",
        "source_page": "https://www.nashville.gov/departments/parks/outdoor-recreation/hiking-trails",
        "source_url": "https://www.nashville.gov/sites/default/files/2025-10/3-Hiking_and_Trails1_photobyJamesFullerton.jpg",
        "source_filename": "3-Hiking_and_Trails1_photobyJamesFullerton.jpg",
        "original_title": "Shelby Bottoms trail in autumn",
        "license": None,
        "credit": "James Fullerton / Metro Nashville Parks",
        "rights_status": "pending-authorization",
        "restrictions": "Published Nashville.gov file is only 739×492. Larger approved original still needed from Metro Parks. Do not upscale. Written authorization required before treating as fully cleared.",
        "derivative_notes": "4:3 cover crop from 739×492 published file; WebP largest native 656×492 written to -1600 slot. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "attraction-ryman-auditorium-tour",
        "output_path": "public/media/attractions/ryman-auditorium-tour-1600.webp",
        "recommended_use": "Attraction card: Ryman Auditorium Tour",
        "alt_text": "Visitors posing together on the historic stage during a Ryman Auditorium tour.",
        "focal": "center",
        "source_type": "Official venue photography",
        "source_site": "Ryman Auditorium",
        "source_page": "https://www.ryman.com/tours/group-tours",
        "source_url": "https://www.ryman.com/assets/img/RYM_Website_Tour_Header-v5-cafe7f59ac.jpg",
        "source_filename": "RYM_Website_Tour_Header-v5-cafe7f59ac.jpg",
        "original_title": "Ryman group-tour header on the historic stage",
        "license": None,
        "credit": "Ryman Auditorium",
        "rights_status": "pending-authorization",
        "restrictions": "Official Ryman tour marketing image. Contact Ryman communications for a larger original if needed. Formal usage authorization still required.",
        "derivative_notes": "4:3 cover crop from 1600×1000 official asset; WebP 640/960/1333. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "attraction-frist-art-museum",
        "output_path": "public/media/attractions/frist-art-museum-1600.webp",
        "recommended_use": "Attraction card: Frist Art Museum",
        "alt_text": "Two visitors viewing a circular glass sculpture inside the Frist Art Museum.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/nashville-businesses/frist-art-museum/4973",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/listing_images/nashvilletn-couple-at-Eversley-in-LSS_CC0C9408-E9CA-457E-BB626443959CB64B_a69649ae-cf14-4a68-80b5aa8c7610fc28_0.jpg",
        "source_filename": "nashvilletn-couple-at-Eversley-in-LSS_CC0C9408-E9CA-457E-BB626443959CB64B_a69649ae-cf14-4a68-80b5aa8c7610fc28_0.jpg",
        "original_title": "Couple looking at a round glass sculpture",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC listing original (not listing_slide_small). Formal usage authorization still required.",
        "derivative_notes": "4:3 cover crop from 1620×1080 original; WebP 640/960/1440. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "attraction-cheekwood-estate-gardens",
        "output_path": "public/media/attractions/cheekwood-estate-gardens-1600.webp",
        "recommended_use": "Attraction card: Cheekwood Estate & Gardens",
        "alt_text": "The historic Cheekwood mansion surrounded by its landscaped gardens in Nashville.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/nashville-businesses/cheekwood-estate-gardens/7600",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/listing_images/nashvilletn-4562_cheekwood5_6c748220-5056-b3a8-494c3ba7bf4e7479_0.jpg",
        "source_filename": "nashvilletn-4562_cheekwood5_6c748220-5056-b3a8-494c3ba7bf4e7479_0.jpg",
        "original_title": "Cheekwood historic mansion and summer gardens",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC listing original (not listing_slide_small). Formal usage authorization still required.",
        "derivative_notes": "4:3 cover crop from 1619×1080 original; WebP 640/960/1440 (1600-slot recompressed ~q70 to stay under ~400KB). No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
    {
        "asset_id": "attraction-nmaam",
        "output_path": "public/media/attractions/nmaam-1600.webp",
        "recommended_use": "Attraction card: National Museum of African American Music",
        "alt_text": "The National Museum of African American Music entrance at Fifth + Broadway in downtown Nashville.",
        "focal": "center",
        "source_type": "Official institution photography",
        "source_site": "National Museum of African American Music",
        "source_page": "https://www.nmaam.org/",
        "source_url": "https://www.nmaam.org/wp-content/uploads/2025/06/hero-video-thumbnail.jpg",
        "source_filename": "hero-video-thumbnail.jpg",
        "original_title": "NMAAM entrance at Fifth + Broadway",
        "license": None,
        "credit": "National Museum of African American Music",
        "rights_status": "pending-authorization",
        "restrictions": "Exact homepage hero composition. Published file is 1300×731; request higher-resolution original via NMAAM Media Requests if needed. Formal usage authorization still required.",
        "derivative_notes": "4:3 cover crop from 1300×731 source; WebP largest native 975×731 written to -1600 slot. No upscaling. Downloaded 2026-08-06.",
        "download_date": "2026-08-06",
    },
]


def main() -> None:
    report = {row["id"]: row for row in json.loads(REPORT.read_text(encoding="utf-8"))}
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    existing = {a["asset_id"] for a in data["assets"]}

    for row in ROWS:
        asset_id = row["asset_id"]
        key = asset_id.replace("attraction-", "")
        if key == "national-museum-of-african-american-music":
            key = "nmaam"
        if key in report:
            row["source_sha256"] = report[key]["source_sha256"]
        if asset_id in existing:
            data["assets"] = [row if a["asset_id"] == asset_id else a for a in data["assets"]]
        else:
            data["assets"].append(row)

    JSON_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    # Rebuild CSV from JSON for consistency
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
    print(f"assets={len(data['assets'])}")


if __name__ == "__main__":
    main()
