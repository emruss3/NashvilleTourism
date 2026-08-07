"""Append neighborhood dining restaurant rights to ASSET-RIGHTS.json."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "docs" / "media" / "ASSET-RIGHTS.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    existing = {a["asset_id"]: i for i, a in enumerate(data["assets"])}

    def orig(name: str) -> Path:
        return ROOT / "media-originals" / "restaurants" / name

    rows = [
        {
            "asset_id": "restaurants-peg-leg-porker",
            "output_path": "public/media/restaurants/peg-leg-porker-1600.webp",
            "recommended_use": "Gulch neighborhood dining — primary BBQ",
            "alt_text": "Peg Leg Porker white-brick exterior and covered patio on Gleaves Street in the Gulch.",
            "photographer": "Peg Leg Porker",
            "owner": "Peg Leg Porker",
            "source_type": "official_property",
            "source_url": "https://peglegporker.com/media/",
            "licence": "Official Peg Leg Porker press kit media",
            "source_sha256": sha256(orig("peg-leg-porker.jpg")) if orig("peg-leg-porker.jpg").exists() else "",
            "focal": "center",
            "date_recorded": "2026-08-07",
            "changes": "Cropped/resized to responsive WebP tiers; no generative editing; never upscaled. Graphic overlays stripped from press-kit master where present.",
        },
        {
            "asset_id": "restaurants-butter-milk-ranch",
            "output_path": "public/media/restaurants/butter-milk-ranch-1600.webp",
            "recommended_use": "12 South neighborhood dining — breakfast/brunch",
            "alt_text": "The Butter Milk Ranch dining room with open kitchen, long counter, mustard-yellow stools, and wood ceiling.",
            "photographer": "The Butter Milk Ranch",
            "owner": "The Butter Milk Ranch",
            "source_type": "official_property",
            "source_url": "https://buttermilkranch.com/",
            "licence": "Official restaurant website media",
            "source_sha256": sha256(orig("butter-milk-ranch.jpg")),
            "focal": "center",
            "date_recorded": "2026-08-07",
            "changes": "Cropped/resized to responsive WebP tiers; no generative editing; never upscaled.",
        },
        {
            "asset_id": "restaurants-playdate",
            "output_path": "public/media/restaurants/playdate-1600.webp",
            "recommended_use": "12 South neighborhood dining — drinks/groups",
            "alt_text": "Playdate's restored white house, PLAYDATE signage, and patio on 12th Avenue South in 12 South.",
            "photographer": "Playdate Nashville",
            "owner": "Playdate Nashville",
            "source_type": "venue_hosted",
            "source_url": "https://www.eventective.com/nashville-tn/playdate-772181.html",
            "licence": "Venue-hosted Eventective listing media (property-authorized exterior)",
            "source_sha256": sha256(orig("playdate.jpg")),
            "focal": "center",
            "date_recorded": "2026-08-07",
            "changes": "Cropped/resized to responsive WebP tiers; no generative editing; never upscaled. Not Nashville Guru watermarked media.",
        },
        {
            "asset_id": "restaurants-butchertown-hall",
            "output_path": "public/media/restaurants/butchertown-hall-1600.webp",
            "recommended_use": "Germantown neighborhood dining — live-fire/groups",
            "alt_text": "Butchertown Hall dining room with vaulted ceiling, white tile, and long communal wooden tables.",
            "photographer": "Butchertown Hall",
            "owner": "Butchertown Hall",
            "source_type": "official_property",
            "source_url": "https://butchertownhall.com/",
            "licence": "Official restaurant website media",
            "source_sha256": sha256(orig("butchertown-hall.jpg")),
            "focal": "center",
            "date_recorded": "2026-08-07",
            "changes": "Cropped/resized to responsive WebP tiers; no generative editing; never upscaled.",
        },
        {
            "asset_id": "restaurants-aba-nashville",
            "output_path": "public/media/restaurants/aba-nashville-1600.webp",
            "recommended_use": "Wedgewood-Houston neighborhood dining — dinner+design",
            "alt_text": "Aba Nashville two-story dining room with olive trees, amber Murano chandeliers, and leather seating.",
            "photographer": "Aba / Lettuce Entertain You",
            "owner": "Lettuce Entertain You",
            "source_type": "official_property",
            "source_url": "https://storage.googleapis.com/leye_bucket/wp-content/uploads/073f0e0a-aba-nashville-interior.jpg",
            "licence": "Official Lettuce Entertain You Nashville location media",
            "source_sha256": sha256(orig("aba-nashville.jpg")),
            "focal": "center",
            "date_recorded": "2026-08-07",
            "changes": "Cropped/resized to responsive WebP tiers; no generative editing; never upscaled. Nashville location only — not Chicago/Austin.",
        },
    ]

    for row in rows:
        aid = row["asset_id"]
        if aid in existing:
            data["assets"][existing[aid]].update(row)
            print("updated", aid)
        else:
            data["assets"].append(row)
            print("added", aid)

    PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", PATH)


if __name__ == "__main__":
    main()
