# Whole-character player — staged local proof

This proof begins from main `cfbd3fae0de6ade09f37508084baace37ba403d0`.
All 206 source blobs were checked against the remote tree before editing.

## Implemented scope

- The approved revised **front** walk, eight frames at 8 fps, replaces the player idle/walk cutout body only where matching art exists. Runtime PNGs are exact copies of the approved root-aware 352px outputs, rendered at uniform 0.25 scale with fixed root `(288,480)` on their 576×576 canvas. The original idle PNG is unchanged; its single uniform placement is provisional pending native screenshot review.
- Horizontal east/west currently approximate the approved front-right/front-left view. West mirrors the **entire** bitmap. The front is never presented as rear walking.
- Rear idle/walk, attacks, rolls and lever operation retain the existing renderer explicitly. This is a staged integration, **not** a claim that every state is now a whole-character sprite. These missing states remain visible in debug snapshots as `legacy-action-fallback` with a reason.
- Weapons attach to measured gauntlet/palm carry sockets. This is a one-handed noncombat carry, including the poleaxe. No support grip is claimed during carry. All attacks use the existing hand-registered renderer, including the verified two-handed poleaxe action.
- Shadow dimensions, projected world position, foot-depth sorting and environment occlusion are unchanged. The whole body has no separately transformed limbs or plates.

## Equipment and mechanics boundary

The approved starter Ward appearance is fixed **only for this local proof**. Delver, Marcher and mixed-piece whole-body variants are absent. Individual item ownership, armour statistics, equipment UI, upgrades and saves remain unchanged; the retained action renderer still displays its existing mixed pieces. That visible transition can be jarring and is a release blocker until reviewed. The proof does not rename items or pretend that individual visible plates still swap on the new whole bitmap.

No movement, collision, stamina, combat timing, damage, weapon range/shape, player target capsules, gate alignment, level, XP or save-schema code changes are included. The old player pose remains the mechanical geometry authority. Whole-character art is presentation only, not a new contact mask.

## Minimum missing art

1. Matching rear idle + eight walk frames, same elevated orthographic ~30° camera, travelling upper-right away from the viewer. Rear helmet/backplate; no visor/front breastplate. Same frame-phase order, armour identity, proportions, lighting, empty hands and true transparent background. Mirror as a whole for upper-left.
2. Matching front/rear cut, thrust, overhead and hook windup/contact/recovery body frames; roll; lever reach/pull/settle. Supply primary-hand sockets, plus verified support sockets for two-hand actions.
3. Complete-body Ward/Delver/Marcher appearance variants and an explicit approved mapping for mixed equipment. No automatic chest-set or other visual mapping is silently introduced here.
4. A two-hand poleaxe carry/walk variant if carrying it one-handed is not visually accepted.

Rear/action registration must use a fixed ground root plus approximate head-base, neck-base and hips landmarks. Use positive whole-frame uniform scale + XY translation only; no alpha-bottom normalization, body proportion warps or limb fitting. Approved reference guide root is `(320,631.9967308044434)`, common guide-to-game scale `0.17467039426525557`. This is approximate registration, not proved per-foot world locking.

## Verification status

- 214 deterministic tests and strict TypeScript/production build passed on the current local integration (Node 24.19.0; repository CI uses Node 22).
- Source-hash/registration/coverage/cadence/mirrored-origin tests and actual-game native transition cases are authored. Native browser execution and screenshot review have **not** yet occurred for this proof.
- Existing attack/contact/support-grip assertions are retained. New production-game capture cases cover approved idle/walk → existing attack and roll → whole-character idle. Existing real gate-route cases retain approach/pull/end screenshots and root/reach checks.
- Native browser execution is prepared for GitHub CI. Browser test discovery is not execution or visual acceptance.
- The proposed branch is an explicitly incomplete draft visual proof, not a deployable release. Existing live main is unchanged and available for rollback.
