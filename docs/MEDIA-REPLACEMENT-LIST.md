# Media Replacement List

Audit of every key in `src/lib/media.ts` plus hero video. Do not use AI-generated images. Prefer Nashville-specific rights-cleared photography.

| Key | Current source | Accurate? | Keep / Replace | Replacement brief | Dimensions / crop | Original shoot required? |
|---|---|---|---|---|---|---|
| `hero/video` | Pexels 9481012 (K) — generic concert | Partial — music mood only | **Replace as sole hero** | Daylight establishing montage: skyline/bridge, hospitality, live room, neighborhood street. Keep concert as one beat only. | 1920×1080, ≤4 MB, 8–15s loop | Preferred for brand films |
| `hero/lower-broadway` | Cameron Stewart / Unsplash — Pedestrian Bridge | Yes | **Keep** as poster / still | Optional second still: bright Lower Broadway daytime | 2400×1600, 16:10 | No |
| `neighborhood/downtown-broadway` | Wikimedia — Broadway neon | Yes | **Keep** | Optional daytime alternate for variety | 1600×1067+ | No |
| `neighborhood/12-south` | Wikimedia — I Believe mural | Yes | **Keep** | Optional: 12th Ave streetscape with bungalows | 1600×1067, avoid portrait-only | No |
| `neighborhood/the-gulch` | Wikimedia — ICON / Gulch banners | Yes | **Keep** | Optional: wings mural or Demonbreun street | 1600×1067 | No |
| `neighborhood/east-nashville` | Wikimedia — Shelby Bottoms | Partial — greenway not Five Points | **Replace preferred** | Five Points / Main St storefronts, daylight | 1600×1067 street-level | Nice to have |
| `neighborhood/germantown` | Unsplash — brick home + blossoms | Yes | **Keep** | Optional: restaurant block / brick street | 1600×1067 | No |
| `neighborhood/wedgewood-houston` | Flickr — Melrose Theater (Berry Hill) | **No** | **Replace** | Warehouse / gallery / brewery block in WeHo proper (Chestnut / 4th–8th Ave S) | 1600×1067 | Yes if stock fails |
| `neighborhood/midtown` | Wikimedia — Parthenon columns | Partial — Centennial/West End | **Replace or supplement** | Music Row houses/studios OR West End with Parthenon wide | 1600×1067 | Nice to have |
| `neighborhood/hillsboro-village` | Wikimedia — 21st Ave | Yes | **Keep** | — | 1600×1067 | No |
| `neighborhood/sylvan-park` | Flickr — Richland Creek Greenway | Partial — greenway not Murphy Rd | **Replace preferred** | Murphy / 46th commercial row or residential bungalows | 1600×1067 | Nice to have |
| `neighborhood/green-hills` | Wikimedia — Hillsboro Pike | Yes | **Keep** | Avoid mall-interior stock | 1600×1067 | No |
| `hub/hotels` | Unsplash — resort pool | **No** (generic) | **Replace** | Nashville hotel exterior or rooftop with skyline context | 1600×1067 | Preferred |
| `hub/restaurants` | Unsplash — plated food | Category OK | **Keep for hub only** | Never attach to a named restaurant | 1600×1067 | Venue shots need originals |
| `hub/tours` | Unsplash — mountain road | **No** | **Replace** | Pedal tavern / party bus / downtown sightseeing in Nashville | 1600×1067 | Preferred |
| `hub/tickets` | Unsplash — outdoor concert | Category OK | **Keep with caution** | Prefer Ascend / Bridgestone identifiable (rights permitting) | 1600×1067 | Nice to have |
| `hub/live-music` | Unsplash — concert crowd | Category OK | **Keep with caution** | Prefer Broadway / Station Inn / listening room (rights permitting) | 1600×1067 | Nice to have |
| `hub/honky-tonk-highway` | Unsplash — guitarist | Partial | **Replace preferred** | Lower Broadway neon or daytime strip | 1600×1067 | No if Broadway still used |
| `hub/weekend` | Unsplash — skyline / bridge | Yes | **Keep** | — | 1600×1067 | No |
| `hub/bachelorette` | Unsplash — friends outdoors | Generic | **Replace preferred** | Nashville group trip without cliché props | 1600×1067 | Nice to have |
| `hub/opryland` | Unsplash — hotel suite | **No** | **Replace** | Gaylord Opryland atrium or exterior only with permission / licensed library | 1600×1067 | Yes or CVC library |

## Listing imagery

Restaurant, Hotel, Venue, and Attraction cards now accept an optional `imageKey`. Until a key exists in `AVAILABLE_MEDIA`, they use the branded `PhotoSlot` fallback — never misleading stock for a named place.

## Activation

1. Drop file under `public/media/…`
2. Add key to `AVAILABLE_MEDIA` in `src/lib/media.ts`
3. Update alt/credit/licence/dimensions to match the file
4. Rebuild
