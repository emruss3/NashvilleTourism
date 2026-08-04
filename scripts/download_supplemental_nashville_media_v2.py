#!/usr/bin/env python3
"""Download licensed Nashville photos with rate-limit-safe Wikimedia retries."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import shutil
import time
from pathlib import Path
from urllib.parse import quote

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps

OUT = Path("nashville-supplemental-media")
UA = "NashvilleTourism/1.0 (editorial media build; contact: eric@bigplanholdings.com)"

ASSETS = [
    dict(key="neighborhood-east-nashville", filename="east-nashville.jpg", commons_file="EastNashvilleHD.jpg", source_page="https://commons.wikimedia.org/wiki/File:EastNashvilleHD.jpg", author="Andrew Jameson", license="CC BY-SA 3.0", license_url="https://creativecommons.org/licenses/by-sa/3.0/", alt="Historic houses on a leafy street in East Nashville.", use="Neighborhood: East Nashville"),
    dict(key="neighborhood-germantown", filename="germantown.jpg", commons_file="GermantownHDNashville.jpg", source_page="https://commons.wikimedia.org/wiki/File:GermantownHDNashville.jpg", author="Andrew Jameson", license="CC BY-SA 3.0", license_url="https://creativecommons.org/licenses/by-sa/3.0/", alt="Historic brick building and houses at 7th Avenue and Monroe Street in Germantown.", use="Neighborhood: Germantown"),
    dict(key="neighborhood-the-gulch", filename="the-gulch.jpg", commons_file="Gulch Greenway.jpg", source_page="https://commons.wikimedia.org/wiki/File:Gulch_Greenway.jpg", author="Lahti213", license="CC BY-SA 4.0", license_url="https://creativecommons.org/licenses/by-sa/4.0/", alt="The Gulch Greenway in Nashville.", use="Neighborhood: The Gulch"),
    dict(key="neighborhood-hillsboro-village", filename="hillsboro-village.jpg", commons_file="DSCF9014-crop1.jpg", source_page="https://commons.wikimedia.org/wiki/File:DSCF9014-crop1.jpg", author="CEWall", license="CC BY-SA 4.0", license_url="https://creativecommons.org/licenses/by-sa/4.0/", alt="The Belcourt Theatre at dusk in Hillsboro Village.", use="Neighborhood: Hillsboro Village"),
    dict(key="neighborhood-12-south", filename="12-south.jpg", commons_file="I Believe in Nashville Mural Jameson Fink.jpg", source_page="https://commons.wikimedia.org/wiki/File:I_Believe_in_Nashville_Mural_Jameson_Fink.jpg", author="Jameson Fink", license="CC BY 2.0", license_url="https://creativecommons.org/licenses/by/2.0/", alt="The I Believe in Nashville mural in the 12 South neighborhood.", use="Neighborhood: 12 South"),
    dict(key="neighborhood-west-end-midtown", filename="west-end-midtown.jpg", commons_file="Nashville Parthenon, Centennial Park, West End Avenue, Midtown, Nashville, TN (54385063001).jpg", source_page="https://commons.wikimedia.org/wiki/File:Nashville_Parthenon,_Centennial_Park,_West_End_Avenue,_Midtown,_Nashville,_TN_(54385063001).jpg", author="Warren LeMay", license="CC BY-SA 2.0", license_url="https://creativecommons.org/licenses/by-sa/2.0/", alt="The Parthenon in Centennial Park along West End Avenue in Midtown Nashville.", use="Neighborhood: West End / Midtown; attraction: Parthenon"),
    dict(key="neighborhood-music-row", filename="music-row.jpg", commons_file="RCA Studio B (1).jpg", source_page="https://commons.wikimedia.org/wiki/File:RCA_Studio_B_(1).jpg", author="Cliff", license="CC BY 2.0", license_url="https://creativecommons.org/licenses/by/2.0/", alt="RCA Studio B on Music Row in Nashville.", use="Neighborhood: Music Row"),
    dict(key="neighborhood-green-hills", filename="green-hills.jpg", commons_file="Green Hills 2010.JPG", source_page="https://commons.wikimedia.org/wiki/File:Green_Hills_2010.JPG", author="Dougmac7", license="CC BY-SA 3.0", license_url="https://creativecommons.org/licenses/by-sa/3.0/", alt="Hillsboro Road at Crestmoor Road in Green Hills, Nashville.", use="Neighborhood: Green Hills"),
    dict(key="hub-opryland-hotel", filename="opryland-hotel.jpg", commons_file="Opryland Hotel 2022g.jpg", source_page="https://commons.wikimedia.org/wiki/File:Opryland_Hotel_2022g.jpg", author="Antony-22", license="CC BY-SA 4.0", license_url="https://creativecommons.org/licenses/by-sa/4.0/", alt="The Cascades Atrium inside Gaylord Opryland Resort in Nashville.", use="Hub: Opryland; hub: hotels"),
    dict(key="attraction-grand-ole-opry", filename="grand-ole-opry-house.jpg", commons_file="Grand Ole Opry House 2022a.jpg", source_page="https://commons.wikimedia.org/wiki/File:Grand_Ole_Opry_House_2022a.jpg", author="Antony-22", license="CC BY-SA 4.0", license_url="https://creativecommons.org/licenses/by-sa/4.0/", alt="The entrance of the Grand Ole Opry House in Nashville.", use="Attraction: Grand Ole Opry; hub: music"),
]


def download(session: requests.Session, asset: dict) -> bytes:
    url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + quote(asset["commons_file"], safe="")
    last = ""
    for attempt in range(7):
        try:
            response = session.get(
                url,
                timeout=120,
                allow_redirects=True,
                headers={"Referer": asset["source_page"], "Accept": "image/jpeg,image/*;q=0.8,*/*;q=0.5"},
            )
            last = f"HTTP {response.status_code} {response.url}"
            if response.status_code in {429, 500, 502, 503, 504}:
                delay = min(60, 5 * (attempt + 1))
                print(f'{asset["key"]}: {last}; retrying in {delay}s', flush=True)
                time.sleep(delay)
                continue
            response.raise_for_status()
            if not response.content or len(response.content) < 25_000:
                raise RuntimeError(f"unexpected response size {len(response.content)} from {response.url}")
            return response.content
        except Exception as exc:  # noqa: BLE001
            last = str(exc)
            if attempt < 6:
                delay = min(60, 4 * (attempt + 1))
                print(f'{asset["key"]}: {last}; retrying in {delay}s', flush=True)
                time.sleep(delay)
    raise RuntimeError(last)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    originals, jpgs, webps, review = [OUT / x for x in ("originals", "web-jpg", "web-webp", "review")]
    for folder in (originals, jpgs, webps, review):
        folder.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update({"User-Agent": UA})
    rows = []

    for index, asset in enumerate(ASSETS):
        row = dict(asset)
        try:
            raw = download(session, asset)
            digest = hashlib.sha256(raw).hexdigest()
            with Image.open(io.BytesIO(raw)) as opened:
                image = ImageOps.exif_transpose(opened).convert("RGB")
            original = originals / asset["filename"]
            jpg = jpgs / asset["filename"]
            webp = webps / (Path(asset["filename"]).stem + ".webp")
            image.save(original, "JPEG", quality=95, optimize=True, progressive=True)
            large = image.copy(); large.thumbnail((2400, 1800), Image.Resampling.LANCZOS)
            large.save(jpg, "JPEG", quality=86, optimize=True, progressive=True)
            medium = image.copy(); medium.thumbnail((1600, 1200), Image.Resampling.LANCZOS)
            medium.save(webp, "WEBP", quality=82, method=6)
            row.update(download_status="success", width=image.width, height=image.height, bytes=len(raw), sha256=digest, original=original.relative_to(OUT).as_posix(), web_jpg=jpg.relative_to(OUT).as_posix(), web_webp=webp.relative_to(OUT).as_posix())
        except Exception as exc:  # noqa: BLE001
            row.update(download_status="error", error=str(exc))
        rows.append(row)
        print(asset["key"], row["download_status"], row.get("error", ""), flush=True)
        time.sleep(4)

    successful = [r for r in rows if r["download_status"] == "success"]
    font = ImageFont.load_default()
    tile_w, tile_h, label_h, cols = 420, 280, 64, 2
    canvas = Image.new("RGB", (tile_w * cols, max(1, (len(successful) + 1) // 2) * (tile_h + label_h)), "white")
    draw = ImageDraw.Draw(canvas)
    for i, row in enumerate(successful):
        x, y = (i % cols) * tile_w, (i // cols) * (tile_h + label_h)
        with Image.open(OUT / row["web_jpg"]) as opened:
            tile = ImageOps.fit(opened.convert("RGB"), (tile_w, tile_h), method=Image.Resampling.LANCZOS)
        canvas.paste(tile, (x, y))
        draw.text((x + 8, y + tile_h + 8), row["key"], fill="black", font=font)
        draw.text((x + 8, y + tile_h + 30), f'{row["author"]} · {row["license"]}', fill="black", font=font)
    canvas.save(review / "supplemental-contact-sheet.jpg", "JPEG", quality=88, optimize=True)

    (OUT / "manifest.json").write_text(json.dumps({"generated_at": time.time(), "assets": rows}, indent=2), encoding="utf-8")
    fields = sorted({k for row in rows for k in row})
    with (OUT / "manifest.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields); writer.writeheader(); writer.writerows(rows)
    readme = "# Licensed Nashville supplemental media\n\n" + "\n".join(f'- **{r["key"]}** — {r["author"]} — {r["license"]} — {r["download_status"]}' for r in rows) + "\n"
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    failures = [r for r in rows if r["download_status"] != "success"]
    if failures:
        print(json.dumps(failures, indent=2), flush=True)
        raise SystemExit(f"{len(failures)} supplemental downloads failed")


if __name__ == "__main__":
    main()
