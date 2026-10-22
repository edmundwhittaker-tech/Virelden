# Virelden — Beneath the Station

A connected **Phaser + TypeScript + Vite** action-RPG level: explore the lower ward, open its monumental station gate, and ascend through the Lamp Ascent, Transfer Court and Upper Watch. Recover equipment, improve mundane steel, open a shortcut, secure a second checkpoint and defeat the final captain.

## Play

Choose **Vanguard** (140 health, 90 stamina, sword) or **Wayfarer** (100 health, 130 stamina, spear). Both share the existing ordinary full-plate knight artwork, closed helmet and no cloth. Neither wears true Warplate.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Screen-relative movement and facing |
| F / J | Attack in current or last keyboard movement direction; no mouse needed |
| Left click | Aim and attack toward the cursor |
| Space | Roll in movement direction, or current facing when still |
| E | Open cache, rest, use forge, open shortcut, pull station-gate lever, secure exit |
| I | Equipment, comparison and upgrades |
| H | Controls and survival guide |
| Escape | Pause / resume |

The sword sweeps broadly, the spear thrusts farther in a narrow cone, and the slow hammer staggers. Watch enemy windups and allow stamina to recover. Rolls briefly avoid damage but cost stamina and have recovery. Four equipment caches reward side exploration. The forge near the starting checkpoint upgrades equipped weapons to +1 (30 marks) and +2 (60 marks).

Equipment, upgrades, earned marks, cleared foes, opened caches, fully opened station gate, checkpoint and the shortcut persist through death and reload. A reload starts safely at the checkpoint, not mid-fight. An interrupted lever pull or partially opened gate resets closed; a fully opened gate stays open. Version-one saves migrate without losing earned equipment or upgrades, and the new route remains available after the old captain is defeated. Living enemies reset on retry. Rest heals but does not revive cleared enemies. Menus and lost browser focus pause play. **Pause → Reset saved progress** requires confirmation and permits trying the other loadout. Saves are local to this browser; no account or server sync.

The four section names, ward and adversaries are explicitly prototype adaptations, not additions to official campaign canon. Public Plate-station and monumental Imperial architecture guide the environment. No private GM content is included.

## Develop in a browser

1. Open this repository on GitHub.
2. **Code → Codespaces → Create codespace on main** (or choose the feature branch being reviewed).
3. Run `npm run dev`, then open forwarded port **5173**.
4. Commit changes and stop the Codespace when done. Codespaces may incur costs beyond included allowance; this project does not start one automatically.

For local development, use Node **22.12+ in the 22.x line** and clone the repository:

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run preview
```

`npm run check` runs rule tests and production build. Browser tests separately exercise actual keyboard/browser flows. Debug snapshots are read-only and opt-in at `?debug=1`; there is no gameplay mutation API.

## Architecture

- `src/core/game.ts` — original movement, collision, isometric projection
- `src/core/adventure.ts` — deterministic combat, AI, exploration collision, equipment, progress validation
- `src/game/CourtyardScene.ts` — fixed-step integration, buffered actions, DOM menus and saves
- `src/game/WorldView.ts` — depth-sorted environment and procedural combat feedback
- `src/game/KnightSprite.ts` — six-facing idle/walk art, three-pose attack body and hand-attached weapon profiles
- `tests/` — deterministic movement/combat/progression tests
- `browser-tests/` — real-browser inputs and UI regression checks
- `docs/STATUS.md` — exact verification and publication status

## Publication and scope

Expected Pages URL: https://edmundwhittaker-tech.github.io/Virelden/

Pull requests run verification only. Main pushes verify and can publish through GitHub Actions when Pages is configured. Do not confuse a local build or draft PR with deployment. The prior courtyard remains in Git history at `94c9f7f`.

Desktop keyboard/mouse first; no multiplayer or touch controls. This isolated QA candidate has an optional, muted-by-default sound-texture experiment in Controls; see docs/SOUND_EXPERIMENT.md for scope and unrun acceptance gates. Enemy bodies reuse the knight art with distinct labels and ground markers, not bespoke enemy sprites. Attacks use a small authored three-pose body rig with separate hand-attached weapon profiles; rolling transforms and floor telegraphs remain procedural. See `docs/CHARACTER_ART.md` for original artwork details.

Live QA may use `?qa=1&debug=1` for a clearly labelled separate local save. It has identical gameplay and cannot read or erase the normal expedition.
