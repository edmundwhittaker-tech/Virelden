# Station-route expansion — 22 October 2026

## Implemented candidate

One continuous four-section station level preserves the Lower Ward and adds the Lamp Ascent, Transfer Court and Upper Watch. Twelve encounters replace the old three-encounter endpoint; the old captain remains but no longer ends the expedition. New optional cache, transfer checkpoint and marked final exit use the existing equipment/progression systems. The surveyed collision-valid route is 818 → 3,661 projected pixels (4.47×); connected floor area and encounter count are 4×. This is not an exact playtime claim.

The monumental station gate retains a520px-wide architectural silhouette with independently opening doors, a visibly pulled lever, registered ground feet and collision that releases only when fully open. It leads into the actual expanded route. New bow lookouts have three full-plate body poses, a held/drawn bow and separate shaft/head/fletching arrows sharing a measured nock origin. F is primary keyboard attack, J retained, and both use current/last keyboard heading independently of the cursor; clicking explicitly aims an attack. Camera deadzone scrolling preserves readable knight scale.

Version-one saves migrate earned loot, upgrades, marks, cleared foes and shortcut. Version-two adds completed gate/checkpoint/finish. Partial gate animations safely restart closed after reload/retry. QA saves remain isolated via `?qa=1`.

## Verification state

- Local deterministic gameplay, migration, rig, geometry, passage/interruption, route connectivity and content metric tests are passing; final count and exact-commit CI recorded in the PR.
- Strict TypeScript and production build pass locally.
- Browser suite includes native keyboard-only heading, real gate operation/pause/reload/walkthrough, earned equipment/full-route combat/checkpoint/finish, and bow draw/release/projectile pixel capture, alongside old gameplay regressions.
- First candidate `7930369`: 38/38 rules and 21/24 browser tests passed in CI39720900811; the three new gate/route/bow scenarios died during scripted navigation. Original regressions and F/J controls passed. Heavy per-input trace recording produced a680MB evidence archive; extended tests now retain compact state and phase screenshots instead, without relaxing assertions. First in-game screenshot inspection identified threshold occlusion; conditional gate foreground fading addresses it. Second candidate `ccbc593` passed the native gate interruption/walkthrough and bow phase/damage cases; mixed-combat traversal and timing-sensitive old traced cases still failed. Suite-wide dense tracing is now disabled while explicit screenshots, read-only snapshots and native assertions remain. The full-route driver uses defensive rolls and bounded real retry with durable-progress assertions. Expanded-area camera framing now leaves more room ahead. Final candidate browser verification remains pending. Local Chromium launch was restricted in this workspace; it is not retried or represented as a local pass. Canvas, normal requestAnimationFrame and no SwiftShader flags remain unchanged.
- This candidate is not yet merged or publicly deployed. Draft PR publication does not imply live release.

## Rollback and scope

Last deployed corrective slice retained at `dc45e792e586a9307743b4edba23db9f873efa49` (PR5); previous monumental-gate reference at `7d6a1a2c5de0395ddbc3c8a27fda2ebf0c639de2`. This new PR requires specific publication authorization before merge/main deployment.

All local section names, gate and adversaries are prototype adaptations. No canonical sealed-Vault revelation, true Warplate, soul resurrection or private GM material. Desktop keyboard/mouse; no audio, touch, multiplayer, account service or sprawling RPG systems.

## Next-stage local equipment integration — not published

Separate integration worktree based on station candidate `153932f`; rebase onto final stable station merge remains required. Isolated core `70ac4db`, UI `e8261c0` and selected art/runtime paths from separate rig commit `7761491` are integrated locally. The player is now a genuine15-part articulated ordinary-plate renderer (no baked body under a changed helmet), with controlled four-slot equipment/training UI, catalog-driven attack phase/shape/stagger, XP1–10, checkpoint allocation and explicit rest. New save path uses a v3 envelope, separate current key, one bounded previous-good fallback, legacy read-only migration, validated write/readback and corruption/reset safeguards. Resolve deliberately grants5defense per point; starter Ward incoming damage is normalized to the prior game. Hammer is deliberately forward-only instead of its prior rear-reaching full circle.

Current local evidence:123 deterministic tests passing; strict TypeScript and production build passing. Local runtime is Node24.19 (repository targets22.x); exact-node22 CI remains required. Normal browser suite24 and isolated equipment DOM suite6 successfully parse/list, but **neither has run for this integration**. Existing local Chromium socket restriction is respected. Art contact sheets validate source anatomy/reach, not browser gameplay.

Release blockers remain: inspect full earnable Delver artwork and textured weapons in actual gameplay, inspect the integrated physical modular lever reach, execute the adapted browser selectors/texture expectations for the real new component/rig, inspect actual-game art/contact screenshots and perform the full real-input save/equipment/training regressions. Poleaxe remains locked until full two-hand visual acceptance. No new areas or external enemy art are activated in this first next-stage milestone. No next-stage branch publication, merge or deployment has occurred.

The temporary `feature/equipment-campaign-integration` draft branch runs a separately named focused Actions workflow and deliberately skips the ordinary full-route PR job. This is not merge/release eligibility; remove that temporary branch guard and run the final full suite after rebasing the stable station release. The workflow has no Pages deployment path.

Full Delver assets and six textured weapon sprites are now imported. All four station-cache armor rewards have real loaded render descriptors; no unavailable armor drop is required for this focused candidate. Seven new real-input QA-storage fixture tests cover independent slot swaps/mixed sets/reload, exact training/no implicit heal, busy denials, corrupt fallback/reset protection, quota failures and hammer/axe four-direction phase captures. Browser discovery passes; execution remains pending the focused Actions run.
