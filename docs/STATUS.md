# Release verification snapshot — 22 October 2026, 00:51 UTC

## Implemented

Two ordinary full-plate starter loadouts; sword sweep, spear thrust, hammer impact; windup/active/recovery phases; health, stamina and timed dodge invulnerability; melee raider, ranged lookout and tougher captain. Connected exploration with three equipment caches, a physical shortcut gate, equipment comparison, +1/+2 forge upgrades, checkpoint/death/retry, validated local progress saving, help/pause and confirmed reset.

Existing six-direction knight art is retained and shared by both loadouts and enemies. Distinct ground markers aid identification. Weapon effects and roll transformations are procedural, not bespoke attack animation sheets. Nine original generated environment assets provide weathered slate, mud, rubble, low walls, monumental piers/vault, coffers, forge and lanterns. Foreground stone fades around the player and living enemies. Actual in-game screenshots, not only contact sheets, were inspected.

## Verified

- Local and supported Node 22 CI: **23/23 deterministic gameplay tests**, strict TypeScript and production build passed.
- **17/17 real-input Chromium browser tests passed** on `e0641c862a69b67f612e8f9235fbc9e731ea7421`: movement/diagonal art, short taps, attack/roll, pause/focus, reset, QA save isolation, loot once, equip/compare, earned +1/+2 and cap, all caches, physical shortcut, death/retry, raider victory, spear-spacing captain victory/completion and reload persistence. Tests use normal keyboard/mouse controls and read-only snapshots, not injected game state or currency.
- [Green CI run and downloadable screenshots](https://github.com/edmundwhittaker-tech/Virelden/actions/runs/39701842367). Evidence includes desktop/small viewport, actual earned upgrades, full progression, death and captain victory.
- Untraced foreground diagnostic: **1.50 s simulation / 1.51 s wall time**, approximately **58 FPS**, sampled **0.1 ms scene update / 0.2 ms render**. This is one software-2D CI measurement, not a guarantee for every device. The full functional tests also passed with tracing enabled.
- Removed the old software-WebGL launch flags for Canvas CI. Normal requestAnimationFrame scheduling is retained; the unsuccessful forced-timer experiment was reverted. The game sleeps when hidden/unfocused, pauses safely, buffers brief movement taps and avoids rewriting unchanged HUD content.
- Local browser launch is restricted by workspace permissions; browser execution above was performed in GitHub Actions, not claimed as local play. Local Node is 24.19; supported CI Node is 22. Phaser's existing large-chunk warning remains informational.

## Release / rollback

At this **pre-merge snapshot**, publication was approved and PR #4 was being finalized; deployment had not yet been verified. The existing main pipeline verifies the exact main commit before publishing. Consult [current deployment/check status](https://github.com/edmundwhittaker-tech/Virelden/actions) and the [playable site](https://edmundwhittaker-tech.github.io/Virelden/) for the subsequent release.

The previous courtyard remains recoverable at `94c9f7f6cd68ec5e1c93da99038964310a5e5140`. Reverting the release through a branch/PR and the same verification pipeline restores it without deleting history.

## Limits / canon

Desktop keyboard/mouse; no audio, touch or multiplayer. One compact prototype, not a large RPG. Ordinary plate and mundane steel upgrades only, never true Warplate. Specific ward, enemy names and mechanics are prototype adaptations, not official campaign canon. Cleared foes remain defeated; reset starts a fresh expedition. Saves are browser-local and reload at the checkpoint. `?qa=1` visibly selects a separate QA save with identical mechanics, so live testing cannot erase normal progress.
