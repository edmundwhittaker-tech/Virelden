# Status — basic courtyard, 22 October 2026

## Implemented

The owner's latest request replaces the broader combat prototype with a deliberately basic starting point:
one isometric stone courtyard, four solid pillars and one movable placeholder knight.
WASD/arrows move relative to the screen at a normalized speed; fixed simulation and collision substeps keep movement stable.
The reset button returns the character to the centre. Losing window focus or hiding the tab releases movement keys.
The page scales to its viewport; keyboard controls are required.
Dependencies are pinned and package-lock.json is committed. Codespaces installs with npm ci.
The previous prototype remains recoverable in Git history.

## Verification for this change

- Node 22.22.0, TypeScript 5.9.3, Phaser 3.90.0 and Vite 7.3.7.
- npm test: all five movement/collision tests passed.
- npm run build: strict TypeScript check and production build passed.
- npm run test:browser: all five Chromium tests passed against the production build.
- Browser checks cover boot without page errors, WASD/arrows, reset, opposing keys, focus cleanup, courtyard bounds and opt-in debug state.
- Desktop 1440×1000 and small 390×844 screenshots were rendered and visually inspected.
- Vite reports its normal large-chunk warning for Phaser; it does not prevent the build.
- GitHub CI is configured to repeat these checks; inspect the linked PR/Actions run for its current result.

## Preview / publication

Codespaces configuration is ready; this change does not start cloud compute.
At inspection, the preceding main workflow skipped actual Pages deployment because Pages was not configured for Actions.
The GitHub connector exposes repository writes but not the Pages administration setting.
To enable a permanent playable link, set Settings → Pages → Source to GitHub Actions, then run Verify and publish on main.
Do not describe the expected Pages URL as live before deployment succeeds.

## Limits and next step

Procedural placeholder art; fixed 2D isometric view; desktop keyboard controls.
No combat, enemies, saving, audio, inventory, touch controls, multiplayer or private lore.
Have Edmund try movement before adding any new systems.
