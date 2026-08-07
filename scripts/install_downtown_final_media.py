#!/usr/bin/env python3
"""Process FINAL Downtown/Broadway masters into responsive WebP tiers. Never upscale."""

from __future__ import annotations

import gc
import json
import shutil
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tmp" / "downtown-sources"
ORIG = ROOT / "media-originals" / "downtown"
PUBLIC = ROOT / "public" / "media"
Q = 84
Image.MAX_IMAGE_PIXELS = None


@dataclass
class Job:
    key: str  # path stem under public/media/{folder}/
    folder: str
    source: Path
    kind: str  # hero | standard
    alt: str
    credit: str
    licence: str
    source_url: str
    notes: str = ""
    focal_x: float = 0.5
    focal_y: float = 0.5
    desktop_ratio: float | None = None  # None = preserve aspect
    mobile_ratio: float | None = None


def crop_ratio(img: Image.Image, ratio: float, fx: float = 0.5, fy: float = 0.5) -> Image.Image:
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


def export_widths(img: Image.Image, dest_dir: Path, stem: str, widths: list[int]) -> list[tuple[int, int, int]]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    max_w = img.size[0]
    out_meta: list[tuple[int, int, int]] = []
    for w in widths:
        tw = min(w, max_w)
        th = int(round(tw * img.size[1] / img.size[0]))
        frame = img if (tw, th) == img.size else img.resize((tw, th), Image.Resampling.LANCZOS)
        path = dest_dir / f"{stem}-{w}.webp"
        frame.save(path, "WEBP", quality=Q, method=6)
        out_meta.append((w, frame.size[0], frame.size[1]))
        print(f"  {path.relative_to(ROOT)} {frame.size[0]}x{frame.size[1]} {path.stat().st_size}B")
    return out_meta


def process(job: Job) -> dict:
    if not job.source.exists():
        raise FileNotFoundError(job.source)

    ORIG.mkdir(parents=True, exist_ok=True)
    orig_dest = ORIG / f"{job.key}{job.source.suffix.lower()}"
    if job.source.resolve() != orig_dest.resolve():
        shutil.copy2(job.source, orig_dest)

    im = Image.open(job.source).convert("RGB")
    print(f"\n{job.key} source {im.size} from {job.source.name}")

    dest_dir = PUBLIC / job.folder
    if job.kind == "hero":
        desktop = crop_ratio(im, job.desktop_ratio or (16 / 9), job.focal_x, job.focal_y)
        widths = [800, 1200, 1600, 2400]
        meta = export_widths(desktop, dest_dir, job.key, widths)
        mobile_meta = None
        if job.mobile_ratio:
            mobile = crop_ratio(im, job.mobile_ratio, job.focal_x, job.focal_y)
            mobile_meta = export_widths(mobile, dest_dir, f"{job.key}-mobile", [800, 1200])
        master_w = min(2400, desktop.size[0])
        master_h = int(round(master_w * desktop.size[1] / desktop.size[0]))
    else:
        base = im
        if job.desktop_ratio:
            base = crop_ratio(im, job.desktop_ratio, job.focal_x, job.focal_y)
        widths = [640, 960, 1600]
        meta = export_widths(base, dest_dir, job.key, widths)
        mobile_meta = None
        if job.mobile_ratio:
            mobile = crop_ratio(im, job.mobile_ratio, job.focal_x, job.focal_y)
            mobile_meta = export_widths(mobile, dest_dir, f"{job.key}-mobile", [640, 960])
        master_w = min(1600, base.size[0])
        master_h = int(round(master_w * base.size[1] / base.size[0]))

    del im
    gc.collect()

    srcset_parts = []
    for slot_w, actual_w, _ in meta:
        srcset_parts.append(f"/media/{job.folder}/{job.key}-{slot_w}.webp {actual_w}w")

    record = {
        "key": f"{job.folder}/{job.key}" if job.folder != "neighborhoods" else f"neighborhood/{job.key}",
        "folder": job.folder,
        "stem": job.key,
        "alt": job.alt,
        "credit": job.credit,
        "licence": job.licence,
        "source_url": job.source_url,
        "notes": job.notes,
        "width": master_w,
        "height": master_h,
        "src": f"/media/{job.folder}/{job.key}-{widths[-1] if job.kind != 'hero' else 2400}.webp".replace(
            f"-{2400}.webp", f"-{meta[-1][0]}.webp"
        ),
        "srcSet": ", ".join(srcset_parts),
        "mobile": None,
    }
    # Prefer the largest produced file as src
    largest_slot = meta[-1][0]
    record["src"] = f"/media/{job.folder}/{job.key}-{largest_slot}.webp"
    record["width"] = meta[-1][1]
    record["height"] = meta[-1][2]

    if mobile_meta:
        mparts = [
            f"/media/{job.folder}/{job.key}-mobile-{slot}.webp {aw}w" for slot, aw, _ in mobile_meta
        ]
        record["mobile"] = {
            "src": f"/media/{job.folder}/{job.key}-mobile-{mobile_meta[-1][0]}.webp",
            "srcSet": ", ".join(mparts),
            "width": mobile_meta[-1][1],
            "height": mobile_meta[-1][2],
        }
    return record


JOBS: list[Job] = [
    Job(
        key="sobro",
        folder="downtown",
        source=SRC / "FINAL-downtown-sobro-ascend-river-skyline-bluehour-NSH_146-3000x1999.jpg",
        kind="standard",
        alt="Elevated blue-hour view of SoBro with Ascend Amphitheater, the Cumberland River, and downtown hotel towers.",
        credit="Four Seasons Hotels and Resorts",
        licence="Four Seasons press library — authorized editorial use",
        source_url="https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_146_original.jpg",
        notes="SoBro zone environmental; Ascend + river + skyline",
        desktop_ratio=3 / 2,
        focal_y=0.45,
    ),
    Job(
        key="nashville-yards",
        folder="downtown",
        source=SRC / "FINAL-downtown-nashville-yards-grand-hyatt-dusk-exterior-4000x3965.jpg",
        kind="standard",
        alt="Grand Hyatt Nashville and surrounding Nashville Yards mixed-use buildings at dusk.",
        credit="Grand Hyatt Nashville / Hyatt Hotels",
        licence="Official hotel distribution (IcePortal)",
        source_url="https://media.iceportal.com/134257/photos/72997025_XL/",
        notes="Nashville Yards architectural exterior with Grand Hyatt",
        desktop_ratio=3 / 2,
        focal_y=0.4,
        mobile_ratio=4 / 5,
        focal_x=0.5,
    ),
    Job(
        key="roberts-western-world",
        folder="venues",
        source=SRC / "FINAL-venues-roberts-western-world-stage-interior-1400x823.jpg",
        kind="standard",
        alt="Stage interior at Robert's Western World with drum kit branding, neon lighting, and memorabilia-lined walls.",
        credit="Robert's Western World",
        licence="Official venue website media",
        source_url="https://www.robertswesternworld.com/",
        notes="Official interior stage identity; live performers not in frame in authorized public set",
        desktop_ratio=3 / 2,
        focal_y=0.4,
    ),
    Job(
        key="twelve-thirty-club",
        folder="venues",
        source=ROOT / "media-originals" / "nashroam" / "Twelve-Thirty-Club-bar.jpg",
        kind="standard",
        alt="Twelve Thirty Club supper club bar with red and green leather seating, brass, marble, and dark wood.",
        credit="Nashville Convention & Visitors Corp / property media",
        licence="CVC / property-authorized media held by BPH",
        source_url="local:media-originals/nashroam/Twelve-Thirty-Club-bar.jpg",
        desktop_ratio=3 / 2,
        focal_y=0.45,
    ),
    Job(
        key="chiefs-on-broadway",
        folder="venues",
        source=SRC / "FINAL-venues-chiefs-exterior-dusk-2400x1400.jpg",
        kind="standard",
        alt="Chief's on Broadway dusk exterior with restored brick facade, stained-glass windows, and illuminated marquee.",
        credit="Chief's on Broadway",
        licence="Official venue website media",
        source_url="https://www.chiefsonbroadway.com/wp-content/uploads/2024/05/Chiefs_Exterior_2400.jpg",
        desktop_ratio=3 / 2,
        focal_y=0.45,
    ),
    Job(
        key="category-10",
        folder="venues",
        source=SRC / "FINAL-venues-category-10-main-floor-balcony-6048x3409.jpg",
        kind="standard",
        alt="Category 10 main floor crowd with balcony mezzanine and Category 10 neon identity.",
        credit="Category 10 / Nathan Zucker",
        licence="Official category10.com media",
        source_url="https://www.category10.com/wp-content/uploads/sites/18/2026/05/Bachelorette-Party_by-Nathan-Zucker_0821-2025_NZ4_0033-edited.jpg",
        notes="Main floor + balcony; stage/hat wall not primary in this authorized frame",
        desktop_ratio=3 / 2,
        focal_x=0.55,
        focal_y=0.45,
        mobile_ratio=4 / 5,
    ),
    Job(
        key="assembly-food-hall",
        folder="restaurants",
        source=SRC / "FINAL-restaurants-assembly-food-hall-interior-1750x1313.png",
        kind="standard",
        alt="Interior of Assembly Food Hall with multiple vendor counters and open circulation.",
        credit="Food Hall Co / Assembly Food Hall",
        licence="Official property media",
        source_url="https://foodhallco.com/wp-content/uploads/2022/08/Assembly_Property.png",
        desktop_ratio=3 / 2,
        focal_y=0.5,
    ),
    Job(
        key="bacco",
        folder="restaurants",
        source=SRC / "FINAL-restaurants-bacco-green-banquettes-kitchen-NSH_1316-3000x1668.jpg",
        kind="standard",
        alt="Bacco dining room with green banquettes, open kitchen, dry-aging cabinet, and patterned floor.",
        credit="Four Seasons Hotels and Resorts",
        licence="Four Seasons press library — authorized editorial use",
        source_url="https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_1316_original.jpg",
        desktop_ratio=3 / 2,
        focal_y=0.5,
    ),
    Job(
        key="etch",
        folder="restaurants",
        source=SRC / "FINAL-restaurants-etch-dining-room-populated-1800x1200.jpg",
        kind="standard",
        alt="Populated dining room and chef's bar interior at etch restaurant downtown.",
        credit="etch restaurant",
        licence="Official restaurant website media",
        source_url="https://etchrestaurant.com/wp-content/uploads/2022/01/Interior.jpg",
        desktop_ratio=3 / 2,
        focal_y=0.45,
    ),
    Job(
        key="four-seasons-nashville",
        folder="hotels",
        source=ROOT / "media-originals" / "nashroam" / "NSH_490_original.jpg",
        kind="standard",
        alt="Four Seasons Hotel Nashville rooftop pool and terrace overlooking the Cumberland River.",
        credit="Four Seasons Hotels and Resorts",
        licence="Four Seasons press library — authorized editorial use",
        source_url="https://press.fourseasons.com/content/dam/fourseasons/images/web/NSH/NSH_490_original.jpg",
        desktop_ratio=3 / 2,
        focal_y=0.4,
        mobile_ratio=4 / 5,
    ),
    Job(
        key="1-hotel-nashville",
        folder="hotels",
        source=SRC / "FINAL-hotels-1-hotel-lobby-timber-greenery-1920x1440.jpg",
        kind="standard",
        alt="1 Hotel Nashville lobby with timber structure, leather seating, and abundant greenery.",
        credit="1 Hotels",
        licence="Official brand media (Brandfolder)",
        source_url="https://cdn.bfldr.com/TU9NUD0C/at//9vg88ppwqbhqt6ntwzgvgx/2022-12-07_1Hotel_Nashville_Day2_MF_RT_S0392-1921x1440-9c1935f.jpg",
        desktop_ratio=3 / 2,
        focal_y=0.45,
    ),
    Job(
        key="the-joseph",
        folder="hotels",
        source=SRC / "joseph-outdoor-rooftop-pool-4796-dam.jpg",
        kind="standard",
        alt="Rooftop pool at The Joseph, a Luxury Collection Hotel, Nashville.",
        credit="Marriott International / The Joseph Nashville",
        licence="Official Marriott gallery media",
        source_url="https://cache.marriott.com/content/dam/marriott-renditions/BNALJ/bnalj-outdoor-rooftop-pool-4796-hor-wide.jpg",
        notes="Official Marriott 'Outdoor Rooftop Pool' / Rooftop Pool gallery selection",
        desktop_ratio=3 / 2,
        focal_y=0.45,
        mobile_ratio=4 / 5,
    ),
    Job(
        key="hermitage-hotel",
        folder="hotels",
        source=ROOT / "media-originals" / "nashroam" / "hermitage-hotel-lobby_1.jpg",
        kind="standard",
        alt="Grand Hermitage Hotel lobby with vaulted historic ceiling, fireplace, chandeliers, and central floral table.",
        credit="The Hermitage Hotel / Nashville CVC media",
        licence="CVC / property-authorized media held by BPH",
        source_url="local:media-originals/nashroam/hermitage-hotel-lobby_1.jpg",
        desktop_ratio=3 / 2,
        focal_y=0.4,
    ),
    Job(
        key="grand-hyatt-nashville",
        folder="hotels",
        source=SRC / "FINAL-hotels-grand-hyatt-rooftop-pool-twilight-4000x3207.jpg",
        kind="standard",
        alt="Grand Hyatt Nashville rooftop pool at twilight with Nashville Yards skyline context.",
        credit="Grand Hyatt Nashville / Hyatt Hotels",
        licence="Official hotel distribution (IcePortal)",
        source_url="https://media.iceportal.com/134257/photos/72997003_XL/",
        desktop_ratio=3 / 2,
        focal_y=0.4,
        mobile_ratio=4 / 5,
    ),
    Job(
        key="pedestrian-bridge",
        folder="editorial",
        source=ROOT / "media-originals" / "nashroam" / "Skyline-bridge-view.jpg",
        kind="hero",
        alt="John Seigenthaler Pedestrian Bridge at blue hour with downtown skyline and Cumberland River reflections.",
        credit="Nashville Convention & Visitors Corp",
        licence="CVC media library — authorized editorial use",
        source_url="https://www.visitmusiccity.com/sites/default/files/2025-02/Skyline-bridge-view.jpg",
        desktop_ratio=16 / 9,
        focal_y=0.45,
        mobile_ratio=4 / 5,
        focal_x=0.55,
    ),
    Job(
        key="country-music-hall-of-fame-night",
        folder="attractions",
        source=ROOT / "tmp" / "attraction-sources" / "cmhof-night_w_4000_q_90.jpg",
        kind="standard",
        alt="Blue-hour exterior of the Country Music Hall of Fame and Museum with the Omni Nashville Hotel visible.",
        credit="The Country Music Hall Of Fame and Museum",
        licence="Institution-authorized media",
        source_url="local:tmp/attraction-sources/cmhof-night_w_4000_q_90.jpg",
        desktop_ratio=3 / 2,
        focal_y=0.45,
        mobile_ratio=4 / 5,
    ),
]


def main() -> None:
    report = []
    for job in JOBS:
        report.append(process(job))
    out = SRC / "INSTALL-REPORT.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nWrote {out}")


if __name__ == "__main__":
    main()
