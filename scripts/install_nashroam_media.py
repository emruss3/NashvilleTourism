#!/usr/bin/env python3
"""Process CVC + Four Seasons masters into public/media production crops."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tmp" / "nashroam-sources"
ORIG = ROOT / "media-originals" / "nashroam"
PUBLIC = ROOT / "public" / "media"

Image.MAX_IMAGE_PIXELS = None


def cover_crop(im: Image.Image, tw: int, th: int, focal_x: float = 0.5, focal_y: float = 0.5) -> Image.Image:
    im = im.convert("RGB")
    sw, sh = im.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = int(round((nw - tw) * focal_x))
    top = int(round((nh - th) * focal_y))
    left = max(0, min(left, nw - tw))
    top = max(0, min(top, nh - th))
    return resized.crop((left, top, left + tw, top + th))


def save_jpeg(im: Image.Image, dest: Path, quality: int = 82) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)


def save_webp(im: Image.Image, dest: Path, quality: int = 82) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=quality, method=6)


def process(
    source_name: str,
    out_rel: str,
    size: tuple[int, int],
    *,
    focal_x: float = 0.5,
    focal_y: float = 0.5,
    also_webp: bool = True,
) -> dict:
    src = SRC / source_name
    if not src.exists():
        raise FileNotFoundError(src)
    ORIG.mkdir(parents=True, exist_ok=True)
    master_dest = ORIG / source_name
    if not master_dest.exists() or master_dest.stat().st_size != src.stat().st_size:
        shutil.copy2(src, master_dest)

    im = Image.open(src)
    cropped = cover_crop(im, size[0], size[1], focal_x, focal_y)
    out = PUBLIC / out_rel
    save_jpeg(cropped, out, quality=82)
    webp_path = None
    if also_webp:
        webp_path = out.with_suffix(".webp")
        save_webp(cropped, webp_path, quality=82)
    return {
        "source": source_name,
        "out": str(out.relative_to(ROOT)).replace("\\", "/"),
        "bytes": out.stat().st_size,
        "size": f"{size[0]}x{size[1]}",
        "webp_bytes": webp_path.stat().st_size if webp_path else None,
    }


JOBS = [
    # Hero
    ("NSH_146_original.jpg", "hero/nashroam-skyline-hero.jpg", (2400, 1350), 0.5, 0.5),
    ("NSH_146_original.jpg", "hero/nashroam-skyline-hero-mobile.jpg", (1400, 1750), 0.56, 0.5),
    # Hubs
    ("NSH_490_original.jpg", "hubs/hotels-premium.jpg", (1800, 1200), 0.5, 0.45),
    ("Twelve-Thirty-Club-bar.jpg", "hubs/restaurants-premium.jpg", (1800, 1200), 0.5, 0.5),
    ("cassadee-pope-ryman.jpg", "hubs/live-music-premium.jpg", (1800, 1200), 0.5, 0.4),
    ("gray-line-parthenon-transportation-bus.jpg", "hubs/things-to-do-premium.jpg", (1800, 1200), 0.5, 0.5),
    ("musicians-corner-concert-dancing-outdoors.jpg", "hubs/events-premium.jpg", (1800, 1200), 0.5, 0.5),
    ("Skyline-bridge-view.jpg", "hubs/trip-planner-premium.jpg", (1800, 1200), 0.5, 0.5),
    # Guides
    ("Downtown-Aerial-skyline.jpg", "guides/first-time-visitors.jpg", (2000, 1250), 0.5, 0.45),
    ("hermitage-hotel-lobby_1.jpg", "guides/where-to-stay.jpg", (2000, 1250), 0.5, 0.45),
    ("NSH_457_original.jpg", "guides/weekend-itinerary.jpg", (2000, 1250), 0.5, 0.42),
    # Trending
    ("nashville-concert-upcoming-events.jpg", "trending/live-tonight.jpg", (1800, 1200), 0.5, 0.45),
    ("state-capitol-skyline-green-aerial.jpg", "trending/weekender.jpg", (1800, 1200), 0.5, 0.45),
    # Neighborhoods
    ("Broadway-RobertsWesternWorld.jpg", "neighborhoods/downtown-broadway.jpg", (1800, 1200), 0.5, 0.5),
    ("draper-james-shopping-12south.jpg", "neighborhoods/12-south.jpg", (1800, 1200), 0.5, 0.5),
    ("TheCupcakeCollection-Germantown.jpg", "neighborhoods/germantown.jpg", (1800, 1200), 0.5, 0.5),
    ("RosemaryAndBeauty-EastNashville.jpg", "neighborhoods/east-nashville.jpg", (1800, 1200), 0.5, 0.5),
    ("2023-Bastion-WeHo-2-3299x2200-d358ddc.jpg", "neighborhoods/wedgewood-houston.jpg", (1800, 1200), 0.5, 0.5),
    ("biscuit-love-gulch.jpg", "neighborhoods/the-gulch.jpg", (1800, 1200), 0.5, 0.5),
    ("2023-BelcourtTheatre-HillsboroVillage-1-3299x2200-d358ddc.jpg", "neighborhoods/hillsboro-village.jpg", (1800, 1200), 0.5, 0.5),
    ("BluebirdCafe-Greenhills.jpg", "neighborhoods/green-hills.jpg", (1800, 1200), 0.5, 0.5),
    ("Odies_Venue_Main.jpg", "neighborhoods/midtown.jpg", (1800, 1200), 0.5, 0.45),
    ("MusicRow-2023-11.jpg", "neighborhoods/music-row.jpg", (1800, 1200), 0.5, 0.5),
    ("2023-SylvanSupply-SylvanPark-(8)-3299x2200-d358ddc.jpg", "neighborhoods/sylvan-park.jpg", (1800, 1200), 0.5, 0.5),
    ("Parthenon-centennial-park.jpg", "neighborhoods/west-end.jpg", (1800, 1200), 0.5, 0.5),
]


def main() -> None:
    results = []
    for source, out_rel, size, fx, fy in JOBS:
        info = process(source, out_rel, size, focal_x=fx, focal_y=fy)
        results.append(info)
        print(f"{info['out']:55} {info['size']:12} {info['bytes']//1024:4}KB  webp={info['webp_bytes'] and info['webp_bytes']//1024}KB  <- {source}")

    manifest = ROOT / "docs" / "media" / "nashroam-install-manifest.json"
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nwrote {manifest}")


if __name__ == "__main__":
    main()
