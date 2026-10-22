# Corrective slice verification — 22 October 2026

## Implemented

Same compact underworks ward and mechanics, with grounding/scale/depth corrections and visible knight attacks. Shared world-foot registrations now match solid prop collision; the vault has connected inaccessible footing; all four pillars have a consistent scale; wall blocks follow their real collision rectangles; near-black offboard and a continuous foundation replace the void ellipse. Physical weapons/projectiles/lever sort locally by ground feet; floor telegraphs stay below solids, and foreground geometry fades instead of falsely drawing the player above it.

The ordinary closed-helmet full-plate knight now has three authored attack body poses with measured hand sockets and independent sword/spear/hammer profiles. Existing walking, text feedback, combat timing, saves, pause, retry and progression remain. This is a small reusable rig, not a full skeletal animation or armor system. See `SCENE_GROUNDING.md` and `KNIGHT_ATTACK_RIG.md`.

## Verification state

- Local complete deterministic suite: **29/29** gameplay, rig and geometry tests passed; strict TypeScript and production build passed.
- Geometry tests cover prop footprint containment/collision, ground-depth tie rules and connected access to every existing interaction.
- Browser suite expanded to20 cases, including four-direction attack-phase PNG/JSON capture, earned hammer capture, and real-input foreground/back depth transition.
- First candidate `311ebeb7df701bda34206a2dbfc1ed4a668a2561`: **19/20 browser tests passed**, including all prior gameplay tests and four-direction attack captures. The new spatial test hit the newly solid beacon instead of walking around it; its route has been corrected without weakening collision or assertions. Final-candidate rerun and publication remain **pending**.
- Actual first-candidate in-game screenshots confirm grounded props and changed attack body/weapon poses. Untraced timing: **57.5 FPS**, **1.52s simulation / 1.51s wall**, sampled **1ms render / 0.2ms update**. This is a CI measurement, not a device-wide guarantee.
- Local Chromium execution remains restricted by workspace permissions. Browser execution is via GitHub Actions. Local Node24; supported CI Node22. Canvas, normal requestAnimationFrame and no SwiftShader launch flags remain unchanged.

## Release / rollback

The currently published previous playable slice is retained at `7d6a1a2c5de0395ddbc3c8a27fda2ebf0c639de2` (PR #4). The older courtyard remains at `94c9f7f6cd68ec5e1c93da99038964310a5e5140`. Corrective PR #5 must pass exact-commit browser verification and visual inspection before authorized merge/publication.

## Limits / canon

Desktop keyboard/mouse; no audio, touch or multiplayer. One compact prototype, no new levels or systems, no lore changes or private GM information. Ordinary plate and mundane steel only, never true Warplate. Browser-local saves; reload at checkpoint. `?qa=1` visibly selects a separate QA save without reading or erasing normal progress.
