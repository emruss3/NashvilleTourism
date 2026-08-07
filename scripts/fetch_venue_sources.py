#!/usr/bin/env python3
"""Probe/download non-CVC venue masters; CVC originals come via browser session."""

from __future__ import annotations

import urllib.request
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "tmp" / "venue-sources"
OUT.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

DIRECT = [
    (
        "the-truth",
        "https://booking.thetruthnashville.com/wp-content/uploads/2025/10/The-Truth-Exterior-2048x1165.webp",
        "https://booking.thetruthnashville.com/",
    ),
]

# Public CVC paths that often work without cookie (2025-02 library)
CVC_PUBLIC = [
    ("ryman", "https://www.visitmusiccity.com/sites/default/files/2025-02/ryman-auditorium-spotlight.jpg"),
    ("station-inn", "https://www.visitmusiccity.com/sites/default/files/2025-02/Station-Inn.jpg"),
    ("bluebird", "https://www.visitmusiccity.com/sites/default/files/2025-02/bluebird-cafe-nightlife.jpg"),
]


def fetch(url: str, dest: Path, referer: str | None = None) -> tuple[int, int]:
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


def main() -> None:
    for slug, url, referer in DIRECT:
        dest = OUT / f"{slug}-source.webp"
        status, size = fetch(url, dest, referer)
        try:
            im = Image.open(dest)
            print(f"{slug}: {status} {im.size} {size}B")
        except Exception as e:
            print(f"{slug}: {status} {size}B not-image {e}")

    for slug, url in CVC_PUBLIC:
        dest = OUT / f"{slug}-try.jpg"
        status, size = fetch(url, dest, "https://www.visitmusiccity.com/")
        try:
            im = Image.open(dest)
            print(f"{slug}: {status} {im.size} {size}B -> keeping")
            dest.replace(OUT / f"{slug}-source.jpg")
        except Exception:
            print(f"{slug}: {status} {size}B FAIL {url}")


if __name__ == "__main__":
    main()
