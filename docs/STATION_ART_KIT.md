# Station gate and archer art kit

This is an ordinary station gate, not a forbidden canonical Vault. The visual reference is reused for severe human Gothic architecture only.

## Gate contract
`StationGateView.preload(scene)`, `new StationGateView(scene)`, `.draw(adventure)`, `.snapshot()`.
Architecture remains **520 px wide** at constant scale. Ground point is `project(STATION_GATE)` registered to source `(472,776)` on the 960px image. Real alpha aperture exposes continuous world floor. Left/right etched steel leaves translate independently along `(±115,±58)` and disappear into masonry pockets using a fixed aperture mask; the building never shrinks. Geometry mask and frame share the same anchor. Frame depth is foot ground y; leaves just behind. Lever grip is `project(lever)+(-13+23t,-43+13t)`, `t=1-interactionTimer/.8`.

`KnightSprite.drawLeverPull(position,facing,t)` uses the existing reach body pose, exact world feet, and a layered steel forearm/gauntlet connecting to that grip. Caller may align the actor to operating stance once at interaction start; no ongoing foot sliding.

## Archer contract
`ArcherView.preload(scene)`, `new ArcherView(scene)`, `.draw(enemy,walking)`, `.effects(...)`, `.snapshot()`.
Three generated **unarmed** full-plate body poses keep closed helmets and no cloth. Bow is a separate code-native weapon, matching existing swap-able vector weapons. Arrow has a wood shaft, metal head, and paired pale feathers. Body is registered at ground241, scale.405 (~88px helmet-to-ground). Bow grip `(221,75)` local source pixels. Bow rotates around grip with aim; string and arrow rotate with it.

`core/archerRig.ts` is the single source of truth for aim-dependent nock position and projectile world spawn. Renderer subtracts `ARROW_HEIGHT=67.23` from projected projectile.y, and draws the arrow forward from its nock. Projectile travel and damage remain core-owned. Full draw is reached over.35s during.9s windup; release pose uses recovery phase.

Original generation filenames, full prompts, references, anchors, alpha and optimization provenance are recorded in `src/assets/station-kit/manifest.json`. Generated originals are retained outside the repository in the workspace `generated_images` folder; optimized assets are self-contained in repository.
