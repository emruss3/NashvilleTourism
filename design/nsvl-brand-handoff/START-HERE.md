# Start here — Claude Code handoff

This folder contains the complete design brief for the homepage plus eight page families. The images communicate layout and art direction; the Markdown specifies behavior; the CSS supplies initial tokens. This is not an existing application or a deployed site.

## Give the package to Claude Code
1. Extract the ZIP. Keep the entire `nsvl-brand-handoff` folder intact so image references work.
2. Put that folder in your existing site repository, for example at `design/nsvl-brand-handoff/`. Keep the repository's current instructions and application files.
3. Open Claude Code in that repository and paste the contents of `CLAUDE-CODE-PROMPT.md`.
4. Ask it to inspect the nine PNG boards directly, not only the HTML indexes. Relative paths are listed in `PAGE-MAP.md`.

If you transfer files through an upload interface, include the full folder contents or the archive and have it extract them. The implementation agent must also have access to the actual site repository; this ZIP contains the design brief, not your current application code.

## What is included
- Nine photographic desktop/mobile concept boards, including the homepage and the group-based planner.
- An indexed visual gallery and an annotated wireframe atlas with corresponding pictures.
- Homepage, category, mobile and group-optimizer requirements.
- Brand guide, CSS tokens, copy, data needs and acceptance criteria.
- Provisional logo assets, plus explicit production dependencies.

## Source-of-truth order
1. Current user/repository instructions.
2. `HOMEPAGE.md` for homepage layout; `GROUP-TRIP-PLANNER.md` for planner behavior; `MOBILE-FIRST.md` for shared mobile controls. HOMEPAGE.md supersedes the earlier homepage section order.
3. `page-designs/README.md` and the nine images for visual composition. Written requirements win over accidental text, dates, missing controls or invented content in generated boards.
4. `PAGE-LAYOUTS.md` for category data, detail flows and failure states; `BRAND-GUIDE.md`, `design-tokens.css` and `CONTENT-AND-DATA.md` for shared rules.
5. `page-layouts/PAGE-LAYOUTS.html` for structural annotations. Gray blocks are wireframe notation, not the intended finished appearance.
6. Older `SITE-LAYOUT.md` and `references/` provide supporting historical detail only where consistent with the above.

## Important asset status
Production palette is Paper White #F5F3ED and Charcoal Ink #1F2421. No third accent. Generated photography/listings are illustrative. Final authentic logo vector, small favicon and standalone image exports are still needed. White PNG logo reconstructions are review-only because of edge artifacts. These gaps must not stop work on the rest of the implementation, but must not be silently passed off as complete.

## Approved AI pictures
The owner wants to use the AI pictures from all nine boards. Read AI-IMAGERY.md; it overrides earlier stock/photography replacement instructions. Full-page images are included, but individual picture assets have not yet been exported or uploaded to the site.
