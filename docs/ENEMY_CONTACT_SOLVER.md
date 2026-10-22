# Optional first-contact solver — implemented, not activated

`src/core/enemyContact.ts` implements `resolveEnemyContact(EnemyContactInput)` for both enemy weapons→pose-aware injected player capsules/shields and incoming player weapon polygons→giant capsules/shield polygons. It does not import `HUMAN_BODY`, modify the player rig, choose target dimensions, apply damage/immunity or activate any enemy/gameplay code.

## Motion/topology contract

- Points, capsule endpoints **and radius** interpolate linearly in absolute projected pixels over one active tick. This is a piecewise-linear geometry contract, **not** a rotational arc or an assumed skeletal trajectory. An adapter must split the real motion into matching intervals if it needs a different trajectory; these two snapshots alone cannot establish that path.
- Arrays and vertex indices identify the same physical features at both endpoints. Polygon count, vertex count, equipment string and layer must match. Capsule arrays retain matching indices. Source equipment alpha-rectangle ordering must stay stable. Detectable mismatches reject the interval. Equal topology cannot detect a teleport or an authored animation cut: the host must split at those discontinuities. Optional `motion:'discontinuous'` rejects a swept interval; omitted / `'linear'` declares the above contract for compatibility with the optional simulation.
- Narrowphase polygons must remain strictly convex, consistently wound and nondegenerate throughout the entire linear motion. Exact quadratic orientation tests check every edge against all other vertices. A pose which becomes flat, concave, self-crossing or winding-reversed is unsupported, even when its endpoints look plausible. Body capsules may become zero-length; radius must remain nonnegative. AABB-disjoint shapes need no convexity certificate to establish their safe miss and are not sent to narrowphase.
- An `active-entry` is zero-duration and checks **only the current** weapon/target snapshot at TOI 0. Previous windup geometry is ignored, including its topology. `active-step` is closed [0,1]. `active-exit` excludes the exact root 1, not merely a proximity band. Interval tick/kind/endExclusive consistency is validated.

### Authored frames, facing and mirrored shields

A host must **not** pass a previous authored sprite frame and a new discrete frame/facing to this solver as though that transition was a physical sweep. For example, front/side/rear original PR7 shields have different rectangle topology, and mirroring a shield may flatten/reverse its correspondence mid-interval. A count/identity mismatch or convexity failure is explicitly unsupported; equal-looking arrays do not make an authored cut continuous. The adapter must either provide a genuinely authored matching continuous path, or end the preceding interval and separately resolve the new current instant under the game's reviewed contact rules. This solver currently accepts only one tick-sized linear interval; it does not implement arc subdivision, authored-path reconstruction or subinterval remapping. A future adapter must establish any required real-motion subdivision/error bounds and map local event times into the original active interval without admitting windup or an excluded exit endpoint. Merely sampling a rotation into chords does not prove the curved swept volume is covered. It must not sweep the cut, turn a marked discontinuity into a hit, retry by reordering indices, or let the error crash gameplay. No such player/sprite host adapter is activated here.

## Continuous proof, ordering and numerical meaning

Swept, outward-rounded AABBs reject impossible pairs but never establish hits. Exact initial overlap tests provide a fast path, testing every initial shield before any initial body contact. Remaining candidate pairs generate all possible contact-boundary feature events:

- polygon/polygon: moving vertex–edge collinearity (degree≤2), plus vertex–vertex coincidence for identically collinear sliding edges;
- polygon/capsule: moving point–endpoint distance/radius events (degree≤2), endpoint–polygon edge and polygon vertex–capsule spine distance/radius events (degree≤4), with exact segment-projection guards.

These features cover first contact of supported convex polygons and capsules; endpoint overlap is not used as evidence of a swept miss. Tangencies, including isolated even-multiplicity roots, are retained. Interior segment crossings and radius 0 are supported.

IEEE-754 input values are converted to their **exact dyadic values**. Integer polynomial operations and positive-scaled pseudo-remainder Sturm sequences count/isolate all real event roots; signs at a root use exact Bernstein enclosures, polynomial common factors and further isolation. Earliest contacts are ordered by disjoint algebraic root brackets. Common factors certify true equality, so only a **true tie** favors the shield: near-but-distinct contacts are not epsilon-grouped.

Returned TOI is an approximation to that certified earliest event, with absolute error ≤2^-43 (the isolating bracket width is ≤2^-42). No positional or radius epsilon is added. At the allowed coordinate/radius bounds, component interpolation error from that TOI approximation is below approximately 0.00000023px. This precision does not establish the correctness of host artwork, collision masks, world projection or intended motion. A decimal intended by the caller is not substituted for its supplied IEEE value.

## Bounded work and safe failure

Limits: at most 4096 incoming polygons, 4096 shield polygons, 128 capsules, 3–8 vertices/polygon; finite coordinates/radii with magnitude≤1,000,000; relevant exact-grid dynamic range≤256 bits; at most 52 dyadic root subdivisions/refinements along a bracket. Default/hard maximum deterministic work budget 1,000,000; a host can request less with `maxWork`. Budget counts bound pair checks, polynomial evaluations and pseudo-division work; it is **not a millisecond deadline**. Input size, polynomial degree and coefficient range are separately bounded. Diagnostics expose work, broadphase/candidate pairs, event polynomials, isolated intervals and refinements.

Invalid input, topology/discontinuity, unsupported narrowphase motion, excessive input range, budget exhaustion or unseparable events throw typed `EnemyContactError` with `invalid|unsupported|budget|unresolved`. They never return a fabricated body hit or certified `none`. `tryResolveEnemyContact` exposes an explicit `status:'unresolved'` result for future adapters. **Do not map that status to a certified miss or pass an arbitrary result into the simulation**: contain it at the host boundary, withhold/abort damage/contact safely, record the reason, and reconcile the attack/pose before continuing. The current optional callback interface has no unresolved branch, so wiring such handling into actual gameplay is still an integration gate. Unexpected programming errors are not swallowed.

## Local verification and costs

Pinned installed TypeScript 5.9.3 strict compilation passes. Node 24.19.0 (outside repository's preferred Node 22 line) runs 95 focused tests: 58 pre-existing contract tests plus 37 new solver/integration tests. New tests cover physical shield/body ordering, true/near ties, reversed/moving targets, moving shields, isolated tangency/close miss, zero-radius spine crossing, varying endpoints/radius, 2,000px tunnelling, alpha gaps, entry/exit, malformed/unsupported/budget failures, deterministic repeated results, exact original PR7 equipment masks and real-solver optional-simulation consumption. These do **not** accept original PR7 body art as an R5 replacement.

From the Virelden repository root, with its pinned dependencies installed, use the existing project commands:

```sh
npm test
npm run build
node tools/contact-benchmark.mjs
```

`npm test` invokes the repository test compiler (`tsc -p tsconfig.tests.json`) before running all rule tests, so it also produces the `.test-build` modules used by the benchmark. The benchmark prints a fresh report without overwriting the curated `contact-benchmark.json`; an optional output filename can save another run. All three commands were exercised against the isolated main-source overlay containing this solver.

Local Linux Node microbenchmark (20 warmups, 100 measured, synthetic projected geometry; see JSON):

| Case | Median | p95 | Four-interaction median sum |
| --- | ---: | ---: | ---: |
|original PR7 giant,51 trident quads, far miss|0.062ms|1.198ms|0.246ms|
|same, starting physical body overlap|0.297ms|0.610ms|1.186ms|
|same, genuine2px/tick body crossing|0.564ms|0.881ms|2.256ms|
|stress: original trident,100px/tick tunnelling|6.319ms|9.064ms|25.278ms|
|player tip15px translation→41-quad giant shield|0.604ms|1.977ms|2.416ms|
|player tip≈20px rotation chord→41-quad giant shield|1.103ms|3.056ms|4.413ms|
|player polygon200px sweep→41-quad giant shield/body|0.948ms|2.039ms|3.791ms|

The approximately 20px tip fixture uses linear vertex chords between endpoint rectangles, not an exact rotational arc. The 100px stress case alone can exceed an 8.333ms tick and four such interactions are **not 120Hz-ready**. Ordinary four-interaction estimates do not include rendering, world callbacks, navigation, multiple body capsules, browser GC or concurrent player-rig work; they are not measured whole-game frames. Broadphase/initial-contact paths intentionally keep symbolic work a narrow fallback, but worst-case native/multi-actor performance remains a preactivation gate. This candidate adds no browser, native/map/asset acceptance, branch, upload, merge or deployment evidence.

Independent local review found no blocking CCD defect and checked 1,000 translated-rectangle cases against independent slab equations, an irrational true-tie fixture and a maximum-size shape input. An isolated main-source overlay passes 279 aggregate rule tests (184 existing main + 58 optional-contract + 37 solver/integration), strict production type-check and Vite build; all 34 production files are byte-identical to the local untouched reference output. The helpers remain unused/tree-shaken. Native browser tests were not run.
