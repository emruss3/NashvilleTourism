# Technical Upgrade Plan

Current stack (do **not** upgrade in the same commit as the UI redesign):

- Next.js **14.2.15** (App Router, `output: 'export'`)
- React **18.3.x**
- TypeScript 5.5, Tailwind 3.4

## Target

| Package | Target | Notes |
|---|---|---|
| Next.js | **15.x** latest stable | App Router; confirm static export still first-class |
| React | **19.x** matching Next 15 peer | Concurrent features already partly usable |
| `eslint-config-next` | Match Next major | |
| `next/font` | Adopt on upgrade | Replace Google Fonts `<link>` in `layout.tsx` |

## Breaking changes to plan for

1. **Async request APIs** — `cookies()`, `headers()`, `params` / `searchParams` as promises in newer Next; audit dynamic routes even if static export limits some APIs.
2. **React 19** — `useFormStatus` / ref-as-prop; check third-party types.
3. **Image** — `next/image` remains `unoptimized: true` under static export unless a custom loader is introduced.
4. **Caching defaults** — verify `generateStaticParams` and build-time feed fetches still run at build only.
5. **ESLint flat config** — Next 15 may push eslint 9; budget time for config migration.

## Static export implications

- Keep `output: 'export'`, `trailingSlash: true`, `basePath` env support.
- No server actions, no Route Handlers that must run at request time in production (current `app/api` and `llms.txt` routes must remain build-time compatible or move to static files).
- Feed adapters stay build-time; schedule CI rebuilds for calendar freshness.

## Font migration

1. Add `next/font/google` for Inter + Playfair Display in `layout.tsx`.
2. Map to `--font-sans` / `--font-display` (already consumed in CSS).
3. Remove external Google Fonts `<link>` tags.
4. Confirm CLS and FOIT/`display: swap` behavior.

## Testing requirements before merge

- [ ] `npm run typecheck`
- [ ] `npm run build` → `out/` complete
- [ ] Smoke: home, plan `?type=`, booking tabs, neighborhood explorer keyboard
- [ ] axe or existing a11y script on home + plan
- [ ] Visual: 375 / 768 / 1440
- [ ] Affiliate URL generation unchanged

## Rollback plan

1. Tag pre-upgrade commit.
2. Upgrade on a branch; deploy `out/` to staging host only.
3. If export or runtime regressions: revert branch, redeploy previous `out/` artifact.
4. Do not combine upgrade with homepage redesign or content migrations.

## Suggested sequence

1. Finish UI redesign on Next 14 (this pass).  
2. Upgrade Next/React on a dedicated PR.  
3. Adopt `next/font`.  
4. Optionally reconsider image CDN/loader once hosting is fixed.
