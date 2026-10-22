# Controlled gait comparison — QA branch only

Based on exact PR8 commit `36e19fdae0c63b5191aadeb86f0e06310dfee40b`. All gameplay/core/combat files are preserved. No gameplay default, Pages deployment or main merge is part of this branch.

`worldGait.ts` is a pure world-space support-foot planner. `experimentalPose.ts` applies it non-mutatingly to the CURRENT base pose and returns attack/roll/interact unchanged. It must not replace the current combat helper. Walking-to-attack/roll/lever transitions remain a future integration gate, not a claim made here.

`/gait.html` compares the unchanged time-only walk against the candidate on the current textured court, using the current textured weapon adapter. Both travel at exactly 150 projected px/s. Actual 88 px figures are above; 3× figures below. Routes include east/NE/SE starts/stops and 90°/180° turns. Ward/Delver use the same body pivots. No raw art or videos are added to Git.

The fixture-only renderer snapshot adds pose injection, viewport masking and actual Phaser transform-matrix queries. It imports the current game manifests and weapon adapter; it is NOT a replacement for the gameplay renderer.

## Checks

- `npm run test:gait`: 12 pure experiment tests, including all eight directions, both views/mirrors, 90/150/180 px/s, 30/60/120 fps, pause, immutability and attack/roll/interaction bypass.
- `npm test` / `npm run build`: unchanged game baseline plus separate fixture build.
- `npm run test:gait:browser`: four focused Playwright routes. Screenshots, continuous-route videos and rendered-foot/transition JSON go to CI artifacts, not Git.

The browser test records actual Phaser image matrices, converts rendered ankles/joints/crown back to world pixels, and compares them with the planner. It reports supported-foot drift, exact rendered ankle agreement, crown-height changes and largest joint jumps (including view switches). Numerical constraints are not final visual acceptance.

Known visual review concerns: the rear knee IK branch differs from the frozen idle helper, NE uses a shorter/faster step pattern, and abrupt view changes need human inspection. Swing lift is 1.8 px and preferred crouch 2.5 px. Gameplay remains on its existing helper until the browser evidence is accepted.

Local Chromium is blocked by the environment; no local browser retry/bypass is attempted. Focused Actions uses its supported Chromium environment. Parent has statically accepted the candidate only for this controlled comparison.

Phaser uses Float32 screen matrices: their subpixel rounding is amplified when divided by frame time. CPU support drift must remain exactly zero; actual rendered support is bounded by 0.0005 world px per sampled frame and 0.02 px/s, with raw measurements retained before assertions. This is a numerical precision allowance, not a visual sliding allowance.
