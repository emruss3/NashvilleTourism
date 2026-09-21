# Visit Music City photography: intake and usage

**Permission (2026-09-21).** Conley Merritt, Publicist at the Nashville Convention & Visitors
Corp, granted access to the NCVC "General Nashville" folder by email with this usage statement:

> Images, videos, and b-roll are only permitted for use in promoting the city of Nashville as a
> tourist destination, to promote an upcoming meeting or conference to attendees, or in a
> tourism-related article. Usage is not permitted for any of the following: for-profit, commercial,
> personal use, merchandising, or advertising. All images that do not have photographer credits may
> be labeled "Courtesy of Nashville Convention & Visitors Corp."

This replaces the 2026-08-07 "no CVC" policy in `COMMERCIAL-MEDIA-SOURCING.md`.

## How NSVL uses them

Allowed (tourism promotion and tourism articles):

- Neighborhood guides, things-to-do, music venue guides, events and live-music pages, the trip
  planner, the weekend page, guide articles, photo essays.

Never (for-profit, merchandising, advertising):

- The shop and bag, the advertising page, private-events sales pages, sponsored slots, affiliate
  hotel and tour modules (Booking.com and Viator cards, "Check rates" rows), the listing fallbacks
  that feed those cards, email marketing, paid social, print or merchandise.

`tests/media-usage.test.ts` fails the build if a CVC-licensed key is referenced from one of those
surfaces. Keys are listed in `CVC_EDITORIAL_KEYS` in `src/lib/media.ts`.

Credit line, everywhere: **Courtesy of Nashville Convention & Visitors Corp.** (photographer
credit instead where the file carries one). `/photo-credits/` lists every CVC frame in use.

## Already in production (from the CVC library, activated 2026-09-21)

| Key | Frame | Placement |
| --- | --- | --- |
| `hub/events-premium` | Dancing at a Musicians Corner concert | Events page intro |
| `hub/live-music-premium` | Performer on the Ryman stage | Live music tonight |
| `hub/restaurants-premium` | Twelve Thirty Club bar | Restaurants page intro |
| `hub/trip-planner-premium` | Skyline from the pedestrian bridge | Plan your trip intro |
| `trending/weekender` | Aerial of the State Capitol and downtown | Weekend page lead |
| `trending/live-tonight` | Band on a lit stage | Reserve for music editorial |
| `venues/twelve-thirty-club` | Twelve Thirty Club supper club bar | Downtown guide pick |
| `restaurants/butter-milk-ranch` | Butter Milk Ranch interior | 12 South guide pick |
| `restaurants/playdate` | Playdate patio | 12 South guide pick |
| `editorial/pedestrian-bridge` | John Seigenthaler bridge at blue hour | Kids guide cover |
| `neighborhood/music-row` | Guitar sculptures on Music Row | Music Row neighborhood |
| `neighborhood/wedgewood-houston` | Bastion dining room | Bastion pick, WeHo guide |
| `neighborhood/west-end` | Parthenon across the Centennial Park lake | West End neighborhood |
| `cvc/hermitage-hotel-lobby` | Hermitage Hotel lobby | Where to stay guide article |

Held back: `restaurants/peg-leg-porker` (413 px, too small) and `hub/things-to-do-premium`
(a Gray Line coach in frame; another company's branding).

## Wanted from the General Nashville folder

Pick these first; they replace concept illustrations or Commons street frames on editorial pages.

| Priority | Subject | Replaces | Target key |
| --- | --- | --- | --- |
| 1 | Lower Broadway neon at night, street level, crowd | Commons daytime frame | `neighborhood/downtown-broadway` |
| 1 | Honky-tonk interior with a band and dancers | none (page has no image) | `hub/honky-tonk-highway` |
| 1 | Grand Ole Opry stage or Opry House exterior at night | Commons daytime exterior | `music/grand-ole-opry` |
| 1 | Ryman Auditorium interior, pews and stage | Commons exterior | `music/ryman-auditorium` |
| 1 | Bluebird Cafe writers' round | Commons exterior | `music/bluebird-cafe` |
| 2 | 12 South street with shops and pedestrians | mural crop | `neighborhood/12-south` |
| 2 | East Nashville, Five Points | residential street | `neighborhood/east-nashville` |
| 2 | Germantown brick streets | Commons | `neighborhood/germantown` |
| 2 | The Gulch, street level with murals | Commons | `neighborhood/the-gulch` |
| 2 | Midtown, Division Street at night | Commons | `neighborhood/midtown` |
| 2 | Green Hills district (not a mall interior) | mall interior | `neighborhood/green-hills` |
| 2 | Hillsboro Village, Belcourt marquee | Commons | `neighborhood/hillsboro-village` |
| 2 | Hot chicken plate, Nashville | illustration | `editorial/hot-chicken` |
| 2 | Meat-and-three or brunch table | illustration | `editorial/nashville-brunch` |
| 2 | Country Music Hall of Fame exterior or rotunda | night exterior only | `attractions/country-music-hall-of-fame` |
| 2 | Frist Art Museum, Cheekwood, Parthenon interior | Commons | `attractions/*` |
| 3 | Cumberland River, pedestal bridge, skyline at dusk | drone poster | `hero/*` (video stays) |
| 3 | Musicians Corner, CMA Fest crowds, Fourth of July | concept illustrations | `hub/events-*` |
| 3 | Families at Centennial Park, Adventure Science Center | bridge frame | `guide/with-kids` |
| 3 | Bachelorette groups on Broadway (tasteful) | concept | `hub/bachelorette` |

Do not take: hotel rooms and pools for the hotel pages (those carry affiliate links), tour
operator vehicles, anything for the shop or private-events pages.

## Installing frames from the Brandfolder share

The share is https://brandfolder.com/s/w6kr476hzpk96cvgx9pcqs. Download the originals you want into
one folder, then:

```bash
python scripts/media/import-cvc.py --source ~/Downloads/brandfolder --init
#   writes docs/media/cvc-intake/manifest.json with one row per file and a suggested key
#   fill alt (what is actually in frame, naming any business shown), placement, optional
#   photographer credit; set "skip": true for frames not wanted; rename keys to the target
#   keys in the wanted list above where they replace an existing placement
python scripts/media/import-cvc.py --source ~/Downloads/brandfolder
#   master JPG + 640/960/1600/2400 WebP into public/media/<group>/, generated
#   src/lib/media-cvc.ts, cleared rows with the permission block in ASSET-RIGHTS.json
npm run test:media && npm run build
```

Imported keys are allowlisted automatically and the guard test keeps them off commercial
surfaces. Point placements at the new keys (`media-placements.ts`, page intros, guide picks),
check `/photo-credits/`, commit the files with the manifest.

## Reply to send Conley

> Thanks, Conley. To make sure we use these the way you intend: NSVL (nashroam.com, moving to
> Nashville.com) is an independent city guide with neighborhood guides, venue guides and event
> listings. The CVC frames will appear only in that editorial coverage, credited "Courtesy of
> Nashville Convention & Visitors Corp." unless a photographer credit is supplied. The site also
> carries a small merchandise shop, an advertising page and hotel booking links; we will keep CVC
> photography off all of those. If that reading of the usage statement is right, no reply needed;
> if you would prefer we limit use further, tell us and we will adjust.
