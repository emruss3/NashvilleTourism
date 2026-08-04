#!/usr/bin/env python3
"""Fast, review-first inventory of photography from BPH-owned Nashville sites."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import subprocess
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont, ImageOps

OUT = Path("owned-media-library")
TIMEOUT = 12
MAX_PER_SITE = 90
MIN_W, MIN_H = 700, 420
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"

SITES = {
    "jbjs": {
        "name": "JBJ's Nashville",
        "pages": [
            "https://www.jbjsnash.com/",
            "https://www.jbjsnash.com/about",
            "https://www.jbjsnash.com/faqs",
        ],
        "uses": ["Downtown/Broadway", "live music", "nightlife", "rooftop", "groups", "food and drink"],
    },
    "hanks": {
        "name": "Hank Williams Jr.'s Boogie Bar",
        "pages": [
            "https://www.hanksnash.com/",
            "https://www.hanksnash.com/about",
            "https://www.hanksnash.com/vip-reservations",
        ],
        "uses": ["Downtown/Broadway", "live music", "rooftop", "sports", "food and drink"],
    },
    "playdate": {
        "name": "Playdate Nashville",
        "pages": ["https://www.playdatenash.com/"],
        "uses": ["12 South", "restaurants", "brunch", "groups", "patio", "daytime"],
    },
    "the-lanes": {
        "name": "Solaya at The Lanes",
        "pages": ["https://thelanesnashville.com/"],
        "uses": ["wellness", "family", "outdoors", "greenway", "residential design"],
    },
    "delux-weho": {
        "name": "DELUX WeHo",
        "pages": [
            "https://deluxweho.com/",
            "https://deluxweho.com/gallery/",
            "https://deluxweho.com/p/neighborhood/",
        ],
        "uses": ["Wedgewood-Houston", "wellness", "pool", "fitness", "urban living", "skyline"],
    },
}

BAD_TERMS = {
    "logo", "icon", "favicon", "sprite", "arrow", "chevron", "cookie", "close", "menu",
    "facebook", "instagram", "tiktok", "linkedin", "wordmark", "equal-housing", "qr-code",
}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff"}


@dataclass
class Row:
    site: str
    site_name: str
    page_url: str
    source_url: str
    alt: str = ""
    context: str = ""
    status: str = "discovered"
    reason: str = ""
    width: int = 0
    height: int = 0
    bytes: int = 0
    sha256: str = ""
    original: str = ""
    web_jpg: str = ""
    web_webp: str = ""


def clean(raw: str, base: str) -> str | None:
    if not raw or raw.startswith(("data:", "blob:")):
        return None
    value = urljoin(base, raw.strip().strip("'\""))
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        return None
    return value.split("#", 1)[0]


def image_candidates(html: str, page_url: str) -> list[tuple[str, str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    found: list[tuple[str, str, str]] = []

    def add(raw: str | None, alt: str = "", context: str = "") -> None:
        url = clean(raw or "", page_url)
        if not url:
            return
        ext = Path(urlparse(url).path).suffix.lower()
        if ext in IMAGE_EXTS:
            found.append((url, alt[:400], context[:800]))

    for tag in soup.find_all(["img", "source", "video"]):
        context = " ".join(tag.parent.get_text(" ", strip=True).split()) if tag.parent else ""
        for attr in ("src", "data-src", "data-lazy-src", "data-original", "poster"):
            add(tag.get(attr), tag.get("alt", ""), context)
        for attr in ("srcset", "data-srcset"):
            for part in (tag.get(attr) or "").split(","):
                add(part.strip().split()[0] if part.strip() else "", tag.get("alt", ""), context)

    for tag in soup.find_all(style=True):
        for match in re.finditer(r"url\(([^)]+)\)", tag.get("style", ""), flags=re.I):
            add(match.group(1), tag.get("aria-label", ""), "inline background")

    for style in soup.find_all("style"):
        for match in re.finditer(r"url\(([^)]+)\)", style.get_text(" "), flags=re.I):
            add(match.group(1), "", "stylesheet background")

    for meta in soup.find_all("meta"):
        if meta.get("property") == "og:image" or meta.get("name") == "twitter:image":
            add(meta.get("content"), "", "social metadata")

    # Catch Webflow/WordPress/Entrata JSON strings containing image URLs.
    for match in re.finditer(r"https?://[^\s\"'<>\\]+", html):
        candidate = match.group(0).replace("&amp;", "&")
        if Path(urlparse(candidate).path).suffix.lower() in IMAGE_EXTS:
            add(candidate, "", "embedded source")

    unique: dict[str, tuple[str, str, str]] = {}
    for item in found:
        key = urlparse(item[0]).netloc.lower() + unquote(urlparse(item[0]).path).lower()
        # Prefer the largest Webflow srcset candidate, which tends to appear later.
        unique[key] = item
    return list(unique.values())


def safe_name(url: str, digest: str) -> str:
    stem = Path(unquote(urlparse(url).path)).stem
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", stem).strip("-._").lower()[:80]
    return stem or digest[:10]


def fetch(session: requests.Session, url: str) -> requests.Response:
    response = session.get(url, timeout=TIMEOUT, allow_redirects=True)
    response.raise_for_status()
    return response


def process_site(session: requests.Session, key: str, spec: dict) -> list[Row]:
    discovered: list[Row] = []
    seen_urls: set[str] = set()
    for page in spec["pages"]:
        try:
            response = fetch(session, page)
        except Exception as exc:  # noqa: BLE001
            discovered.append(Row(key, spec["name"], page, "", status="page-error", reason=str(exc)[:300]))
            continue
        for url, alt, context in image_candidates(response.text, response.url):
            normalized = urlparse(url).netloc.lower() + unquote(urlparse(url).path).lower()
            if normalized in seen_urls:
                continue
            seen_urls.add(normalized)
            discovered.append(Row(key, spec["name"], response.url, url, alt, context))
            if len(discovered) >= MAX_PER_SITE:
                break
        if len(discovered) >= MAX_PER_SITE:
            break
    return discovered


def download(rows: list[Row], session: requests.Session) -> None:
    raw = OUT / "raw"
    web = OUT / "web"
    raw.mkdir(parents=True, exist_ok=True)
    web.mkdir(parents=True, exist_ok=True)
    seen_hash: dict[str, str] = {}

    for index, row in enumerate(rows, 1):
        if not row.source_url:
            continue
        filename = unquote(Path(urlparse(row.source_url).path).name).lower()
        blocked = next((term for term in BAD_TERMS if term in filename), None)
        if blocked:
            row.status, row.reason = "rejected", f"UI/brand asset: {blocked}"
            continue
        try:
            content = fetch(session, row.source_url).content
            row.bytes = len(content)
            if len(content) < 20_000:
                row.status, row.reason = "rejected", "under 20 KB"
                continue
            digest = hashlib.sha256(content).hexdigest()
            row.sha256 = digest
            if digest in seen_hash:
                row.status, row.reason = "duplicate", seen_hash[digest]
                continue
            with Image.open(io.BytesIO(content)) as source:
                source.load()
                image = ImageOps.exif_transpose(source).convert("RGB")
            row.width, row.height = image.size
            if row.width < MIN_W or row.height < MIN_H:
                row.status, row.reason = "rejected", f"too small: {row.width}x{row.height}"
                continue
            ratio = row.width / row.height
            if ratio > 4 or ratio < 0.35:
                row.status, row.reason = "rejected", f"extreme ratio: {ratio:.2f}"
                continue

            name = f"{row.site}-{index:03d}-{safe_name(row.source_url, digest)}-{digest[:8]}"
            original = raw / f"{name}.jpg"
            jpg = web / f"{name}-2400.jpg"
            webp = web / f"{name}-1600.webp"
            image.save(original, "JPEG", quality=95, optimize=True, progressive=True)
            large = image.copy()
            large.thumbnail((2400, 1800), Image.Resampling.LANCZOS)
            large.save(jpg, "JPEG", quality=86, optimize=True, progressive=True)
            medium = image.copy()
            medium.thumbnail((1600, 1200), Image.Resampling.LANCZOS)
            medium.save(webp, "WEBP", quality=82, method=6)
            row.original = original.relative_to(OUT).as_posix()
            row.web_jpg = jpg.relative_to(OUT).as_posix()
            row.web_webp = webp.relative_to(OUT).as_posix()
            row.status = "accepted"
            seen_hash[digest] = row.original
        except Exception as exc:  # noqa: BLE001
            row.status, row.reason = "error", str(exc)[:300]


def video() -> list[dict]:
    folder = OUT / "video"
    folder.mkdir(parents=True, exist_ok=True)
    target = "https://player.vimeo.com/video/1101419034?h=c863ccbf71"
    template = str(folder / "jbjs-owned-hero-%(id)s.%(ext)s")
    command = [
        "yt-dlp", "--no-playlist", "--socket-timeout", "12", "--retries", "1",
        "--fragment-retries", "1", "--merge-output-format", "mp4",
        "-f", "bv*[height<=720]+ba/b[height<=720]/best", "-o", template, target,
    ]
    result = subprocess.run(command, text=True, capture_output=True, check=False, timeout=300)
    files = [p.relative_to(OUT).as_posix() for p in folder.glob("*")]
    return [{"site": "jbjs", "source_url": target, "status": "downloaded" if files else "failed", "files": files, "stderr": result.stderr[-1200:]}]


def contact_sheets(rows: list[Row]) -> None:
    folder = OUT / "review"
    folder.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    for key in SITES:
        approved = [row for row in rows if row.site == key and row.status == "accepted"]
        for start in range(0, len(approved), 12):
            batch = approved[start : start + 12]
            if not batch:
                continue
            canvas = Image.new("RGB", (1080, 1200), "white")
            draw = ImageDraw.Draw(canvas)
            for i, row in enumerate(batch):
                x = (i % 3) * 360
                y = (i // 3) * 300
                with Image.open(OUT / row.web_jpg) as source:
                    tile = ImageOps.fit(source.convert("RGB"), (360, 250), method=Image.Resampling.LANCZOS)
                canvas.paste(tile, (x, y))
                draw.text((x + 7, y + 258), f"{start+i+1:03d}  {row.width}x{row.height}  {Path(row.original).stem[:36]}", fill="black", font=font)
            canvas.save(folder / f"{key}-contact-{start//12+1:02d}.jpg", "JPEG", quality=88, optimize=True)


def manifests(rows: list[Row], videos: list[dict]) -> None:
    fields = list(Row.__dataclass_fields__)
    with (OUT / "manifest.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(asdict(row) for row in rows)
    payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_authorization": "User states their organization owns JBJsNash.com, HanksNash.com, PlaydateNash.com, TheLanesNashville.com and DeluxWeHo.com and authorizes reuse of appropriate pictures.",
        "rights_caution": "Exclude embedded social content, third-party logos, archive imagery, and recognizable celebrity publicity unless underlying reuse and likeness rights are confirmed.",
        "sites": SITES,
        "images": [asdict(row) for row in rows],
        "videos": videos,
    }
    (OUT / "manifest.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    accepted = sum(row.status == "accepted" for row in rows)
    (OUT / "README.md").write_text(
        f"# Owned Nashville media source repository\n\nAccepted photos: **{accepted}**.\n\n"
        "Review the contact sheets first. Use `manifest.csv` to trace every file to its source URL and page. "
        "This is a source repository, not an automatic content assignment. Only the curated integration map should copy files into the live website.\n",
        encoding="utf-8",
    )


def main() -> None:
    if OUT.exists():
        import shutil
        shutil.rmtree(OUT)
    OUT.mkdir()
    session = requests.Session()
    session.headers.update({"User-Agent": UA, "Accept": "text/html,image/avif,image/webp,*/*"})
    rows: list[Row] = []
    for key, spec in SITES.items():
        site_rows = process_site(session, key, spec)
        rows.extend(site_rows)
        print(f"{key}: discovered {len(site_rows)}", flush=True)
    download(rows, session)
    videos = video()
    contact_sheets(rows)
    manifests(rows, videos)
    print((OUT / "README.md").read_text(), flush=True)


if __name__ == "__main__":
    main()
