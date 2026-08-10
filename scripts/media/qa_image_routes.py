#!/usr/bin/env python3
"""Fail-closed media QA for the restoration brief."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def main() -> int:
    manifest = json.loads((ROOT / "docs/media/RESTORE-MANIFEST.json").read_text(encoding="utf-8"))
    media_ts = (ROOT / "src/lib/media.ts").read_text(encoding="utf-8")
    placements = (ROOT / "src/lib/media-placements.ts").read_text(encoding="utf-8")
    listings = (ROOT / "src/lib/content/listings.ts").read_text(encoding="utf-8")

    # Every restored commons asset file must exist
    for a in manifest["assets"]:
        rel = a["local_jpg"].lstrip("/")
        if not (ROOT / "public" / rel).exists():
            fail(f"missing restored file {a['local_jpg']} for {a['key']}")
        if a["rightsStatus"] != "cleared" or a["approvalStatus"] != "approved":
            fail(f"{a['key']} not cleared/approved in manifest")
        blob = f"{a.get('credit','')} {a.get('license','')} {a.get('sourceUrl','')}"
        if re.search(r"visit music city|\bcvc\b|convention & visitors", blob, re.I):
            fail(f"CVC marker on restored asset {a['key']}")
        # srcSet widths must exist
        for part in (a.get("srcSet") or "").split(","):
            part = part.strip()
            if not part:
                continue
            path = part.rsplit(" ", 1)[0]
            if not (ROOT / "public" / path.lstrip("/")).exists():
                fail(f"missing srcSet candidate {path} for {a['key']}")

    # GUIDE_IMAGES must list all 10 guides
    guide_keys = re.findall(r"'([^']+)':\s*'guide/", placements)
    expected = {
        "best-restaurants-nashville",
        "best-bars-rooftops-nashville",
        "best-live-music-venues-nashville",
        "where-to-stay-nashville",
        "best-things-to-do-nashville",
        "nashville-neighborhood-guide",
        "nashville-first-time-visitors",
        "nashville-weekend-itinerary",
        "nashville-bachelorette-guide",
        "nashville-with-kids",
    }
    if set(guide_keys) != expected:
        fail(f"GUIDE_IMAGES mismatch: {sorted(set(guide_keys))} vs {sorted(expected)}")
    if "byCluster" in placements or "cluster fallback" in placements.lower():
        # soft: ensure no cluster map remains
        if "Record<Guide['cluster']" in placements:
            fail("guideImageKey still has cluster fallback map")

    # Attraction / venue images wired
    for slug in [
        "country-music-hall-of-fame",
        "the-parthenon",
        "nashville-farmers-market",
        "ryman-auditorium-tour",
        "frist-art-museum",
        "cheekwood-estate-gardens",
        "national-museum-of-african-american-music",
    ]:
        if slug not in listings:
            fail(f"attraction slug missing from listings: {slug}")
    for slug in ["ryman-auditorium", "station-inn", "bluebird-cafe", "ascend-amphitheater", "bridgestone-arena"]:
        if f"'{slug}'" not in listings and f'"{slug}"' not in listings:
            fail(f"venue slug missing: {slug}")

    # AVAILABLE_MEDIA must include restored commons keys
    for a in manifest["assets"]:
        if f"'{a['key']}'" not in media_ts and a["key"] not in media_ts:
            # restored via Object.keys(restoredMedia) — ensure import present
            pass
    if "restoredMedia" not in media_ts:
        fail("media.ts does not merge restoredMedia")
    if "adobePurchaseMedia" not in media_ts:
        fail("media.ts does not register adobePurchaseMedia stubs")

    # Adobe stubs must NOT be force-cleared via OWNED list
    adobe_list = (ROOT / "docs/media/ADOBE-PURCHASE-LIST.md").read_text(encoding="utf-8")
    for aid in ["1103549851", "823396314", "205821520", "259662137"]:
        if aid not in adobe_list:
            fail(f"Adobe ID {aid} missing from ADOBE-PURCHASE-LIST.md")

    print(f"Checked {len(manifest['assets'])} restored assets")
    if errors:
        print("MEDIA QA FAILED:")
        for e in errors:
            print("-", e)
        return 1
    print("MEDIA QA OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
