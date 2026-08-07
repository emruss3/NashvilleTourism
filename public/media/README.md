# Media assets

Production photography may ship only when:

```ts
rightsStatus === 'cleared' && approvalStatus === 'approved'
```

That allowlist is `AVAILABLE_MEDIA` in `src/lib/media.ts`. Uncleared keys render a typographic fallback — never a wrong-business substitute.

## Do not use Visit Music City / Nashville CVC

NashRoam is a commercial competitor. CVC / Visit Music City photography is **never** production-eligible. Art-direction memory only: `docs/media/reference/`.

## Authoritative docs

- `docs/media/COMMERCIAL-MEDIA-SOURCING.md` — hierarchy + placement manifest
- `docs/media/STOCK-PURCHASE-QUEUE.md` — premium stock shortlist (Eric approves buys)
- `docs/media/DIRECT-PHOTO-REQUESTS.md` — exact-business outreach (do not send yet)
- `docs/media/NEEDED-SHOOTS.md` — original NashRoam shot list
- `docs/media/ASSET-RIGHTS.json` — rights ledger (`rightsStatus`, `approvalStatus`)
- `docs/media/ATTRIBUTION.md` — public CC/Pexels credit text

## How the registry works

1. Files live under `public/media/` at paths declared in `src/lib/media.ts`.
2. A key must appear in `AVAILABLE_MEDIA` (cleared + approved) before `SmartImage` renders it.
3. Named businesses require exact-place rights — never generic stock stand-ins.

## Currently cleared in production

Primarily BPH-owned editorial/venue frames (JBJ’s, DELUX WeHo, The Lanes, select hubs) plus openly licensed / cleared hero and landmark frames listed in `ASSET-RIGHTS.json` with `rightsStatus: cleared`.

Neighborhood heroes, CVC dining locks, CVC venue/attraction listing photos, and uncleared property press media are **not** in `AVAILABLE_MEDIA`.

## Licensing

Every asset’s provenance is in `docs/media/ASSET-RIGHTS.*`. Public attribution for open-license photographs: `/photo-credits/`.
