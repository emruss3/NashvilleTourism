#!/usr/bin/env python3
"""Rebuild AVAILABLE_MEDIA to cleared+approved keys only; retag CVC licence notes in media.ts."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RIGHTS = json.loads((ROOT / "docs/media/ASSET-RIGHTS.json").read_text(encoding="utf-8"))
MEDIA_TS = ROOT / "src/lib/media.ts"

# asset_id → ImageKey
ASSET_TO_KEY: dict[str, str] = {
    "nashville-hero-poster": "hero/lower-broadway",
    "downtown-rooftop": "hero/downtown-rooftop",
    "live-music-night": "hero/live-music-night",
    "restaurants": "hub/restaurants",
    "tickets": "hub/tickets",
    "live-music": "hub/live-music",
    "honky-tonk-highway": "hub/honky-tonk-highway",
    "weekend": "hub/weekend",
    "bachelorette": "hub/bachelorette",
    "wellness": "hub/wellness",
    "outdoor-living": "hub/outdoor-living",
    "pool": "hub/pool",
    "hotels": "hub/hotels",
    "opryland": "hub/opryland",
    "tours": "hub/tours",
    "broadway-rooftop-day": "editorial/broadway-rooftop-day",
    "broadway-nightlife": "editorial/broadway-nightlife",
    "rooftop-party": "editorial/rooftop-party",
    "live-music-crowd": "editorial/live-music-crowd",
    "live-performance-overhead": "editorial/live-performance-overhead",
    "private-events": "editorial/private-events",
    "nashville-food": "editorial/nashville-food",
    "cocktail-service": "editorial/cocktail-service",
    "weho-skyline": "editorial/weho-skyline",
    "weho-pool": "editorial/weho-pool",
    "weho-fitness": "editorial/weho-fitness",
    "weho-sauna": "editorial/weho-sauna",
    "weho-lounge": "editorial/weho-lounge",
    "weho-interior-design": "editorial/weho-interior-design",
    "the-lanes-outdoor-living": "editorial/the-lanes-outdoor-living",
    "the-lanes-community-center": "editorial/the-lanes-community-center",
    "the-lanes-pool": "editorial/the-lanes-pool",
    "the-lanes-greenway": "editorial/the-lanes-greenway",
    "the-lanes-runner-dog": "editorial/the-lanes-runner-dog",
    "the-lanes-homes": "editorial/the-lanes-homes",  # also venues/the-lanes-homes
    "jbjs-rooftop": "venues/jbjs-rooftop",
    "jbjs-interior": "venues/jbjs-interior",
    "jbjs-food": "venues/jbjs-food",
    "delux-weho-exterior": "venues/delux-weho-exterior",
    "grand-ole-opry-house": "editorial/grand-ole-opry-house",
    "opryland-atrium": "editorial/opryland-atrium",
    "parthenon-west-end": "editorial/parthenon-west-end",
    "music-row-studio-b": "editorial/music-row-studio-b",
    "printers-alley": "editorial/printers-alley",
    "skyline": "editorial/skyline",
    "venues-jbjs-rooftop-downtown": "venues/jbjs-rooftop",
}

# Keys that exist in media.ts as aliases for cleared owned/CC assets
EXTRA_CLEARED_KEYS = [
    "venues/the-lanes-homes",  # same master family as editorial/the-lanes-homes
    "editorial/the-lanes-homes",
]

CVC_KEYS = [
    "neighborhood/12-south",
    "neighborhood/downtown-broadway",
    "neighborhood/east-nashville",
    "neighborhood/germantown",
    "neighborhood/green-hills",
    "neighborhood/hillsboro-village",
    "neighborhood/midtown",
    "neighborhood/music-row",
    "neighborhood/sylvan-park",
    "neighborhood/the-gulch",
    "neighborhood/wedgewood-houston",
    "neighborhood/west-end",
    "guide/first-time-visitors",
    "guide/where-to-stay",
    "hub/events-premium",
    "hub/live-music-premium",
    "hub/restaurants-premium",
    "hub/things-to-do-premium",
    "hub/trip-planner-premium",
    "trending/live-tonight",
    "trending/weekender",
    "venues/twelve-thirty-club",
    "hotels/hermitage-hotel",
    "editorial/pedestrian-bridge",
    "restaurants/peg-leg-porker",
    "restaurants/butter-milk-ranch",
    "restaurants/playdate",
]


def main() -> None:
    cleared_keys: set[str] = set(EXTRA_CLEARED_KEYS)
    for a in RIGHTS["assets"]:
        if a.get("rightsStatus") == "cleared" and a.get("approvalStatus") == "approved":
            key = ASSET_TO_KEY.get(a["asset_id"])
            if key:
                cleared_keys.add(key)
            # hub-* style ids already mapped; also try path-based
            out = a.get("output_path") or ""
            m = re.search(r"public/media/(hubs|editorial|venues|hero|neighborhoods|guides|trending|hotels|restaurants|downtown|attractions)/([^/]+)\.", out)
            if m:
                folder, name = m.group(1), m.group(2)
                name = re.sub(r"-(?:640|960|1600|2400|mobile-\d+)$", "", name)
                folder_map = {
                    "hubs": "hub",
                    "editorial": "editorial",
                    "venues": "venues",
                    "hero": "hero",
                    "neighborhoods": "neighborhood",
                    "guides": "guide",
                    "trending": "trending",
                    "hotels": "hotels",
                    "restaurants": "restaurants",
                    "downtown": "downtown",
                    "attractions": "attractions",
                }
                prefix = folder_map[folder]
                # hero poster special-case
                if name == "nashville-hero-poster":
                    cleared_keys.add("hero/lower-broadway")
                elif name.startswith("nashville-hero"):
                    continue
                else:
                    # strip common suffixes already handled
                    cleared_keys.add(f"{prefix}/{name}")

    # Only keep keys that appear in the images object
    text = MEDIA_TS.read_text(encoding="utf-8")
    catalog_keys = set(re.findall(r"^\s+'([^']+)':\s*\{", text, flags=re.M))
    cleared_keys &= catalog_keys

    # Never include CVC keys even if mis-mapped
    cleared_keys -= set(CVC_KEYS)

    # Pending / not cleared keys that must leave AVAILABLE_MEDIA
    pending_like = {
        "hero/nashroam-skyline",
        "hub/hotels-premium",
        "guide/weekend-itinerary",
        "downtown/sobro",
        "downtown/nashville-yards",
        "venues/roberts-western-world",
        "venues/chiefs-on-broadway",
        "venues/category-10",
        "restaurants/assembly-food-hall",
        "restaurants/bacco",
        "restaurants/etch",
        "hotels/four-seasons-nashville",
        "hotels/1-hotel-nashville",
        "hotels/the-joseph",
        "hotels/grand-hyatt-nashville",
        "attractions/country-music-hall-of-fame-night",
        "restaurants/butchertown-hall",
        "restaurants/aba-nashville",
    }
    cleared_keys -= pending_like

    ordered = sorted(cleared_keys)
    block_lines = ["export const AVAILABLE_MEDIA: ReadonlySet<string> = new Set<string>(["]
    block_lines.append("  // Production gate: rightsStatus === 'cleared' && approvalStatus === 'approved'.")
    block_lines.append("  // CVC / Visit Music City assets are never listed here.")
    block_lines.append("  'hero/video',")
    for k in ordered:
        block_lines.append(f"  '{k}',")
    block_lines.append("]);")
    new_block = "\n".join(block_lines)

    text2, n = re.subn(
        r"export const AVAILABLE_MEDIA: ReadonlySet<string> = new Set<string>\(\[[\s\S]*?\]\);",
        new_block,
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("Failed to replace AVAILABLE_MEDIA block")

    # Retag CVC licence strings
    text2 = text2.replace(
        "licence: 'Nashville CVC Media Library — usage authorization pending'",
        "licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship'",
    )
    text2 = text2.replace(
        "licence: 'CVC media library — authorized editorial use'",
        "licence: 'CVC / Visit Music City — reference-only; not licensed; do not ship'",
    )
    text2 = text2.replace(
        "licence: 'CVC / property-authorized media held by BPH'",
        "licence: 'CVC or unresolved property media — reference-only / pending clearance; do not ship'",
    )

    # Update file header comment
    text2 = text2.replace(
        "Until a file exists, `SmartImage` renders a typographic fallback rather than\n"
        " * a broken image or a stock photo that misrepresents a specific business.\n"
        " * See `public/media/README.md` and `docs/media/MEDIA-MAP.md`.",
        "An image may render only when it is in AVAILABLE_MEDIA, which means\n"
        " * `rightsStatus === 'cleared'` and `approvalStatus === 'approved'`.\n"
        " * CVC / Visit Music City photography is never cleared. Missing or uncleared\n"
        " * keys render a typographic fallback — never a wrong-business substitute.\n"
        " * See `public/media/README.md` and `docs/media/COMMERCIAL-MEDIA-SOURCING.md`.",
    )

    # Strengthen hasMedia helper
    text2 = re.sub(
        r"export function hasMedia\(key: string\): boolean \{\n  return AVAILABLE_MEDIA\.has\(key\);\n\}",
        "export function isMediaClearedForProduction(key: string): boolean {\n"
        "  /** AVAILABLE_MEDIA is the cleared+approved allowlist. */\n"
        "  return AVAILABLE_MEDIA.has(key);\n"
        "}\n\n"
        "export function hasMedia(key: string): boolean {\n"
        "  return isMediaClearedForProduction(key);\n"
        "}",
        text2,
        count=1,
    )

    MEDIA_TS.write_text(text2, encoding="utf-8")
    print(f"AVAILABLE_MEDIA keys (excl hero/video): {len(ordered)}")
    for k in ordered:
        print(k)


if __name__ == "__main__":
    main()
