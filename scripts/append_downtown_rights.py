#!/usr/bin/env python3
"""Append Downtown FINAL photography rights to ASSET-RIGHTS.json."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "docs" / "media" / "ASSET-RIGHTS.json"
data = json.loads(path.read_text(encoding="utf-8"))
existing = {a["asset_id"]: a for a in data["assets"]}

entries = [
    {
        "asset_id": "downtown-sobro",
        "output_path": "public/media/downtown/sobro-1600.webp",
        "recommended_use": "Downtown guide SoBro zone",
        "alt_text": "Elevated blue-hour view of SoBro with Ascend Amphitheater, the Cumberland River, and downtown hotel towers.",
        "photographer": "Four Seasons Hotels and Resorts",
        "owner": "Four Seasons Hotels and Resorts",
        "source_type": "official_property",
        "source_url": "https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_146_original.jpg",
        "licence": "Four Seasons press library — authorized editorial use",
        "notes": "NSH_146 original; SoBro environmental (not Ascend concert duplicate)",
    },
    {
        "asset_id": "downtown-nashville-yards",
        "output_path": "public/media/downtown/nashville-yards-1600.webp",
        "recommended_use": "Downtown guide Nashville Yards zone",
        "alt_text": "Grand Hyatt Nashville and surrounding Nashville Yards mixed-use buildings at dusk.",
        "photographer": "Grand Hyatt Nashville / Hyatt Hotels",
        "owner": "Hyatt Hotels",
        "source_type": "official_property",
        "source_url": "https://media.iceportal.com/134257/photos/72997025_XL/",
        "licence": "Official hotel distribution (IcePortal)",
    },
    {
        "asset_id": "venues-roberts-western-world",
        "output_path": "public/media/venues/roberts-western-world-1600.webp",
        "recommended_use": "Downtown guide Broadway pick",
        "alt_text": "Stage interior at Robert's Western World with drum kit branding, neon lighting, and memorabilia-lined walls.",
        "photographer": "Robert's Western World",
        "owner": "Robert's Western World",
        "source_type": "official_property",
        "source_url": "https://www.robertswesternworld.com/",
        "licence": "Official venue website media",
        "notes": "Authorized public interior; live performers not in frame",
    },
    {
        "asset_id": "venues-twelve-thirty-club",
        "output_path": "public/media/venues/twelve-thirty-club-1600.webp",
        "recommended_use": "Downtown guide Broadway pick only (dining text-links)",
        "alt_text": "Twelve Thirty Club supper club bar with red and green leather seating, brass, marble, and dark wood.",
        "photographer": "CVC / property",
        "owner": "BPH-held CVC/property media",
        "source_type": "cvc_or_property",
        "source_url": "local:media-originals/nashroam/Twelve-Thirty-Club-bar.jpg",
        "licence": "CVC / property-authorized media held by BPH",
    },
    {
        "asset_id": "venues-chiefs-on-broadway",
        "output_path": "public/media/venues/chiefs-on-broadway-1600.webp",
        "recommended_use": "Downtown guide Broadway pick",
        "alt_text": "Chief's on Broadway dusk exterior with restored brick facade, stained-glass windows, and illuminated marquee.",
        "photographer": "Chief's on Broadway",
        "owner": "Chief's on Broadway",
        "source_type": "official_property",
        "source_url": "https://www.chiefsonbroadway.com/wp-content/uploads/2024/05/Chiefs_Exterior_2400.jpg",
        "licence": "Official venue website media",
    },
    {
        "asset_id": "venues-category-10",
        "output_path": "public/media/venues/category-10-1600.webp",
        "recommended_use": "Downtown guide Broadway pick",
        "alt_text": "Category 10 main floor crowd with balcony mezzanine and Category 10 neon identity.",
        "photographer": "Nathan Zucker / Category 10",
        "owner": "Category 10",
        "source_type": "official_property",
        "source_url": "https://www.category10.com/",
        "licence": "Official category10.com media",
        "notes": "Main floor + balcony composition from official site",
    },
    {
        "asset_id": "restaurants-assembly-food-hall",
        "output_path": "public/media/restaurants/assembly-food-hall-1600.webp",
        "recommended_use": "Downtown guide dining",
        "alt_text": "Interior of Assembly Food Hall with multiple vendor counters and open circulation.",
        "photographer": "Food Hall Co",
        "owner": "Assembly Food Hall",
        "source_type": "official_property",
        "source_url": "https://foodhallco.com/wp-content/uploads/2022/08/Assembly_Property.png",
        "licence": "Official property media",
    },
    {
        "asset_id": "restaurants-bacco",
        "output_path": "public/media/restaurants/bacco-1600.webp",
        "recommended_use": "Downtown guide dining",
        "alt_text": "Bacco dining room with green banquettes, open kitchen, dry-aging cabinet, and patterned floor.",
        "photographer": "Four Seasons Hotels and Resorts",
        "owner": "Four Seasons Hotels and Resorts",
        "source_type": "official_property",
        "source_url": "https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_1316_original.jpg",
        "licence": "Four Seasons press library — authorized editorial use",
    },
    {
        "asset_id": "restaurants-etch",
        "output_path": "public/media/restaurants/etch-1600.webp",
        "recommended_use": "Downtown guide dining",
        "alt_text": "Populated dining room and chef's bar interior at etch restaurant downtown.",
        "photographer": "etch restaurant",
        "owner": "etch restaurant",
        "source_type": "official_property",
        "source_url": "https://etchrestaurant.com/wp-content/uploads/2022/01/Interior.jpg",
        "licence": "Official restaurant website media",
    },
    {
        "asset_id": "hotels-four-seasons-nashville",
        "output_path": "public/media/hotels/four-seasons-nashville-1600.webp",
        "recommended_use": "Downtown guide hotels",
        "alt_text": "Four Seasons Hotel Nashville rooftop pool and terrace overlooking the Cumberland River.",
        "photographer": "Four Seasons Hotels and Resorts",
        "owner": "Four Seasons Hotels and Resorts",
        "source_type": "official_property",
        "source_url": "https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_490_original.jpg",
        "licence": "Four Seasons press library — authorized editorial use",
    },
    {
        "asset_id": "hotels-1-hotel-nashville",
        "output_path": "public/media/hotels/1-hotel-nashville-1600.webp",
        "recommended_use": "Downtown guide hotels",
        "alt_text": "1 Hotel Nashville lobby with timber structure, leather seating, and abundant greenery.",
        "photographer": "1 Hotels",
        "owner": "1 Hotels",
        "source_type": "official_property",
        "source_url": "Brandfolder 1 Hotel Nashville Day2 S0392",
        "licence": "Official brand media (Brandfolder)",
    },
    {
        "asset_id": "hotels-the-joseph",
        "output_path": "public/media/hotels/the-joseph-1600.webp",
        "recommended_use": "Downtown guide hotels",
        "alt_text": "Rooftop pool at The Joseph, a Luxury Collection Hotel, Nashville.",
        "photographer": "Marriott International",
        "owner": "The Joseph Nashville",
        "source_type": "official_property",
        "source_url": "https://cache.marriott.com/content/dam/marriott-renditions/BNALJ/bnalj-outdoor-rooftop-pool-4796-hor-wide.jpg",
        "licence": "Official Marriott gallery media",
        "notes": "Rooftop Pool gallery selection",
    },
    {
        "asset_id": "hotels-hermitage-hotel",
        "output_path": "public/media/hotels/hermitage-hotel-1600.webp",
        "recommended_use": "Downtown guide hotels",
        "alt_text": "Grand Hermitage Hotel lobby with vaulted historic ceiling, fireplace, chandeliers, and central floral table.",
        "photographer": "The Hermitage Hotel / CVC",
        "owner": "BPH-held CVC/property media",
        "source_type": "cvc_or_property",
        "source_url": "local:media-originals/nashroam/hermitage-hotel-lobby_1.jpg",
        "licence": "CVC / property-authorized media held by BPH",
    },
    {
        "asset_id": "hotels-grand-hyatt-nashville",
        "output_path": "public/media/hotels/grand-hyatt-nashville-1600.webp",
        "recommended_use": "Downtown guide hotels",
        "alt_text": "Grand Hyatt Nashville rooftop pool at twilight with Nashville Yards skyline context.",
        "photographer": "Grand Hyatt Nashville / Hyatt Hotels",
        "owner": "Hyatt Hotels",
        "source_type": "official_property",
        "source_url": "https://media.iceportal.com/134257/photos/72997003_XL/",
        "licence": "Official hotel distribution (IcePortal)",
    },
    {
        "asset_id": "editorial-pedestrian-bridge",
        "output_path": "public/media/editorial/pedestrian-bridge-2400.webp",
        "recommended_use": "Downtown guide attractions",
        "alt_text": "John Seigenthaler Pedestrian Bridge at blue hour with downtown skyline and Cumberland River reflections.",
        "photographer": "Nashville Convention and Visitors Corp",
        "owner": "Nashville CVC",
        "source_type": "cvc",
        "source_url": "https://www.visitmusiccity.com/sites/default/files/2025-02/Skyline-bridge-view.jpg",
        "licence": "CVC media library — authorized editorial use",
    },
    {
        "asset_id": "attractions-cmhof-night",
        "output_path": "public/media/attractions/country-music-hall-of-fame-night-1600.webp",
        "recommended_use": "Downtown guide attractions",
        "alt_text": "Blue-hour exterior of the Country Music Hall of Fame and Museum with the Omni Nashville Hotel visible.",
        "photographer": "The Country Music Hall Of Fame and Museum",
        "owner": "CMHOF",
        "source_type": "institution",
        "source_url": "institution-authorized high-res original",
        "licence": "Institution-authorized media",
    },
    {
        "asset_id": "downtown-lower-broadway-hero",
        "output_path": "public/media/neighborhoods/downtown-broadway-2400.webp",
        "recommended_use": "Downtown guide hero (Lower Broadway environmental)",
        "alt_text": "Robert's Western World and Lower Broadway neon on a busy downtown Nashville block.",
        "photographer": "Nashville Convention and Visitors Corp",
        "owner": "Nashville CVC",
        "source_type": "cvc",
        "source_url": "local:media-originals/nashroam/Broadway-RobertsWesternWorld.jpg",
        "licence": "Nashville CVC Media Library — usage authorization pending",
        "notes": "Environmental Lower Broadway night; not Roberts listing photo",
    },
    {
        "asset_id": "venues-jbjs-rooftop-downtown",
        "output_path": "public/media/venues/jbjs-rooftop-1600.webp",
        "recommended_use": "Downtown guide Broadway pick",
        "alt_text": "JBJ's rooftop overlooking Lower Broadway in Nashville.",
        "photographer": "BPH",
        "owner": "BPH",
        "source_type": "bph_owned",
        "source_url": "local:public/media/venues/jbjs-rooftop.jpg",
        "licence": "BPH-owned media — user-authorized reuse on 2026-08-04",
    },
]

added = 0
for e in entries:
    e.setdefault("focal", "center")
    e.setdefault("date_recorded", str(date.today()))
    e.setdefault(
        "changes",
        "Cropped/resized to responsive WebP tiers; no generative editing; never upscaled.",
    )
    if e["asset_id"] in existing:
        existing[e["asset_id"]].update(e)
    else:
        data["assets"].append(e)
        existing[e["asset_id"]] = e
        added += 1

path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print(f"entries={len(entries)} added={added}")
