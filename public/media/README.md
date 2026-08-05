# Media assets

Production photography and hero video installed from the reviewed
`NashvilleTourism-media-repository` package (August 4, 2026).

Authoritative maps and rights:

- `docs/media/MEDIA-MAP.md`
- `docs/media/ASSET-RIGHTS.csv`
- `docs/media/ATTRIBUTION.md`
- `docs/media/NEEDED-SHOOTS.md`
- `src/lib/media.ts`

## How the registry works

1. Files live under `public/media/` at the exact paths declared in `src/lib/media.ts`.
2. A key must also appear in `AVAILABLE_MEDIA` before `SmartImage` renders the photograph.
3. Missing keys intentionally fall back to a typographic placeholder — never a wrong place or business.

## Hero

| Path | Role |
|---|---|
| `hero/nashville-hero.mp4` | Active muted 12.2s loop |
| `hero/nashville-hero.webm` | VP9 fallback |
| `hero/nashville-hero-poster.jpg` | Poster / reduced-motion still (`hero/lower-broadway` key) |
| `hero/downtown-rooftop.jpg` | Supporting hero still |
| `hero/live-music-night.jpg` | Supporting hero still |

`hero/lower-broadway` (poster) is the live hero surface. The MP4/WebM loop is
kept on disk for a future smoother clip but is **not autoplayed** — the current
montage reads as choppy stills.

## Neighborhoods

Accurate placements for Downtown/Broadway, 12 South, The Gulch, East Nashville, Germantown, Wedgewood-Houston, Midtown, Hillsboro Village, Green Hills, Music Row, and West End.

**`neighborhood/sylvan-park` is intentionally unavailable** until an accurate photo is commissioned. Do not substitute The Lanes, another neighborhood, or generic stock.

## Hubs and editorial

Category hubs (`hubs/`), editorial frames (`editorial/`), and exact venue/property assets (`venues/`) are registered in `src/lib/media.ts`.

Hard rules:

- A named listing card may only show that listing’s exact photograph.
- Category images must not be labeled as an unrelated business.
- Owned JBJ’s / DELUX WeHo / Solaya photos stay in their approved contexts — see `docs/media/ASSET-RIGHTS.csv`.
- Creative Commons assets require attribution (visible credit and `/photo-credits/`).
- No AI-generated imagery.

## Licensing

Every asset’s licence and provenance are recorded in `docs/media/ASSET-RIGHTS.*`. Public attribution for open-license photographs is listed at `/photo-credits/`.
