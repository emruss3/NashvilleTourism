#!/usr/bin/env python3
"""
Download EXACT Wikimedia Commons originals from the restoration brief,
generate responsive WebP derivatives, and write a rights/manifest JSON.

Does NOT touch Adobe Stock (purchase-required until licensed originals arrive).
Does NOT search alternate sources.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path

from PIL import Image, ImageFile

# Some Commons JPEGs end slightly short of EOI; still usable at full stated dimensions.
ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public" / "media"
ORIG_DIR = ROOT / "docs" / "media" / "originals" / "commons-2026-08-09"
MANIFEST_PATH = ROOT / "docs" / "media" / "RESTORE-MANIFEST.json"
UA = "NashRoamMediaBot/1.0 (https://www.nashroam.com; media restoration; contact hello@nashroam.com)"


@dataclass
class Job:
    key: str
    commons_title: str  # File:Name.jpg
    local_stem: str  # relative to public/media without extension
    alt: str
    crop: str  # "cover" | "landscape" | "none"
    crop_note: str | None = None
    widths: tuple[int, ...] = (640, 960, 1600, 2400)
    portrait_source: bool = False  # prefer landscape crop from portrait originals


JOBS: list[Job] = [
    # Guides
    Job("guide/best-restaurants", "File:Nashville_Hot_Chicken_Drumsticks.jpg",
        "guides/best-restaurants-nashville",
        "Nashville-style hot chicken drumsticks served with pickles.", "cover"),
    Job("guide/bars-rooftops", "File:Nashville_skyline_and_bars.jpg",
        "guides/best-bars-rooftops-nashville",
        "Bars and rooftops beneath the Nashville skyline.", "landscape",
        "Landscape crop preserving bar/rooftop context.", portrait_source=True),
    Job("guide/live-music-venues", "File:Marine_Week_Nashville;_2nd_MAW_band_at_CMA_fest_(9103794).jpg",
        "guides/best-live-music-venues-nashville",
        "A large live performance at Ascend Amphitheater in downtown Nashville.", "cover"),
    Job("guide/neighborhood-guide", "File:Nashville,_TN_skyline.jpg",
        "guides/nashville-neighborhood-guide",
        "Downtown Nashville skyline over the Cumberland River.", "cover"),
    Job("guide/first-time-visitors", "File:Broadway_and_4th_Avenue,_Nashville,_TN_(54384489114).jpg",
        "guides/nashville-first-time-visitors",
        "Lower Broadway at Fourth Avenue in downtown Nashville.", "cover"),
    # Attractions
    Job("attractions/country-music-hall-of-fame", "File:Country_Music_Hall_of_Fame_2022c.jpg",
        "attractions/country-music-hall-of-fame",
        "Exterior of the Country Music Hall of Fame and Museum in downtown Nashville.", "cover"),
    Job("attractions/the-parthenon", "File:The_Parthenon_replica,_Centennial_Park,_Nashville,_Tennessee.jpg",
        "attractions/the-parthenon",
        "The Parthenon replica in Centennial Park, Nashville.", "cover"),
    Job("attractions/nashville-farmers-market",
        "File:FEMA_-_44075_-_Disaster_Officials_meet_with_food_vendors_in_Tennessee.jpg",
        "attractions/nashville-farmers-market",
        "Vendors and shoppers inside Nashville Farmers' Market.", "cover",
        "Interim exact-location federal photo (2010); replace with owned shoot."),
    Job("attractions/ryman-auditorium-tour",
        "File:Ryman_Auditorium,_5th_Avenue,_Nashville,_TN_(54384525798).jpg",
        "attractions/ryman-auditorium-tour",
        "Exterior of the Ryman Auditorium on Fifth Avenue in Nashville.", "cover",
        portrait_source=True),
    Job("attractions/frist-art-museum",
        "File:Old_Nashville_Post_Office_(Frist_Art_Museum),_Broadway_and_9th_Avenue,_Nashville,_TN_(54384287651).jpg",
        "attractions/frist-art-museum",
        "The Frist Art Museum building at Broadway and Ninth Avenue in Nashville.", "cover"),
    Job("attractions/cheekwood-estate-gardens",
        "File:Cheekwood_Estate_&_Gardens,_Nashville_3_24_21_(51118861080).jpg",
        "attractions/cheekwood-estate-gardens",
        "Gardens and grounds at Cheekwood Estate & Gardens in Nashville.", "cover"),
    Job("attractions/nmaam",
        "File:National_Museum_of_African_American_Music,_Fifth_+_Broadway,_Broadway_and_5th_Avenue,_Nashville,_TN_(54384524318).jpg",
        "attractions/nmaam",
        "National Museum of African American Music at Fifth + Broadway in Nashville.", "cover",
        portrait_source=True),
    # Music venues
    Job("music/ryman-auditorium",
        "File:Ryman_Auditorium,_5th_Avenue,_Nashville,_TN_(54384525798).jpg",
        "music/ryman-auditorium",
        "Exterior of the Ryman Auditorium on Fifth Avenue in Nashville.", "cover",
        portrait_source=True),
    Job("music/station-inn", "File:Station_Inn_Nashville_(8729882676).jpg",
        "music/station-inn",
        "Exterior of Station Inn in Nashville.", "cover"),
    Job("music/bluebird-cafe", "File:Jillian_Kohr_Live_At_The_Bluebird_Cafe.jpg",
        "music/bluebird-cafe",
        "A live performance inside The Bluebird Cafe in Nashville.", "cover"),
    Job("music/ascend-amphitheater",
        "File:Marine_Week_Nashville;_2nd_MAW_band_at_CMA_fest_(9103794).jpg",
        "music/ascend-amphitheater",
        "A large live performance at Ascend Amphitheater in downtown Nashville.", "cover"),
    Job("music/bridgestone-arena",
        "File:Nashville_Visitor_Center_and_Bridgestone_Arena,_Broadway_and_5th_Avenue,_Nashville,_TN_(54384487819).jpg",
        "music/bridgestone-arena",
        "Bridgestone Arena and the Nashville Visitor Center on Broadway.", "cover",
        portrait_source=True),
    # Neighborhoods
    Job("neighborhood/downtown-broadway",
        "File:Broadway_and_4th_Avenue,_Nashville,_TN_(54384489114).jpg",
        "neighborhoods/downtown-broadway",
        "Lower Broadway at Fourth Avenue in downtown Nashville.", "cover"),
    Job("neighborhood/12-south", "File:I_Believe_in_Nashville_Mural_Jameson_Fink.jpg",
        "neighborhoods/12-south",
        "The I Believe in Nashville mural in 12 South.", "landscape",
        "Landscape crop keeping the complete mural visible.", portrait_source=True),
    Job("neighborhood/the-gulch",
        "File:City_of_Nashville_skyline_from_Gulch_-_Oct_2019.jpg",
        "neighborhoods/the-gulch",
        "Nashville skyline viewed from the Gulch.", "cover"),
    Job("neighborhood/east-nashville", "File:EastNashvilleHD.jpg",
        "neighborhoods/east-nashville",
        "Streetscape in East Nashville.", "cover"),
    Job("neighborhood/germantown", "File:GermantownHDNashville.jpg",
        "neighborhoods/germantown",
        "Streetscape in Germantown, Nashville.", "cover"),
    Job("neighborhood/midtown", "File:Midtown,_Nashville,_TN,_USA_-_panoramio.jpg",
        "neighborhoods/midtown",
        "Midtown Nashville street view.", "cover"),
    Job("neighborhood/hillsboro-village", "File:DSCF9014-crop1.jpg",
        "neighborhoods/hillsboro-village",
        "The Belcourt Theatre in Hillsboro Village.", "cover"),
    Job("neighborhood/sylvan-park", "File:St._Andrew’s_Anglican_Church,_Nashville_01.jpg",
        "neighborhoods/sylvan-park",
        "St. Andrew's Anglican Church in the Sylvan Park area of Nashville.", "cover"),
    Job("neighborhood/green-hills", "File:Green_hills_1.jpg",
        "neighborhoods/green-hills",
        "The Mall at Green Hills in Nashville.", "cover",
        portrait_source=True),
    # Stay (Commons only)
    Job("stay/walkable-to-broadway",
        "File:Broadway_and_4th_Avenue,_Nashville,_TN_(54384489114).jpg",
        "stay/walkable-to-broadway",
        "Lower Broadway at Fourth Avenue in downtown Nashville.", "cover"),
    Job("stay/value-stays-midtown", "File:Midtown,_Nashville,_TN,_USA_-_panoramio.jpg",
        "stay/value-stays-midtown",
        "Midtown Nashville street view.", "cover"),
    # Hub leads (Commons)
    Job("hub/neighborhoods-index", "File:Nashville,_TN_skyline.jpg",
        "hubs/neighborhoods-index",
        "Downtown Nashville skyline over the Cumberland River.", "cover"),
]


def commons_info(title: str) -> dict:
    params = {
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|size|mime|sha1|extmetadata",
        "format": "json",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as res:
        data = json.load(res)
    pages = data["query"]["pages"]
    page = next(iter(pages.values()))
    if "missing" in page or "imageinfo" not in page:
        raise RuntimeError(f"Commons file not found: {title}")
    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})

    def mget(k: str) -> str | None:
        v = meta.get(k, {}).get("value")
        if not v:
            return None
        return re.sub(r"<[^>]+>", "", v).strip()

    license_short = mget("LicenseShortName") or mget("License") or "Unknown"
    artist = mget("Artist") or mget("Credit") or "Unknown"
    # Clean common artist HTML leftovers
    artist = re.sub(r"\s+", " ", artist).strip()
    return {
        "url": info["url"],
        "width": info["width"],
        "height": info["height"],
        "sha1": info.get("sha1"),
        "mime": info.get("mime"),
        "license": license_short,
        "artist": artist,
        "license_url": mget("LicenseUrl"),
        "description": mget("ImageDescription"),
        "commons_page": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
    }


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as res, open(dest, "wb") as out:
        while True:
            chunk = res.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)


def center_crop(im: Image.Image, ratio_w: float, ratio_h: float) -> Image.Image:
    w, h = im.size
    target = ratio_w / ratio_h
    current = w / h
    if abs(current - target) < 0.01:
        return im
    if current > target:
        # too wide
        new_w = int(h * target)
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))
    new_h = int(w / target)
    top = (h - new_h) // 2
    return im.crop((0, top, w, top + new_h))


def mural_crop(im: Image.Image) -> Image.Image:
    """Landscape crop that keeps the mural as complete as possible."""
    w, h = im.size
    # Prefer 3:2 landscape from portrait mural shot: crop vertically from upper-middle
    target = 3 / 2
    new_h = int(w / target)
    if new_h >= h:
        return center_crop(im, 3, 2)
    top = max(0, int(h * 0.12))
    if top + new_h > h:
        top = h - new_h
    return im.crop((0, top, w, top + new_h))


def process_job(job: Job, info: dict, original: Path) -> dict:
    with Image.open(original) as im0:
        im = im0.convert("RGB")
        modified = False
        note = job.crop_note
        if job.key == "neighborhood/12-south" or (job.crop == "landscape" and job.portrait_source):
            before = im.size
            if job.key == "neighborhood/12-south":
                im = mural_crop(im)
            else:
                im = center_crop(im, 3, 2)
            modified = im.size != before
            note = note or "Cropped to landscape for card/hero placement."
        elif job.crop == "cover":
            # Keep native aspect for master jpg; derivatives crop per use via CSS object-fit.
            # Still write a master jpg at original aspect (max edge 3200) without upscaling.
            pass

        # Master JPEG (no upscale): longest edge ≤ 3200
        master = im.copy()
        mw, mh = master.size
        longest = max(mw, mh)
        if longest > 3200:
            scale = 3200 / longest
            master = master.resize((int(mw * scale), int(mh * scale)), Image.Resampling.LANCZOS)
            modified = True
            note = (note + "; " if note else "") + "Resized master longest edge to 3200px (no upscale)."

        out_jpg = PUBLIC / f"{job.local_stem}.jpg"
        out_jpg.parent.mkdir(parents=True, exist_ok=True)
        master.save(out_jpg, format="JPEG", quality=90, optimize=True)

        # For responsive sets, generate cover-cropped variants at 3:2 for cards and 16:9 for leads
        # Store as {stem}-{w}.webp using 16:9 for large editorial, 3:2 for card widths.
        variants = {}
        for w in job.widths:
            if w > master.size[0] and w > master.size[1]:
                continue  # never upscale
            # Prefer width-based resize of a 16:9 crop for hub/hero; 3:2 for guides cards
            ratio = (16, 9) if w >= 1600 else (3, 2)
            base = center_crop(master, ratio[0], ratio[1])
            # scale to width w without exceeding source
            bw, bh = base.size
            if bw < w:
                continue
            nh = int(bh * (w / bw))
            resized = base.resize((w, nh), Image.Resampling.LANCZOS)
            webp_path = PUBLIC / f"{job.local_stem}-{w}.webp"
            resized.save(webp_path, format="WEBP", quality=86, method=6)
            variants[str(w)] = {
                "path": "/" + str(webp_path.relative_to(ROOT / "public")).replace("\\", "/"),
                "width": w,
                "height": nh,
            }

        src_set = ", ".join(
            f"{variants[k]['path']} {k}w" for k in sorted(variants, key=lambda x: int(x))
        )

        sha = hashlib.sha256(out_jpg.read_bytes()).hexdigest()
        return {
            "key": job.key,
            "alt": job.alt,
            "local_jpg": "/" + str(out_jpg.relative_to(ROOT / "public")).replace("\\", "/"),
            "width": master.size[0],
            "height": master.size[1],
            "srcSet": src_set,
            "variants": variants,
            "modified": modified or bool(job.crop_note),
            "modificationNote": note,
            "rightsStatus": "cleared",
            "approvalStatus": "approved",
            "credit": info["artist"],
            "license": normalize_license(info["license"]),
            "licenseUrl": info["license_url"] or license_url_for(normalize_license(info["license"])),
            "sourceUrl": info["commons_page"],
            "originalUrl": info["url"],
            "originalWidth": info["width"],
            "originalHeight": info["height"],
            "sourceSha256": sha,
            "commonsTitle": job.commons_title,
        }


def normalize_license(raw: str) -> str:
    r = raw.strip()
    mapping = {
        "Public domain": "Public Domain",
        "PD": "Public Domain",
        "CC0": "CC0 1.0",
    }
    if r in mapping:
        return mapping[r]
    # Wikimedia sometimes returns "Creative Commons Attribution-Share Alike 4.0"
    if "Attribution-Share Alike 4.0" in r or r == "CC BY-SA 4.0":
        return "CC BY-SA 4.0"
    if "Attribution-Share Alike 3.0" in r or r == "CC BY-SA 3.0":
        return "CC BY-SA 3.0"
    if "Attribution-Share Alike 2.0" in r or r == "CC BY-SA 2.0":
        return "CC BY-SA 2.0"
    if "Attribution 4.0" in r or r == "CC BY 4.0":
        return "CC BY 4.0"
    if "Attribution 3.0" in r or r == "CC BY 3.0":
        return "CC BY 3.0"
    if "Attribution 2.0" in r or r == "CC BY 2.0":
        return "CC BY 2.0"
    if "public domain" in r.lower() or "PD-USGov" in r:
        return "Public Domain"
    return r


def license_url_for(name: str) -> str | None:
    return {
        "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
        "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
        "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
        "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
        "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
        "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
        "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
        "Public Domain": "https://creativecommons.org/publicdomain/mark/1.0/",
    }.get(name)


def main() -> int:
    ORIG_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    errors = []
    # Deduplicate commons downloads
    cache: dict[str, dict] = {}
    for job in JOBS:
        print(f"> {job.key}")
        try:
            if job.commons_title not in cache:
                info = commons_info(job.commons_title)
                cache[job.commons_title] = info
                ext = Path(urllib.parse.urlparse(info["url"]).path).suffix or ".jpg"
                safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", job.commons_title.replace("File:", ""))
                dest = ORIG_DIR / f"{safe}{ext}"
                print(f"  download {info['width']}x{info['height']} {info['license']}")
                download(info["url"], dest)
                info["local_original"] = str(dest.relative_to(ROOT)).replace("\\", "/")
                cache[job.commons_title] = info
            info = cache[job.commons_title]
            original = ROOT / info["local_original"]
            row = process_job(job, info, original)
            results.append(row)
            print(f"  ok -> {row['local_jpg']} ({row['width']}x{row['height']})")
        except Exception as e:
            errors.append({"key": job.key, "error": str(e)})
            print(f"  ERROR: {e}", file=sys.stderr)

    MANIFEST_PATH.write_text(
        json.dumps({"generated": "2026-08-09", "assets": results, "errors": errors}, indent=2),
        encoding="utf-8",
    )
    print(f"\nWrote {MANIFEST_PATH} ({len(results)} ok, {len(errors)} errors)")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
