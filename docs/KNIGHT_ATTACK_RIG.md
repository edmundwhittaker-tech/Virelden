> Legacy renderer reference. The active player uses `ModularKnightSprite`, the articulated `modularRig` and `meleeContact` described in `PROGRESSION_CONTRACT.md`. The older sprite/rig remains available for compatibility; its first-active full-sector description below does not define current player contact.

# Small reusable knight attack rig

## Runtime
- `src/assets/knight-rig/attack-v1.webp`: transparent 768×512 atlas, six 256×256 cells, ~78KB.
- `manifest.json`: phase, facing, ground registration and measured hand sockets.
- `src/core/knightRig.ts`: pure pose selection and independently replaceable weapon motion profiles.
- `src/game/KnightSprite.ts`: existing walk/idle body plus hand-attached weapons; authored attack body poses.

The same closed-helmet, full-plate, no-cloth body serves all three weapons. Windup bends and raises the arm; contact extends the shoulder/elbow and changes torso/stance; recovery lowers the arm. These are different body images, not rotations of a static sprite. Southeast/northeast attack sources mirror for southwest/northwest; exact side attacks use the front-three-quarter attack source. Existing six-direction walking remains unchanged.

Actual head-to-ground height is approximately 88px. The 256px cell includes transparent margins; it is not a 113px-tall figure. Feet register at source Y250. Weapon grips share exact per-pose gauntlet coordinates. Idle/walk have separately measured sockets. No weapon is baked into any body image, and only one held-weapon renderer is used. Weapons render at foot depth ±0.02, behind the body for northward aim and in front otherwise. Roll/death scale/rotation affects both body and weapon around the same foot anchor.

Sword sweeps, spear tracks the aim vector as a long narrow thrust, hammer rotates overhead into impact. All share body poses, but have separate length/angle/progress profiles and distinct silhouettes. Contact body pose and weapon contact begin on the **first active tick**, when simulation damage occurs. Weapon rendering does not alter combat reach/collision.

## Evidence
- `docs/qa/knight-rig-actual-size.png`: mechanically composed contact sheet at runtime body scale. Rows sword / spear / hammer; columns front windup/contact/recovery then rear windup/contact/recovery.
- `docs/qa/knight-rig-enlarged.png`: same sheet at 3× nearest-neighbour magnification.
- These contact sheets are asset/attachment checks, **not in-game browser evidence**. Browser integration screenshots are produced by the separate real-input QA suite.
- Local deterministic rig tests cover changed body poses, bounded hand sockets, contact onset, distinct weapon profiles, mirrored motion, and northward spear aim. Local TypeScript and complete tests pass.

## Generation / limitations
Built-in imagegen was used with the existing front and rear sheets as references. Prompt requested one transparent 3-column × 2-row atlas: front and rear three-quarter views of the same ordinary dark steel full-plate closed-helmet knight; three poses WINDUP (bent raised weapon arm, torso back), CONTACT (extended arm, planted forward stance), RECOVERY (lower hand, torso upright); identical proportions, lighting and feet baseline; empty closed weapon hand; exactly two arms/two legs; no weapons, cloth, cape, shadow, text or ground. Output was visually inspected, cropped by figure, uniformly resized, registered and encoded as alpha WebP. Original generation remains in the task workspace, not shipped.

This intentionally small rig is three discrete body poses, not a full skeletal/armor animation system. Weapon motion interpolates within phases; body poses do not interpolate. Minor generated armor detail differences remain. No new armor sets, level, lore, or game systems were added.
