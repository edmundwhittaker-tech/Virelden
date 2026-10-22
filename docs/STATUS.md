# Station-route expansion — 22 October 2026

## Implemented candidate

One continuous four-section station level preserves the Lower Ward and adds the Lamp Ascent, Transfer Court and Upper Watch. Twelve encounters replace the old three-encounter endpoint; the old captain remains but no longer ends the expedition. New optional cache, transfer checkpoint and marked final exit use the existing equipment/progression systems. The surveyed collision-valid route is 818 → 3,661 projected pixels (4.47×); connected floor area and encounter count are 4×. This is not an exact playtime claim.

The monumental station gate retains a520px-wide architectural silhouette with independently opening doors, a visibly pulled lever, registered ground feet and collision that releases only when fully open. It leads into the actual expanded route. New bow lookouts have three full-plate body poses, a held/drawn bow and separate shaft/head/fletching arrows sharing a measured nock origin. F is primary keyboard attack, J retained, and both use current/last keyboard heading independently of the cursor; clicking explicitly aims an attack. Camera deadzone scrolling preserves readable knight scale.

Version-one saves migrate earned loot, upgrades, marks, cleared foes and shortcut. Version-two adds completed gate/checkpoint/finish. Partial gate animations safely restart closed after reload/retry. QA saves remain isolated via `?qa=1`.

## Verification state

- Local deterministic gameplay, migration, rig, geometry, passage/interruption, route connectivity and content metric tests are passing; final count and exact-commit CI recorded in the PR.
- Strict TypeScript and production build pass locally.
- Browser suite includes native keyboard-only heading, real gate operation/pause/reload/walkthrough, earned equipment/full-route combat/checkpoint/finish, and bow draw/release/projectile pixel capture, alongside old gameplay regressions.
- Native browser evidence includes explicit screenshots and compact state, not expensive per-input tracing. The complete expedition has a 900-second automation budget, at most four real deaths, and requires new durable encounter progress between retries. Native actions retain earned equipment and cleared encounters; no health or save injection substitutes for traversal.
- The exact candidate results, intermediate failures, final route timing/death count, screenshot review and publication status are recorded in [PR6](https://github.com/edmundwhittaker-tech/Virelden/pull/6). A passing local build or draft PR is not a claim that the public game has been updated.
- Local Chromium launch was restricted in this workspace; it is not retried or represented as a local pass. GitHub Actions executes the actual browser using Canvas, normal requestAnimationFrame and no SwiftShader flags. Publication requires the full exact-commit suite and visual review to pass, followed by the main-branch Pages job.

## History and scope

Last deployed corrective slice retained at `dc45e792e586a9307743b4edba23db9f873efa49` (PR5); previous monumental-gate reference at `7d6a1a2c5de0395ddbc3c8a27fda2ebf0c639de2`. Public upload, merge and deployment were explicitly authorized on 22 October 2026; publication remains gated on passing checks and visual review. No separate rollback archive is created.

All local section names, gate and adversaries are prototype adaptations. No canonical sealed-Vault revelation, true Warplate, soul resurrection or private GM material. Desktop keyboard/mouse; no audio, touch, multiplayer, account service or sprawling RPG systems.
