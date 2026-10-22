# Expedition environment rendering

`src/game/ExpeditionWorldView.ts` renders only the Cistern Viaduct and Record Annex environments. The station, actors, combat rigs and camera retain their own renderer. These two places and their layouts are local game adaptations inspired by the published Virelden archive, not additions to official campaign canon.

## Geometry and materials

- `src/core/expeditionCatalog.ts` is the common geometry source for collision and rendering. Floors are exact rectangular unions; the reservoir and black offboard are never floor. The original route remains present when a shortcut opens.
- Floor UVs recover the existing `environment-v1/slate-court.webp` diamond's square ground plane, then use the game's `.8/.4` projection once. This preserves paved texture and scale without stretching the original diamond over long corridors.
- Water uses continuous ground UVs. Its open variant explicitly subtracts the active return-bridge rectangle; the bridge is also an opaque floor above it. An incomplete descending bridge is a translucent elevated mechanism, not durable or collision-active floor.
- Segmented textured masonry walls use the exact solid AABBs. Wall and prop occlusion fades from their ground feet, never their sprite bottoms.
- Five freestanding120px record shelves stand on the visible floor in front of Annex partitions, not buried inside masonry. Their measured ground footprint is reserved as46×20world-unit rectangles in the typed prop catalog. Collision expands those rectangles by the same player radius as walls; sprite origin and foot-based sorting use the measured registration. They do not replace rubble or loot. Closed/open routes, original enemy-home clearance and each interaction stance are retested with these physical footprints.
- Ordinary service-stair exits have small inset masonry landings with five shaded descending treads and carved riser lips. Their ground extent (x±28,y−29..+18) stays inside existing walkable floor; they introduce no new void, barrier, teleport or collision exemption.
- The lever base is registered at origin `.514981,.804922`, display `24.6967×37.0451`. Its socket is exactly `(0,-20)` from the ground foot. The original procedural moving shaft and horizontal brass grip remain: `hand=(-13+pull*23,-43+pull*13)`, grip endpoints `hand.x±5`, pull duration `.8s`. No character-rig or contact contract is changed.
- Every animation consumes simulation state, not an independent tween or wall clock, so pause freezes it and partial opening cannot become an invented durable state.

## Asset provenance

`src/assets/expedition-v1/` contains three optimized original WebPs generated with the built-in image generator on 2026-10-22 (251,872 bytes total): reservoir-water, record-shelf and lever-base. Prompts are retained in `provenance.json`; exact measured registrations and physical footprints are in `registration.json`. Large generation originals are not repository assets. All three source images and their static ground-scale/alpha/motion composites were visually reviewed before integration. These checks are art review, not a browser playthrough claim.

## Lifecycle and verification

Call `ExpeditionWorldView.preload(scene)` alongside existing environment preload, construct the needed area view, call `draw(state)` and `setVisible(active)`, and call `destroy()` when retiring it. The renderer also cleans its objects and generated canvas textures on scene shutdown. `snapshot()` exposes active floor/wall geometry, water texture/mask state, registrations, lever hand and animation progress for browser assertions.

Browser acceptance must check the full service-stair route, all floor/water edges, open bridge masking, shutter animation, paused lever hand alignment, close foreground occlusion and compact viewport corners. Static material inspection and TypeScript checks do not substitute for those runtime checks.
