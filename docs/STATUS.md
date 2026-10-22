# Station-route expansion — 22 October 2026

## Implemented candidate

One continuous four-section station level preserves the Lower Ward and adds the Lamp Ascent, Transfer Court and Upper Watch. Twelve encounters replace the old three-encounter endpoint; the old captain remains but no longer ends the expedition. New optional cache, transfer checkpoint and marked final exit use the existing equipment/progression systems. The surveyed collision-valid route is 818 → 3,661 projected pixels (4.47×); connected floor area and encounter count are 4×. This is not an exact playtime claim.

The monumental station gate retains a520px-wide architectural silhouette with independently opening doors, a visibly pulled lever, registered ground feet and collision that releases only when fully open. It leads into the actual expanded route. New bow lookouts have three full-plate body poses, a held/drawn bow and separate shaft/head/fletching arrows sharing a measured nock origin. F is primary keyboard attack, J retained, and both use current/last keyboard heading independently of the cursor; clicking explicitly aims an attack. Camera deadzone scrolling preserves readable knight scale.

Version-one saves migrate earned loot, upgrades, marks, cleared foes and shortcut. Version-two adds completed gate/checkpoint/finish. Partial gate animations safely restart closed after reload/retry. QA saves remain isolated via `?qa=1`.

## Verification state

- Local deterministic gameplay, migration, rig, geometry, passage/interruption, route connectivity and content metric tests are passing; final count and exact-commit CI recorded in the PR.
- Strict TypeScript and production build pass locally.
- Browser suite includes native keyboard-only heading, real gate operation/pause/reload/walkthrough, earned equipment/full-route combat/checkpoint/finish, and bow draw/release/projectile pixel capture, alongside old gameplay regressions.
- First candidate `7930369`: 38/38 rules and 21/24 browser tests passed in CI39720900811; the three new gate/route/bow scenarios died during scripted navigation. Original regressions and F/J controls passed. Heavy per-input trace recording produced a680MB evidence archive; extended tests now retain compact state and phase screenshots instead, without relaxing assertions. First in-game screenshot inspection identified threshold occlusion; conditional gate foreground fading addresses it. Second candidate `ccbc593` passed the native gate interruption/walkthrough and bow phase/damage cases; mixed-combat traversal and timing-sensitive old traced cases still failed. Suite-wide dense tracing is now disabled while explicit screenshots, read-only snapshots and native assertions remain. The full-route driver uses defensive rolls and bounded real retry with durable-progress assertions. Expanded-area camera framing now leaves more room ahead. Third candidate `153932f`: 23/24 browser cases passed, including every original regression, keyboard controls, gate interruption/traversal and bow phases/damage. The native expedition cleared seven foes and reached Transfer Court, then performed one real save-preserving death/retry before its 420-second automation budget expired. The bounded route budget is now 900 seconds with at most four deaths and new durable encounter progress required between retries; final verification remains pending. Local Chromium launch was restricted in this workspace; it is not retried or represented as a local pass. Canvas, normal requestAnimationFrame and no SwiftShader flags remain unchanged.
- This candidate is not yet merged or publicly deployed. Draft PR publication does not imply live release.

## History and scope

Last deployed corrective slice retained at `dc45e792e586a9307743b4edba23db9f873efa49` (PR5); previous monumental-gate reference at `7d6a1a2c5de0395ddbc3c8a27fda2ebf0c639de2`. Public upload, merge and deployment were explicitly authorized on 22 October 2026; publication remains gated on passing checks and visual review. No separate rollback archive is created.

All local section names, gate and adversaries are prototype adaptations. No canonical sealed-Vault revelation, true Warplate, soul resurrection or private GM material. Desktop keyboard/mouse; no audio, touch, multiplayer, account service or sprawling RPG systems.
