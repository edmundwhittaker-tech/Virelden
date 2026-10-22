# Isolated floor24 native trial — preparation, not acceptance

## Fixed scope

Compare the existing live time-only walk (left) with the opt-in 150ms / floor24
candidate (right), using the existing Ward source art and 88px actor scale at
150 projected px/s. No gameplay, shared contact, upper-body/socket, source-art or
held-enemy changes. Frozen `gait.html` remains unchanged. `cadence.html?variant=28`
and `?variant=baseline` preserve controls; only floor24 receives native capture.

The compact canvas is720×300 with two actors and two floor TileSprites. The old
four-view fixture's24 large floor patches are not rendered. This is fixture
capture overhead reduction, not a production-game performance claim.

## Evidence protocol

- Four sequential routes: east, NE, SE,90°/180° turns; no parallel encoders.
- Native videos use actual `canvas.captureStream(30)` frames, not interpolation.
  Requested30fps is only a request. `ffprobe` records each encoded PTS and reports
  achieved intervals/second, median/p95/maximum gaps, and gaps above50ms.
- Record wall-clock render gaps, simulation-time gaps and raw actual-Phaser joint
  positions. Simulation follows Phaser delta, selecting the un-interpolated60Hz
  trace as the frozen fixture does. Frames skipped by a slow capture are not
  fabricated. Report actual first/last simulation and wall times.
- Markers are off in native video; separate full-page native screenshots and3×
  detail stills are taken outside capture. Enlarged views never enter the video.
- Native joint/anchor checks supplement, not replace, full CPU physical-foot
  branch-continuity checks. Render-sampled contact duties and observed landing
  times are explicitly incomplete when capture gaps omit short states.
- Below25 achieved fps is flagged as limited visual evidence, not disguised as
  successful30fps or used alone to fail otherwise-valid geometry.

## Gates and limits

Local preflight:26 new tests,17 frozen gait tests,133 gameplay tests and strict
build pass under available Node24.19.0, not repository-pinned22. Browser test
discovery lists exactly four routes; no local browser was launched.

The separate `cadence-qa.yml` runs on `qa/gait-cadence24-compact-*` only, with
read-only repository permissions and no deployment. Node22 installs pinned
dependencies, runs all176 tests and build before installing supported Chromium
and recording native evidence. Existing main/Pages and frozen gait workflows
are unchanged. Run results remain pending until exact-commit Actions completion.

Floor24 lowers CPU flight but worsens some low-rate SE/reversal excursions; the
mode remains latched after diagonal entry rather than being a complete adaptive
controller. See `REPORT.md` for numeric controls and regressions. Neither numerical
success nor better capture FPS proves pleasant jogging. Root review is required
before further changes; this branch is not gameplay activation or acceptance.
