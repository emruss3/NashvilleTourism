#!/usr/bin/env python3
"""Crop attraction masters to 4:3 WebP variants (640 / 960 / ≤1600). Never upscale."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tmp" / "attraction-sources"
ORIG = ROOT / "media-originals" / "attractions"
PUBLIC = ROOT / "public" / "media" / "attractions"

Image.MAX_IMAGE_PIXELS = None

WIDTHS = (640, 960, 1600)
WEBP_QUALITY = 84


def cover_crop_43(im: Image.Image) -> Image.Image:
    """Largest 4:3 cover crop from the source without upscaling."""
    im = im.convert("RGB")
    sw, sh = im.size
    target_ratio = 4 / 3
    src_ratio = sw / sh
    if src_ratio > target_ratio:
        # wider than 4:3 — crop sides
        new_w = int(round(sh * target_ratio))
        left = (sw - new_w) // 2
        return im.crop((left, 0, left + new_w, sh))
    # taller / narrower — crop top/bottom
    new_h = int(round(sw / target_ratio))
    top = (sh - new_h) // 2
    return im.crop((0, top, sw, top + new_h))


def resize_exact(im: Image.Image, width: int) -> Image.Image:
    height = int(round(width * 3 / 4))
    return im.resize((width, height), Image.Resampling.LANCZOS)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


JOBS = [
    {
        "id": "country-music-hall-of-fame",
        "source": "cmhof-night-source.jpg",
        "credit": "The Country Music Hall Of Fame and Museum",
        "alt": "The illuminated Country Music Hall of Fame and Museum in downtown Nashville with the Omni Nashville Hotel behind it.",
    },
    {
        "id": "parthenon",
        "source": "parthenon-source.jpg",
        "credit": "Sterling E. Stevens",
        "alt": "The illuminated Parthenon reflected across Lake Watauga in Nashville’s Centennial Park at blue hour.",
    },
    {
        "id": "nashville-farmers-market",
        "source": "farmers-source.jpg",
        "credit": "Nashville Convention & Visitors Corp",
        "alt": "Visitors dining inside the Nashville Farmers’ Market Market House.",
    },
    {
        "id": "shelby-bottoms-greenway",
        "source": "shelby-bottoms-source.jpg",
        "credit": "James Fullerton / Metro Nashville Parks",
        "alt": "A visitor walking a wooded trail at Shelby Bottoms Greenway in East Nashville.",
    },
    {
        "id": "ryman-auditorium-tour",
        "source": "ryman-tour-source.jpg",
        "credit": "Ryman Auditorium",
        "alt": "Visitors posing together on the historic stage during a Ryman Auditorium tour.",
    },
    {
        "id": "frist-art-museum",
        "source": "frist-source.jpg",
        "credit": "Nashville Convention & Visitors Corp",
        "alt": "Two visitors viewing a circular glass sculpture inside the Frist Art Museum.",
    },
    {
        "id": "cheekwood-estate-gardens",
        "source": "cheekwood-source.jpg",
        "credit": "Nashville Convention & Visitors Corp",
        "alt": "The historic Cheekwood mansion surrounded by its landscaped gardens in Nashville.",
    },
    {
        "id": "nmaam",
        "source": "nmaam-source.jpg",
        "credit": "National Museum of African American Music",
        "alt": "The National Museum of African American Music entrance at Fifth + Broadway in downtown Nashville.",
    },
]


def process(job: dict) -> dict:
    src = SRC / job["source"]
    if not src.exists():
        raise FileNotFoundError(src)

    ORIG.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    master = ORIG / job["source"]
    shutil.copy2(src, master)

    im = Image.open(src)
    crop = cover_crop_43(im)
    max_w = crop.size[0]

    outputs = {}
    for w in WIDTHS:
        target_w = min(w, max_w)
        # Always write the named tier file. If source is narrower than the
        # requested tier, write the largest native size into that slot (no upscale).
        out = resize_exact(crop, target_w)
        dest = PUBLIC / f"{job['id']}-{w}.webp"
        out.save(dest, "WEBP", quality=WEBP_QUALITY, method=6)
        outputs[str(w)] = {
            "path": str(dest.relative_to(ROOT)).replace("\\", "/"),
            "width": out.size[0],
            "height": out.size[1],
            "bytes": dest.stat().st_size,
        }

    return {
        "id": job["id"],
        "source": job["source"],
        "source_size": list(im.size),
        "crop_size": list(crop.size),
        "source_sha256": sha256(master),
        "credit": job["credit"],
        "alt": job["alt"],
        "outputs": outputs,
    }


def main() -> None:
    report = [process(job) for job in JOBS]
    out = SRC / "install-report.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    for row in report:
        o1600 = row["outputs"]["1600"]
        print(
            f"{row['id']:32s} src={row['source_size'][0]}x{row['source_size'][1]} "
            f"crop={row['crop_size'][0]}x{row['crop_size'][1]} "
            f"1600slot={o1600['width']}x{o1600['height']} {o1600['bytes']}B"
        )
    print("report", out)


if __name__ == "__main__":
    main()
