# Virelden — Beneath the Station

A compact **Phaser + TypeScript + Vite** action-RPG slice: explore an underworks ward, recover equipment, improve mundane steel, open a shortcut and defeat an armoured captain.

## Play

Choose **Vanguard** (140 health, 90 stamina, sword) or **Wayfarer** (100 health, 130 stamina, spear). Both share the existing ordinary full-plate knight artwork, closed helmet and no cloth. Neither wears true Warplate.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Screen-relative movement and facing |
| J / left click | Attack; mouse aims, movement sets facing |
| Space | Roll in movement direction, or current facing when still |
| E | Open cache, rest, use forge, open shortcut |
| I | Equipment, comparison and upgrades |
| H | Controls and survival guide |
| Escape | Pause / resume |

The sword sweeps broadly, the spear thrusts farther in a narrow cone, and the slow hammer staggers. Watch enemy windups and allow stamina to recover. Rolls briefly avoid damage but cost stamina and have recovery. Three equipment caches reward side exploration. The forge near the starting checkpoint upgrades equipped weapons to +1 (30 marks) and +2 (60 marks).

Equipment, upgrades, earned marks, cleared foes, opened caches and the shortcut persist through death and reload. A reload starts safely at the checkpoint, not mid-fight. Living enemies reset on retry. Rest heals but does not revive cleared enemies. Menus and lost browser focus pause play. **Pause → Reset saved progress** requires confirmation and permits trying the other loadout. Saves are local to this browser; no account or server sync.

The ward and adversaries are explicitly prototype adaptations, not additions to official campaign canon. Public Plate-station and monumental Imperial architecture guide the environment. No private GM content is included.

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
- `src/game/KnightSprite.ts` — preserved generated six-facing idle/walk art
- `tests/` — deterministic movement/combat/progression tests
- `browser-tests/` — real-browser inputs and UI regression checks
- `docs/STATUS.md` — exact verification and publication status

## Publication and scope

Expected Pages URL: https://edmundwhittaker-tech.github.io/Virelden/

Pull requests run verification only. Main pushes verify and can publish through GitHub Actions when Pages is configured. Do not confuse a local build or draft PR with deployment. The prior courtyard remains in Git history at `94c9f7f`.

Desktop keyboard/mouse first; no audio, multiplayer or touch controls. Enemy bodies reuse the knight art with distinct labels and ground markers, not bespoke enemy sprites. Attack effects and rolling transforms are procedural treatments of existing idle/walk sheets. See `docs/CHARACTER_ART.md` for original artwork details.
