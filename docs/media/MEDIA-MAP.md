# Media implementation map

> **2026-08-07:** Visit Music City / Nashville CVC photography is **not** production media.
> See `COMMERCIAL-MEDIA-SOURCING.md`. Neighborhood / premium / dining CVC paths below are
> **registry keys only** — files removed; keys stay for art direction until STOCK / DIRECT / COMMISSION replacements. Production allowlist = `AVAILABLE_MEDIA` (cleared + approved only).

Copy licensed files into `public/media/` only after `rightsStatus: cleared` and `approvalStatus: approved`.

## Key status snapshot

| Image key | Status |
|---|---|
| `hero/lower-broadway` | Cleared (Pexels) — in production |
| `neighborhood/*` (CVC wave) | Removed from production — STOCK/COMMISSION |
| `hub/*` owned/open hubs | Cleared where in `AVAILABLE_MEDIA` |
| `hub/*-premium` | CVC retired — homepage remapped to cleared `hub/*` |
| `guide/*` / `trending/*` | CVC / pending — homepage remapped to cleared editorial/hub keys |
| `hero/nashroam-skyline` | Four Seasons pending — live hero uses `hero/downtown-rooftop` until STOCK #1 or DIRECT |
| `neighborhood/*` | CVC files removed — cards use cleared atmosphere stand-ins via `neighborhoodImageKey()` |
| JBJ’s / DELUX / The Lanes editorial | Cleared OWNED — in production |

## Complete approved file inventory

See `ASSET-RIGHTS.json` (`rightsStatus` / `approvalStatus`) and `AVAILABLE_MEDIA` in `src/lib/media.ts`.
Art-direction references for retired CVC frames: `docs/media/reference/`.
