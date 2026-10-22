# Player rig integration checkpoint — not release acceptance

Test branch `qa/player-rig-integration-2026-10-22`, based on exact
`b825fbd4c93898be5f812ed4c63d11801d47420b`. No main/Pages publication.
No enemy or unrelated art changes. Existing modular artwork and foot size retained.

## Candidate structure

- Keep the reviewed compact fitted torso/waist/hip/arm ownership. Neutral hip
  registration now aligns both boots without a hidden unreachable outer-IK epsilon.
- Canonical 72px-cycle directional model: actual resolved screen travel at unchanged
  150px/s drives phase, not requested velocity or global time. Three-dimensional
  anatomical lengths are 18/C and 20/C, C=sqrt(3)/2; source transverse plate-fit spans
  remain 18/20. Projected segment lengths genuinely vary with direction. North/south
  use 9px rather than 12px travel amplitude to avoid the rejected deep crouch.
- Player simulation owns transient gait/action state. Render draws do not advance
  it. Wall pressure settles; checkpoint respawn, legacy load and area arrival reset
  old world-foot plants. Save schemas remain unchanged; no gait is serialized.
- `playerPoseFrame` is shared by actual player drawing and melee sampling. Same-
  facing action entry uses a 100ms fixed-bone bridge, complete before the earliest
  active 200ms contact; all six active weapon geometries remain exactly baseline.
- Incompatible source-view/flip changes at action entry use an **explicit 2D facing
  cut**, not pretend continuous mirrored anatomy: connected ready body, hands and
  equipment re-register together at the unchanged actor root. The cut records
  from/to frame; old foot plants are discarded. Attack and roll freeze ONE facing
  authority, including exact north/south ties. Native boundary review remains due.
- `playerTargetBody` exposes 15 pose-derived, roll-transformed player capsules. This
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

Local follow-up: build, 202 gameplay rules and 13 directional-model tests passed.
Rules include real wall resolution, explicit resets/save reload, six-weapon active
pose equality, same-facing action entry, recorded coordinated source cuts across
768 weapon/heading/action combinations, exact-vertical facing regression and the
first resolved travel tick after action completion. An independent 512-case roll-exit
matrix and 576 legal chained-action entries also pass: completed roll facing stays
frozen through its rendered exit tick without overwriting control aim; immediate
action chains snapshot the actual ready lower body, not stale pre-action walking
feet. Mathematical tests are NOT
visual movement acceptance.

The eight-heading 720x300 native fixture renders Ward+sword and a mixed-armour
poleaxe at actual 88px scale, on camera-matched textured floor for 450px travel and
an exact relaxed stop. It is **scripted collision-free root travel**, not browser
input/controller, turning, source-alpha sole, roll or lever-approach acceptance.
Original WebMs/raw geometry are uploaded before the separate mandatory real
encoded-PTS audit (>25fps, >100 frames, no gap >75ms, exactly 8 clips, no frame filling).
The workflow also rechecks actual neutral/lever image registration, poleaxe grips
and all six physical weapon/NPC contacts; results must be read at the exact head.

Still required before release: native review of all headings; real controller
start/stop at varied phases, reversals/turns and wall response; equipped action
entry/cut/return and roll boundary frames; real-input lever approach for all three
mechanisms; source-alpha boot grounding and armour overlap; campaign/combat/save
browser regressions. Directional knees differ from the reviewed east 2D control
(maximum about 2.4px in the bounded comparison), so old east clips do not prove this model.
No historical gait or foot-lock percentage substitutes for looking convincing.


## Follow-up native controller and artifact retention

The exact `66e400c` scripted eight-heading run `39860155126` passed all planned gates.
The directional design was visually reviewed in sampled native frames;
turn/action/interaction acceptance remains pending.
Its early artifact `12460958187` preserves the eight original clips; later suites
unfortunately cleared default `test-results` before the final artifact. This
follow-up isolates each renderer suite's output directory and re-audits all eight
original clips after every later suite, so missing final clips fail CI.

The separate main-controller job uses fresh Vanguard/Wayfarer UI choices with
ordinary keyboard/mouse events only: no save, health, gear, root or time injection.
A 720x300 integer 1:1 crop copies actual newly rendered 1280x800 game-canvas frames;
no rescaling/interpolated motion or synthetic frame filling. Spawn scenery permits
only short clear rays (12–36px), so it studies genuine short starts/reversals/stops,
action source cuts, collision-constrained rolls, pause and actual wall response.
It explicitly does NOT claim several steady cycles or a collision-free 137px roll;
long steady evidence belongs to the separate eight-heading fixture. Source raw
snapshots/events and original clips are preserved before the mandatory two-clip
encoded-PTS audit. These new controller results remain pending until run/read.


A separate exact-head baseline job runs the unchanged existing browser scenarios
(including real combat, ordinary station-gate approach, equipment/save and four
station sections) plus the isolated equipment DOM contract suite. Existing browser
configuration is retained; no new browser flags or ignored failures are added.
A baseline failure still fails that job while the independently prepared DOM
suite can run for useful diagnostics. Full connected-expedition unseeded campaign
and all three real-input lever paths remain separate release gates.

Two additional independent jobs invoke the existing seeded expedition feature
configuration and genuinely unseeded earned-campaign configuration. Each preserves
its own runner output and the existing custom route snapshots in separate artifacts,
including failed stages. A seeded feature pass cannot substitute for earning the
connected campaign. These jobs are prepared, not yet executed on this follow-up.

The existing explicit seeded fixture now advances the real mechanism transaction
until opening and interaction release have both finished, with an eight-second
simulation guard and completion assertions; it does not set completed flags.
The unseeded station route targets the collision-valid operating approach
`{x:560,y:115}` instead of the column-blocked `{x:550,y:105}`, and asserts a clear
path to the unchanged operating stance before using ordinary navigation/input.
Exact-core checks found 27 clear approach samples, maximum 2.5px resolved travel
per simulation tick and zero pull-root drift. These checks are not a native route pass.


Completion-boundary follow-up also ignores the renderer's observed `moving`
boolean as an animation authority: a root-moving final roll tick must not fall
back to legacy global-time walk. All action phases and the exact completion
frame now compare renderer moving=true/false, and legal chain tests snapshot
that actual rendered boundary. Native capture remains necessary after pure tests.
