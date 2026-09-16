# NSVL / Nashville.com — brand and website handoff
Version 1.3 • September 16, 2026

Start with `CLAUDE-CODE-PROMPT.md`, then read the brand and layout specifications. This is a design and implementation handoff, not a deployed site or an audit of the current codebase.

## Mobile-first update
60% of traffic is expected to be mobile. Read MOBILE-FIRST.md for the primary design specification: homepage order, bottom navigation, shopping/ticket flows, performance targets and mobile sign-off. It supersedes earlier mobile layout guidance.

## What is decided
- Preserve the exact NSVL logo in the supplied visual reference. Nashville.com is the destination; .com is not required in the primary branding.
- Replace “Your weekend starts here.” with “One good plan changes everything.” in the lower trip-planning section. The hero remains “Get into Nashville.”
- Production palette follows the latest direction: Paper White #F5F3ED and Charcoal Ink #1F2421.
- The reference screenshot has its original black/cream palette preserved; use it for logo, composition and the requested text edit. Use the token file for production colors.

## Contents
1. BRAND-GUIDE.md — positioning, identity, color, type, imagery, voice and merchandise.
2. SITE-LAYOUT.md — responsive homepage and secondary page specifications.
3. CLAUDE-CODE-PROMPT.md — implementation brief to paste into Claude Code.
4. design-tokens.css — framework-neutral visual tokens and foundational styles.
5. CONTENT-AND-DATA.md — final copy, content fields, asset requirements and tracking.
6. ACCEPTANCE-CHECKLIST.md — release criteria and phased implementation.
7. MOBILE-FIRST.md — primary mobile layout, navigation, journeys and verification.
8. references/ — selected source image and edited headline reference.

## Asset status
The exact logo exists in a raster concept. A verified vector master and standalone transparent logo exports are NOT included. Do not substitute a font or invent a new NSVL mark. Obtain the original SVG/AI/EPS, or commission a faithful vector reconstruction and compare it to the supplied mark before approval. Until then, treat the logo as a clearly documented asset dependency. The references are mockups, not production photography or current event inventory.

Suggested handoff: unzip this folder into `design/nsvl-brand-handoff/` in the current site repository, then paste CLAUDE-CODE-PROMPT.md into Claude Code. Do not replace the repository's existing CLAUDE.md or instructions.

## Logo assets added
See logos/README.md and logos/logo-preview.html. Transparent raster reconstructions and eight consistent CSS color/layout variants are included. White PNGs are review-only due to edge artifacts. Original vector and favicon remain outstanding.
