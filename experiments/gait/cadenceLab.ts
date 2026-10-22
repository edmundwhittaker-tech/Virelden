/** Opt-in, local-only bounded experiment. No production imports this module.
 * The original planner supplies an unchanged reference body/phase. Only the
 * planned feet are substituted before the unchanged contact/branch policy.
 * This is not an accepted walk and never selects a gameplay default.
 */
import { twoBone, type RigInput, type RigPoint } from '../../src/core/modularRig.js';
import { evaluateGaitPose } from './experimentalPose.js';
import { constrainProjectedGait, type ProjectedPostureState, type ProjectedGaitSample } from './projectedPosture.js';
import { updateWorldGait, type GaitSample, type GaitState } from './worldGait.js';
import { routeAt, type Route } from './routes.js';

type Point = RigPoint;
type Id = 0 | 1;
type Side = 'near' | 'far';
type Swing = NonNullable<GaitState['swing']>;
export type AnkleFloor = 24 | 28;
const INTERVAL = .15, MARGIN = .4;
const add = (a: Point, b: Point) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Point, n: number) => ({ x: a.x * n, y: a.y * n });
const mix = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const origin = { x: 0, y: 0 };

export interface CadenceLabState {
  time: number; enabled: boolean; plan: GaitState; posture: ProjectedPostureState;
  sample: ProjectedGaitSample; source: GaitSample;
}

function copyPlan(s: GaitState): GaitState {
  return { ...s, position: { ...s.position }, direction: { ...s.direction }, body: { ...s.body },
    feet: s.feet.map(f => ({ ...f, ground: { ...f.ground } })) as GaitState['feet'],
    swing: s.swing ? { ...s.swing, from: { ...s.swing.from }, to: { ...s.swing.to } } : undefined };
}

/** Analytic checks on the actual two-bone branch, not radial reach alone. */
function valid(p: Point, bend: 1 | -1, floor: AnkleFloor) {
  if (Math.abs(p.x) > 12 - MARGIN || p.y < floor + MARGIN || Math.hypot(p.x, p.y) > 37.8 - MARGIN) return false;
  const leg = twoBone(origin, p, 18, 20, bend);
  return leg.joint.y >= 10 + MARGIN && p.y - leg.joint.y >= 11 + MARGIN;
}

/** Find the incoming end of the longest feasible stance chord. This predicts
 * constant current velocity/current body offset only; it never reads a future
 * route, future pose, or future contact. The margin reserves modest bob room.
 */
const landingCache = new Map<string, Point>();
function landingOffset(velocity: Point, bend: 1 | -1, floor: AnkleFloor): Point {
  const key = `${velocity.x.toFixed(5)},${velocity.y.toFixed(5)},${bend},${floor}`;
  const cached = landingCache.get(key); if (cached) return { ...cached };
  let best = { x: 0, y: 33 }, bestScore = -Infinity;
  for (let x = -11.5; x <= 11.5; x += .25) for (let y = floor + MARGIN; y <= 37.4; y += .25) {
    const p = { x, y }; if (!valid(p, bend, floor)) continue;
    let dwell = 0;
    // Stop at FIRST infeasible point; do not assume a convex branch envelope.
    for (let t = .0025; t <= .25 + 1e-9; t += .0025) {
      if (!valid(add(p, mul(velocity, -t)), bend, floor)) break;
      dwell = t;
    }
    const score = dwell - Math.abs(y - 33) * 1e-6 - Math.abs(x) * 1e-7;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  landingCache.set(key, best); return { ...best };
}

function sampleSwing(plan: GaitState, time: number) {
  const w = plan.swing; if (!w) return;
  const t = clamp((time - w.start) / w.duration, 0, 1), f = plan.feet[w.id];
  f.ground = mix(w.from, w.to, smooth(t));
  f.lift = w.startLift * (1 - t) + w.height * Math.sin(Math.PI * t);
  if (t >= 1 - 1e-8) { f.ground = { ...w.to }; f.lift = 0; plan.supportId = w.id; plan.swing = undefined; plan.steps++; }
}

export function updateCadenceLab(previous: CadenceLabState | undefined, source: GaitSample,
  input: RigInput, position: Point, ankleFloor: AnkleFloor): CadenceLabState {
  const time = source.state.time;
  if (previous && time === previous.time) return previous;
  const reset = !previous || time < previous.time || time - previous.time > .25;
  const enabled = !reset && previous.enabled || input.motion === 'walk' && Math.abs(source.state.direction.y) > .2;
  if (!enabled || reset) {
    const result = constrainProjectedGait(reset ? undefined : previous?.posture, source, input, position);
    return { time, enabled: enabled && !reset, plan: copyPlan(source.state), posture: result.state, sample: result.sample, source };
  }
  const old = previous!, oldTime = old.time, dt = time - oldTime;
  const plan = copyPlan(old.plan);
  const velocity = source.state.moving ? mul(source.state.direction, source.state.speed) : origin;
  const moving = input.motion === 'walk' && source.state.moving;
  const reference = evaluateGaitPose(input, position, source);
  const nearId = old.posture.nearId;
  const sideOf = (id: Id): Side => id === nearId ? 'near' : 'far';
  const turn = moving && old.plan.moving &&
    source.state.direction.x * old.plan.direction.x + source.state.direction.y * old.plan.direction.y < .8;

  const makeSwing = (id: Id, at: number, stopping: boolean): Swing => {
    const duration = stopping ? .14 : INTERVAL, side = sideOf(id), f = plan.feet[id];
    const hip = add(position, reference.parts[`thigh_${side}`].start);
    const offset = landingOffset(velocity, old.posture.feet[id].bend, ankleFloor);
    // The current reference hip is extrapolated to touchdown, without changing
    // the source body animation. No goal is re-anchored once planted.
    const to = stopping ? { ...source.feet[side].ground }
      : add(add(hip, mul(velocity, at + duration - time)), offset);
    return { id, from: { ...f.ground }, to, start: at, duration,
      startLift: f.lift, height: stopping ? 1 : 1.8, stopping };
  };
  const settle = (at: number) => {
    const errors = plan.feet.map(f => Math.hypot(f.ground.x - source.feet[sideOf(f.id)].ground.x, f.ground.y - source.feet[sideOf(f.id)].ground.y));
    const id = (errors[0] > errors[1] ? 0 : 1) as Id;
    if (errors[id] > .4) { if (id === plan.supportId) plan.supportId = (1 - id) as Id; plan.swing = makeSwing(id, at, true); }
  };

  if (moving) {
    // Enter/retarget from the existing physical swing, never from a fabricated
    // landing. Steady diagonal cadence is exactly 150ms; turns are explicit.
    if (!old.enabled || turn || plan.swing?.stopping) plan.swing = makeSwing(plan.swing?.id ?? (1 - plan.supportId) as Id, oldTime, false);
    if (!plan.swing) plan.swing = makeSwing((1 - plan.supportId) as Id, oldTime, false);
  } else {
    if (plan.swing && !plan.swing.stopping) plan.swing = makeSwing(plan.swing.id, oldTime, true);
    if (!plan.swing) settle(oldTime);
  }
  for (let events = 0; plan.swing && plan.swing.start + plan.swing.duration <= time + 1e-9 && events < 8; events++) {
    const landed = plan.swing.start + plan.swing.duration; sampleSwing(plan, landed);
    if (moving) plan.swing = makeSwing((1 - plan.supportId) as Id, landed, false); else settle(landed);
  }
  sampleSwing(plan, time);
  // Everything outside this foot schedule is copied from the frozen reference.
  const plannedState: GaitState = { ...source.state, feet: plan.feet, swing: plan.swing,
    steps: plan.steps, supportId: plan.supportId, nearId, moving,
    position: { ...position }, time, direction: { ...source.state.direction } };
  const plannedFeet = {} as GaitSample['feet'];
  for (const foot of plan.feet) plannedFeet[sideOf(foot.id)] = { id: foot.id, ground: { ...foot.ground },
    display: { x: foot.ground.x, y: foot.ground.y - foot.lift }, lift: foot.lift };
  const plannedSource: GaitSample = { ...source, state: plannedState, feet: plannedFeet, supportId: plan.supportId };
  const result = constrainProjectedGait(old.posture, plannedSource, input, position, { ankleFloor, maxX: 12 });
  return { time, enabled, plan: plannedState, posture: result.state, sample: result.sample, source };
}

export function buildCadenceTrace(route: Route, hz: number, ankleFloor: AnkleFloor) {
  let sourceState: GaitState | undefined, labState: CadenceLabState | undefined;
  const frames = [];
  for (let i = 0; i <= Math.round(4 * hz); i++) {
    const time = i / hz, r = routeAt(route, time);
    const input: RigInput = { view: r.view, flipped: r.flipped, motion: r.moving ? 'walk' : 'idle', time, weapon: 'sword', weaponReach: 75 };
    const source = updateWorldGait(sourceState, { position: r.position, time, moving: r.moving, view: r.view, flipped: r.flipped });
    sourceState = source.state;
    labState = updateCadenceLab(labState, source, input, r.position, ankleFloor);
    frames.push({ time, position: r.position, input, source, state: labState,
      gait: labState.sample, pose: evaluateGaitPose(input, r.position, labState.sample), reference: evaluateGaitPose(input, r.position, source) });
  }
  return frames;
}
