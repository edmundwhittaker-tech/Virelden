# Corrective slice verification — 22 October 2026

## Implemented

Same compact underworks ward and mechanics, with grounding/scale/depth corrections and visible knight attacks. Shared world-foot registrations now match solid prop collision; the vault has connected inaccessible footing; all four pillars have a consistent scale; wall blocks follow their real collision rectangles; near-black offboard and a continuous foundation replace the void ellipse. Physical weapons/projectiles/lever sort locally by ground feet; floor telegraphs stay below solids, and foreground geometry fades instead of falsely drawing the player above it.

The ordinary closed-helmet full-plate knight now has three authored attack body poses with measured hand sockets and independent sword/spear/hammer profiles. Existing walking, text feedback, combat timing, saves, pause, retry and progression remain. This is a small reusable rig, not a full skeletal animation or armor system. See `SCENE_GROUNDING.md` and `KNIGHT_ATTACK_RIG.md`.

## Verification state

- Local complete deterministic suite: **29/29** gameplay, rig and geometry tests passed; strict TypeScript and production build passed.
- Geometry tests cover prop footprint containment/collision, ground-depth tie rules and connected access to every existing interaction.
- Browser suite expanded to20 cases, including four-direction attack-phase PNG/JSON capture, earned hammer capture, and real-input foreground/back depth transition.
- Textured candidate `223f9342cb4561ad4fea1be24d93047c9340a990`: **20/20 real-input browser tests passed** in [CI39707528799](https://github.com/edmundwhittaker-tech/Virelden/actions/runs/39707528799), including all gameplay regressions, four-direction attack-phase captures and real foreground/background depth transitions. The initial spatial-test route ran into a correctly solid beacon; its route was corrected without weakening collision or assertions.
- Actual in-game screenshots confirm textured exact-geometry walls, a grounded stone vault apron, uniform pillars, and changed attack body/weapon poses. Untraced timing: **58.25 FPS**, **1.52s simulation / 1.51s wall**, sampled **1ms render / 0.3ms update**. This is a CI measurement, not a device-wide guarantee.
- This is a pre-merge evidence snapshot. A final narrow fix locks body facing to the attack aim while a swing is in progress and uses current aim for idle weapon layering; its real-pointer regression is included. Final exact-commit check and later publication are recorded in [PR #5](https://github.com/edmundwhittaker-tech/Virelden/pull/5) and the Actions run, rather than assumed here.
- Local Chromium execution remains restricted by workspace permissions. Browser execution is via GitHub Actions. Local Node24; supported CI Node22. Canvas, normal requestAnimationFrame and no SwiftShader launch flags remain unchanged.

## Release / rollback

The previous published playable slice is retained at `7d6a1a2c5de0395ddbc3c8a27fda2ebf0c639de2` (PR #4). The older courtyard remains at `94c9f7f6cd68ec5e1c93da99038964310a5e5140`. Corrective PR #5 must pass exact-commit browser verification and visual inspection before authorized merge/publication.

## Limits / canon

Desktop keyboard/mouse; no audio, touch or multiplayer. One compact prototype, no new levels or systems, no lore changes or private GM information. Ordinary plate and mundane steel only, never true Warplate. Browser-local saves; reload at checkpoint. `?qa=1` visibly selects a separate QA save without reading or erasing normal progress.
