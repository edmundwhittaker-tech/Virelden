# Status — full-plate knight, 22 October 2026

## Implemented

The courtyard now uses generated raster character art instead of the geometric placeholder.
One closed-helmet knight wears complete articulated metal plate with no cloth.
Standing pose plus a six-frame rightward walk; leftward movement mirrors the same design.
Feet remain attached to the ground position, with a separate ground shadow and existing pillar depth sorting.
Render frames between fixed simulation steps preserve the current walk state, preventing idle flashes on displays faster than the 60 Hz simulation.
Reset returns the knight to the centre, standing and facing right.

The source artwork was generated with the built-in image tool, then resized/encoded for delivery.
The transparent atlas is 95 KB. Vite imports it with a content-hashed URL so the new art is included in production builds.
See CHARACTER_ART.md for the asset path, atlas layout, limitations and exact generation prompt.

## Local verification

Node 22.22.0 with the repository's pinned dependencies.
- npm test: five movement/collision tests passed.
- npm run build: strict TypeScript check and production build passed.
- npm run test:browser: six Chromium tests passed.
- The added test confirms the real texture loads, frames advance while walking, left/right orientation changes, and stopping returns to idle.
- Existing movement, bounds, focus cleanup, reset and viewport checks pass.
- Desktop, left-facing and right-facing screenshots were visually inspected.
- Vite reports the existing large Phaser chunk warning; the build succeeds.

## Publication

GitHub Pages is enabled for Actions. The preceding courtyard build was verified live at https://edmundwhittaker-tech.github.io/Virelden/.
The verification workflow tests this art change before merging; main then runs verification and publication.
See the PR and final delivery for this change's actual CI/deployment result.
No Codespace or additional paid compute was started.

## Limits

Two horizontal sprite facings only; vertical movement keeps the most recent horizontal facing.
Small frame-to-frame art variations remain in this first animation proof.
The environment remains procedural placeholder geometry. Gameplay is still courtyard movement only.
