# Bounded cadence experiment — local CPU evidence only

This is the initial CPU assessment. The subsequent isolated native-trial fixture
and its pending acceptance gates are documented in `NATIVE_TRIAL.md`; no native
results are claimed here.

## Decision

**The 150ms / ankle-floor 24 variant merits one native visual trial, not acceptance.**
The floor 28 variant is a useful control but retains substantial diagonal flight.
Neither proves pleasant jogging. Floor24 reduces unsupported time but increases
some SE ankle excursions and low-rate reversal knee excursions. Do not raise the
cadence to chase zero flight, and do not activate either variant in gameplay.

## Frozen reference and local scope

- Reference: local `6583b2fcd0487e915d1338ebe90b06b60fbbfd6a`, equivalent remote
  `592212108f34c9ee78a713dc241da5556b148d67`, tree
  `d0704ee0dd0c03ce32de42776939ec7041657efc`.
- Isolated checkout: `/workspace/scratch/45357b924c90/virelden-gait-cadence-lab`.
  The original `/workspace/scratch/45357b924c90/virelden-gait-qa` stays clean.
- Exactly two candidates: posture-aware landing every 150ms, with ankle floor 28
  or24. Both keep 18/20px bones, thigh descent 10, shin descent 11 and lateral
  reach 12. The landing search uses 0.4px interior margins; actual constraints
  retain the stated 10/11/28-or24 bounds.
- The lab retains the original source phase, body offset, upper-body parts,
  hand/support-hand sockets, weapon angle/length and actor transform exactly.
  It does not shorten the original clock because that would speed the arms/bob.
- Existing planted-contact, epoch and observed straight-branch-transfer handling
  is reused. Only optional posture parameters and a separate opt-in foot schedule
  are added. No source artwork, scale, held enemy assets, gameplay, default walk,
  original browser harness selection or deployment is changed. The subsequent
  isolated QA entry/workflow does not activate this code in gameplay.
- The experimental mode becomes active on a diagonal and remains active through
  that route's later turns, including horizontal-west. **This is not a complete
  direction-adaptive production controller.** East-only is the exact control.

## Why cadence alone is insufficient

At 150 projected px/s, a 45-degree route moves vertically 106.07px/s. A stationary
body offset leaves ankle drop only 28–37.8px. Analytic fixed-branch geometry gives
maximum stance chords of about 91ms NE and 92ms SE (about 82/83ms with 0.5px margins).
Zero-flight would therefore require approximately 11–12 alternating landings/sec,
near 13/sec with margins: likely conspicuous rapid shuffling, not a good goal.
The existing small body oscillation perturbs these estimates; they are not a
global impossibility proof for an arbitrarily changing body trajectory.

At 150ms between landings (6.67 steps/sec), the idealized floor 28 envelope still
predicts roughly 39% flight. Floor24 expands useful stance without permitting a
hip-high knee: thigh/shin descent bounds remain 10/11. It does not guarantee that
the resulting full-plate silhouette looks better.

## Measured results

All percentages below are **sampled CPU right-endpoint walking-interval duty
fractions**, not native video rates or continuous-contact integrations. Their
denominator excludes the initial idle-to-walk interval, so frozen-baseline values
differ slightly from older frame-count summaries and native sparse captures.

|60 Hz route|Frozen baseline|150ms / floor 28|150ms / floor 24|
|---|---:|---:|---:|
|NE flight|54.24%|39.83%|26.27%|
|SE flight|62.71%|35.59%|20.34%|
|Turns flight|39.76%|28.31%|18.07%|
|Mirror-reversal window flight,1.7–2.1s|66.67%|54.17%|20.83%|
|Both physical legs transferring bend at once|116.7ms|150.0ms|50.0ms|

At 30/60/120 Hz, floor 24 NE flight is 25.86/26.27/28.57%; SE is 18.97/20.34/21.85%.
Actual steady straight-route landing observations are 150ms apart at 60/120 Hz;
30Hz observations quantize to 133/167ms around the 150ms schedule. Turn retargets,
branch transfers, start and stop are not claimed to follow a perfect 150ms rhythm.

Across all 24 candidate route/rate cases:

- Continuous planted-contact anchor drift is exactly 0; epochs never label a
  free output as a new contact. Independent trace checking also found no moved
  anchor during consecutive planted frames even when ignoring epochs.
- Paused samples are exactly idempotent. Bone lengths, posture bounds, ankle
  pose/target agreement and enabled lateral reach pass numerical checks.
- Upper-body/socket/weapon/actor comparisons against the original reference
  show zero differences. East-only full gait samples equal the frozen baseline.
- Both adjacent branch-change outputs have hip-to-ankle reach 37.9999px; flips
  occur only while free. Every route finishes with both feet planted.
- An independent 60Hz reversal-window audit finds minimum ankle-center separation
  improves from 1.38px baseline to 6.04px floor 28 / 5.38px floor 24. Samples below 4px
  fall from 25% to 0%. This is not evidence of painted foot/leg separation.

### Motion warnings that flight percentages do not excuse

- Floor24's30Hz turn-route maximum physical knee step is 18.20px, worse than
  frozen baseline 16.30px. At 60Hz it is 9.65px versus 9.83px, but hip-relative knee
  movement is 7.91px versus 7.22px. This is not uniformly smoother motion.
- Floor24's SE maximum ankle step is 14.57px versus 10.65px at 30Hz and 6.86px versus
  5.27px at 60Hz. Its foot still needs genuine visual review rather than a support
  statistic alone.
- Floor28 increases simultaneous branch-transfer overlap to 150ms at 60Hz despite
  reducing total flight. Faster steady stepping does not solve reversal topology.
- Contact, epoch and branch continuity are mechanical correctness, not proof of
  attractive knees, toe orientation, acceptable foot overlap or absence of
  visible snaps. Walking-to-combat/roll/interaction integration remains untested.

## Verification and artifacts

Local existing Node is **v24.19.0**, not the repository-requested Node 22. No packages
were installed/downloaded; the already-pinned dependency tree was reused.

- 24 new route/rate invariant cases plus 2 frozen-state advancement cases: passed.
- 17 preserved gait tests: passed.
- 133 preserved gameplay tests: passed.
- Strict production typecheck/build: passed, with the existing bundle-size warning.
- No browser launched, no native frames captured, no CI run or publication made.

Reproduce from this isolated checkout:

```sh
./node_modules/.bin/tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir .gait-build experiments/gait/cadenceLab.ts
node --test experiments/gait/cadence-lab.test.mjs
npm run test:gait
npm test
npm run build
```

`metrics.json` contains all 36 baseline/candidate summaries with raw observed
contacts and scheduled-landings lists. Eight `*-trace.json` files retain the
60Hz physical-foot/branch trajectories. `cadence-tests.log` records the 26 checks.
The patch beside this report contains only local implementation/tests/report
and status documentation, not dependencies or raw traces.

## Native trial gate

Trial floor 24 against both the frozen baseline and floor 28 at native 88px, fixed
150px/s, NE/SE plus the existing reversal route. Use a compact two-panel native
canvas for video, with one reference and one candidate. Do not encode all four
large floor views; preserve terrain registration and actual actor scale while
reducing the fixture-only render area. Capture full-page or separate 3x stills
for diagnostic detail instead of putting enlarged views in the video. Include
markers-off motion and a separate contact-overlay pass.

Keep actual un-interpolated captured frames. Record frame count, first/last PTS,
per-frame PTS gaps, achieved intervals/second, elapsed wall time and simulation
time beside the requested capture rate. Require actual achieved frame rate rather
than assuming a requested 30fps was attained; the previous clips were only about
10–13fps, which undersamples 150ms steps. Do not call low-throughput fixture
capture a production-game performance result: its 24 large floor patches and four
views are test overhead. The compact capture plan is not implemented here.

Native fixture wiring is deliberately not included or exercised. Any subsequent
trial must use the repository Node 22 workflow and preserve exact variants. If
floor 24 visibly folds/overlaps the plate or worsens turns, reject it even with its
lower flight score. Keep the live walk unchanged in all cases until visual and
integration gates are met.
