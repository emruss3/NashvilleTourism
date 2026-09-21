#!/usr/bin/env python3
"""Import Visit Music City frames from a downloaded Brandfolder folder.

    python scripts/media/import-cvc.py --source ~/Downloads/brandfolder --init
        Writes a manifest skeleton (docs/media/cvc-intake/manifest.json) listing
        every image in the folder with a suggested key. Fill in alt, placement
        and (optionally) credit, then:

    python scripts/media/import-cvc.py --source ~/Downloads/brandfolder
        For each manifest row: master JPG (longest edge 3200, no upscale) plus
        640/960/1600/2400 WebP variants into public/media/<group>/, an entry in
        the generated src/lib/media-cvc.ts, and a cleared row in
        docs/media/ASSET-RIGHTS.json carrying the NCVC permission.

Every imported key is allowlisted for production and treated as
CVC-licensed by tests/media-usage.test.ts, which keeps it off the shop,
advertising, private-events and affiliate surfaces. Credit line:
"Courtesy of Nashville Convention & Visitors Corp." unless the manifest row
names a photographer.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
MANIFEST = ROOT / "docs" / "media" / "cvc-intake" / "manifest.json"
LEDGER = ROOT / "docs" / "media" / "ASSET-RIGHTS.json"
OUT_TS = ROOT / "src" / "lib" / "media-cvc.ts"
SHARE_URL = "https://brandfolder.com/s/w6kr476hzpk96cvgx9pcqs"
LICENCE = (
    "Visit Music City usage statement (email, Conley Merritt, NCVC, 2026-09-21): "
    "tourism-promotion and tourism-article use only; never on shop, advertising, private-events or affiliate surfaces"
)
CREDIT = "Courtesy of Nashville Convention & Visitors Corp."
WIDTHS = (640, 960, 1600, 2400)
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
GROUPS = {"neighborhood": "neighborhoods", "hub": "hubs", "editorial": "editorial", "music": "music", "venues": "venues", "attractions": "attractions", "restaurants": "restaurants", "guide": "guides", "hero": "hero", "events": "events", "cvc": "cvc"}


def slug(text: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", text.lower())).strip("-")


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def init_manifest(source: Path) -> int:
    files = sorted(p for p in source.rglob("*") if p.suffix.lower() in IMAGE_EXT)
    if not files:
        print(f"No images under {source}")
        return 1
    existing = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"assets": []}
    known = {a["file"] for a in existing["assets"]}
    for p in files:
        rel = str(p.relative_to(source))
        if rel in known:
            continue
        existing["assets"].append(
            {
                "file": rel,
                "key": f"cvc/{slug(p.stem)}",
                "alt": "",
                "placement": "",
                "credit": "",
                "focal": "center",
                "skip": False,
            }
        )
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n")
    print(f"Manifest: {MANIFEST.relative_to(ROOT)} ({len(existing['assets'])} rows). Fill alt and placement, set skip: true for frames not wanted, then run without --init.")
    return 0


def process(source: Path, row: dict, dry: bool) -> dict | None:
    src = source / row["file"]
    if not src.exists():
        print(f"  missing file: {src}")
        return None
    key = row["key"]
    group, stem = key.split("/", 1)
    folder = PUBLIC / "media" / GROUPS.get(group, group)
    folder.mkdir(parents=True, exist_ok=True)
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    w, h = im.size
    note = ""
    if max(w, h) > 3200:
        scale = 3200 / max(w, h)
        im = im.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)
        note = "Resized master longest edge to 3200px (no upscale)."
    master = folder / f"{stem}.jpg"
    variants = []
    if not dry:
        im.save(master, format="JPEG", quality=90, optimize=True)
    for vw in WIDTHS:
        if vw > im.width:
            continue
        vh = round(im.height * vw / im.width)
        if not dry:
            im.resize((vw, vh), Image.Resampling.LANCZOS).save(folder / f"{stem}-{vw}.webp", format="WEBP", quality=86, method=6)
        variants.append((f"/media/{GROUPS.get(group, group)}/{stem}-{vw}.webp", vw))
    return {
        "key": key,
        "src": f"/media/{GROUPS.get(group, group)}/{stem}.jpg",
        "srcSet": ", ".join(f"{p} {vw}w" for p, vw in variants),
        "alt": row["alt"].strip(),
        "credit": row.get("credit", "").strip() or CREDIT,
        "focal": row.get("focal") or "center",
        "width": im.width,
        "height": im.height,
        "placement": row.get("placement", "").strip(),
        "source_filename": Path(row["file"]).name,
        "source_sha256": sha256(src),
        "note": note,
    }


def write_registry(assets: list[dict]) -> None:
    lines = [
        "/** Auto-generated by scripts/media/import-cvc.py from docs/media/cvc-intake/manifest.json. Do not edit by hand. */",
        "import type { MediaAsset } from './media-types';",
        "",
        "/** Visit Music City frames imported from the NCVC Brandfolder share; editorial placements only. */",
        "export const cvcMedia = {",
    ]
    for a in sorted(assets, key=lambda a: a["key"]):
        lines.append(f"  '{esc(a['key'])}': {{")
        lines.append(f"    src: '{esc(a['src'])}',")
        if a["srcSet"]:
            lines.append(f"    srcSet: '{esc(a['srcSet'])}',")
        lines.append(f"    alt: '{esc(a['alt'])}',")
        lines.append(f"    credit: '{esc(a['credit'])}',")
        lines.append(f"    licence: '{esc(LICENCE)}',")
        if a["focal"] in ("top", "bottom"):
            lines.append(f"    focal: '{a['focal']}',")
        lines.append(f"    width: {a['width']},")
        lines.append(f"    height: {a['height']},")
        lines.append("  },")
    lines.append("} as const satisfies Record<string, MediaAsset>;")
    lines.append("")
    lines.append("export const CVC_IMPORTED_KEYS = Object.keys(cvcMedia) as Array<keyof typeof cvcMedia>;")
    lines.append("")
    OUT_TS.write_text("\n".join(lines))


def write_ledger(assets: list[dict]) -> None:
    doc = json.loads(LEDGER.read_text())
    by_key = {r.get("media_key"): r for r in doc["assets"] if r.get("media_key")}
    for a in assets:
        row = by_key.get(a["key"]) or {"asset_id": f"cvc-{slug(a['key'].split('/', 1)[1])}"}
        row.update(
            {
                "media_key": a["key"],
                "output_path": "public" + a["src"],
                "recommended_use": a["placement"] or "Editorial placement",
                "alt_text": a["alt"],
                "focal": a["focal"],
                "source_type": "Destination marketing organization media library",
                "source_site": "Nashville Convention & Visitors Corp",
                "source_page": SHARE_URL,
                "source_filename": a["source_filename"],
                "source_sha256": a["source_sha256"],
                "license": "Visit Music City usage statement",
                "credit": a["credit"],
                "rights_status": "approved-cvc-editorial",
                "rightsStatus": "cleared",
                "approvalStatus": "approved",
                "approval_status": "approved",
                "productionEligible": True,
                "restrictions": "NCVC usage statement: promoting Nashville as a tourist destination and tourism-related articles only. Not for for-profit product, commercial, merchandising or advertising use: never on the shop, bag, advertising, private-events or affiliate surfaces.",
                "derivative_notes": (a["note"] + " " if a["note"] else "") + "JPG master plus 640/960/1600/2400 WebP variants; no generative editing.",
                "download_date": date.today().isoformat(),
                "permission": {
                    "granted_by": "Conley Merritt, Publicist, Nashville Convention & Visitors Corp",
                    "channel": "email",
                    "date": "2026-09-21",
                    "scope": "General Nashville folder (Brandfolder share); NCVC usage statement",
                },
            }
        )
        if row not in doc["assets"]:
            doc["assets"].append(row)
    LEDGER.write_text(json.dumps(doc, indent=2, ensure_ascii=True) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="Folder of originals downloaded from the Brandfolder share")
    ap.add_argument("--init", action="store_true", help="Write or extend the manifest skeleton and stop")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    source = Path(args.source).expanduser()
    if args.init:
        return init_manifest(source)
    if not MANIFEST.exists():
        print("No manifest; run with --init first.")
        return 1
    rows = [r for r in json.loads(MANIFEST.read_text())["assets"] if not r.get("skip")]
    bad = [r["file"] for r in rows if not r.get("alt") or not re.fullmatch(r"[a-z]+/[a-z0-9-]+", r.get("key", ""))]
    if bad:
        print("Rows missing alt text or with a bad key (group/slug):\n  " + "\n  ".join(bad))
        return 1
    assets = []
    for r in rows:
        print(f"{r['key']}  ←  {r['file']}")
        a = process(source, r, args.dry_run)
        if a:
            assets.append(a)
    if args.dry_run:
        print(f"Dry run: {len(assets)} frames would be written.")
        return 0
    write_registry(assets)
    write_ledger(assets)
    print(f"Wrote {len(assets)} frames, {OUT_TS.relative_to(ROOT)} and {LEDGER.relative_to(ROOT)}. Now: npm run test:media && npm run build.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
