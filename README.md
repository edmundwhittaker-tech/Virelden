# Virelden — Beneath the Station

A connected **Phaser + TypeScript + Vite** action RPG with **three expeditions**: the station (Lower Ward, Lamp Ascent, Transfer Court and Upper Watch), Cistern Viaduct and Record Annex. Open the monumental station gate, defeat the Upper Watch captain, then take the eastern service stair onward. Explore guarded finds, operate shortcuts and physically walk back to the station forge. The full route has **24 foes and 1,620 XP**, enough to reach level 10.

## Play

Choose **Vanguard** (140 health, 90 stamina, sword) or **Wayfarer** (100 health, 130 stamina, spear). Both start in ordinary Ward full plate with a closed helmet and no cloth. Neither wears true Warplate. Ward, Delver and Marcher offer twelve mixable pieces across helmet, chest, gauntlets and legs.

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

Find and equip **sword, spear, hammer, axe, falchion and poleaxe**. The sword sweeps broadly, the spear thrusts farther in a narrow cone, and the slow hammer staggers. The guarded main-route annex coffer provides the poleaxe before the final keeper. Watch enemy windups and allow stamina to recover. Rolls briefly avoid damage but cost stamina and have recovery. Station caches and later guarded finds reward exploration. Train earned attribute points at checkpoints; the forge near the starting checkpoint upgrades equipped weapons to +1 (30 marks) and +2 (60 marks).

Equipment, upgrades, marks, XP and training are shared across areas; cleared foes, looted finds, checkpoints, shortcuts and objectives persist per area through death and reload. A reload starts safely at the active checkpoint, not mid-fight. Interrupted mechanisms reset closed; fully opened mechanisms stay open. Save v4 preserves full valid v3 progress, with older v3/v1 keys kept read-only. Living enemies reset on retry or area re-entry; cleared enemies stay defeated. Rest heals. Menus and lost browser focus pause play. **Pause → Reset saved progress** requires confirmation and permits trying the other loadout. Saves are local to this browser; no account or server sync. See [Connected expeditions](docs/CONNECTED_EXPEDITIONS.md) for route and persistence details.

The expedition names, places, equipment and adversaries are explicitly prototype adaptations, not additions to official campaign canon. Public Plate-station and monumental Imperial architecture guide the environment. No private GM content is included.

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
- `src/game/ModularKnightSprite.ts` / `src/core/modularRig.ts` — 15-part modular 2D full-plate player body, mixable armour and hand-attached weapons
- `src/game/KnightSprite.ts` / `src/game/ArcherView.ts` — prototype human enemy artwork
- `src/core/expeditionCatalog.ts` / `src/game/ExpeditionWorldView.ts` — connected-area content, geometry and rendering
- `tests/` — deterministic movement/combat/progression tests
- `browser-tests/` — real-browser inputs and UI regression checks
- `docs/STATUS.md` — exact verification and publication status

## Publication and scope

**Play the released game:** https://edmundwhittaker-tech.github.io/Virelden/

The verified published release is main `a932dc5`. See [Project status](docs/STATUS.md) for release evidence and its limits.

Pull requests run verification only. Main pushes verify and can publish through GitHub Actions when Pages is configured. Do not confuse a local build or draft PR with deployment. Earlier working versions, including station release `f080674` and courtyard `94c9f7f`, remain in ordinary Git history for rollback.

Desktop keyboard/mouse first; the published game has **no audio**, multiplayer or touch controls. The player uses a 15-part modular **2D** body, not a 3D rig, with hand-attached weapon artwork. This release leaves the current walk unchanged. Human raider, bow and captain artwork remains prototype art with distinct labels and ground markers; no skeleton, headless or giant assets are active. Floor telegraphs and combat feedback remain procedural.

Live QA may use `?qa=1&debug=1` for a clearly labelled separate local save. It has identical gameplay and cannot read or erase the normal expedition.
