#!/usr/bin/env python3
from __future__ import annotations

import re
import urllib.request
from pathlib import Path

from PIL import Image

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
OUT = Path("tmp/attraction-sources")


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def try_img(url: str, label: str) -> None:
    try:
        data = get(url)
        p = OUT / "probe.bin"
        p.write_bytes(data)
        im = Image.open(p)
        print(f"OK {im.size[0]}x{im.size[1]} {len(data):8d}B  {label}  {url}")
    except Exception as e:
        print(f"FAIL {type(e).__name__}: {e}  {label}")


# Hiking / parks pages that might embed the Fullerton photo
pages = [
    "https://www.nashville.gov/departments/parks",
    "https://www.nashville.gov/departments/parks/greenways",
    "https://www.nashville.gov/departments/parks/greenways-and-open-space/shelby-bottoms-greenway",
    "https://www.nashville.gov/departments/parks/parks/shelby-bottoms-park-and-greenway",
    "https://www.nashville.gov/sites/default/files/2025-10/",
]

for page in pages:
    try:
        html = get(page).decode("utf-8", "ignore")
        print(f"\nPAGE {page} ({len(html)} bytes)")
        for m in sorted(set(re.findall(r"https?://[^\"'\s]+Fullerton[^\"'\s]*", html, re.I))):
            print(" ", m)
        for m in sorted(set(re.findall(r"/sites/default/files/[^\"'\s]+Hiking[^\"'\s]*", html, re.I))):
            print(" ", m)
        for m in sorted(set(re.findall(r"/sites/default/files/[^\"'\s]+[Ss]helby[^\"'\s]*", html))):
            print(" ", m)
    except Exception as e:
        print(f"PAGE FAIL {page}: {e}")

print("\n=== style probes ===")
for rel in [
    "/sites/default/files/2025-10/3-Hiking_and_Trails1_photobyJamesFullerton.jpg",
    "/sites/default/files/styles/max_3250x3250/public/2025-10/3-Hiking_and_Trails1_photobyJamesFullerton.jpg",
    "/sites/default/files/styles/wide_2x/public/2025-10/3-Hiking_and_Trails1_photobyJamesFullerton.jpg",
    "/sites/default/files/styles/hero_2x/public/2025-10/3-Hiking_and_Trails1_photobyJamesFullerton.jpg",
]:
    try_img("https://www.nashville.gov" + rel, rel)

print("\n=== NMAAM media ===")
html = get("https://www.nmaam.org/").decode("utf-8", "ignore")
imgs = sorted(set(re.findall(r"https://www\.nmaam\.org/wp-content/uploads/[^\s\"']+", html)))
print("count", len(imgs))
for u in imgs:
    low = u.lower()
    if any(k in low for k in ["hero", "exterior", "entrance", "building", "fifth", "facade", "thumb", "video"]):
        try_img(u.split("?")[0], "match")

# media requests / press
for page in [
    "https://www.nmaam.org/media-requests/",
    "https://www.nmaam.org/press/",
    "https://www.nmaam.org/about/",
]:
    try:
        html = get(page).decode("utf-8", "ignore")
        print(f"\nNMAAM PAGE {page}")
        for u in sorted(set(re.findall(r"https://www\.nmaam\.org/wp-content/uploads/[^\s\"']+\.(?:jpg|jpeg|png|webp)", html, re.I)))[:30]:
            print(" ", u)
    except Exception as e:
        print("fail", page, e)
