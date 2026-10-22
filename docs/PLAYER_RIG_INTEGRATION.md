# Player rig integration checkpoint — not release acceptance

Test branch `qa/player-rig-integration-2026-10-22`, based on exact
`b825fbd4c93898be5f812ed4c63d11801d47420b`. No main/Pages publication.
No enemy or unrelated art changes. Existing modular artwork and foot size retained.

## Candidate structure

- Keep the reviewed compact fitted torso/waist/hip/arm ownership. Neutral hip
  registration now aligns both boots without a hidden unreachable outer-IK epsilon.
- Canonical72px-cycle directional model: actual resolved screen travel at unchanged
 150px/s drives phase, not requested velocity or global time. Three-dimensional
  anatomical lengths are18/C and20/C, C=sqrt(3)/2; source transverse plate-fit spans
  remain18/20. Projected segment lengths genuinely vary with direction. North/south
  use9px rather than12px travel amplitude to avoid the rejected deep crouch.
- Player simulation owns transient gait/action state. Render draws do not advance
  it. Wall pressure settles; checkpoint respawn, legacy load and area arrival reset
  old world-foot plants. Save schemas remain unchanged; no gait is serialized.
- `playerPoseFrame` is shared by actual player drawing and melee sampling. Same-
  facing action entry uses a100ms fixed-bone bridge, complete before earliest
  active200ms contact; all six active weapon geometries remain exactly baseline.
- Incompatible source-view/flip changes at action entry use an **explicit2D facing
  cut**, not pretend continuous mirrored anatomy: connected ready body, hands and
  equipment re-register together at the unchanged actor root. The cut records
  from/to frame; old foot plants are discarded. Attack and roll freeze ONE facing
  authority, including exact north/south ties. Native boundary review remains due.
- `playerTargetBody` exposes15 pose-derived, roll-transformed player capsules. This
  is an approximate plate/body proxy, NOT an opaque-alpha mask. Legacy NPC
  `HUMAN_BODY` remains unchanged; new sprite enemy helpers are not activated here.
- Roll scale is owned by the shared pose with smooth full-size entry/exit, preserving
  the existing duration, root controls and invulnerability windows.
- Station and both service levers use collision-resolved visible approach to the
  closer approved operating stances, then settle, reach, fixed-root pull and release.
  Neither the physical handle path nor hidden reach is widened. A blocked direct
  approach is rejected rather than teleported. Interaction waits for a neutral
  settled gait; previous immediate-pull tests now test the real stages explicitly.

## Evidence and remaining gates

Local checkpoint: build,199 gameplay rules and13 directional-model tests passed.
Rules include real wall resolution, explicit resets/save reload, six-weapon active
pose equality, same-facing action entry, recorded coordinated source cuts across
768 weapon/heading/action combinations, exact-vertical facing regression and the
first resolved travel tick after action completion. Mathematical tests are NOT
visual movement acceptance.

The eight-heading720x300 native fixture renders Ward+sword and a mixed-armour
poleaxe at actual88px scale, on camera-matched textured floor for450px travel and
an exact relaxed stop. It is **scripted collision-free root travel**, not browser
input/controller, turning, source-alpha sole, roll or lever-approach acceptance.
Original WebMs/raw geometry are uploaded before the separate mandatory real
encoded-PTS audit (>25fps, >100frames, no gap>75ms, exactly8clips, no frame filling).
The workflow also rechecks actual neutral/lever image registration, poleaxe grips
and all six physical weapon/NPC contacts; results must be read at the exact head.

Still required before release: native review of all headings; real controller
start/stop at varied phases, reversals/turns and wall response; equipped action
entry/cut/return and roll boundary frames; real-input lever approach for all three
mechanisms; source-alpha boot grounding and armour overlap; campaign/combat/save
browser regressions. Directional knees differ from the approved east2D control
(max~2.4px in the bounded comparison), so old east clips do not prove this model.
No historical gait or foot-lock percentage substitutes for looking convincing.
