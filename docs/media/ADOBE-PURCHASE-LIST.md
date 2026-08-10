# Adobe Stock purchase list

**Do not download or use Adobe previews in production.**  
Status remains `purchase-required` until Eric supplies the licensed original file.

Before purchase, open each asset page and confirm:

- License is **Standard** or **Extended**
- License is **not** Editorial Use Only

If Editorial Use Only: **STOP** and leave the NashRoam fallback.

| ID | Use / key | Local path after license | Notes |
|---|---|---|---|
| 1103549851 | `guide/where-to-stay`, `hub/where-to-stay` | `/media/guides/where-to-stay-nashville.jpg` | Downtown skyline / Cumberland blue hour |
| 238367153 | `guide/best-things-to-do` | `/media/guides/best-things-to-do-nashville.jpg` | Pedestrian bridge at dusk |
| 179552781 | `guide/weekend-itinerary` | `/media/guides/nashville-weekend-itinerary.jpg` | Nashville skyline |
| 205821520 | `guide/bachelorette` | `/media/guides/nashville-bachelorette-guide.jpg` | Lifestyle only — do not claim Nashville location |
| 254050330 | `guide/with-kids` | `/media/guides/nashville-with-kids.jpg` | Lifestyle park — do not claim a specific Nashville park |
| 259662137 | `attractions/shelby-bottoms-greenway` | `/media/attractions/shelby-bottoms-greenway.jpg` | Exact Shelby Bottoms |
| 117735176 | `stay/boutique-hotels-downtown` | `/media/stay/boutique-hotels-downtown.jpg` | Illustrative lobby — not a named hotel |
| 171188671 | `stay/group-rentals` | `/media/stay/group-rentals.jpg` | Illustrative group vacation |
| 116459645 | `stay/luxury-resorts-opryland` | `/media/stay/luxury-resorts-opryland.jpg` | Alt: “A large resort hotel atrium.” Never “Gaylord Opryland” |
| 1642501680 | `stay/hotels-with-pools` | `/media/stay/hotels-with-pools.jpg` | Illustrative rooftop pool — never label as Nashville property |
| 823396314 | Homepage hero `hero/nashroam-skyline` | `/media/hero/nashroam-skyline-hero.jpg` | Replaces interim Pexels `hero/downtown-rooftop` |
| 118131119 | `hub/hotels-index` | `/media/hubs/hotels-index.jpg` | Downtown skyline — not a fake hotel |
| 90286481 | `hub/tours-lead` | `/media/hubs/tours-lead.jpg` | Pedestrian bridge / skyline sunset |
| 242230333 | `hub/weekend-lead` | `/media/hubs/weekend-lead.jpg` | Downtown twilight |
| 309003897 | `hub/events-lead` | `/media/hubs/events-lead.jpg` | Blue/purple hour skyline |
| 73314740 | `hub/events-this-weekend` | `/media/hubs/events-this-weekend.jpg` | Evening skyline |
| 268082470 | `hub/plan-lead` | `/media/hubs/plan-lead.jpg` | Skyline + Cumberland |

## Activation checklist (per asset)

1. Purchase Standard or Extended commercial license
2. Download licensed original (not comp/preview)
3. Place file at the local path above
4. Generate 640 / 960 / 1600 (+ 2400 if source allows) WebP derivatives
5. Update `docs/media/ASSET-RIGHTS.json` with license record + `rightsStatus: cleared` + `approvalStatus: approved`
6. Add key to `AVAILABLE_MEDIA`
7. Re-run `npm run media:qa`
