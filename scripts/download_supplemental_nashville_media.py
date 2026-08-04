#!/usr/bin/env python3
"""Download and optimize geographically accurate, openly licensed Nashville media.

All source metadata is explicit. This script supplements BPH-owned photography
only where the owned sites do not truthfully cover a named neighborhood.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import shutil
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps

OUT = Path("nashville-supplemental-media")
UA = "NashvilleTourism media builder/1.0 (editorial asset retrieval)"

SOURCES = [
    {
        "key": "neighborhood-east-nashville",
        "filename": "east-nashville.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/b/b1/EastNashvilleHD.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:EastNashvilleHD.jpg",
        "author": "Andrew Jameson",
        "license": "CC BY-SA 3.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/3.0/",
        "alt": "Historic houses on a leafy street in East Nashville.",
        "use": "Neighborhood: East Nashville",
        "status": "approved",
    },
    {
        "key": "neighborhood-germantown",
        "filename": "germantown.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/9/9c/GermantownHDNashville.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:GermantownHDNashville.jpg",
        "author": "Andrew Jameson",
        "license": "CC BY-SA 3.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/3.0/",
        "alt": "Historic brick building and houses at 7th Avenue and Monroe Street in Germantown.",
        "use": "Neighborhood: Germantown",
        "status": "approved",
    },
    {
        "key": "neighborhood-the-gulch",
        "filename": "the-gulch.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/2/29/Gulch_Greenway.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:Gulch_Greenway.jpg",
        "author": "Lahti213",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
        "alt": "The Gulch Greenway in Nashville.",
        "use": "Neighborhood: The Gulch",
        "status": "approved",
    },
    {
        "key": "neighborhood-hillsboro-village",
        "filename": "hillsboro-village.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/b/b9/DSCF9014-crop1.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:DSCF9014-crop1.jpg",
        "author": "CEWall",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
        "alt": "The Belcourt Theatre at dusk in Hillsboro Village.",
        "use": "Neighborhood: Hillsboro Village",
        "status": "approved",
    },
    {
        "key": "neighborhood-12-south",
        "filename": "12-south.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/4/45/I_Believe_in_Nashville_Mural_Jameson_Fink.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:I_Believe_in_Nashville_Mural_Jameson_Fink.jpg",
        "author": "Jameson Fink",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
        "alt": "The I Believe in Nashville mural in the 12 South neighborhood.",
        "use": "Neighborhood: 12 South",
        "status": "approved",
    },
    {
        "key": "neighborhood-west-end-midtown",
        "filename": "west-end-midtown.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/0/0e/Nashville_Parthenon%2C_Centennial_Park%2C_West_End_Avenue%2C_Midtown%2C_Nashville%2C_TN_%2854385063001%29.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:Nashville_Parthenon,_Centennial_Park,_West_End_Avenue,_Midtown,_Nashville,_TN_(54385063001).jpg",
        "author": "Warren LeMay",
        "license": "CC BY-SA 2.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/2.0/",
        "alt": "The Parthenon in Centennial Park along West End Avenue in Midtown Nashville.",
        "use": "Neighborhood: West End / Midtown; attraction: Parthenon",
        "status": "approved",
    },
    {
        "key": "neighborhood-music-row",
        "filename": "music-row.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/7/76/RCA_Studio_B_%281%29.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:RCA_Studio_B_(1).jpg",
        "author": "Cliff",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
        "alt": "RCA Studio B on Music Row in Nashville.",
        "use": "Neighborhood: Music Row",
        "status": "approved",
    },
    {
        "key": "neighborhood-green-hills",
        "filename": "green-hills.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/8/84/Green_Hills_2010.JPG",
        "source_page": "https://commons.wikimedia.org/wiki/File:Green_Hills_2010.JPG",
        "author": "Dougmac7",
        "license": "CC BY-SA 3.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/3.0/",
        "alt": "Hillsboro Road at Crestmoor Road in Green Hills, Nashville.",
        "use": "Neighborhood: Green Hills",
        "status": "approved",
    },
    {
        "key": "hub-opryland-hotel",
        "filename": "opryland-hotel.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/d/d6/Opryland_Hotel_2022g.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:Opryland_Hotel_2022g.jpg",
        "author": "Antony-22",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
        "alt": "The Cascades Atrium inside Gaylord Opryland Resort in Nashville.",
        "use": "Hub: Opryland; hub: hotels",
        "status": "approved",
    },
    {
        "key": "attraction-grand-ole-opry",
        "filename": "grand-ole-opry-house.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/0/0c/Grand_Ole_Opry_House_2022a.jpg",
        "source_page": "https://commons.wikimedia.org/wiki/File:Grand_Ole_Opry_House_2022a.jpg",
        "author": "Antony-22",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
        "alt": "The entrance of the Grand Ole Opry House in Nashville.",
        "use": "Attraction: Grand Ole Opry; hub: music",
        "status": "approved",
    },
]


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    originals = OUT / "originals"
    jpg_dir = OUT / "web-jpg"
    webp_dir = OUT / "web-webp"
    review_dir = OUT / "review"
    for folder in [originals, jpg_dir, webp_dir, review_dir]:
        folder.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update({"User-Agent": UA, "Accept": "image/avif,image/webp,image/*,*/*"})
    rows = []

    for source in SOURCES:
        row = dict(source)
        try:
            response = session.get(source["url"], timeout=60)
            response.raise_for_status()
            raw = response.content
            digest = hashlib.sha256(raw).hexdigest()
            with Image.open(io.BytesIO(raw)) as opened:
                image = ImageOps.exif_transpose(opened).convert("RGB")
            row.update({"width": image.width, "height": image.height, "bytes": len(raw), "sha256": digest})

            original_path = originals / source["filename"]
            jpg_path = jpg_dir / source["filename"]
            webp_path = webp_dir / (Path(source["filename"]).stem + ".webp")
            image.save(original_path, "JPEG", quality=95, optimize=True, progressive=True)
            large = image.copy()
            large.thumbnail((2400, 1800), Image.Resampling.LANCZOS)
            large.save(jpg_path, "JPEG", quality=86, optimize=True, progressive=True)
            medium = image.copy()
            medium.thumbnail((1600, 1200), Image.Resampling.LANCZOS)
            medium.save(webp_path, "WEBP", quality=82, method=6)
            row.update({
                "download_status": "success",
                "original": original_path.relative_to(OUT).as_posix(),
                "web_jpg": jpg_path.relative_to(OUT).as_posix(),
                "web_webp": webp_path.relative_to(OUT).as_posix(),
            })
        except Exception as exc:  # noqa: BLE001
            row.update({"download_status": "error", "error": str(exc)})
        rows.append(row)
        print(source["key"], row["download_status"], flush=True)

    successful = [row for row in rows if row.get("download_status") == "success"]
    font = ImageFont.load_default()
    tile_w, tile_h, label_h, cols = 420, 280, 64, 2
    sheet = Image.new("RGB", (tile_w * cols, ((len(successful) + cols - 1) // cols) * (tile_h + label_h)), "white")
    draw = ImageDraw.Draw(sheet)
    for index, row in enumerate(successful):
        x = (index % cols) * tile_w
        y = (index // cols) * (tile_h + label_h)
        with Image.open(OUT / row["web_jpg"]) as opened:
            tile = ImageOps.fit(opened.convert("RGB"), (tile_w, tile_h), method=Image.Resampling.LANCZOS)
        sheet.paste(tile, (x, y))
        draw.text((x + 8, y + tile_h + 8), row["key"][:58], fill="black", font=font)
        draw.text((x + 8, y + tile_h + 28), f'{row["author"]} · {row["license"]}', fill="black", font=font)
    sheet.save(review_dir / "supplemental-contact-sheet.jpg", "JPEG", quality=88, optimize=True)

    (OUT / "manifest.json").write_text(json.dumps({"generated_at": time.time(), "assets": rows}, indent=2), encoding="utf-8")
    fields = sorted({key for row in rows for key in row})
    with (OUT / "manifest.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    readme = "# Licensed Nashville supplemental media\n\n"
    readme += "These assets fill geographic gaps not covered by the BPH-owned websites. Attribution and license data must travel with every file.\n\n"
    for row in rows:
        readme += f'- **{row["key"]}** — {row["author"]} — {row["license"]} — {row.get("download_status")}\n'
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    if any(row.get("download_status") != "success" for row in rows):
        raise SystemExit("One or more supplemental downloads failed")


if __name__ == "__main__":
    main()
