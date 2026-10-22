import { twoBone, type RigInput, type RigPoint } from '../../src/core/modularRig.js';
import { evaluateGaitPose } from './experimentalPose.js';
import type { GaitSample } from './worldGait.js';

type Side = 'near' | 'far';
type Id = 0 | 1;
interface BendTransfer { stage: 'extend' | 'straight' | 'retract'; stageAt: number; start: number; fromAngle: number; fromLength: number; fromLift: number; to: 1 | -1 }
interface ContactFoot {
  id: Id; world: RigPoint; ground: RigPoint; source: RigPoint;
  lift: number; planted: boolean; epoch: number; releasedAt: number;
  trackStart?: number; offset: RigPoint; bend: 1 | -1; hip: RigPoint; knee: RigPoint; transfer?: BendTransfer;
}
export interface ProjectedPostureState {
  time: number; nearId: Id; depth: number; steps: number;
  view: 'front' | 'rear'; flipped: boolean; feet: [ContactFoot, ContactFoot];
  sample: ProjectedGaitSample;
}
export interface ProjectedGaitSample extends GaitSample {
  nearId: Id;
  bends: Record<Side, 1 | -1>;
  contactSupport: Side | 'both' | 'none';
  contacts: [ContactFoot, ContactFoot];
  posture: { minThighDrop: number; minShinDrop: number; minAnkleDrop: number; maxCorrection: number; flight: boolean };
}
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const mix = (a: RigPoint, b: RigPoint, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const distance = (a: RigPoint, b: RigPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const smooth = (t: number) => t * t * (3 - 2 * t);
const MIN_THIGH = 10, MIN_SHIN = 11, MIN_ANKLE = 28, MAX_REACH = 37.8;
const THIGH_LO = Math.asin(MIN_THIGH / 18), THIGH_HI = Math.PI - THIGH_LO;
const STRAIGHT_REACH = 37.9999;

/** Nearest feasible ankle, with fixed bones and the renderer's SAME knee branch. */
export function projectAnkle(target: RigPoint, hip: RigPoint, bend: 1 | -1, maxX: number, maxReach = MAX_REACH, minAnkle: number = MIN_ANKLE) {
  const original = twoBone(hip, target, 18, 20, bend);
  const valid = distance(original.end, target) < 1e-6
    && original.joint.y - hip.y >= MIN_THIGH - 1e-7
    && original.end.y - original.joint.y >= MIN_SHIN - 1e-7
    && target.y - hip.y >= minAnkle - 1e-7
    && Math.abs(target.x - hip.x) <= maxX + 1e-7
    && distance(target, hip) <= maxReach + 1e-7;
  if (valid) return { point: { ...target }, correction: 0 };
  const bendMin = Math.acos((maxReach ** 2 - 18 ** 2 - 20 ** 2) / (2 * 18 * 20));
  const requested = { x: target.x - hip.x, y: target.y - hip.y };
  const evaluate = (thighAngle: number) => {
    const knee = { x: 18 * Math.cos(thighAngle), y: 18 * Math.sin(thighAngle) };
    const shinDrop = Math.max(MIN_SHIN, minAnkle - knee.y);
    if (shinDrop > 20) return undefined;
    const shinLo = Math.asin(shinDrop / 20);
    let lo = Math.max(shinLo, Math.acos(clamp((maxX - knee.x) / 20, -1, 1)));
    let hi = Math.min(Math.PI - shinLo, Math.acos(clamp((-maxX - knee.x) / 20, -1, 1)));
    if (bend === 1) hi = Math.min(hi, thighAngle - bendMin);
    else lo = Math.max(lo, thighAngle + bendMin);
    if (lo > hi) return undefined;
    const angle = Math.atan2(requested.y - knee.y, requested.x - knee.x);
    const candidates = [lo, hi];
    if (angle >= 0) candidates.push(clamp(angle, lo, hi));
    let best: { point: RigPoint; score: number; angle: number } | undefined;
    for (const shinAngle of candidates) {
      const point = { x: knee.x + 20 * Math.cos(shinAngle), y: knee.y + 20 * Math.sin(shinAngle) };
      const score = (point.x - requested.x) ** 2 + (point.y - requested.y) ** 2;
      if (!best || score < best.score) best = { point, score, angle: thighAngle };
    }
    return best;
  };
  let best: ReturnType<typeof evaluate>;
  const step = (THIGH_HI - THIGH_LO) / 100;
  for (let i = 0; i <= 100; i++) {
    const candidate = evaluate(THIGH_LO + step * i);
    if (candidate && (!best || candidate.score < best.score)) best = candidate;
  }
  if (!best) throw new Error('No feasible projected leg posture');
  let lo = Math.max(THIGH_LO, best.angle - step), hi = Math.min(THIGH_HI, best.angle + step);
  for (let i = 0; i < 18; i++) {
    const a = evaluate(lo + (hi - lo) / 3), b = evaluate(hi - (hi - lo) / 3);
    if (a && a.score < best.score) best = a;
    if (b && b.score < best.score) best = b;
    if ((a?.score ?? Infinity) < (b?.score ?? Infinity)) hi -= (hi - lo) / 3;
    else lo += (hi - lo) / 3;
  }
  const point = { x: hip.x + best.point.x, y: hip.y + best.point.y };
  return { point, correction: distance(point, target) };
}

/**
 * Foot policy only: the reference body, cadence, arm animation and combat are
 * unchanged. A contact is released rather than sliding an ankle into a folded
 * shin. Both feet may genuinely be unplanted during the run-like transfer.
 */
export function constrainProjectedGait(previous: ProjectedPostureState | undefined,
  source: GaitSample, input: RigInput, position: RigPoint,
  labOptions: { ankleFloor?: 24 | 28; maxX?: 12 } = {}) {
  const time = source.state.time;
  const reset = !previous || time < previous.time || time - previous.time > .25;
  // Paused evaluation must not consume a landing or advance a transfer twice.
  // The simulation owns time: input changes take effect on its next advancing tick.
  if (!reset && time === previous.time) return { state: previous, sample: previous.sample };
  const dt = reset ? 0 : Math.max(0, time - previous.time);
  const reference = evaluateGaitPose(input, position, source);
  // Match the frozen rig's branch convention in BOTH art views. A mirror
  // change is transferred per physical leg, never inverted while planted.
  const desiredBend = (input.flipped ? 1 : -1) as 1 | -1;
  const targetDepth = source.active ? clamp(Math.abs(source.state.direction.y) / .6, 0, 1) : 0;
  const depth = reset ? targetDepth : previous.depth + (targetDepth - previous.depth) * (1 - Math.exp(-dt * 18));
  const maxX = labOptions.maxX ?? 20 - depth * 8;
  const project = (world: RigPoint, side: Side, bend: 1 | -1, maxReach = MAX_REACH) => {
    const hip = reference.parts[`thigh_${side}`].start;
    const result = projectAnkle({ x: world.x - position.x, y: world.y - position.y }, hip, bend, maxX, maxReach, labOptions.ankleFloor ?? MIN_ANKLE);
    return { point: { x: result.point.x + position.x, y: result.point.y + position.y }, correction: result.correction };
  };
  const sourcePoint = (id: Id) => ({ x: source.state.feet[id].ground.x, y: source.state.feet[id].ground.y - source.state.feet[id].lift });
  const feet = (reset ? [0, 1].map(n => {
    const id = n as Id, p = sourcePoint(id), side = id === source.state.nearId ? 'near' : 'far';
    const h = reference.parts[`thigh_${side}`].start, k = reference.parts[`greave_${side}`].start;
    return { id, world: p, ground: { ...p }, source: { ...p }, lift: 0,
      planted: true, epoch: 0, releasedAt: time, offset: { x: 0, y: 0 }, bend: desiredBend, hip: { x: h.x + position.x, y: h.y + position.y }, knee: { x: k.x + position.x, y: k.y + position.y } };
  }) : previous.feet.map(f => ({ ...f, world: { ...f.world }, ground: { ...f.ground },
    source: { ...f.source }, offset: { ...f.offset }, hip: { ...f.hip }, knee: { ...f.knee }, transfer: f.transfer ? { ...f.transfer } : undefined }))) as [ContactFoot, ContactFoot];
  let nearId = reset ? source.state.nearId : previous.nearId;
  if (!reset && (previous.view !== input.view || previous.flipped !== input.flipped)) {
    const cost = (near: Id) => feet.reduce((sum, foot) => { const side = foot.id === near ? 'near' : 'far', h = reference.parts[`thigh_${side}`].start, hip = { x: h.x + position.x, y: h.y + position.y }; return sum + project(foot.world, side, foot.bend).correction ** 2 + distance(hip, foot.hip) ** 2 * 4; }, 0);
    if (cost((1 - nearId) as Id) < cost(nearId)) nearId = (1 - nearId) as Id;
  }
  // supportId may be reassigned immediately by the source's idle-settle
  // scheduler. Only an observed prior swing identifies a physical landing.
  const landed = !reset && source.state.steps === previous.steps + 1 ? previous.sample.state.swing?.id : undefined;
  let maxCorrection = 0;
  for (const foot of feet) {
    const side = foot.id === nearId ? 'near' : 'far';
    const planned = sourcePoint(foot.id), settleTarget = source.active ? planned : source.feet[side].display, swing = source.state.swing?.id === foot.id ? source.state.swing : undefined;
    if (landed === foot.id && !swing) {
      const result = project(planned, side, foot.bend);
      foot.world = result.point; foot.ground = { ...result.point }; foot.lift = 0;
      foot.planted = true; foot.trackStart = undefined;
      maxCorrection = Math.max(maxCorrection, result.correction);
    } else if (swing) {
      if (foot.trackStart !== swing.start) {
        foot.offset = { x: foot.world.x - foot.source.x, y: foot.world.y - foot.source.y };
        foot.trackStart = swing.start; foot.releasedAt = swing.start;
      }
      const progress = clamp((time - swing.start) / swing.duration, 0, 1);
      const factor = 1 - smooth(progress);
      const requested = { x: planned.x + foot.offset.x * factor, y: planned.y + foot.offset.y * factor };
      const result = project(requested, side, foot.bend);
      foot.world = result.point; foot.lift = source.state.feet[foot.id].lift;
      foot.ground = { x: foot.world.x, y: foot.world.y + foot.lift }; foot.planted = false;
      maxCorrection = Math.max(maxCorrection, result.correction);
    } else if (foot.planted) {
      const result = project(foot.ground, side, foot.bend);
      if (result.correction <= 1e-7 && (source.active || distance(foot.world, settleTarget) < .08)) { foot.world = { ...foot.ground }; foot.lift = 0; }
      else { foot.planted = false; foot.releasedAt = time - dt; foot.trackStart = undefined; }
    }
    if (!foot.planted && !swing && landed !== foot.id) {
      const hip = reference.parts[`thigh_${side}`].start;
      const comfortable = source.active
        ? { x: position.x + hip.x, y: position.y + hip.y + 33 }
        : settleTarget;
      const requested = mix(foot.world, comfortable, 1 - Math.exp(-dt * 22));
      const result = project(requested, side, foot.bend);
      foot.world = result.point; foot.lift = Math.min(1.8, Math.max(0, time - foot.releasedAt) * 30);
      foot.ground = { x: foot.world.x, y: foot.world.y + foot.lift };
      maxCorrection = Math.max(maxCorrection, result.correction);
      if (!source.active && distance(foot.world, settleTarget) < .08) {
        foot.world = { ...settleTarget }; foot.ground = { ...settleTarget }; foot.lift = 0;
        foot.planted = true;
      }
    }
    // A bent leg cannot change IK branch continuously in 2D. Transfer only
    // while free, via a nearly straight plateau; never flip a planted knee.
    const h = reference.parts[`thigh_${side}`].start;
    const hipWorld = { x: h.x + position.x, y: h.y + position.y };
    if (!foot.planted && !foot.transfer && foot.bend !== desiredBend) {
      const start = previous?.feet[foot.id].world ?? foot.world;
      foot.transfer = { stage: 'extend', stageAt: time, start: time, fromAngle: Math.atan2(start.y - hipWorld.y, start.x - hipWorld.x),
        fromLength: Math.min(STRAIGHT_REACH, distance(start, hipWorld)),
        fromLift: previous?.feet[foot.id].lift ?? foot.lift, to: desiredBend };
    }
    if (foot.transfer) {
      const transfer = foot.transfer;
      // Each phase boundary is an observed output, not a time window that a
      // low-frame-rate update can skip. Flip only AFTER emitting old-bend straight.
      let t: number;
      if (transfer.stage === 'extend') {
        t = .42 * clamp((time - transfer.start) / .06, 0, 1);
        if (t >= .42) { transfer.stage = 'straight'; transfer.stageAt = time; }
      } else if (transfer.stage === 'straight') {
        t = .58; foot.bend = transfer.to;
        transfer.stage = 'retract'; transfer.stageAt = time;
      } else t = .58 + .42 * clamp((time - transfer.stageAt) / .06, 0, 1);
      const goal = project(foot.world, side, transfer.to).point;
      const goalAngle = Math.atan2(goal.y - hipWorld.y, goal.x - hipWorld.x);
      let angle = transfer.fromAngle + Math.atan2(Math.sin(goalAngle - transfer.fromAngle), Math.cos(goalAngle - transfer.fromAngle)) * smooth(t);
      const length = t < .42
        ? transfer.fromLength + (STRAIGHT_REACH - transfer.fromLength) * smooth(t / .42)
        : t <= .58 ? STRAIGHT_REACH
        : STRAIGHT_REACH + (distance(goal, hipWorld) - STRAIGHT_REACH) * smooth((t - .58) / .42);
      const unitX = clamp(Math.cos(angle), -maxX / length, maxX / length);
      angle = Math.acos(unitX);

      const requested = { x: hipWorld.x + Math.cos(angle) * length, y: hipWorld.y + Math.sin(angle) * length };
      foot.world = project(requested, side, foot.bend, STRAIGHT_REACH).point;
      foot.planted = false;
      foot.lift = Math.max(foot.lift, transfer.fromLift * (1 - t), 1.8 * Math.sin(Math.PI * t));
      foot.ground = { x: foot.world.x, y: foot.world.y + foot.lift };
      if (t >= 1) {
        foot.transfer = undefined;
        if (!swing && (source.active || distance(foot.world, settleTarget) < .08)) {
          foot.planted = true; foot.lift = 0; foot.ground = { ...foot.world };
        }
      }
    }
    // Epochs describe actual new ground contacts, not source schedule landings
    // suppressed by a free-leg transfer.
    const prior = reset ? undefined : previous.feet[foot.id];
    foot.epoch = (prior?.epoch ?? 0) + (foot.planted && (!prior?.planted || distance(foot.ground, prior.ground) > 1e-7) ? 1 : 0);
    foot.hip = hipWorld;
    const solved = twoBone(h, { x: foot.world.x - position.x, y: foot.world.y - position.y }, 18, 20, foot.bend);
    foot.knee = { x: solved.joint.x + position.x, y: solved.joint.y + position.y };
    foot.source = planned;
  }
  const outputFeet = {} as GaitSample['feet'];
  let minThighDrop = Infinity, minShinDrop = Infinity, minAnkleDrop = Infinity, maxFootSpeed = 0;
  for (const foot of feet) {
    const side = foot.id === nearId ? 'near' : 'far';
    outputFeet[side] = { id: foot.id, ground: { ...foot.ground }, display: { ...foot.world }, lift: foot.lift };
    const hip = reference.parts[`thigh_${side}`].start;
    const leg = twoBone(hip, { x: foot.world.x - position.x, y: foot.world.y - position.y }, 18, 20, foot.bend);
    minThighDrop = Math.min(minThighDrop, leg.joint.y - hip.y);
    minShinDrop = Math.min(minShinDrop, leg.end.y - leg.joint.y);
    minAnkleDrop = Math.min(minAnkleDrop, leg.end.y - hip.y);
    if (dt && previous) maxFootSpeed = Math.max(maxFootSpeed, distance(foot.world, previous.feet[foot.id].world) / dt);
  }
  const nearPlanted = feet[nearId].planted, farPlanted = feet[(1 - nearId) as Id].planted;
  const sample: ProjectedGaitSample = { ...source, nearId, feet: outputFeet, contacts: feet,
    bends: { near: feet[nearId].bend, far: feet[(1 - nearId) as Id].bend },
    contactSupport: nearPlanted ? farPlanted ? 'both' : 'near' : farPlanted ? 'far' : 'none',
    maxFootSpeed, posture: { minThighDrop, minShinDrop, minAnkleDrop, maxCorrection, flight: feet.every(f => !f.planted) } };
  const state: ProjectedPostureState = { time, nearId, depth, steps: source.state.steps,
    view: input.view, flipped: input.flipped, feet, sample };
  return { state, sample };
}
