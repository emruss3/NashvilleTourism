#!/usr/bin/env python3
"""
Nashroam Overture Places sync.

Downloads the latest Overture Places release for a Nashville bbox, filters to
tourism-relevant POIs, upserts into place_discovery_candidates, scores, then
runs deterministic matching / unpublished auto-create.

Never publishes places or writes nashroam_score.

Required env:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  NASHVILLE_BBOX  (min_lon,min_lat,max_lon,max_lat) — optional, has default

Optional:
  OVERTURE_TYPE=place
  MIN_CANDIDATE_SCORE=70
  SKIP_DOWNLOAD=1  (reuse existing GeoJSON path)
  GEOJSON_PATH=/tmp/nashville-overture.geojson
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import urlopen

try:
    from supabase import create_client
except ImportError:
    print("Install: pip install supabase overturemaps==1.0.1", file=sys.stderr)
    raise

DEFAULT_BBOX = "-87.06,35.97,-86.46,36.41"  # Davidson / central Nashville
TOURISM_ROOTS = {
    "food_and_drink",
    "arts_and_entertainment",
    "cultural_and_historic",
    "shopping",
    "sports_and_recreation",
    "lodging",
}
BATCH = 200


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None or value == "":
        raise SystemExit(f"Missing required env: {name}")
    return value


def parse_bbox(raw: str) -> tuple[float, float, float, float]:
    parts = [float(x.strip()) for x in raw.split(",")]
    if len(parts) != 4:
        raise SystemExit("NASHVILLE_BBOX must be min_lon,min_lat,max_lon,max_lat")
    return parts[0], parts[1], parts[2], parts[3]


def stac_latest_release() -> str:
    """Best-effort STAC/latest label for reporting (download uses CLI latest-release)."""
    try:
        with urlopen("https://stac.overturemaps.org/", timeout=30) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
        # Prefer an explicit release id if present in the landing page/catalog.
        m = re.search(r"20\d{2}-\d{2}-\d{2}", body)
        if m:
            return m.group(0)
    except Exception:
        pass
    return "latest-release"


def download_overture(bbox: str, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable,
        "-m",
        "overturemaps",
        "download",
        f"--bbox={bbox}",
        "-f",
        "geojson",
        "--type=place",
        "-o",
        str(out_path),
    ]
    print("Running:", " ".join(cmd), flush=True)
    subprocess.check_call(cmd)


def as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x) for x in value if x is not None and str(x).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def names_from_props(props: dict[str, Any]) -> str:
    names = props.get("names") or {}
    if isinstance(names, dict):
        primary = names.get("primary")
        if primary:
            return str(primary).strip()
        common = names.get("common")
        if isinstance(common, dict):
            for v in common.values():
                if v:
                    return str(v).strip()
    if props.get("name"):
        return str(props["name"]).strip()
    return ""


def taxonomy_fields(props: dict[str, Any]) -> tuple[str | None, str | None, list[str], list[str]]:
    basic = props.get("basic_category") or props.get("basicCategory")
    taxonomy = props.get("taxonomy") or {}
    primary = None
    hierarchy: list[str] = []
    alternates: list[str] = []
    if isinstance(taxonomy, dict):
        primary = taxonomy.get("primary")
        hierarchy = as_list(taxonomy.get("hierarchy"))
        alternates = as_list(taxonomy.get("alternates"))
    # Legacy fallback only if taxonomy missing (deprecated categories).
    if not hierarchy and not primary:
        cats = props.get("categories") or {}
        if isinstance(cats, dict):
            primary = cats.get("main") or primary
            hierarchy = as_list(cats.get("alternate"))
    return (
        str(basic).strip() if basic else None,
        str(primary).strip() if primary else None,
        hierarchy,
        alternates,
    )


def address_fields(props: dict[str, Any]) -> dict[str, str | None]:
    addresses = props.get("addresses") or props.get("address") or []
    addr = addresses[0] if isinstance(addresses, list) and addresses else addresses
    if not isinstance(addr, dict):
        addr = {}
    line1 = addr.get("freeform") or addr.get("street") or addr.get("address_line1")
    return {
        "address_line1": str(line1).strip() if line1 else None,
        "locality": (addr.get("locality") or addr.get("city") or None),
        "region": (addr.get("region") or addr.get("state") or None),
        "postal_code": (addr.get("postcode") or addr.get("postal_code") or None),
        "country_code": (addr.get("country") or "US"),
    }


def website_phone(props: dict[str, Any]) -> tuple[str | None, str | None]:
    website = None
    phone = None
    websites = props.get("websites") or props.get("website")
    if isinstance(websites, list) and websites:
        website = str(websites[0]).strip()
    elif isinstance(websites, str):
        website = websites.strip()
    phones = props.get("phones") or props.get("phone")
    if isinstance(phones, list) and phones:
        phone = str(phones[0]).strip()
    elif isinstance(phones, str):
        phone = phones.strip()
    return website or None, phone or None


def operating_status(props: dict[str, Any]) -> str | None:
    for key in ("operating_status", "operatingStatus", "status"):
        if props.get(key):
            return str(props[key]).strip()
    return None


def provider_confidence(props: dict[str, Any]) -> float | None:
    for key in ("confidence", "provider_confidence"):
        if props.get(key) is not None:
            try:
                return float(props[key])
            except (TypeError, ValueError):
                return None
    return None


def source_licenses(props: dict[str, Any]) -> list[Any]:
    sources = props.get("sources") or props.get("source") or []
    if isinstance(sources, list):
        return sources
    if sources:
        return [sources]
    return []


def coords(feature: dict[str, Any]) -> tuple[float | None, float | None]:
    geom = feature.get("geometry") or {}
    if geom.get("type") == "Point":
        coords = geom.get("coordinates") or []
        if len(coords) >= 2:
            return float(coords[1]), float(coords[0])  # lat, lon
    props = feature.get("properties") or {}
    if props.get("latitude") is not None and props.get("longitude") is not None:
        return float(props["latitude"]), float(props["longitude"])
    return None, None


def tourism_relevant(hierarchy: list[str], basic: str | None, primary: str | None) -> bool:
    roots = set(hierarchy) & TOURISM_ROOTS
    if roots:
        return True
    blob = " ".join([basic or "", primary or ""]).lower()
    return any(
        token in blob
        for token in (
            "restaurant",
            "cafe",
            "bar",
            "hotel",
            "museum",
            "park",
            "attraction",
            "nightlife",
            "gallery",
            "theatre",
            "theater",
            "lodging",
            "shopping",
        )
    )


def feature_to_row(feature: dict[str, Any], source_id: str, release: str) -> dict[str, Any] | None:
    props = feature.get("properties") or {}
    external_id = str(props.get("id") or feature.get("id") or "").strip()
    name = names_from_props(props)
    if not external_id or not name:
        return None
    basic, primary, hierarchy, alternates = taxonomy_fields(props)
    if not tourism_relevant(hierarchy, basic, primary):
        return None
    lat, lon = coords(feature)
    addr = address_fields(props)
    website, phone = website_phone(props)
    return {
        "source_id": source_id,
        "external_id": external_id,
        "name": name,
        "basic_category": basic,
        "taxonomy_primary": primary,
        "taxonomy_hierarchy": hierarchy,
        "alternate_categories": alternates,
        "latitude": lat,
        "longitude": lon,
        "address_line1": addr["address_line1"],
        "locality": addr["locality"],
        "region": addr["region"],
        "postal_code": addr["postal_code"],
        "country_code": str(addr["country_code"] or "US")[:2].upper(),
        "phone": phone,
        "website_url": website,
        "operating_status": operating_status(props),
        "provider_confidence": provider_confidence(props),
        "source_release": release,
        "source_licenses": source_licenses(props),
        "source_metadata": {
            "overture_id": external_id,
            "version": props.get("version"),
            "level": props.get("level"),
            "theme": props.get("theme"),
            "type": props.get("type"),
        },
        "last_seen_at": utc_now(),
    }


def chunked(items: list[dict[str, Any]], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def main() -> int:
    bbox = os.environ.get("NASHVILLE_BBOX", DEFAULT_BBOX)
    min_score = int(os.environ.get("MIN_CANDIDATE_SCORE", "70"))
    geojson_path = Path(os.environ.get("GEOJSON_PATH") or Path(tempfile.gettempdir()) / "nashville-overture.geojson")
    dry_run = os.environ.get("DRY_RUN") == "1"

    release = stac_latest_release()
    print(f"Overture release label: {release}")
    print(f"BBOX: {bbox}")

    if os.environ.get("SKIP_DOWNLOAD") != "1":
        download_overture(bbox, geojson_path)
    elif not geojson_path.exists():
        raise SystemExit(f"SKIP_DOWNLOAD set but missing {geojson_path}")

    print(f"Reading {geojson_path} ({geojson_path.stat().st_size / 1e6:.1f} MB)")
    with geojson_path.open(encoding="utf-8") as f:
        data = json.load(f)
    features = data.get("features") or []
    raw_count = len(features)
    print(f"Raw place features: {raw_count}")

    # Local count path (no Supabase writes) for verification without credentials.
    if dry_run:
        tourism = 0
        restaurant_count = 0
        taxonomy_counter: Counter[str] = Counter()
        for feature in features:
            props = feature.get("properties") or {}
            basic, primary, hierarchy, _alts = taxonomy_fields(props)
            if not tourism_relevant(hierarchy, basic, primary):
                continue
            tourism += 1
            for h in hierarchy:
                taxonomy_counter[h] += 1
            if "restaurant" in hierarchy and "food_and_drink" in hierarchy:
                restaurant_count += 1
            elif (primary or "").lower() == "restaurant":
                restaurant_count += 1
        print(f"DRY_RUN tourism-relevant: {tourism}")
        print(f"DRY_RUN restaurant-ish: {restaurant_count}")
        for root in sorted(TOURISM_ROOTS):
            print(f"  hierarchy:{root} = {taxonomy_counter.get(root, 0)}")
        report = {
            "overture_release": release,
            "bbox": bbox,
            "raw_place_count": raw_count,
            "tourism_relevant_count": tourism,
            "restaurant_candidate_count": restaurant_count,
            "dry_run": True,
            "finished_at": utc_now(),
        }
        out = Path("tmp") / "overture-sync-report.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Wrote {out}")
        return 0

    url = env("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL"))
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    client = create_client(url, key)

    source = (
        client.table("data_sources")
        .select("id,provider_key,active")
        .eq("provider_key", "overture_maps")
        .limit(1)
        .execute()
    )
    if not source.data:
        raise SystemExit("data_sources.overture_maps missing — apply place discovery migration first")
    source_id = source.data[0]["id"]

    rows: list[dict[str, Any]] = []
    taxonomy_counter: Counter[str] = Counter()
    restaurant_count = 0
    for feature in features:
        row = feature_to_row(feature, source_id, release)
        if not row:
            continue
        rows.append(row)
        for h in row["taxonomy_hierarchy"]:
            taxonomy_counter[h] += 1
        if "restaurant" in row["taxonomy_hierarchy"] and "food_and_drink" in row["taxonomy_hierarchy"]:
            restaurant_count += 1
        elif (row.get("taxonomy_primary") or "").lower() == "restaurant":
            restaurant_count += 1

    print(f"Tourism-relevant candidates: {len(rows)}")
    print(f"Restaurant-ish candidates: {restaurant_count}")
    for root in sorted(TOURISM_ROOTS):
        print(f"  hierarchy:{root} = {taxonomy_counter.get(root, 0)}")

    upserted = 0
    for batch in chunked(rows, BATCH):
        # Do not send first_seen_at — DB default on insert; existing rows keep original.
        result = (
            client.table("place_discovery_candidates")
            .upsert(batch, on_conflict="source_id,external_id")
            .execute()
        )
        upserted += len(result.data or batch)
    print(f"Upserted candidates: {upserted}")

    scored = client.rpc("score_place_discovery_candidates").execute()
    print(f"score_place_discovery_candidates updated rows: {scored.data}")

    stale = client.rpc(
        "flag_stale_place_discovery_candidates",
        {"p_source_id": source_id, "p_source_release": release},
    ).execute()
    print(f"flag_stale_place_discovery_candidates: {stale.data}")

    # Score distribution for this source
    dist = (
        client.table("place_discovery_candidates")
        .select("candidate_score,suggested_category,match_status")
        .eq("source_id", source_id)
        .eq("tourism_relevant", True)
        .execute()
    )
    scores = [r["candidate_score"] for r in (dist.data or [])]
    if scores:
        buckets = Counter((s // 10) * 10 for s in scores)
        print("Score distribution (floor decade):", dict(sorted(buckets.items())))
        cats = Counter(r.get("suggested_category") or "none" for r in dist.data or [])
        print("Suggested categories:", dict(cats))

    matched_before = (
        client.table("places")
        .select("id,name,slug,website_url,address_line1,postal_code,latitude,longitude,is_published,curation_status")
        .execute()
    )

    match_result = client.rpc(
        "match_place_discovery_candidates",
        {"p_min_score": min_score, "p_auto_create": True},
    ).execute()
    print("Match result:", match_result.data)

    # Verify zero auto-publish / zero auto nashroam_score from this run
    leaked = (
        client.table("places")
        .select("id,slug,is_published,curation_status")
        .like("slug", "ovt-%")
        .eq("is_published", True)
        .execute()
    )
    if leaked.data:
        print("ERROR: auto-created places were published:", leaked.data)
        return 1

    BOOTSTRAP_RESTAURANT_SLUGS = {
        "rolf-and-daughters",
        "city-house",
        "henrietta-red",
        "locust",
        "audrey",
        "noko",
        "the-optimist",
        "husk-nashville",
        "bastion",
        "iggys",
        "bad-idea",
        "kisser",
        "folk",
        "lyra",
        "xiao-bao",
        "cafe-roze",
        "butcher-and-bee",
        "kayne-prime",
        "etch",
        "yolan",
    }

    overture_links = (
        client.table("place_source_ids")
        .select("place_id,external_id,places(name,slug,primary_category,is_published)")
        .eq("source_id", source_id)
        .execute()
    )
    print(f"Overture source linkages total: {len(overture_links.data or [])}")

    linked_place_ids = {row["place_id"] for row in (overture_links.data or [])}
    existing_non_ovt = [
        p for p in (matched_before.data or []) if not str(p.get("slug") or "").startswith("ovt-")
    ]
    matched_existing = [p for p in existing_non_ovt if p["id"] in linked_place_ids]
    bootstrap = [p for p in existing_non_ovt if p.get("slug") in BOOTSTRAP_RESTAURANT_SLUGS]
    bootstrap_matched = [p for p in bootstrap if p["id"] in linked_place_ids]
    bootstrap_missed = [p for p in bootstrap if p["id"] not in linked_place_ids]
    print(
        f"Existing canonical places linked to Overture: {len(matched_existing)} / {len(existing_non_ovt)}"
    )
    print(
        f"Bootstrap restaurants matched: {len(bootstrap_matched)} / {len(bootstrap)}"
    )
    for p in bootstrap_matched:
        print(f"  matched bootstrap: {p.get('slug')} — {p.get('name')}")
    for p in bootstrap_missed:
        print(f"  MISSED bootstrap: {p.get('slug')} — {p.get('name')}")

    auto_created = (
        client.table("places")
        .select("id", count="exact")
        .like("slug", "ovt-%")
        .eq("is_published", False)
        .execute()
    )
    print(f"Auto-created unpublished ovt-* places (count): {auto_created.count}")

    published_ovt = (
        client.table("places")
        .select("id", count="exact")
        .like("slug", "ovt-%")
        .eq("is_published", True)
        .execute()
    )
    auto_published = published_ovt.count or 0
    if auto_published:
        print(f"ERROR: {auto_published} ovt-* places are published")
        return 1
    print("Auto-published ovt-* places: 0")

    editorial = (
        client.table("place_editorial")
        .select("place_id,nashroam_score,places!inner(slug)")
        .like("places.slug", "ovt-%")
        .execute()
    )
    if editorial.data:
        print("ERROR: nashroam_score rows exist for ovt-* places:", editorial.data)
        return 1
    print("Auto nashroam_score on ovt-* places: 0")

    ambiguous = (
        client.table("place_discovery_candidates")
        .select("id", count="exact")
        .eq("source_id", source_id)
        .eq("match_status", "ambiguous")
        .execute()
    )
    closed = (
        client.table("place_discovery_candidates")
        .select("id", count="exact")
        .eq("source_id", source_id)
        .eq("match_status", "closed")
        .execute()
    )

    report = {
        "overture_release": release,
        "bbox": bbox,
        "raw_place_count": raw_count,
        "tourism_relevant_count": len(rows),
        "restaurant_candidate_count": restaurant_count,
        "upserted": upserted,
        "match_result": match_result.data,
        "stale_result": stale.data,
        "existing_canonical_linked": len(matched_existing),
        "existing_canonical_total": len(existing_non_ovt),
        "bootstrap_restaurants_matched": len(bootstrap_matched),
        "bootstrap_restaurants_total": len(bootstrap),
        "bootstrap_missed_slugs": [p.get("slug") for p in bootstrap_missed],
        "ambiguous_count": ambiguous.count or 0,
        "closed_count": closed.count or 0,
        "auto_created_unpublished": auto_created.count or 0,
        "auto_published": 0,
        "auto_nashroam_scores": 0,
        "finished_at": utc_now(),
    }
    out = Path("tmp") / "overture-sync-report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
