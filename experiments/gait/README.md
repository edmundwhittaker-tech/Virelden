# Controlled gait comparison — QA branch only

Based on exact PR8 commit `36e19fdae0c63b5191aadeb86f0e06310dfee40b`. Gameplay/core/combat files are preserved. No gameplay default, Pages deployment or main merge is part of this branch.

## Current posture experiment

The original full-stance foot planner was rejected visually: diagonal ground stride can bring the ankle too close to the hip, making a fixed 18px thigh + 20px shin fold horizontally even while ankle reach tests pass.

`projectedPosture.ts` is a foot-policy-only correction. It preserves the reference body, cadence, arms, hand sockets and weapon angle. Actual IK must keep the thigh descending at least 10px, shin at least 11px and ankle at least 28px below its hip. No bone is stretched and body scale is unchanged. The east route remains the unchanged control.

A contact that cannot retain this posture is released rather than slid. Both feet can be unplanted during a run-like transfer; this is reported, not counted as supported-foot anchoring. `contacts[].planted` and `epoch` identify actual continuous contacts, and `nearId` maps physical foot identity to the current art side. The original planner's `supportId` is cadence metadata, not authoritative contact information.

The corrected posture candidate is **not accepted for gameplay**. Its diagonal flight fraction and overall motion still require visual review. `worldGait.ts` supplies the reference schedule/body, and `experimentalPose.ts` applies locomotion non-mutatingly. Attack/roll/interact remain untouched. Walking-to-combat/roll/lever transitions are a separate untested integration gate.

## Fixture and checks

`/gait.html` compares the unchanged game walk against the candidate on the textured court with the current textured weapon adapter. Both use the same 150 projected px/s simulation velocity. Nominal 88px figures are above, 3× figures below. Routes cover east/NE/SE starts/stops and 90°/180° turns. Ward/Delver share body pivots. Green markers mean planted contacts; amber markers mean free feet. No raw art or videos are added to Git.

The fixture-only renderer adds pose injection, viewport masking and actual Phaser transform-matrix queries. It imports current game manifests and weapon geometry; it is not a gameplay-renderer replacement.

- `npm run test:gait`: 15 pure tests. These include all eight directions, both art views/mirrors, 90/150/180 px/s, 30/60/120fps, actual rendered-leg geometry, unchanged upper body/east control, planted-contact invariance, pause/immutability and combat/roll/interaction bypass.
- `npm test`: 133 preserved gameplay tests.
- `npm run build`: game plus separate fixture build.
- `npm run test:gait:browser`: four focused Playwright routes, including posture bounds measured from actual Phaser image matrices. Screenshots, native continuous-route videos and raw contact/joint/transition JSON are CI artifacts, not Git.

[Prior capture validation](https://github.com/edmundwhittaker-tech/Virelden/actions/runs/39736535694) passed four browser routes, the original 12 experiment tests, 133 gameplay tests and build, before this posture correction. Current corrected-posture browser validation remains pending.

Each `*-continuous-native.webm` records the complete route directly from the 1200×820 canvas at requested 30fps, preserving nominal 88px and 3× scale. Recording waits for simulation time 4 and holds the endpoint rather than wrapping. Capture dimensions, codec and elapsed wall time are retained in JSON; full-page PNGs provide context without a duplicate encoder. Capture can reduce CI rendering throughput; this fixture is not a game-performance benchmark.

Phaser Float32 matrix rounding is amplified when divided by frame time. CPU drift during a continuous planted contact must remain exactly zero; actual rendered contact drift is bounded by 0.0005 world px per sampled frame and 0.02px/s. Raw measurements are retained before assertions. This is a numerical allowance, not visual motion acceptance. Front/rear view changes and final idle settling remain review items.
