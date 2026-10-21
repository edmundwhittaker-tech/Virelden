# Status — isometric knight directions, 22 October 2026

## Implemented

Added northeast, northwest, southeast and southwest walking/idle artwork to the full-plate knight.
Separate rear and front sheets share the original armour reference; west variants mirror the east source.
The original east/west artwork remains available for horizontal movement.
Diagonal key pairs select the matching facing. Pure north/south movement selects rear/front while keeping the most recent horizontal side.
Idle retains the last facing and reset returns to east.
Changing sheets retains the walk phase.
Per-cell render registration aligns visible height, head and ground anchors across the new generated frames.
Movement speed, collision, fixed simulation and courtyard geometry remain unchanged.
See CHARACTER_ART.md for asset paths, controls, limitations and exact generation/edit prompts.

## Local verification

Node 22.22.0 with pinned repository dependencies.
- npm test: nine tests passed, including all diagonal facings, vertical fallback and idle orientation.
- npm run build: strict TypeScript and production build passed.
- npm run test:browser: eleven Chromium tests cover existing controls/collision, all four diagonal textures and mirrors, advancing frames, idle direction, and front/rear transitions without releasing movement.
- Directional screenshots were rendered and inspected.
- The three transparent sheets total 335,664 bytes and are imported through Vite with content-hashed URLs.
- The existing large Phaser chunk warning remains informational.

## Publication

Pages is enabled and the prior full-plate knight was verified live.
This change's PR runs verification before merging; main then verifies and publishes.
The final delivery reports actual CI/deployment status.
No Codespace or additional paid compute was started.

## Limits

Six facings: east/west plus the four diagonals. Exact north/south sprites are not independently authored.
West-facing lighting is mirrored. Minor generated armour and pose variations remain.
The environment remains procedural placeholder geometry. Gameplay is still courtyard movement only.
