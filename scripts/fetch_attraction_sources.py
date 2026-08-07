#!/usr/bin/env python3
"""Download exact attraction source images for /things-to-do/ cards."""

from __future__ import annotations

import hashlib
import json
import re
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp" / "attraction-sources"
ORIG = ROOT / "media-originals" / "attractions"
OUT.mkdir(parents=True, exist_ok=True)
ORIG.mkdir(parents=True, exist_ok=True)

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def fetch(url: str, dest: Path, *, referer: str | None = None) -> tuple[int, int]:
    headers = {"User-Agent": UA, "Accept": "image/avif,image/webp,image/*,*/*;q=0.8"}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
            status = getattr(resp, "status", 200)
    except urllib.error.HTTPError as e:
        data = e.read()
        status = e.code
    dest.write_bytes(data)
    return status, len(data)


def inspect(path: Path) -> str:
    try:
        im = Image.open(path)
        return f"{im.size[0]}x{im.size[1]} {path.stat().st_size}B"
    except Exception as e:
        return f"not-image ({e}); {path.stat().st_size}B"


DIRECT = [
    (
        "parthenon",
        "https://images.squarespace-cdn.com/content/v1/5e305abfabc0e4424fd1454a/5fbd701c-b940-4adb-b0a1-6fb66eb7fdd1/Sterling-E-Stevensparthenon-110-%283%29.jpg",
        "https://www.nashvilleparthenon.com/",
    ),
    (
        "shelby-bottoms",
        "https://www.nashville.gov/sites/default/files/2025-10/3-Hiking_and_Trails1_photobyJamesFullerton.jpg",
        "https://www.nashville.gov/",
    ),
    (
        "ryman-tour",
        "https://www.ryman.com/assets/img/RYM_Website_Tour_Header-v5-cafe7f59ac.jpg",
        "https://www.ryman.com/tours/group-tours",
    ),
    (
        "nmaam",
        "https://www.nmaam.org/wp-content/uploads/2025/06/hero-video-thumbnail.jpg",
        "https://www.nmaam.org/",
    ),
]

CVC = [
    (
        "farmers-market",
        "nashvilletn-3885_Farmers-Market-interior_36cada9a-5056-b3a8-4973de94ab1c1b2b_0.jpg",
        "https://www.visitmusiccity.com/nashville-businesses/nashville-farmers-market/7531",
    ),
    (
        "frist",
        "nashvilletn-couple-at-Eversley-in-LSS_CC0C9408-E9CA-457E-BB626443959CB64B_a69649ae-cf14-4a68-80b5aa8c7610fc28_0.jpg",
        "https://www.visitmusiccity.com/nashville-businesses/frist-art-museum/4973",
    ),
    (
        "cheekwood",
        "nashvilletn-4562_cheekwood5_6c748220-5056-b3a8-494c3ba7bf4e7479_0.jpg",
        "https://www.visitmusiccity.com/nashville-businesses/cheekwood-estate-gardens/7600",
    ),
]


def try_cvc(slug: str, filename: str, page: str) -> Path | None:
    bases = [
        f"https://www.visitmusiccity.com/sites/default/files/listing_images/{filename}",
        f"https://www.visitmusiccity.com/sites/default/files/listing_images/{filename}.webp",
        f"https://www.visitmusiccity.com/sites/default/files/styles/max_2600x2600/public/listing_images/{filename}",
        f"https://www.visitmusiccity.com/sites/default/files/styles/max_2600x2600/public/listing_images/{filename}.webp",
        f"https://www.visitmusiccity.com/sites/default/files/styles/wide/public/listing_images/{filename}",
        f"https://www.visitmusiccity.com/sites/default/files/styles/wide/public/listing_images/{filename}.webp",
        # deliberately NOT listing_slide_small
        f"https://www.visitmusiccity.com/sites/default/files/styles/listing_slide_large/public/listing_images/{filename}",
        f"https://www.visitmusiccity.com/sites/default/files/styles/listing_slide_large/public/listing_images/{filename}.webp",
    ]
    for url in bases:
        dest = OUT / f"{slug}-try.bin"
        status, size = fetch(url, dest, referer=page)
        print(f"  {status} {size:8d} {url}")
        if status == 200 and size > 50_000:
            final = OUT / f"{slug}-source{Path(url).suffix or '.jpg'}"
            if final.suffix == ".bin" or final.suffix == "":
                final = OUT / f"{slug}-source.jpg"
            # normalize extension from content
            try:
                im = Image.open(dest)
                ext = ".jpg" if im.format == "JPEG" else f".{im.format.lower()}"
                final = OUT / f"{slug}-source{ext}"
                print(f"  OK {inspect(dest)} -> {final.name}")
            except Exception:
                pass
            dest.replace(final)
            return final
    return None


def scrape_cmhof() -> list[str]:
    html_path = OUT / "cmhof-kit.html"
    status, size = fetch(
        "https://www.countrymusichalloffame.org/plan-your-visit/group-tours/group-marketing-kit",
        html_path,
        referer="https://www.countrymusichalloffame.org/",
    )
    print(f"cmhof kit page: {status} {size}")
    html = html_path.read_text(encoding="utf-8", errors="ignore")
    urls = sorted(set(re.findall(r"https?://[^\"'\s>]+\.(?:jpg|jpeg|png|webp)", html, re.I)))
    # relative media
    for m in re.findall(r"(?:href|src|data-src|data-full-url)=[\"']([^\"']+)[\"']", html):
        if any(x in m.lower() for x in [".jpg", ".jpeg", ".png", ".webp"]):
            if m.startswith("//"):
                urls.append("https:" + m)
            elif m.startswith("/"):
                urls.append("https://www.countrymusichalloffame.org" + m)
            elif m.startswith("http"):
                urls.append(m)
    # imgix / wp uploads often used
    urls = sorted(set(urls))
    print(f"found {len(urls)} image urls")
    for u in urls:
        print(" ", u)
    return urls


def main() -> None:
    report = {}

    print("=== Direct refs ===")
    for slug, url, referer in DIRECT:
        dest = OUT / f"{slug}-source{Path(url).suffix.split('?')[0]}"
        status, size = fetch(url, dest, referer=referer)
        print(f"{slug}: {status} {inspect(dest)}")
        report[slug] = {"status": status, "path": str(dest), "info": inspect(dest), "url": url}

    print("\n=== CVC ===")
    for slug, filename, page in CVC:
        path = try_cvc(slug, filename, page)
        report[slug] = {"path": str(path) if path else None, "filename": filename}

    print("\n=== CMHOF kit ===")
    urls = scrape_cmhof()
    report["cmhof_urls"] = urls

    (OUT / "fetch-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("\nWrote", OUT / "fetch-report.json")


if __name__ == "__main__":
    main()
