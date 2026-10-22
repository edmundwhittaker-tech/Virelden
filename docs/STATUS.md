# Project status —22 October2026

## Playable content and candidate boundaries

The station is one continuous four-section level: Lower Ward, Lamp Ascent, Transfer Court and Upper Watch. It has twelve encounters, four caches, two checkpoints, a shortcut, a monumental operated gate and a marked final exit. This is one level, not four separate levels. Cistern Viaduct and Record Annex remain separate design prototypes; external enemy-kit art is not activated in this equipment candidate.

The gate has independently opening doors, registered lever/feet and collision that releases only when fully open. Partial opening resets closed on safe resume; fully open persists. Bow lookouts share a measured nock/projectile origin. F/J attack along the last keyboard heading independently of the pointer; clicking explicitly aims. Camera deadzone scrolling preserves knight scale.

The equipment candidate replaces the player's baked body with15 articulated metal parts, four independently swappable slots, genuine Ward/Delver assets and six registered textured weapon profiles. All four station-cache armor rewards have matching ready visuals. Poleaxe remains locked pending two-hand visual acceptance and is not a station reward. XP1–10, nine possible checkpoint training points, explicit Rest and forge upgrades are authoritative core actions. Resolve deliberately grants5defense; starter Ward damage is normalized to the previous game. Hammer deliberately uses a frontal overhead, not its old rear-reaching full circle.

Active persistence uses a v3 envelope, separate current key and one bounded previous-good fallback, validated legacy migration/write/readback, honest storage errors and protected corrupt/future-version saves. Legacy progress is read-only during migration. Existing upgrades, marks, loot, clears and durable gate/checkpoint progress are retained. See `PROGRESSION_CONTRACT.md`.

## Exact verification evidence

Draft PR8, head `6b0ce2cfc8fd0828665f1e6ffa4b70ba17df9e5c`, focused Actions run39727792941:

- **123/123** deterministic rules pass under the required Node22 runtime.
- Strict TypeScript and production build pass.
- **6/6** isolated actual-DOM equipment tests pass, including1440/900 layouts and keyboard/focus behavior.
- **24/26** focused native playable cases pass, including real slot swaps/mixed gear/reload, training/rest, busy denials, quota feedback and textured hammer/axe phase captures.
- Failure1: the old lower-captain driver stalls at20HP using its previous92–108px spear spacing. A shared latency-tested70–90px/blocked-retreat driver correction is being reused without relaxing kill/alive/save assertions.
- Failure2: a test injected storage corruption into the outgoing document, whose legitimate blur-save restored current progress before reload. Fault injection moves to the incoming document's one-use init script. Recovery notices are also retained through autosaves so they remain readable.

The downloadable evidence contains real browser screenshots/copied states; the separate build artifact identifies the tested candidate. Native Ward/Delver/mixed-source screenshots have been inspected. This is useful focused evidence, **not a full regression pass or release approval**. Revisions addressing both failures still require exact-commit rerun and screenshot inspection.

A separate contact audit confirmed that static full-sector damage can precede or miss the actual visible cut sweep near arc edges. This is a release blocker for the new weapon system: align active motion and elapsed contact coverage, retaining total damage, reach, costs, recovery, wall checks and one-hit-per-enemy rules. Centered source-art reach tests alone are insufficient. Integrated lever tracking, actual-enemy contact and final full-route/death/retry/save regressions remain required.

## Publication and regression gates

The equipment branch is a **stacked draft**, not merged or publicly deployed. Rebase onto the final stable station-route release before final regression. Its separate focused workflow has no Pages deployment path. A temporary branch-specific guard skips the ordinary full-route PR job; remove the guard and execute the full suite before merge/release. Run the separate equipment DOM suite as well. Inspect actual screenshots, not only green job summaries.

Canvas rendering, normal requestAnimationFrame and no SwiftShader flags are retained. Local Chromium launch is restricted; no local-browser pass is claimed and the restriction is not bypassed. Actual browser execution above is from GitHub Actions.

Last deployed corrective reference remains `dc45e792e586a9307743b4edba23db9f873efa49` (PR5); the earlier gate reference is `7d6a1a2c5de0395ddbc3c8a27fda2ebf0c639de2`. Preserve ordinary Git history and browser-local saves. All local names, equipment and encounters are prototype adaptations, not additions to official lore. No sealed-Vault revelation, private GM material, soul resurrection or starter true Warplate. Desktop keyboard/mouse; no audio, touch, multiplayer or account service.
