# Status — playable underworks slice, 22 October 2026

## Implemented

Two ordinary full-plate starter loadouts; sword sweep, spear thrust, hammer impact; windup/active/recovery phases; health, stamina and timed dodge invulnerability; melee raider, ranged lookout and tougher captain. Partitioned exploration with three equipment caches, a physical shortcut gate, equipment comparison, +1/+2 forge upgrades, checkpoint/death/retry, local validated progress save, help/pause and confirmed reset. Existing six-direction knight art retained. Enemy bodies reuse knight art with distinct ground markers; combat effects/roll transformations are procedural, not new animation sheets.

Nine original generated environment assets now dress the court: weathered slate, mud, rubble, low walls, monumental piers and vault, coffers, forge and lanterns. Foreground stone fades around the player and living enemies; contact-sheet and in-game visual reviews have been performed. Final prop-pass CI capture remains pending.

## Verification so far

- Pinned dependencies installed using `npm ci` (workspace cache).
- Local `npm test`: 23/23 passed.
- Local `npm run build`: strict TypeScript and production build passed.
- Seventeen real-input browser cases authored and parse; local execution blocked by sandbox browser launch permissions. Earlier CI proved actual loot/equip/+1/reload and enemy damage/death/retry. Current CI adds real raider/captain victories, full +2/shortcut progression, short taps and simulation-time diagnostics; final results pending.
- Independent source QA found and prompted fixes for start/reset saving, paused focus, warning cone accuracy, equipped weapon silhouette and enemy movement animation.
- Local runtime is Node 24.19; project/CI uses Node 22. Local compatibility warning disclosed; CI is the supported-runtime check.
- Phaser's existing large-chunk build warning remains informational.

## Publication

Branch/draft PR only. Publication authorized after checks pass; no merge or deployment performed yet for this slice. Prior courtyard at main `94c9f7f` remains untouched. Final status must be updated after CI and rendered visual review.

## Limits

Desktop keyboard/mouse; no audio/touch/multiplayer. Small bounded prototype, not a large RPG. Only mundane steel upgrades, no true Warplate. Specific ward, enemies and game rules are prototype adaptations, not official campaign canon. Defeated foes stay defeated; reset begins a fresh expedition.
