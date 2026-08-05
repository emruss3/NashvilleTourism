# Launch Checklist

Indexing must stay **off** (`allowIndexing` false) until every gate below is green.

## Identity & legal

- [ ] Public domain live (replace `[DOMAIN.COM]` in `src/lib/site.ts`)
- [ ] Legal entity name and mailing address complete
- [ ] Real phone and `hello@` / editorial / corrections / advertising emails
- [ ] Privacy policy reviewed by counsel (not template)
- [ ] Terms of use reviewed by counsel (not template)
- [ ] Affiliation / affiliate disclosure language finalized
- [ ] Advertising rate card and sponsorship terms finalized

## People & content

- [ ] Real authors replace placeholders in `src/lib/content/authors.ts`
- [ ] Editor names on published guides
- [ ] Sample / `[Sample]` listings removed or fully verified
- [ ] Restaurants: hours, reservations, parking verified (`dataStatus: verified`)
- [ ] Hotels: rates context, amenities, walkability notes verified
- [ ] Venues: capacity, ticket links, genres verified
- [ ] Attractions: hours, price, time-needed verified
- [ ] Events: live Ticketmaster (or equivalent) feed in production rebuilds
- [ ] Neighborhood decision fields (noise, Broadway time, hotel band) spot-checked

## Media & rights

- [ ] Every `AVAILABLE_MEDIA` key has a rights-cleared file
- [ ] Credits/licences accurate in `src/lib/media.ts`
- [ ] Named venues/restaurants never use unrelated stock
- [ ] WeHo, tours hub, Opryland hub, hotels hub replaced per `MEDIA-REPLACEMENT-LIST.md`
- [ ] Hero montage or approved stills (not only generic concert)

## Product

- [ ] Newsletter provider wired (not console stub)
- [ ] Trip planner save / share if promised in marketing
- [ ] Affiliate IDs set in env; deep links QA’d (hotels, tours, tickets)
- [ ] Scheduled rebuilds for events calendar
- [ ] Analytics destination configured
- [ ] Error / uptime monitoring configured

## Technical go-live

- [ ] `npm run typecheck` clean
- [ ] `npm run build` clean; `out/` deployed
- [ ] Canonical URLs and `NEXT_PUBLIC_SITE_URL` correct
- [ ] `robots` / indexing switch flipped only after gates above
- [ ] Accessibility regression pass (keyboard, focus, reduced motion)
- [ ] Mobile sticky CTA does not cover primary actions
- [ ] Demo banner removed or disabled when sample data is gone
