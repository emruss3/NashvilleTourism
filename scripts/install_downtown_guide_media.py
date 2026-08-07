#!/usr/bin/env python3
"""Build responsive Downtown Broadway guide hero (+ section tier webps). Never upscale."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "media-originals" / "nashroam" / "Broadway-RobertsWesternWorld.jpg"
OUT = ROOT / "public" / "media" / "neighborhoods"
Q = 84

Image.MAX_IMAGE_PIXELS = None


def crop_ratio(img: Image.Image, ratio: float, focal_x: float = 0.5, focal_y: float = 0.5) -> Image.Image:
    w, h = img.size
    src_ratio = w / h
    if src_ratio > ratio:
        tw = int(round(h * ratio))
        th = h
    else:
        tw = w
        th = int(round(w / ratio))
    left = int(round((w - tw) * focal_x))
    top = int(round((h - th) * focal_y))
    left = max(0, min(left, w - tw))
    top = max(0, min(top, h - th))
    return img.crop((left, top, left + tw, top + th))


def export_tiers(img: Image.Image, dest_dir: Path, stem: str, widths: list[int], label: str) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    max_w = img.size[0]
    for w in widths:
        tw = min(w, max_w)
        th = int(round(tw * img.size[1] / img.size[0]))
        out = img if (tw, th) == img.size else img.resize((tw, th), Image.Resampling.LANCZOS)
        # Keep requested slot names even when capped below target.
        name = f"{stem}-{w}.webp"
        dest = dest_dir / name
        out.save(dest, "WEBP", quality=Q, method=6)
        print(f"{label:10s} {name:40s} {out.size[0]}x{out.size[1]} {dest.stat().st_size}B")


def export_hub_tiers(src: Path, widths: list[int]) -> None:
    im = Image.open(src).convert("RGB")
    export_tiers(im, src.parent, src.stem, widths, src.stem)


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    print("source", im.size)

    desktop = crop_ratio(im, 16 / 9, focal_x=0.42, focal_y=0.45)
    mobile = crop_ratio(im, 4 / 5, focal_x=0.40, focal_y=0.42)
    print("desktop crop", desktop.size)
    print("mobile crop", mobile.size)

    export_tiers(desktop, OUT, "downtown-broadway", [960, 1600, 2400], "desktop")
    export_tiers(mobile, OUT, "downtown-broadway-mobile", [960, 1400], "mobile")

    # Registry fallback jpg at native desktop crop (no upscale).
    jpg = OUT / "downtown-broadway.jpg"
    desktop.save(jpg, "JPEG", quality=88, optimize=True)
    print("jpg", desktop.size, jpg.stat().st_size)

    export_hub_tiers(ROOT / "public" / "media" / "venues" / "jbjs-rooftop.jpg", [960, 1600, 2400])
    export_hub_tiers(ROOT / "public" / "media" / "hubs" / "restaurants-premium.jpg", [960, 1600, 2400])
    export_hub_tiers(ROOT / "public" / "media" / "hubs" / "hotels-premium.jpg", [960, 1600, 2400])
    export_hub_tiers(ROOT / "public" / "media" / "hubs" / "trip-planner-premium.jpg", [960, 1600, 2400])


if __name__ == "__main__":
    main()
