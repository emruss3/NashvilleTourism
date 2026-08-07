# Commercial media sourcing

**Policy (2026-08-07):** NashRoam does **not** pursue Nashville CVC / Visit Music City image rights. NashRoam is a commercial competitor. CVC photography is `rightsStatus: reference-only` + `approvalStatus: hold` forever — art-direction memory only (`docs/media/reference/`).

## Render rule

An image may appear in production only when:

```ts
rightsStatus === 'cleared' && approvalStatus === 'approved'
```

Implemented as membership in `AVAILABLE_MEDIA` (`src/lib/media.ts`). No exceptions to avoid placeholders. Do not substitute generic stock for a named business.

## Source hierarchy

| Priority | Strategy code | Meaning |
|---|---|---|
| A | **OWNED** | NashRoam / BPH-owned commercial digital rights (verify photographer agreements before activation) |
| B | **STOCK** | Adobe Stock / Getty / Shutterstock / premium libraries — commercial website license; never `Editorial Use Only` |
| C | **DIRECT LICENSE** | Written permission from business or photographer for NashRoam.com commercial digital editorial use (incl. affiliate/booking revenue) |
| D | **COMMISSION** | Original NashRoam shoot |

There is **no CVC strategy**.

## Placement manifest

| Page | Placement | Desired subject | Strategy | Exact source/asset | Rights | Cost | Status |
|---|---|---|---|---|---|---|---|
| Homepage | Hero | Nashville skyline / Cumberland daylight | STOCK | TBD — see STOCK-PURCHASE-QUEUE #1 | — | TBD | Fallback until purchase |
| Homepage | Hub: hotels | Premium hotel / skyline terrace context | DIRECT LICENSE or STOCK | Four Seasons press pending ≠ cleared | pending-clearance | — | Fallback |
| Homepage | Hub: restaurants | Exact dining identity or city food context | OWNED / DIRECT / STOCK | CVC restaurant hub retired | reference-only (CVC) | — | Fallback |
| Homepage | Hub: live music | Live music city context (not wrong venue) | STOCK / COMMISSION | CVC live-music hub retired | reference-only (CVC) | — | Fallback |
| Homepage | Hub: things to do | City orientation landmark | STOCK | CVC things-to-do hub retired | reference-only (CVC) | — | Fallback |
| Homepage | Hub: events | Event / arena city context | STOCK | CVC events hub retired | reference-only (CVC) | — | Fallback |
| Homepage | Hub: trip planner | Planning / skyline orientation | STOCK | CVC trip-planner hub retired | reference-only (CVC) | — | Fallback |
| Homepage | Guide: first-time | Orientation skyline / bridge | STOCK | CVC guide retired | reference-only (CVC) | — | Fallback |
| Homepage | Guide: where to stay | Hotel district orientation | STOCK / DIRECT | CVC guide retired | reference-only (CVC) | — | Fallback |
| Homepage | Guide: weekend | Weekend itinerary still | DIRECT LICENSE | Four Seasons pending | pending-clearance | — | Fallback |
| Homepage | Trending cards | Live tonight / weekender | STOCK / COMMISSION | CVC trending retired | reference-only (CVC) | — | Fallback |
| Neighborhoods | downtown-broadway | Lower Broadway neon streetscape | STOCK / COMMISSION | CVC Robert’s frame → reference | reference-only (CVC) | — | Fallback |
| Neighborhoods | 12-south | 12 South streetscape | STOCK / COMMISSION | CVC Draper James → reference | reference-only (CVC) | — | Fallback |
| Neighborhoods | the-gulch | Gulch streetscape | STOCK / COMMISSION | CVC Biscuit Love → reference | reference-only (CVC) | — | Fallback |
| Neighborhoods | east-nashville | East Nashville orientation | STOCK / COMMISSION | CVC R&BQ → reference | reference-only (CVC) | — | Fallback |
| Neighborhoods | germantown | Germantown brick streets | STOCK / COMMISSION | CVC Cupcake Collection → reference | reference-only (CVC) | — | Fallback |
| Neighborhoods | wedgewood-houston | WeHo industrial-creative streets | STOCK / COMMISSION / OWNED | CVC Bastion → reference; WeHo OWNED interiors OK where cleared | mixed | — | Neighborhood hero fallback |
| Neighborhoods | midtown | Division / Midtown | STOCK / COMMISSION | CVC Odie’s → reference | reference-only (CVC) | — | Fallback |
| Neighborhoods | hillsboro-village | Belcourt / village street | STOCK / DIRECT / COMMISSION | CVC Belcourt → reference | reference-only (CVC) | — | Fallback |
| Neighborhoods | green-hills | Green Hills orientation | STOCK / DIRECT | CVC Bluebird context → reference | reference-only (CVC) | — | Fallback |
| Neighborhoods | music-row | Music Row boulevard | STOCK / COMMISSION | CVC Music Row → reference; Studio B CC remains cleared separately | mixed | — | Neighborhood hero fallback |
| Neighborhoods | sylvan-park | Sylvan Park streetscape | COMMISSION | CVC Sylvan Supply → reference | reference-only (CVC) | — | Fallback |
| Neighborhoods | west-end | West End / Vanderbilt | STOCK / COMMISSION | CVC West End → reference | reference-only (CVC) | — | Fallback |
| Editorial | pedestrian-bridge | John Seigenthaler Pedestrian Bridge | STOCK | CVC bridge retired | reference-only (CVC) | — | Fallback |
| Editorial | skyline / Parthenon / Opry / Printers Alley | Landmark / owned / CC frames | OWNED / STOCK / open license | See ASSET-RIGHTS cleared rows | cleared | — | Production where cleared |
| Dining guides | Peg Leg Porker | Exact restaurant | DIRECT LICENSE | CVC exterior retired | reference-only (CVC) | — | Fallback |
| Dining guides | Butter Milk Ranch | Exact restaurant | DIRECT LICENSE | CVC exterior retired | reference-only (CVC) | — | Fallback |
| Dining guides | Playdate | Exact restaurant | OWNED or DIRECT | CVC patio retired; verify BPH rights before activation | pending verify | — | Fallback |
| Dining guides | Butchertown Hall | Exact restaurant | DIRECT LICENSE | Official web media pending commercial clearance | pending-clearance | — | Fallback |
| Dining guides | Aba | Exact restaurant | DIRECT LICENSE | Official web media pending commercial clearance | pending-clearance | — | Fallback |
| Music / venues | Station Inn, Bluebird, Ascend, Bridgestone, Pinnacle | Exact venue | DIRECT LICENSE | CVC listing photos retired | reference-only (CVC) | — | Fallback |
| Music / venues | Ryman, The Truth, NMAAM, CMHOF | Exact venue / museum | DIRECT LICENSE | Institutional media pending | pending-clearance | — | Fallback |
| Attractions | Farmers’ Market, Frist, Cheekwood | Exact place | DIRECT LICENSE | CVC listing photos retired | reference-only (CVC) | — | Fallback |
| Attractions | Parthenon, Shelby Bottoms | Exact place | STOCK / DIRECT | Conservancy / Parks pending | pending-clearance | — | Fallback |
| Downtown guide | Roberts, Layla’s, Twelve Thirty, Chief’s, Category 10, hotels, Assembly, Bacco, etch | Exact businesses | DIRECT LICENSE | Mixed official / CVC; CVC purged | pending / reference-only | — | Fallbacks |
| Owned properties | JBJ’s, DELUX WeHo, The Lanes | Exact BPH properties | OWNED | ASSET-RIGHTS approved-owned | cleared | — | Production |

Art-direction briefs for every retired CVC frame: `docs/media/reference/`.

Related queues:

- Stock shortlist (no purchases yet): `docs/media/STOCK-PURCHASE-QUEUE.md`
- Direct permission outreach (do not send yet): `docs/media/DIRECT-PHOTO-REQUESTS.md`
- Original shoot list: `docs/media/NEEDED-SHOOTS.md`
