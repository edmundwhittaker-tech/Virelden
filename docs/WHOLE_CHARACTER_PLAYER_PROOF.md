# Whole-character player — staged local proof

This proof begins from main `cfbd3fae0de6ade09f37508084baace37ba403d0`.
All 206 source blobs were checked against the remote tree before editing.

## Implemented scope

- The approved revised **front** walk and the calibrated **rear** idle/walk now replace the player idle/walk cutout body. Walks have eight frames at 8 fps. Runtime PNGs are exact copies of the approved root-aware 352px outputs, rendered at uniform 0.25 scale with fixed root `(288,480)` on their 576×576 canvas. The reviewed replacement front idle now uses the same 576×576 canvas, fixed root and uniform 0.25 runtime scale as the approved walk; its exact PNG and measured carry socket are recorded in the manifest. The rear family uses a single approved 1.06 uniform calibration about the same fixed root, already baked once into its exact runtime PNGs; runtime must not apply it again.
- Horizontal east/west currently approximate the approved front-right/front-left view. West mirrors the **entire** bitmap. The front is never presented as rear walking.
- Attacks, rolls and lever operation retain the existing renderer explicitly. Rear idle/walk now use the accepted complete rear bitmaps, not a front drawing facing backwards. This is a staged integration, **not** a claim that every state is now a whole-character sprite. Missing action states remain visible in debug snapshots as `legacy-action-fallback` with reason `missing-action-art`.
- Weapons attach to measured gauntlet/palm carry sockets. This is a one-handed noncombat carry, including the poleaxe. No support grip is claimed during carry. All attacks use the existing hand-registered renderer, including the verified two-handed poleaxe action.
- Shadow dimensions, projected world position, foot-depth sorting and environment occlusion are unchanged. The whole body has no separately transformed limbs or plates.

## Equipment and mechanics boundary

The approved starter Ward appearance is fixed **only for this local proof**. Delver, Marcher and mixed-piece whole-body variants are absent. Individual item ownership, armour statistics, equipment controls, upgrades and saves remain unchanged; the equipment footer explicitly labels the fixed-outfit limitation and temporary action, roll and lever renderer; the retained action renderer still displays its existing mixed pieces. That visible transition can be jarring and is a release blocker until reviewed. The proof does not rename items or pretend that individual visible plates still swap on the new whole bitmap.

No movement, collision, stamina, combat timing, damage, weapon range/shape, player target capsules, gate alignment, level, XP or save-schema code changes are included. The old player pose remains the mechanical geometry authority. Whole-character art is presentation only, not a new contact mask.

## Minimum missing art

1. Matching front/rear cut, thrust, overhead and hook windup/contact/recovery body frames; roll; lever reach/pull/settle. Supply primary-hand sockets, plus verified support sockets for two-hand actions.
2. Complete-body Ward/Delver/Marcher appearance variants and an explicit approved mapping for mixed equipment. No automatic chest-set or other visual mapping is silently introduced here.
3. A two-hand poleaxe carry/walk variant if carrying it one-handed is not visually accepted.

Action registration must use a fixed ground root plus approximate head-base, neck-base and hips landmarks. Use positive whole-frame uniform scale + XY translation only; no alpha-bottom normalization, body proportion warps or limb fitting. Approved reference guide root is `(320,631.9967308044434)`, common guide-to-game scale `0.17467039426525557`. This is approximate registration, not proved per-foot world locking.

## Rear registration limits

The rear is manually registered with positive uniform scale and XY translation, not a skeleton rig or per-frame height normalization. Its neck-to-pelvis proportion remains longer than the approved front and cannot be repaired by uniform scaling. Carry sockets are approximate visible gauntlet/knuckle centres, not verified two-hand grips or foot-lock evidence. Front/rear size, feet, body occlusion and transition readability still need native screenshot review.

## Verification status

- The combined local candidate passes 230 deterministic rules and strict TypeScript/production build (Node 24.19.0; repository CI uses Node 22). The original isolated front-only proof passed 214 rules.
- Exact front/rear source-hash, fixed-root, carry-socket, coverage, cadence and mirrored-origin tests and actual-game native transition cases are authored. Native browser execution and screenshot review have **not** yet occurred for the combined rear/enemy candidate. The earlier front-only native proof passed its gate, all-equipment and twelve effect poses; its two loadout cases failed only an over-tight Float32 root-coordinate threshold. See [native evidence and precision bound](STATUS.md#front-only-native-proof-before-the-combined-increment).
- Existing attack/contact/support-grip assertions are retained. New production-game capture cases cover approved front/rear idle/walk → existing attack and roll → whole-character idle. The native effect fixture retains the original twelve cases and adds the same twelve for rear art. Existing real gate-route cases retain approach/pull/end screenshots and root/reach checks.
- Native browser execution is prepared for GitHub CI. Browser test discovery is not execution or visual acceptance.
- The proposed branch is an explicitly incomplete draft visual proof, not a deployable release. Existing live main is unchanged and available for rollback.
