# Media assets

The build environment had no outbound network access, so no photography or
video could be downloaded. Every image slot renders a "Photo to come"
placeholder that reserves the correct space. Dropping the real files in here
switches them over with **no layout shift and no code changes**.

## How to activate an asset

1. Save the file at the exact path listed below.
2. Open `src/lib/media.ts` and add the asset's key to the `AVAILABLE_MEDIA` set.
3. If the file's intrinsic dimensions differ from the ones declared in the
   `images` map, update `width` and `height` there too. They exist to reserve
   layout space and keep CLS at zero.
4. Rebuild.

Until step 2 is done the placeholder keeps rendering. This is deliberate: a
missing file should never produce a broken image on a live page.

## Video: the hero

| Path | Notes |
|---|---|
| `video/lower-broadway-night.mp4` | H.264. Target under 4 MB. |
| `video/lower-broadway-night.webm` | VP9. Usually 30-40% smaller. |
| `hero/lower-broadway-night.jpg` | Poster still, 2400×1350. Required. |

Add the key `hero/video` to `AVAILABLE_MEDIA` **only when all three exist**.
Add `hero/lower-broadway` when the poster still exists, with or without video.

Brief: 8-15 seconds, muted, seamless loop, shot at dusk or after dark looking
down Lower Broadway with the neon lit. Slow push or locked-off. Avoid
recognisable faces, avoid readable brand signage as the focal subject, and
avoid anything that dates the clip such as a visible tour poster.

The hero already handles the rest: the video is `muted`/`playsInline`/`loop`,
carries `preload="metadata"`, and is hidden entirely for anyone with
`prefers-reduced-motion`, who gets the poster still instead. A gradient scrim
sits over the media so the headline keeps its WCAG contrast on any footage.

## Photography

All images are 3:2 or 16:10 unless noted. Shoot or licence horizontal.

### Neighborhoods (`neighborhoods/`, 1600×1067)
`downtown-broadway.jpg`, `12-south.jpg`, `the-gulch.jpg`, `east-nashville.jpg`,
`germantown.jpg`, `wedgewood-houston.jpg`, `midtown.jpg`,
`hillsboro-village.jpg`, `sylvan-park.jpg`, `green-hills.jpg`

Each should read instantly as that specific area. Street-level, daylight,
people present but not identifiable close-ups.

### Hub pages (`hubs/`, 1600×1067)
`hotels.jpg`, `tours.jpg`, `tickets.jpg`, `live-music.jpg`,
`honky-tonk-highway.jpg`, `weekend.jpg`, `bachelorette.jpg`, `opryland.jpg`

## Licensing rules

- **Every** asset needs a `licence` value recorded in `src/lib/media.ts`.
- Where the licence requires attribution, fill `credit`. The component renders
  it over the bottom-right corner automatically.
- Do not use AI-generated imagery. The site's credibility rests on showing real
  places, and a generated "Nashville" street is a fabrication.
- Do not attach a generic stock photo to a specific named business. A generic
  photo of *a* restaurant on a page about *that* restaurant misrepresents it.
  Neighborhood and category shots are fine; individual venue shots must be of
  that venue.

### Sources worth using

- **Pexels / Unsplash** — free licence, no attribution legally required, but
  record the photographer anyway.
- **Nashville CVC media library** — often licensable for editorial use with
  credit. Best quality-to-effort for neighborhood shots.
- **Commissioned local shoot** — the only way to get venue-specific imagery you
  can use without restriction. Budget for this before launch.

## Alt text

Alt text is already written for every slot in `src/lib/media.ts`. If the photo
you licence shows something different from the description, **update the alt
text to match the photo**. Alt text that describes an image other than the one
displayed is worse than none.
