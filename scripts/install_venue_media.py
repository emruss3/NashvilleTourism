#!/usr/bin/env python3
"""Crop venue masters to 3:2 WebP variants (640 / 960 / ≤1600). Never upscale."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_A = ROOT / "tmp" / "attraction-sources"
SRC_V = ROOT / "tmp" / "venue-sources"
ORIG = ROOT / "media-originals" / "venues"
PUBLIC = ROOT / "public" / "media" / "venues"

Image.MAX_IMAGE_PIXELS = None
WIDTHS = (640, 960, 1600)
WEBP_QUALITY = 84

JOBS = [
    {
        "id": "ryman-auditorium",
        "sources": ["Ryman-Live-Show-2.jpg"],
        "credit": "Ryman Auditorium / official Ryman media",
        "alt": "A packed audience watches a live performance inside Nashville's historic Ryman Auditorium.",
        "focal_y": 0.5,
    },
    {
        "id": "station-inn",
        "sources": ["venue-station-inn-source.jpg"],
        "credit": "Nashville Convention & Visitors Corp",
        "alt": "The Station Inn bluegrass venue in the Gulch surrounded by newer Nashville development.",
        "focal_y": 0.5,
    },
    {
        "id": "bluebird-cafe",
        "sources": ["venue-bluebird-source.jpg"],
        "credit": "Nashville Convention & Visitors Corp",
        "alt": "Songwriters performing in the round for an intimate audience at The Bluebird Cafe in Nashville.",
        "focal_y": 0.45,
    },
    {
        "id": "the-pinnacle",
        "sources": ["venue-pinnacle-source.jpg"],
        "credit": "Nashville Convention & Visitors Corp",
        "alt": "A live concert inside The Pinnacle at Nashville Yards.",
        "focal_y": 0.45,
    },
    {
        "id": "ascend-amphitheater",
        "sources": ["venue-ascend-source.jpg"],
        "credit": "Nashville Convention & Visitors Corp",
        "alt": "A live show at Ascend Amphitheater on Nashville's downtown riverfront.",
        "focal_y": 0.42,
    },
    {
        "id": "bridgestone-arena",
        "sources": ["venue-bridgestone-source.jpg"],
        "credit": "Nashville Convention & Visitors Corp",
        "alt": "A packed concert crowd inside Bridgestone Arena in downtown Nashville.",
        "focal_y": 0.5,
    },
    {
        "id": "the-truth",
        "sources": ["the-truth-source.webp", "the-truth-source.jpg"],
        "credit": "The Truth / Live Nation (architectural rendering)",
        "alt": "Architectural rendering of The Truth music venue in Wedgewood-Houston, with its brick facade, arched windows and illuminated entrance.",
        "focal_y": 0.5,
    },
]


def find_source(names: list[str]) -> Path:
    for name in names:
        for folder in (SRC_V, SRC_A):
            p = folder / name
            if p.exists():
                return p
    raise FileNotFoundError(names)


def cover_crop_32(im: Image.Image, focal_y: float = 0.5) -> Image.Image:
    im = im.convert("RGB")
    sw, sh = im.size
    target_ratio = 3 / 2
    src_ratio = sw / sh
    if src_ratio > target_ratio:
        new_w = int(round(sh * target_ratio))
        left = (sw - new_w) // 2
        return im.crop((left, 0, left + new_w, sh))
    new_h = int(round(sw / target_ratio))
    top = int(round((sh - new_h) * focal_y))
    top = max(0, min(top, sh - new_h))
    return im.crop((0, top, sw, top + new_h))


def resize_exact(im: Image.Image, width: int) -> Image.Image:
    height = int(round(width * 2 / 3))
    return im.resize((width, height), Image.Resampling.LANCZOS)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def process(job: dict) -> dict:
    src = find_source(job["sources"])
    ORIG.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    master = ORIG / src.name
    shutil.copy2(src, master)

    im = Image.open(src)
    crop = cover_crop_32(im, job.get("focal_y", 0.5))
    max_w = crop.size[0]

    outputs = {}
    for w in WIDTHS:
        target_w = min(w, max_w)
        out = resize_exact(crop, target_w)
        dest = PUBLIC / f"{job['id']}-{w}.webp"
        out.save(dest, "WEBP", quality=WEBP_QUALITY, method=6)
        # Keep 1600 slot under ~400KB when possible
        if w == 1600 and dest.stat().st_size > 420_000:
            for q in (80, 76, 72, 68):
                out.save(dest, "WEBP", quality=q, method=6)
                if dest.stat().st_size <= 400_000:
                    break
        outputs[str(w)] = {
            "path": str(dest.relative_to(ROOT)).replace("\\", "/"),
            "width": out.size[0],
            "height": out.size[1],
            "bytes": dest.stat().st_size,
        }

    return {
        "id": job["id"],
        "source": src.name,
        "source_size": list(im.size),
        "crop_size": list(crop.size),
        "source_sha256": sha256(master),
        "credit": job["credit"],
        "alt": job["alt"],
        "outputs": outputs,
    }


def main() -> None:
    # Copy Truth into venue-sources if only in place already
    truth = SRC_V / "the-truth-source.webp"
    if not truth.exists():
        raise FileNotFoundError(truth)

    report = [process(job) for job in JOBS]
    out = SRC_V / "install-report.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    for row in report:
        o = row["outputs"]["1600"]
        print(
            f"{row['id']:24s} src={row['source_size'][0]}x{row['source_size'][1]} "
            f"crop={row['crop_size'][0]}x{row['crop_size'][1]} "
            f"large={o['width']}x{o['height']} {o['bytes']}B"
        )


if __name__ == "__main__":
    main()
