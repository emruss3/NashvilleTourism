#!/usr/bin/env python3
"""
Reclassify Visit Music City / Nashville CVC photography as reference-only.

- Sets rightsStatus=reference-only, approvalStatus=hold on every CVC asset
- Migrates legacy rights_status into rightsStatus / approvalStatus for all rows
- Writes art-direction reference briefs (no image binary redistribution)
- Deletes CVC derivative files from public/media/
- Never marks CVC as pending — we are not requesting CVC permission

Does NOT activate any new production images.
"""

from __future__ import annotations

import csv
import json
import re
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RIGHTS_JSON = ROOT / "docs" / "media" / "ASSET-RIGHTS.json"
RIGHTS_CSV = ROOT / "docs" / "media" / "ASSET-RIGHTS.csv"
REF_DIR = ROOT / "docs" / "media" / "reference"
PUBLIC_MEDIA = ROOT / "public" / "media"
REPORT = ROOT / "docs" / "media" / "reference" / "_cvc-purge-report.json"

TODAY = date.today().isoformat()

# Desired composition notes retained from prior art direction (CVC was never a license path).
REFERENCE_BRIEFS: dict[str, dict] = {
    "downtown-broadway": {
        "subject": "Lower Broadway at blue hour / Robert's Western World street frontage",
        "composition": "Street-level view with historic neon honky-tonk facades, pedestrians, and enough surrounding architecture to read as a neighborhood",
        "avoid": "tight business signage crop, generic skyline, empty street, oversaturated tourism stock",
        "placement": "neighborhood/downtown-broadway",
    },
    "downtown-lower-broadway-hero": {
        "subject": "Lower Broadway neon corridor hero",
        "composition": "Wide street-level Broadway with layered neon and foot traffic; readable as Downtown orientation",
        "avoid": "single-venue product shot, empty sidewalk, generic US downtown",
        "placement": "downtown hero / neighborhood hero",
    },
    "12-south": {
        "subject": "12 South / Draper James streetscape",
        "composition": "Neighborhood street with distinctive 12 South retail architecture and sidewalk life",
        "avoid": "generic suburban retail strip, wrong corridor",
        "placement": "neighborhood/12-south",
    },
    "east-nashville": {
        "subject": "East Nashville / Rosemary & Beauty Queen area orientation",
        "composition": "East Nashville street or patio scene that reads as the neighborhood, not a generic brunch stock photo",
        "avoid": "anonymous interior with no place identity",
        "placement": "neighborhood/east-nashville",
    },
    "germantown": {
        "subject": "Germantown / Cupcake Collection or brick-street neighborhood feel",
        "composition": "Historic brick streetscape or distinctive Germantown storefront block",
        "avoid": "generic bakery product hero substituting for the neighborhood",
        "placement": "neighborhood/germantown",
    },
    "the-gulch": {
        "subject": "The Gulch / Biscuit Love corridor",
        "composition": "Gulch streetscape with mixed new development and pedestrian energy",
        "avoid": "generic waffle/biscuit food close-up as neighborhood stand-in",
        "placement": "neighborhood/the-gulch",
    },
    "wedgewood-houston": {
        "subject": "Wedgewood-Houston / Bastion exterior context",
        "composition": "WeHo industrial-creative streetscape; exact Bastion only via direct license",
        "avoid": "generic warehouse loft stock",
        "placement": "neighborhood/wedgewood-houston",
    },
    "midtown": {
        "subject": "Midtown / Odie's corridor orientation",
        "composition": "Division Street / Midtown nightlife street energy",
        "avoid": "generic bar interior labeled as Odie's without rights",
        "placement": "neighborhood/midtown",
    },
    "hillsboro-village": {
        "subject": "Hillsboro Village / Belcourt streetscape",
        "composition": "Village-scale street with Belcourt or neighboring storefronts readable as Hillsboro Village",
        "avoid": "generic cinema marquee from another city",
        "placement": "neighborhood/hillsboro-village",
    },
    "green-hills": {
        "subject": "Green Hills / Bluebird Cafe context",
        "composition": "Green Hills orientation; Bluebird exterior only via direct license",
        "avoid": "generic songwriter-circle stock",
        "placement": "neighborhood/green-hills",
    },
    "music-row": {
        "subject": "Music Row streetscape",
        "composition": "Music Row boulevard with studio / office character",
        "avoid": "Studio B Wikimedia confusion with CVC Music Row asset",
        "placement": "neighborhood/music-row",
    },
    "sylvan-park": {
        "subject": "Sylvan Park / Sylvan Supply streetscape",
        "composition": "Quiet residential-commercial Sylvan Park block",
        "avoid": "The Lanes or other neighborhood substituted as Sylvan Park",
        "placement": "neighborhood/sylvan-park",
    },
    "west-end": {
        "subject": "West End / Vanderbilt corridor",
        "composition": "West End Avenue orientation near campus / parks edge",
        "avoid": "generic campus stock from another city",
        "placement": "neighborhood/west-end",
    },
    "editorial-pedestrian-bridge": {
        "subject": "John Seigenthaler Pedestrian Bridge",
        "composition": "Bridge deck or river-crossing view with downtown skyline relationship",
        "avoid": "wrong bridge, generic footbridge",
        "placement": "editorial/pedestrian-bridge",
    },
    "restaurants-peg-leg-porker": {
        "subject": "Peg Leg Porker exterior / patio",
        "composition": "Exact Peg Leg Porker building identity in the Gulch",
        "avoid": "generic barbecue smoke pit stock",
        "placement": "restaurants/peg-leg-porker; Gulch dining guide",
    },
    "restaurants-butter-milk-ranch": {
        "subject": "The Butter Milk Ranch exterior",
        "composition": "Exact 12 South wood/glass exterior with readable restaurant identity",
        "avoid": "generic brunch patio",
        "placement": "restaurants/butter-milk-ranch; 12 South dining guide",
    },
    "restaurants-playdate": {
        "subject": "Playdate patio / EAT·DRINK·SLIDE identity",
        "composition": "Exact Playdate outdoor dining / slide context in 12 South",
        "avoid": "unrelated white-house facade or generic playground",
        "placement": "restaurants/playdate; 12 South dining guide",
    },
    "venues-twelve-thirty-club": {
        "subject": "Twelve Thirty Club",
        "composition": "Exact venue exterior or signature interior with commercial digital rights",
        "avoid": "CVC listing crop used as production",
        "placement": "venues/twelve-thirty-club",
    },
    "hotels-hermitage-hotel": {
        "subject": "The Hermitage Hotel",
        "composition": "Exact Hermitage facade or lobby with property/photographer license",
        "avoid": "CVC hotel library stand-in",
        "placement": "hotels/hermitage-hotel",
    },
    "venue-station-inn": {
        "subject": "Station Inn",
        "composition": "Exact Station Inn building in the Gulch",
        "avoid": "generic bluegrass band stage stock",
        "placement": "music listing Station Inn",
    },
    "venue-bluebird-cafe": {
        "subject": "Bluebird Cafe",
        "composition": "Exact Bluebird exterior or in-the-round room with venue permission",
        "avoid": "generic songwriter circle",
        "placement": "music listing Bluebird Cafe",
    },
    "venue-the-pinnacle": {
        "subject": "The Pinnacle at Nashville Yards",
        "composition": "Exact Pinnacle concert bowl or exterior",
        "avoid": "generic arena bowl",
        "placement": "venue listing The Pinnacle",
    },
    "venue-ascend-amphitheater": {
        "subject": "Ascend Amphitheater",
        "composition": "Exact Ascend riverfront amphitheater",
        "avoid": "generic outdoor amphitheater",
        "placement": "venue listing Ascend",
    },
    "venue-bridgestone-arena": {
        "subject": "Bridgestone Arena",
        "composition": "Exact Bridgestone exterior or bowl with arena media rights",
        "avoid": "generic NHL arena stock",
        "placement": "venue listing Bridgestone",
    },
    "attraction-nashville-farmers-market": {
        "subject": "Nashville Farmers' Market",
        "composition": "Exact Market House / sheds identity",
        "avoid": "generic farmers market produce table",
        "placement": "things-to-do Farmers' Market",
    },
    "attraction-frist-art-museum": {
        "subject": "Frist Art Museum",
        "composition": "Exact Frist interior or Art Deco exterior",
        "avoid": "generic museum gallery",
        "placement": "things-to-do Frist",
    },
    "attraction-cheekwood-estate-gardens": {
        "subject": "Cheekwood Estate & Gardens",
        "composition": "Exact Cheekwood mansion/gardens",
        "avoid": "generic southern mansion gardens",
        "placement": "things-to-do Cheekwood",
    },
}


def is_cvc(asset: dict) -> bool:
    if asset.get("asset_id") == "venue-ryman-auditorium":
        return False
    st = (asset.get("source_type") or "").lower()
    site = (asset.get("source_site") or "").lower()
    owner = (asset.get("owner") or "").lower()
    photographer = (asset.get("photographer") or "").lower()
    url = (asset.get("source_url") or "").lower()
    restr = (asset.get("restrictions") or "").lower()
    notes = (asset.get("notes") or "").lower()
    lic = ((asset.get("licence") or asset.get("license") or "") or "").lower()
    credit = (asset.get("credit") or "").lower()
    blob = " ".join([st, site, owner, photographer, url, restr, notes, lic, credit])
    markers = (
        "cvc",
        "visit music city",
        "visitmusiccity",
        "nashville convention & visitors",
        "nashville convention and visitors",
        "destination marketing organization media library",
    )
    return any(m in blob for m in markers) or st in {"cvc", "cvc_or_property"}


def migrate_status(asset: dict, cvc: bool) -> tuple[str, str]:
    """Return (rightsStatus, approvalStatus)."""
    if cvc:
        return "reference-only", "hold"

    legacy = asset.get("rights_status")
    if legacy in {"approved-owned", "approved-open-license", "approved-owned-derivative"}:
        return "cleared", "approved"
    if legacy == "pending-authorization":
        return "pending-clearance", "hold"

    # Newer downtown/dining rows without rights_status
    st = (asset.get("source_type") or "").lower()
    owner = (asset.get("owner") or "").lower()
    lic = ((asset.get("licence") or asset.get("license") or "") or "").lower()
    if st in {"bph-owned", "owned", "nashroam"} or "bph" in owner or "bph-owned" in lic:
        return "cleared", "approved"
    if "official" in st or "property" in st:
        # Property press assets still need explicit commercial digital clearance
        return "pending-clearance", "hold"
    if asset.get("licence") or asset.get("license"):
        # Unknown commercial status — do not auto-clear
        return "pending-clearance", "hold"
    return "pending-clearance", "hold"


def output_paths_for_asset(asset: dict) -> list[Path]:
    """Collect public files for an asset (primary + responsive derivatives)."""
    paths: list[Path] = []
    out = asset.get("output_path")
    if out:
        p = ROOT / out.replace("\\", "/")
        paths.append(p)
        # Responsive siblings: foo.jpg → foo-640.webp etc., and stem variants
        stem = p.with_suffix("")
        parent = p.parent
        base = stem.name
        # e.g. peg-leg-porker.jpg and peg-leg-porker-640.webp
        for f in parent.glob(f"{base}*"):
            if f.is_file():
                paths.append(f)
        # Also match without extension patterns already covered
    return list(dict.fromkeys(paths))


def asset_id_to_image_key(asset_id: str) -> str | None:
    """Best-effort map to src/lib/media.ts ImageKey."""
    mapping = {
        "downtown-broadway": "neighborhood/downtown-broadway",
        "wedgewood-houston": "neighborhood/wedgewood-houston",
        "east-nashville": "neighborhood/east-nashville",
        "germantown": "neighborhood/germantown",
        "the-gulch": "neighborhood/the-gulch",
        "hillsboro-village": "neighborhood/hillsboro-village",
        "12-south": "neighborhood/12-south",
        "midtown": "neighborhood/midtown",
        "west-end": "neighborhood/west-end",
        "music-row": "neighborhood/music-row",
        "green-hills": "neighborhood/green-hills",
        "sylvan-park": "neighborhood/sylvan-park",
        "restaurants-premium": "hub/restaurants-premium",
        "live-music-premium": "hub/live-music-premium",
        "things-to-do-premium": "hub/things-to-do-premium",
        "events-premium": "hub/events-premium",
        "trip-planner-premium": "hub/trip-planner-premium",
        "guide-first-time-visitors": "guide/first-time-visitors",
        "guide-where-to-stay": "guide/where-to-stay",
        "trending-live-tonight": "trending/live-tonight",
        "trending-weekender": "trending/weekender",
        "venues-twelve-thirty-club": "venues/twelve-thirty-club",
        "hotels-hermitage-hotel": "hotels/hermitage-hotel",
        "editorial-pedestrian-bridge": "editorial/pedestrian-bridge",
        "downtown-lower-broadway-hero": "neighborhood/downtown-broadway",
        "restaurants-peg-leg-porker": "restaurants/peg-leg-porker",
        "restaurants-butter-milk-ranch": "restaurants/butter-milk-ranch",
        "restaurants-playdate": "restaurants/playdate",
    }
    return mapping.get(asset_id)


def write_csv(assets: list[dict]) -> None:
    fields = [
        "asset_id",
        "output_path",
        "recommended_use",
        "rightsStatus",
        "approvalStatus",
        "rights_status",
        "source_type",
        "source_site",
        "source_url",
        "license",
        "licence",
        "credit",
        "owner",
        "photographer",
        "restrictions",
    ]
    with RIGHTS_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for a in assets:
            row = {k: a.get(k, "") for k in fields}
            w.writerow(row)


def main() -> None:
    REF_DIR.mkdir(parents=True, exist_ok=True)
    data = json.loads(RIGHTS_JSON.read_text(encoding="utf-8"))
    assets: list[dict] = data["assets"]

    cvc_assets: list[dict] = []
    deleted: list[str] = []
    missing_files: list[str] = []
    image_keys_to_disable: list[str] = []

    for asset in assets:
        cvc = is_cvc(asset)
        rights_status, approval_status = migrate_status(asset, cvc)
        asset["rightsStatus"] = rights_status
        asset["approvalStatus"] = approval_status

        # Keep legacy field aligned for older readers, but never leave CVC as pending.
        if cvc:
            asset["rights_status"] = "reference-only"
            asset["approval_status"] = "hold"
            asset["restrictions"] = (
                "Nashville CVC / Visit Music City photography — NOT available to NashRoam. "
                "NashRoam is a commercial competitor; do not request CVC permission; "
                "do not ship in production. Art-direction reference only."
            )
            brief = REFERENCE_BRIEFS.get(asset["asset_id"], {
                "subject": asset.get("alt_text") or asset.get("original_title") or asset["asset_id"],
                "composition": asset.get("recommended_use") or "Retain prior editorial placement intent",
                "avoid": "Any CVC/Visit Music City production use; generic wrong-business stock",
                "placement": asset.get("recommended_use") or "",
            })
            # Preserve prior URL only inside reference metadata — not as a sourcing target.
            # Idempotent: keep archived URL if source_url was already cleared on a prior run.
            prior_url = (
                asset.get("source_url")
                or asset.get("source_url_archived")
                or (asset.get("referenceBrief") or {}).get("priorCvcUrl")
            )
            asset["referenceBrief"] = {
                **brief,
                "priorCvcUrl": prior_url,
                "priorSourceSite": asset.get("source_site") or asset.get("owner"),
                "retiredFromProduction": asset.get("referenceBrief", {}).get("retiredFromProduction")
                or TODAY,
                "note": "URL retained solely to describe a composition we liked; not a future license path.",
            }
            # Neutralize production-facing source pointers
            if prior_url:
                asset["source_url_archived"] = prior_url
            asset["source_url"] = None
            asset["productionEligible"] = False
            if asset.get("licence") or asset.get("license"):
                asset["licence"] = "Not licensed — CVC reference-only (never pursue CVC rights)"
                asset["license"] = None
            cvc_assets.append(asset)

            key = asset_id_to_image_key(asset["asset_id"])
            if key:
                image_keys_to_disable.append(key)

            for path in output_paths_for_asset(asset):
                if path.exists() and path.is_file():
                    # Do not redistribute CVC binaries into docs/; delete from public only.
                    path.unlink()
                    deleted.append(str(path.relative_to(ROOT)).replace("\\", "/"))
                elif asset.get("output_path") and path == ROOT / str(asset["output_path"]).replace("\\", "/"):
                    missing_files.append(str(path.relative_to(ROOT)).replace("\\", "/"))
        else:
            # Align legacy snake_case for non-CVC
            asset["rights_status"] = (
                "approved-owned"
                if rights_status == "cleared" and approval_status == "approved"
                and (asset.get("rights_status") or "").startswith("approved-owned")
                else asset.get("rights_status")
                if rights_status == "cleared"
                else "pending-authorization"
                if rights_status == "pending-clearance"
                else asset.get("rights_status")
            )
            if rights_status == "cleared" and approval_status == "approved":
                # Preserve more specific legacy labels when present
                if asset.get("rights_status") not in {
                    "approved-owned",
                    "approved-open-license",
                    "approved-owned-derivative",
                }:
                    asset["rights_status"] = "approved-owned"
            asset["productionEligible"] = rights_status == "cleared" and approval_status == "approved"

    # Also delete responsive files for known CVC ImageKey stems that may not be listed as output_path
    extra_globs = [
        "neighborhoods/*",
        "hubs/*premium*",
        "guides/*",
        "trending/*",
        "restaurants/peg-leg-porker*",
        "restaurants/butter-milk-ranch*",
        "restaurants/playdate*",
        "venues/twelve-thirty-club*",
        "venues/station-inn*",
        "venues/bluebird-cafe*",
        "venues/the-pinnacle*",
        "venues/ascend-amphitheater*",
        "venues/bridgestone-arena*",
        "hotels/hermitage-hotel*",
        "editorial/pedestrian-bridge*",
        "downtown/lower-broadway*",
        "attractions/nashville-farmers-market*",
        "attractions/frist-art-museum*",
        "attractions/cheekwood*",
    ]
    # Safer: delete only paths tied to purged asset output stems
    for asset in cvc_assets:
        out = asset.get("output_path")
        if not out:
            continue
        p = ROOT / out.replace("\\", "/")
        stem = p.stem
        # strip size suffixes like -1600
        base = re.sub(r"-(?:640|960|1600|2400)$", "", stem)
        parent = p.parent
        if parent.exists():
            for f in parent.iterdir():
                if not f.is_file():
                    continue
                name = f.stem
                name_base = re.sub(r"-(?:640|960|1600|2400)$", "", name)
                if name_base == base or name.startswith(base + "-") or name == base:
                    rel = str(f.relative_to(ROOT)).replace("\\", "/")
                    if rel not in deleted:
                        f.unlink()
                        deleted.append(rel)

    # Reference index (text only — no CVC binaries)
    index_lines = [
        "# CVC / Visit Music City — art-direction references only",
        "",
        "NashRoam is a commercial competitor to Visit Music City. **Do not pursue CVC image rights.**",
        "These entries describe compositions we liked. They are not production assets and must never ship.",
        "",
        f"Retired from production: {TODAY}",
        "",
        "| Asset ID | Placement | Subject | Prior CVC URL (reference only) |",
        "|---|---|---|---|",
    ]
    for asset in sorted(cvc_assets, key=lambda a: a["asset_id"]):
        brief = asset.get("referenceBrief") or {}
        prior = brief.get("priorCvcUrl") or asset.get("source_url_archived") or ""
        index_lines.append(
            f"| `{asset['asset_id']}` | {brief.get('placement','')} | {brief.get('subject','')} | {prior} |"
        )
        # Per-asset markdown
        md = REF_DIR / f"{asset['asset_id']}.md"
        md.write_text(
            "\n".join(
                [
                    f"# Reference: {asset['asset_id']}",
                    "",
                    "**Status:** `rightsStatus: reference-only` · `approvalStatus: hold`",
                    "",
                    "Not for production. Not a licensing target. Composition memory only.",
                    "",
                    f"- **Subject:** {brief.get('subject')}",
                    f"- **Composition:** {brief.get('composition')}",
                    f"- **Avoid:** {brief.get('avoid')}",
                    f"- **Placement:** {brief.get('placement')}",
                    f"- **Prior CVC URL (do not fetch for production):** {prior}",
                    "",
                ]
            ),
            encoding="utf-8",
        )
    (REF_DIR / "README.md").write_text("\n".join(index_lines) + "\n", encoding="utf-8")

    data["meta"] = {
        **(data.get("meta") or {}),
        "cvcPolicy": "reference-only; never pursue Visit Music City / Nashville CVC rights",
        "renderRule": "rightsStatus === 'cleared' && approvalStatus === 'approved'",
        "lastCvcPurge": TODAY,
    }
    data["assets"] = assets
    RIGHTS_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_csv(assets)

    cleared = sum(1 for a in assets if a.get("rightsStatus") == "cleared" and a.get("approvalStatus") == "approved")
    report = {
        "cvcAssetsReclassified": len(cvc_assets),
        "cvcAssetIds": [a["asset_id"] for a in cvc_assets],
        "imageKeysToDisable": sorted(set(image_keys_to_disable)),
        "filesDeleted": sorted(set(deleted)),
        "filesDeletedCount": len(set(deleted)),
        "clearedApprovedCount": cleared,
        "pendingClearanceCount": sum(1 for a in assets if a.get("rightsStatus") == "pending-clearance"),
        "referenceOnlyCount": sum(1 for a in assets if a.get("rightsStatus") == "reference-only"),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
