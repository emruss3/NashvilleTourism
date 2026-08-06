"""Append / refresh ASSET-RIGHTS rows for NashRoam CVC + Four Seasons installs."""
from __future__ import annotations

import csv
import hashlib
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "docs" / "media" / "ASSET-RIGHTS.json"
CSV_PATH = ROOT / "docs" / "media" / "ASSET-RIGHTS.csv"

TODAY = "2026-08-06"

ROWS = [
    {
        "asset_id": "nashroam-skyline-hero",
        "output_path": "public/media/hero/nashroam-skyline-hero.jpg",
        "recommended_use": "Homepage hero (desktop)",
        "alt_text": "Downtown Nashville at sunset above the Cumberland River and Korean Veterans Memorial Bridge.",
        "focal": "center",
        "source_type": "Official hotel press library",
        "source_site": "Four Seasons Hotels and Resorts",
        "source_page": "https://press.fourseasons.com/",
        "source_url": "https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_146_original.jpg",
        "source_filename": "NSH_146_original.jpg",
        "original_title": "Aerial view of downtown Nashville at sunset",
        "license": None,
        "credit": "Four Seasons Hotels and Resorts",
        "rights_status": "pending-authorization",
        "restrictions": "Obtained from Four Seasons Nashville press DAM. Do not invent a public license. Formal usage authorization still required for production claims.",
        "derivative_notes": "Desktop crop 2400×1350; mobile crop 1400×1750 at 56% horizontal focal. No generative editing. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "nashroam-skyline-hero-mobile",
        "output_path": "public/media/hero/nashroam-skyline-hero-mobile.jpg",
        "recommended_use": "Homepage hero (mobile portrait crop)",
        "alt_text": "Downtown Nashville at sunset above the Cumberland River and Korean Veterans Memorial Bridge.",
        "focal": "56% center",
        "source_type": "Official hotel press library",
        "source_site": "Four Seasons Hotels and Resorts",
        "source_page": "https://press.fourseasons.com/",
        "source_url": "https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_146_original.jpg",
        "source_filename": "NSH_146_original.jpg",
        "original_title": "Aerial view of downtown Nashville at sunset",
        "license": None,
        "credit": "Four Seasons Hotels and Resorts",
        "rights_status": "pending-authorization",
        "restrictions": "Same master as nashroam-skyline-hero. Formal usage authorization still required.",
        "derivative_notes": "Portrait crop 1400×1750. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "hotels-premium",
        "output_path": "public/media/hubs/hotels-premium.jpg",
        "recommended_use": "Homepage hub: Hotels",
        "alt_text": "Rooftop terrace bar overlooking the Nashville skyline.",
        "focal": "center",
        "source_type": "Official hotel press library",
        "source_site": "Four Seasons Hotels and Resorts",
        "source_page": "https://press.fourseasons.com/",
        "source_url": "https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_490_original.jpg",
        "source_filename": "NSH_490_original.jpg",
        "original_title": "Rooftop terrace with a bar area and view of the city",
        "license": None,
        "credit": "Four Seasons Hotels and Resorts",
        "rights_status": "pending-authorization",
        "restrictions": "Four Seasons press asset. Not Gaylord Opryland. Formal usage authorization still required.",
        "derivative_notes": "Cropped/resized to 1800×1200. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "restaurants-premium",
        "output_path": "public/media/hubs/restaurants-premium.jpg",
        "recommended_use": "Homepage hub: Restaurants",
        "alt_text": "The cocktail bar at Twelve Thirty Club in Nashville.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/Twelve-Thirty-Club-bar.jpg",
        "source_filename": "Twelve-Thirty-Club-bar.jpg",
        "original_title": "Twelve Thirty Club cocktail bar",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library asset. Formal usage authorization still required. Do not invent a Creative Commons license.",
        "derivative_notes": "Cropped/resized to 1800×1200. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "live-music-premium",
        "output_path": "public/media/hubs/live-music-premium.jpg",
        "recommended_use": "Homepage hub: Live Music",
        "alt_text": "Cassadee Pope performing at the Ryman Auditorium.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/cassadee-pope-ryman.jpg",
        "source_filename": "cassadee-pope-ryman.jpg",
        "original_title": "Cassadee Pope at Ryman",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library asset. Formal usage authorization still required.",
        "derivative_notes": "Cropped/resized to 1800×1200. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "things-to-do-premium",
        "output_path": "public/media/hubs/things-to-do-premium.jpg",
        "recommended_use": "Homepage hub: Things to Do",
        "alt_text": "A Gray Line tour bus parked in front of the Parthenon in Centennial Park.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/gray-line-parthenon-transportation-bus.jpg",
        "source_filename": "gray-line-parthenon-transportation-bus.jpg",
        "original_title": "Gray Line Bus in front of Parthenon",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library asset. Formal usage authorization still required.",
        "derivative_notes": "Cropped/resized to 1800×1200. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "events-premium",
        "output_path": "public/media/hubs/events-premium.jpg",
        "recommended_use": "Homepage hub: Events",
        "alt_text": "People dancing outdoors at a Musicians Corner concert in Nashville.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/musicians-corner-concert-dancing-outdoors.jpg",
        "source_filename": "musicians-corner-concert-dancing-outdoors.jpg",
        "original_title": "Dancing at Musicians Corner Concert",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library asset. Formal usage authorization still required.",
        "derivative_notes": "Cropped/resized to 1800×1200. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "trip-planner-premium",
        "output_path": "public/media/hubs/trip-planner-premium.jpg",
        "recommended_use": "Homepage hub: Trip Planner",
        "alt_text": "Nashville skyline seen from a pedestrian bridge.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/Skyline-bridge-view.jpg",
        "source_filename": "Skyline-bridge-view.jpg",
        "original_title": "Skyline bridge",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library asset. Formal usage authorization still required.",
        "derivative_notes": "Cropped/resized to 1800×1200. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "guide-first-time-visitors",
        "output_path": "public/media/guides/first-time-visitors.jpg",
        "recommended_use": "Guide: Nashville for First-Time Visitors",
        "alt_text": "Aerial view of the downtown Nashville skyline.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/Downtown-Aerial-skyline.jpg",
        "source_filename": "Downtown-Aerial-skyline.jpg",
        "original_title": "Downtown Nashville skyline",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library asset. Formal usage authorization still required.",
        "derivative_notes": "Cropped/resized to 2000×1250. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "guide-where-to-stay",
        "output_path": "public/media/guides/where-to-stay.jpg",
        "recommended_use": "Guide: Where to Stay in Nashville",
        "alt_text": "The lobby of the Hermitage Hotel in downtown Nashville.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/hermitage-hotel-lobby_1.jpg",
        "source_filename": "hermitage-hotel-lobby_1.jpg",
        "original_title": "Hermitage Hotel lobby",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library asset. Not Gaylord Opryland atrium. Formal usage authorization still required.",
        "derivative_notes": "Cropped/resized to 2000×1250. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "guide-weekend-itinerary",
        "output_path": "public/media/guides/weekend-itinerary.jpg",
        "recommended_use": "Guide: A Nashville Weekend Itinerary",
        "alt_text": "Three guests dining on a rooftop terrace overlooking Nashville.",
        "focal": "center",
        "source_type": "Official hotel press library",
        "source_site": "Four Seasons Hotels and Resorts",
        "source_page": "https://press.fourseasons.com/",
        "source_url": "https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_457_original.jpg",
        "source_filename": "NSH_457_original.jpg",
        "original_title": "Three guests on a rooftop terrace enjoying a meal",
        "license": None,
        "credit": "Four Seasons Hotels and Resorts",
        "rights_status": "pending-authorization",
        "restrictions": "Four Seasons press asset. Formal usage authorization still required.",
        "derivative_notes": "Portrait master center-cropped to 2000×1250. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "trending-live-tonight",
        "output_path": "public/media/trending/live-tonight.jpg",
        "recommended_use": "Homepage trending: Who’s Playing Tonight",
        "alt_text": "A live concert crowd in Nashville.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/nashville-concert-upcoming-events.jpg",
        "source_filename": "nashville-concert-upcoming-events.jpg",
        "original_title": "Concert in Nashville",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library asset. Formal usage authorization still required.",
        "derivative_notes": "Cropped/resized to 1800×1200. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
    {
        "asset_id": "trending-weekender",
        "output_path": "public/media/trending/weekender.jpg",
        "recommended_use": "Homepage trending: Nashville Weekender",
        "alt_text": "Aerial view of the Tennessee State Capitol and downtown Nashville skyline with green parkland.",
        "focal": "center",
        "source_type": "Destination marketing organization media library",
        "source_site": "Nashville Convention & Visitors Corp",
        "source_page": "https://www.visitmusiccity.com/",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/state-capitol-skyline-green-aerial.jpg",
        "source_filename": "state-capitol-skyline-green-aerial.jpg",
        "original_title": "State Capitol skyline green aerial",
        "license": None,
        "credit": "Nashville Convention & Visitors Corp",
        "rights_status": "pending-authorization",
        "restrictions": "CVC Media Library asset. Formal usage authorization still required.",
        "derivative_notes": "Cropped/resized to 1800×1200. Downloaded 2026-08-06.",
        "download_date": TODAY,
    },
]

# Neighborhood replacements (same asset_id keys as prior rows where possible)
NEIGHBORHOODS = [
    (
        "downtown-broadway",
        "Robert’s Western World on Lower Broadway in downtown Nashville.",
        "Broadway-RobertsWesternWorld.jpg",
        "Roberts Western World Broadway",
    ),
    (
        "12-south",
        "Draper James shopfront on 12th Avenue South in the 12 South neighborhood.",
        "draper-james-shopping-12south.jpg",
        "Draper James shop in 12South",
    ),
    (
        "germantown",
        "The Cupcake Collection storefront in Germantown, Nashville.",
        "TheCupcakeCollection-Germantown.jpg",
        "The Cupcake Collection Germantown",
    ),
    (
        "east-nashville",
        "Rosemary & Beauty Queen exterior in East Nashville.",
        "RosemaryAndBeauty-EastNashville.jpg",
        "Rosemary & Beauty Queen East Nashville",
    ),
    (
        "wedgewood-houston",
        "Bastion restaurant exterior in Wedgewood-Houston, Nashville.",
        "2023-Bastion-WeHo-2-3299x2200-d358ddc.jpg",
        "Bastion WeHo",
    ),
    (
        "the-gulch",
        "Biscuit Love restaurant in the Gulch, Nashville.",
        "biscuit-love-gulch.jpg",
        "Biscuit Love in the Gulch",
    ),
    (
        "hillsboro-village",
        "The Belcourt Theatre in Hillsboro Village, Nashville.",
        "2023-BelcourtTheatre-HillsboroVillage-1-3299x2200-d358ddc.jpg",
        "Belcourt Theatre",
    ),
    (
        "green-hills",
        "The Bluebird Cafe exterior in Green Hills, Nashville.",
        "BluebirdCafe-Greenhills.jpg",
        "Bluebird Cafe exterior",
    ),
    (
        "midtown",
        "Odie’s Bar exterior overlooking Division Street in Midtown Nashville.",
        "Odies_Venue_Main.jpg",
        "Odie’s Bar exterior overlooking Division Street",
    ),
    (
        "music-row",
        "Music Row streetscape in Nashville.",
        "MusicRow-2023-11.jpg",
        "Music Row streetscape",
    ),
    (
        "sylvan-park",
        "Sylvan Supply storefront in Sylvan Park, Nashville.",
        "2023-SylvanSupply-SylvanPark-(8)-3299x2200-d358ddc.jpg",
        "Sylvan Supply",
    ),
    (
        "west-end",
        "The Parthenon at Centennial Park along West End Avenue.",
        "Parthenon-centennial-park.jpg",
        "Parthenon at Centennial Park",
    ),
]

for asset_id, alt, filename, title in NEIGHBORHOODS:
    if asset_id == "midtown":
        source_url = (
            "https://www.visitmusiccity.com/sites/default/files/listing_images/"
            "nashvilletn-Odies_Venue_Main_6212302A-86C5-4D22-9382DCAA08E0BBB3_50473b45-9d31-413b-9ea9c64449cfd34a_0.jpg"
        )
    else:
        source_url = f"https://www.visitmusiccity.com/sites/default/files/2025-02/{filename}"
    ROWS.append(
        {
            "asset_id": asset_id,
            "output_path": f"public/media/neighborhoods/{asset_id}.jpg",
            "recommended_use": f"Neighborhood: {asset_id}",
            "alt_text": alt,
            "focal": "center",
            "source_type": "Destination marketing organization media library",
            "source_site": "Nashville Convention & Visitors Corp",
            "source_page": "https://www.visitmusiccity.com/",
            "source_url": source_url,
            "source_filename": filename,
            "original_title": title,
            "license": None,
            "credit": "Nashville Convention & Visitors Corp",
            "rights_status": "pending-authorization",
            "restrictions": "CVC Media Library / listing photography. Formal usage authorization still required. Do not invent a Creative Commons license.",
            "derivative_notes": "Cropped/resized to 1800×1200. Downloaded 2026-08-06.",
            "download_date": TODAY,
        }
    )


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    doc = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    by_id = {a["asset_id"]: a for a in doc["assets"]}

    for row in ROWS:
        out = ROOT / row["output_path"]
        if out.exists():
            row["source_sha256"] = sha256(out)
        else:
            row["source_sha256"] = None
        by_id[row["asset_id"]] = {**by_id.get(row["asset_id"], {}), **row}

    doc["assets"] = list(by_id.values())
    JSON_PATH.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")

    # Refresh CSV from JSON (union of keys)
    keys = sorted({k for a in doc["assets"] for k in a.keys()})
    with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        writer.writeheader()
        for a in doc["assets"]:
            writer.writerow(a)
    print(f"updated {JSON_PATH} ({len(doc['assets'])} assets)")
    print(f"updated {CSV_PATH}")


if __name__ == "__main__":
    main()
