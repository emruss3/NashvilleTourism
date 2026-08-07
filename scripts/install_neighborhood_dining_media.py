#!/usr/bin/env python3
"""Process neighborhood dining FINAL masters to responsive WebP. Never upscale."""

from __future__ import annotations

import gc
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tmp" / "neighborhood-dining-sources"
ORIG = ROOT / "media-originals" / "restaurants"
PUBLIC = ROOT / "public" / "media" / "restaurants"
Q = 84
Image.MAX_IMAGE_PIXELS = None

JOBS = [
    {
        "key": "peg-leg-porker",
        "source": "FINAL-peg-leg-porker-exterior-patio-clean.jpg",
        "fallback": "FINAL-peg-leg-porker-exterior-patio.jpg",
        "alt": "Peg Leg Porker white-brick exterior and covered patio on Gleaves Street in the Gulch.",
        "credit": "Peg Leg Porker",
        "licence": "Official Peg Leg Porker press kit media",
        "source_url": "https://peglegporker.com/media/",
    },
    {
        "key": "butter-milk-ranch",
        "source": "FINAL-butter-milk-ranch-interior-counter.jpg",
        "alt": "The Butter Milk Ranch dining room with open kitchen, long counter, mustard-yellow stools, and wood ceiling.",
        "credit": "The Butter Milk Ranch",
        "licence": "Official restaurant website media",
        "source_url": "https://buttermilkranch.com/",
    },
    {
        "key": "playdate",
        "source": "FINAL-playdate-exterior-patio-official.jpg",
        "fallback": "FINAL-playdate-exterior-patio.jpg",
        "alt": "Playdate's restored white house, PLAYDATE signage, and patio on 12th Avenue South in 12 South.",
        "credit": "Playdate Nashville",
        "licence": "Venue-hosted Eventective listing media (property-authorized exterior)",
        "source_url": "https://www.eventective.com/nashville-tn/playdate-772181.html",
    },
    {
        "key": "butchertown-hall",
        "source": "FINAL-butchertown-hall-interior.jpg",
        "alt": "Butchertown Hall dining room with vaulted ceiling, white tile, and long communal wooden tables.",
        "credit": "Butchertown Hall",
        "licence": "Official restaurant website media",
        "source_url": "https://butchertownhall.com/",
    },
    {
        "key": "aba-nashville",
        "source": "FINAL-aba-nashville-hero-interior.jpg",
        "alt": "Aba Nashville two-story dining room with olive trees, amber Murano chandeliers, and leather seating.",
        "credit": "Aba / Lettuce Entertain You",
        "licence": "Official Lettuce Entertain You Nashville location media",
        "source_url": "https://storage.googleapis.com/leye_bucket/wp-content/uploads/073f0e0a-aba-nashville-interior.jpg",
    },
]


def crop_ratio(img: Image.Image, ratio: float = 3 / 2, fx: float = 0.5, fy: float = 0.45) -> Image.Image:
    w, h = img.size
    src_ratio = w / h
    if src_ratio > ratio:
        tw = int(round(h * ratio))
        th = h
    else:
        tw = w
        th = int(round(w / ratio))
    left = int(round((w - tw) * fx))
    top = int(round((h - th) * fy))
    left = max(0, min(left, w - tw))
    top = max(0, min(top, h - th))
    return img.crop((left, top, left + tw, top + th))


def process(job: dict) -> dict | None:
    src = SRC / job["source"]
    if not src.exists() and job.get("fallback"):
        src = SRC / job["fallback"]
    if not src.exists():
        print("MISSING", job["key"], job["source"])
        return None

    ORIG.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    orig_dest = ORIG / f"{job['key']}{src.suffix.lower()}"
    shutil.copy2(src, orig_dest)

    im = Image.open(src).convert("RGB")
    print(job["key"], "source", im.size)
    base = crop_ratio(im)
    meta = []
    for w in (640, 960, 1600):
        tw = min(w, base.size[0])
        th = int(round(tw * base.size[1] / base.size[0]))
        frame = base if (tw, th) == base.size else base.resize((tw, th), Image.Resampling.LANCZOS)
        path = PUBLIC / f"{job['key']}-{w}.webp"
        frame.save(path, "WEBP", quality=Q, method=6)
        meta.append((w, frame.size[0], frame.size[1]))
        print(" ", path.name, frame.size)
    del im
    gc.collect()
    largest = meta[-1]
    return {
        "key": f"restaurants/{job['key']}",
        "src": f"/media/restaurants/{job['key']}-{largest[0]}.webp",
        "srcSet": ", ".join(f"/media/restaurants/{job['key']}-{slot}.webp {aw}w" for slot, aw, _ in meta),
        "width": largest[1],
        "height": largest[2],
        "alt": job["alt"],
        "credit": job["credit"],
        "licence": job["licence"],
        "source_url": job["source_url"],
        "notes": job.get("notes", ""),
    }


def main() -> None:
    report = [r for r in (process(j) for j in JOBS) if r]
    out = SRC / "INSTALL-REPORT.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("wrote", out, "count", len(report))


if __name__ == "__main__":
    main()
