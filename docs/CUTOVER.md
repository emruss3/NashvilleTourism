# Domain cutover: nashroam.com → nashville.com

Everything that is tied to the domain, in one place, so the switch is a checklist and not an archaeology dig. Last updated 2026-10-01.

## Vercel

| Setting | Now | After cutover |
| --- | --- | --- |
| Production domain | `nashroam.com`, `www.nashroam.com` | `nashville.com`, `www.nashville.com` (keep `nashroam.com` as a 301) |
| `NEXT_PUBLIC_SITE_URL` (if set) | `https://nashroam.com` | `https://nashville.com` |
| `NEXT_PUBLIC_STAY_HOST` | `stay.nashroam.com` | `stay.nashville.com` after the white-label custom domain is live (see Hotels) |

Canonical URLs, sitemap entries and JSON-LD `@id`s come from the site config, not from hard-coded hosts; one config change moves them all. `rg -n "nashroam\.com" src` should list only the config, the redirects map and comments.

## Supabase Auth (venue dashboard sign-in)

Magic links redirect back to the site, so Auth has to know the new host before anyone signs in on it.

1. Authentication → URL configuration → Site URL: `https://nashville.com`.
2. Redirect URLs: add `https://nashville.com/venues/` and the Vercel preview pattern `https://*-bobs-projects-d150ad75.vercel.app/venues/`; keep the nashroam entries until the 301 has been live a week.
3. Email templates reference `{{ .SiteURL }}`; nothing to edit unless a template was customised with a literal host.

## Storage (`venue-media` bucket)

Public object URLs are on the Supabase project host (`aeomrsutkhwmnscvvfur.supabase.co`), not on our domain, so floor plans and photos keep working through the cutover. Nothing to change.

## Private events email (Resend)

| Variable | Now | After |
| --- | --- | --- |
| Resend domain | `mail.nashroam.com` | add `mail.nashville.com`, verify DKIM, SPF and DMARC (same record shapes as the runbook) |
| `EVENTS_FROM_EMAIL` | `… <events@mail.nashroam.com>` | `… <events@mail.nashville.com>` |
| Reply and status links in emails | built from the site config | follow the config |

Magic links in venue reply emails (`EVENTS_MAGIC_LINK_SECRET`) are signed over the token only, not the host; links sent before the cutover keep working after it because `nashroam.com` 301s.

## Hotels (white label)

The Nuitée back office custom domain changes from `stay.nashroam.com` to `stay.nashville.com`: add the new CNAME, wait for the certificate, then set `NEXT_PUBLIC_STAY_HOST`. Until the certificate is issued the booking site shows a browser security warning; leave the old host in the variable until the new one answers over HTTPS without one. CAA rules are in `docs/HOTEL-BOOKING.md`.

## Analytics

The GTM container is shared across both domains; add `nashville.com` to any hostname filters in GA4 and in the white-label back office's "Google Site Verification".

## Order of operations

1. DNS for `nashville.com` at Vercel, certificate issued.
2. Supabase Auth URLs (step above) and the Resend domain verified.
3. Vercel env changes, redeploy.
4. Flip the production domain in Vercel; add the 301 from `nashroam.com`.
5. White-label custom domain, then `NEXT_PUBLIC_STAY_HOST`.
6. Search Console: add the new property, submit the sitemap, change of address from the old one.
