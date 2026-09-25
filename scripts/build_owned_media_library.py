#!/usr/bin/env python3
"""Build a reviewable media inventory from BPH-owned Nashville websites.

The script crawls public pages and sitemaps, extracts image/video assets,
downloads original files, removes obvious UI graphics, creates web-sized image
variants, records provenance, and generates contact sheets for human review.

It deliberately does not assign a source image to a NashvilleTourism content
key. Geographic/editorial assignment happens only in the curated manifest.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import shutil
import subprocess
import sys
import time
from collections import deque
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qsl, unquote, urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont, ImageOps

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
)
TIMEOUT = 30
MIN_WIDTH = 700
MIN_HEIGHT = 420
MAX_PAGES_PER_SITE = 50
MAX_ASSETS_PER_SITE = 250

SITES = {
    "jbjs": {
        "name": "JBJ's Nashville",
        "root": "https://www.jbjsnash.com/",
        "owned": True,
        "notes": "Lower Broadway, live music, restaurant, rooftop, nightlife, groups.",
    },
    "hanks": {
        "name": "Hank Williams Jr.'s Boogie Bar",
        "root": "https://hanksnash.com/",
        "owned": True,
        "notes": "Lower Broadway, rooftop, live music, sports, food and drink.",
    },
    "playdate": {
        "name": "Playdate Nashville",
        "root": "https://playdatenash.com/",
        "owned": True,
        "notes": "12 South, restaurant/bar, groups, outdoor space, games.",
    },
    "the-lanes": {
        "name": "Solaya at The Lanes",
        "root": "https://thelanesnashville.com/",
        "owned": True,
        "notes": "North Nashville, wellness, residences, greenway, community.",
    },
    "delux-weho": {
        "name": "DELUX WeHo",
        "root": "https://deluxweho.com/",
        "owned": True,
        "notes": "Wedgewood-Houston, apartments, wellness, skyline, neighborhood.",
    },
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}
BLOCKED_EXTENSIONS = {".svg", ".ico"}
BLOCKED_TERMS = {
    "logo", "icon", "favicon", "sprite", "arrow", "chevron", "cookie", "close",
    "menu", "hamburger", "social", "facebook", "instagram", "tiktok", "linkedin",
    "youtube-icon", "equal-housing", "partner-logo", "wordmark", "badge", "qr-code",
}
TRACKING_QUERY_KEYS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "w", "width", "h", "height", "fit", "crop", "quality", "q",
}


@dataclass
class AssetRecord:
    site_key: str
    site_name: str
    page_url: str
    source_url: str
    asset_type: str
    local_original: str = ""
    local_web_jpg: str = ""
    local_web_webp: str = ""
    width: int = 0
    height: int = 0
    bytes: int = 0
    sha256: str = ""
    alt: str = ""
    title: str = ""
    context: str = ""
    status: str = "discovered"
    reason: str = ""


def clean_url(raw: str, base: str) -> str | None:
    if not raw:
        return None
    raw = raw.strip().strip("'\"")
    if raw.startswith("data:") or raw.startswith("blob:"):
        return None
    absolute = urljoin(base, raw)
    p = urlparse(absolute)
    if p.scheme not in {"http", "https"}:
        return None
    query = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True) if k.lower() not in TRACKING_QUERY_KEYS]
    return urlunparse((p.scheme, p.netloc.lower(), p.path, p.params, "&".join(f"{k}={v}" for k, v in query), ""))


def normalized_asset_key(url: str) -> str:
    p = urlparse(url)
    return f"{p.netloc}{unquote(p.path).lower()}"


def page_is_same_site(url: str, root: str) -> bool:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    root_host = urlparse(root).netloc.lower().removeprefix("www.")
    return host == root_host


def likely_page(url: str) -> bool:
    suffix = Path(urlparse(url).path).suffix.lower()
    return not suffix or suffix in {".html", ".htm", ".php", ".aspx"}


def request(session: requests.Session, url: str) -> requests.Response:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            r = session.get(url, timeout=TIMEOUT, allow_redirects=True)
            r.raise_for_status()
            return r
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed after retries: {url}: {last_error}")


def sitemap_urls(session: requests.Session, root: str) -> list[str]:
    candidates = [urljoin(root, "sitemap.xml"), urljoin(root, "sitemap_index.xml")]
    collected: list[str] = []
    seen: set[str] = set()
    queue = deque(candidates)
    while queue and len(seen) < 25:
        url = queue.popleft()
        if url in seen:
            continue
        seen.add(url)
        try:
            r = request(session, url)
        except Exception:
            continue
        if "xml" not in r.headers.get("content-type", "") and not r.text.lstrip().startswith("<"):
            continue
        soup = BeautifulSoup(r.text, "xml")
        for loc in soup.find_all("loc"):
            value = loc.get_text(strip=True)
            if not value:
                continue
            if value.endswith(".xml"):
                queue.append(value)
            elif page_is_same_site(value, root) and likely_page(value):
                collected.append(value)
    return list(dict.fromkeys(collected))


def extract_css_urls(text: str, base: str) -> Iterable[str]:
    for match in re.finditer(r"url\(([^)]+)\)", text, flags=re.I):
        value = clean_url(match.group(1), base)
        if value:
            yield value


def srcset_urls(value: str, base: str) -> Iterable[str]:
    for part in value.split(","):
        candidate = part.strip().split()[0] if part.strip() else ""
        url = clean_url(candidate, base)
        if url:
            yield url


def extract_page_assets(html: str, page_url: str) -> tuple[list[dict], list[str]]:
    soup = BeautifulSoup(html, "html.parser")
    assets: list[dict] = []
    pages: list[str] = []

    def add(raw: str | None, asset_type: str, tag=None, context: str = "") -> None:
        url = clean_url(raw or "", page_url)
        if not url:
            return
        assets.append(
            {
                "url": url,
                "type": asset_type,
                "alt": (tag.get("alt", "") if tag else "")[:500],
                "title": (tag.get("title", "") if tag else "")[:500],
                "context": context[:1000],
            }
        )

    for tag in soup.find_all(["img", "source", "video"]):
        context = " ".join(tag.parent.get_text(" ", strip=True).split()) if tag.parent else ""
        for attr in ["src", "data-src", "data-lazy-src", "data-original", "poster"]:
            if tag.get(attr):
                ext = Path(urlparse(tag.get(attr)).path).suffix.lower()
                kind = "video" if tag.name == "video" or ext in VIDEO_EXTENSIONS else "image"
                add(tag.get(attr), kind, tag, context)
        for attr in ["srcset", "data-srcset"]:
            if tag.get(attr):
                for url in srcset_urls(tag.get(attr), page_url):
                    add(url, "image", tag, context)

    for tag in soup.find_all(style=True):
        for url in extract_css_urls(tag.get("style", ""), page_url):
            add(url, "image", tag, " ".join(tag.get_text(" ", strip=True).split()))

    for style in soup.find_all("style"):
        for url in extract_css_urls(style.get_text(" "), page_url):
            add(url, "image", style, "stylesheet")

    for meta in soup.find_all("meta"):
        if meta.get("property") in {"og:image", "og:video", "og:video:url"} or meta.get("name") in {"twitter:image", "twitter:player"}:
            kind = "video" if "video" in (meta.get("property") or "") else "image"
            add(meta.get("content"), kind, meta, "social metadata")

    for iframe in soup.find_all("iframe", src=True):
        src = clean_url(iframe.get("src"), page_url)
        if src and ("youtube.com" in src or "youtu.be" in src or "vimeo.com" in src):
            add(src, "embed-video", iframe, "embedded video")

    for link in soup.find_all("a", href=True):
        href = clean_url(link.get("href"), page_url)
        if not href:
            continue
        ext = Path(urlparse(href).path).suffix.lower()
        if ext in IMAGE_EXTENSIONS:
            add(href, "image", link, "linked image")
        elif ext in VIDEO_EXTENSIONS:
            add(href, "video", link, "linked video")
        elif page_is_same_site(href, page_url) and likely_page(href):
            pages.append(href)

    for match in re.finditer(r"https?://[^\s\"'<>\\]+", html):
        candidate = match.group(0).replace("&amp;", "&")
        ext = Path(urlparse(candidate).path).suffix.lower()
        if ext in IMAGE_EXTENSIONS:
            add(candidate, "image", None, "embedded page source")
        elif ext in VIDEO_EXTENSIONS:
            add(candidate, "video", None, "embedded page source")

    return assets, pages


def crawl_site(session: requests.Session, site_key: str, config: dict) -> list[AssetRecord]:
    root = config["root"]
    queue = deque([root, *sitemap_urls(session, root)])
    visited: set[str] = set()
    records: dict[str, AssetRecord] = {}

    while queue and len(visited) < MAX_PAGES_PER_SITE and len(records) < MAX_ASSETS_PER_SITE:
        page_url = queue.popleft()
        if page_url in visited or not page_is_same_site(page_url, root):
            continue
        visited.add(page_url)
        try:
            response = request(session, page_url)
        except Exception as exc:  # noqa: BLE001
            print(f"WARN page {page_url}: {exc}", file=sys.stderr)
            continue
        content_type = response.headers.get("content-type", "")
        if "html" not in content_type and "text" not in content_type:
            continue
        found, linked_pages = extract_page_assets(response.text, response.url)
        for linked in linked_pages:
            if linked not in visited:
                queue.append(linked)
        for item in found:
            key = normalized_asset_key(item["url"])
            if key in records:
                continue
            records[key] = AssetRecord(
                site_key=site_key,
                site_name=config["name"],
                page_url=response.url,
                source_url=item["url"],
                asset_type=item["type"],
                alt=item["alt"],
                title=item["title"],
                context=item["context"],
            )
    print(f"{site_key}: crawled {len(visited)} pages, discovered {len(records)} assets")
    return list(records.values())


def safe_stem(url: str, fallback: str) -> str:
    name = unquote(Path(urlparse(url).path).name)
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(name).stem or fallback).strip("-._").lower()
    return stem[:100] or fallback


def blocked_by_name(url: str) -> str | None:
    name = unquote(Path(urlparse(url).path).name).lower()
    if Path(name).suffix.lower() in BLOCKED_EXTENSIONS:
        return "vector/UI asset"
    for term in BLOCKED_TERMS:
        if term in name:
            return f"filename contains {term}"
    return None


def download_images(session: requests.Session, records: list[AssetRecord], output: Path) -> None:
    raw_dir = output / "raw"
    web_dir = output / "web"
    raw_dir.mkdir(parents=True, exist_ok=True)
    web_dir.mkdir(parents=True, exist_ok=True)
    seen_hashes: dict[str, str] = {}

    for index, rec in enumerate(records, 1):
        if rec.asset_type != "image":
            continue
        blocked = blocked_by_name(rec.source_url)
        if blocked:
            rec.status = "rejected"
            rec.reason = blocked
            continue
        try:
            content = request(session, rec.source_url).content
            if len(content) < 20_000:
                rec.status = "rejected"
                rec.reason = "file smaller than 20 KB"
                continue
            digest = hashlib.sha256(content).hexdigest()
            if digest in seen_hashes:
                rec.status = "duplicate"
                rec.reason = f"same bytes as {seen_hashes[digest]}"
                continue
            with Image.open(io.BytesIO(content)) as test:
                test.load()
                image = ImageOps.exif_transpose(test).convert("RGB")
            rec.width, rec.height = image.size
            rec.bytes = len(content)
            rec.sha256 = digest
            if rec.width < MIN_WIDTH or rec.height < MIN_HEIGHT:
                rec.status = "rejected"
                rec.reason = f"too small: {rec.width}x{rec.height}"
                continue
            ratio = rec.width / rec.height
            if ratio > 4.0 or ratio < 0.35:
                rec.status = "rejected"
                rec.reason = f"extreme aspect ratio: {ratio:.2f}"
                continue

            stem = f"{index:03d}-{safe_stem(rec.source_url, digest[:10])}-{digest[:8]}"
            original_path = raw_dir / f"{stem}.jpg"
            web_jpg = web_dir / f"{stem}-2400.jpg"
            web_webp = web_dir / f"{stem}-1600.webp"
            image.save(original_path, "JPEG", quality=95, optimize=True, progressive=True)
            large = image.copy()
            large.thumbnail((2400, 1800), Image.Resampling.LANCZOS)
            large.save(web_jpg, "JPEG", quality=86, optimize=True, progressive=True)
            medium = image.copy()
            medium.thumbnail((1600, 1200), Image.Resampling.LANCZOS)
            medium.save(web_webp, "WEBP", quality=82, method=6)

            rec.local_original = original_path.relative_to(output).as_posix()
            rec.local_web_jpg = web_jpg.relative_to(output).as_posix()
            rec.local_web_webp = web_webp.relative_to(output).as_posix()
            rec.status = "accepted"
            seen_hashes[digest] = rec.local_original
        except Exception as exc:  # noqa: BLE001
            rec.status = "error"
            rec.reason = str(exc)[:500]


def download_embedded_videos(records: list[AssetRecord], output: Path) -> list[dict]:
    video_dir = output / "video"
    video_dir.mkdir(parents=True, exist_ok=True)
    targets: list[tuple[str, str]] = []
    for rec in records:
        if rec.asset_type in {"video", "embed-video"}:
            targets.append((rec.site_key, rec.source_url))
    targets.extend(
        [
            ("jbjs", "https://player.vimeo.com/video/1101419034?h=c863ccbf71"),
            ("the-lanes", "https://www.youtube.com/watch?v=2hoPREEuAYU"),
        ]
    )
    unique: list[tuple[str, str]] = []
    seen: set[str] = set()
    for item in targets:
        if item[1] not in seen:
            seen.add(item[1])
            unique.append(item)

    results: list[dict] = []
    for i, (site_key, url) in enumerate(unique, 1):
        template = str(video_dir / f"{site_key}-{i:02d}-%(id)s.%(ext)s")
        cmd = [
            "yt-dlp", "--no-playlist", "--restrict-filenames", "--merge-output-format", "mp4",
            "-f", "bv*[height<=1080]+ba/b[height<=1080]/best", "-o", template, url,
        ]
        proc = subprocess.run(cmd, text=True, capture_output=True, check=False)
        matches = sorted(video_dir.glob(f"{site_key}-{i:02d}-*"))
        results.append(
            {
                "site_key": site_key,
                "source_url": url,
                "status": "downloaded" if matches else "failed",
                "files": [p.relative_to(output).as_posix() for p in matches],
                "stderr": proc.stderr[-1500:],
            }
        )
    return results


def make_contact_sheets(records: list[AssetRecord], output: Path) -> None:
    review_dir = output / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    for site_key in SITES:
        accepted = [r for r in records if r.site_key == site_key and r.status == "accepted"]
        if not accepted:
            continue
        thumb_w, thumb_h, label_h = 360, 250, 50
        cols, rows_per_sheet = 3, 4
        per_sheet = cols * rows_per_sheet
        for start in range(0, len(accepted), per_sheet):
            batch = accepted[start : start + per_sheet]
            rows = (len(batch) + cols - 1) // cols
            canvas = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "white")
            draw = ImageDraw.Draw(canvas)
            for j, rec in enumerate(batch):
                x = (j % cols) * thumb_w
                y = (j // cols) * (thumb_h + label_h)
                with Image.open(output / rec.local_web_jpg) as im:
                    tile = ImageOps.fit(im.convert("RGB"), (thumb_w, thumb_h), method=Image.Resampling.LANCZOS)
                canvas.paste(tile, (x, y))
                label = f"{start + j + 1:03d} | {rec.width}x{rec.height} | {Path(rec.local_original).stem[:42]}"
                draw.text((x + 8, y + thumb_h + 8), label, fill="black", font=font)
            canvas.save(review_dir / f"{site_key}-contact-{start // per_sheet + 1:02d}.jpg", "JPEG", quality=88, optimize=True)


def write_manifests(records: list[AssetRecord], video_results: list[dict], output: Path) -> None:
    payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sites": SITES,
        "images": [asdict(r) for r in records],
        "videos": video_results,
        "rules": {
            "ownership": "User states the five source sites are owned by their organization.",
            "restriction": "Do not assume third-party logos, embedded social posts, talent publicity, or externally licensed photography is transferable solely because it appears on a source site.",
            "assignment": "Human review is required before labeling any asset as a specific neighborhood, venue, or experience.",
        },
    }
    (output / "manifest.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

    fields = list(AssetRecord.__dataclass_fields__.keys())
    with (output / "manifest.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(asdict(r) for r in records)

    accepted = sum(r.status == "accepted" for r in records)
    rejected = sum(r.status == "rejected" for r in records)
    duplicate = sum(r.status == "duplicate" for r in records)
    errors = sum(r.status == "error" for r in records)
    summary = f"""# BPH-owned Nashville media inventory

Generated automatically from the public websites listed below. This package is
an inventory for editorial review, not an automatic declaration that every
asset is suitable for reuse.

## Totals

- Accepted photographs: {accepted}
- Rejected UI/small assets: {rejected}
- Duplicate files: {duplicate}
- Download errors: {errors}
- Video targets attempted: {len(video_results)}

## Source sites

"""
    for site in SITES.values():
        summary += f"- **{site['name']}** — {site['root']} — {site['notes']}\n"
    summary += """

## Review process

1. Open `review/*-contact-*.jpg`.
2. Use `manifest.csv` to trace each photograph to its exact source page and URL.
3. Exclude recognizable talent/publicity photographs unless marketing rights are confirmed.
4. Exclude images sourced from embedded Instagram or other third-party services.
5. Assign only geographically truthful uses. A Broadway photo may support Downtown, nightlife, live music or group-trip content; it may not represent East Nashville or Germantown.
6. Copy approved files from `web/` into the curated NashvilleTourism media structure.

## Folder contents

- `raw/` — normalized high-quality JPEG originals for review.
- `web/` — optimized 2400px JPEG and 1600px WebP derivatives.
- `video/` — downloadable video sources found on owned sites.
- `review/` — contact sheets.
- `manifest.json` and `manifest.csv` — provenance and processing status.
"""
    (output / "README.md").write_text(summary, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="owned-media-library")
    args = parser.parse_args()
    output = Path(args.output).resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        }
    )

    records: list[AssetRecord] = []
    for key, config in SITES.items():
        records.extend(crawl_site(session, key, config))
    download_images(session, records, output)
    video_results = download_embedded_videos(records, output)
    make_contact_sheets(records, output)
    write_manifests(records, video_results, output)
    print(f"Wrote media library to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
