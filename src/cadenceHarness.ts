/** Separate QA entry point; never imported by gameplay or the frozen fixture. */
import Phaser from 'phaser';
import floorUrl from './assets/environment-v1/slate-court.webp';
import { FixtureKnightSprite } from '../experiments/gait/fixture/FixtureKnightSprite.js';
import { buildTrace, traceMetrics, type Route, type TraceFrame } from '../experiments/gait/routes.js';
import { buildCadenceTrace } from '../experiments/gait/cadenceLab.js';

const query = new URLSearchParams(location.search);
const variant = query.get('variant') === 'baseline' ? 'baseline' : query.get('variant') === '28' ? 28 : 24;
const scale = query.get('detail') === '1' ? 3 : 1;
const width = scale === 1 ? 720 : 1200, height = scale === 1 ? 300 : 410, panelWidth = width / 2;
const anchor = (i: number) => ({ x: i * panelWidth + panelWidth / 2, y: scale === 1 ? 210 : 360 });
const route = document.querySelector<HTMLSelectElement>('#route')!;
const markers = document.querySelector<HTMLInputElement>('#markers')!;
const slider = document.querySelector<HTMLInputElement>('#time')!;
const status = document.querySelector('#status')!;
let paused = true, clock = 0;
document.querySelector('#pause')!.addEventListener('click', () => paused = !paused);
slider.addEventListener('input', () => { paused = true; clock = Number(slider.value); });
route.addEventListener('change', () => { clock = 0; });
const traces = Object.fromEntries((['east', 'northeast', 'southeast', 'turns'] as Route[]).map(r => {
  const baseline = buildTrace(r);
  const frames = variant === 'baseline' ? baseline : buildCadenceTrace(r, 60, variant).map((f, i) => ({
    ...baseline[i], gait: f.gait, newPose: f.pose,
  }));
  return [r, frames];
})) as Record<Route, TraceFrame[]>;
const metrics = Object.fromEntries(Object.entries(traces).map(([r, t]) => [r, traceMetrics(t)]));

class CompactCadence extends Phaser.Scene {
  actors: FixtureKnightSprite[] = [];
  floors: Phaser.GameObjects.TileSprite[] = [];
  overlays: Phaser.GameObjects.Graphics[] = [];
  current!: TraceFrame;
  recording = false;
  startedAt = 0;
  recorded: any[] = [];

  preload() { FixtureKnightSprite.preload(this); this.load.image('cadence-court', floorUrl); }
  create() {
    for (let i = 0; i < 2; i++) {
      const x = i * panelWidth;
      const clip = this.make.graphics({ x: 0, y: 0 }).fillStyle(0xffffff).fillRect(x, 0, panelWidth, height);
      const mask = clip.createGeometryMask();
      // Two compact repeating floor surfaces replace the frozen fixture's
      // twenty-four large patches. The camera still moves by actual world px.
      this.floors.push(this.add.tileSprite(x + panelWidth / 2, height / 2, panelWidth, height, 'cadence-court')
        .setTileScale(scale).setTint(0xadb8b7).setDepth(-1000));
      const actor = new FixtureKnightSprite(this); actor.setMask(mask); actor.setEquipment({ helmet: 'ward', chest: 'ward', gauntlets: 'ward', legs: 'ward' });
      this.actors.push(actor); this.overlays.push(this.add.graphics().setDepth(9000).setMask(mask));
      this.add.text(x + 10, 12, (i ? `CANDIDATE ${variant === 'baseline' ? 'frozen baseline' : `150ms / floor ${variant}`}` : 'CURRENT time-only walk') + (scale === 1 ? ' / 88px' : ' / 3x detail'),
        { fontSize: scale === 1 ? '12px' : '15px', color: '#e0e4d5', backgroundColor: '#152023' }).setDepth(10000);
    }
    this.add.graphics().lineStyle(1, 0x81938a).lineBetween(panelWidth, 0, panelWidth, height).setDepth(10000);
    Object.assign(window, { cadenceHarness: {
      ready: true, variant, scale, gameplayDefaultChanged: false,
      render: (options: { route?: Route; time?: number; markers?: boolean }) => {
        paused = true; if (options.route) route.value = options.route;
        if (options.time !== undefined) clock = options.time;
        if (options.markers !== undefined) markers.checked = options.markers;
        this.drawFrame(); return this.snapshot();
      },
      play: () => paused = false, pause: () => paused = true,
      snapshot: () => this.snapshot(),
      startRecording: () => { this.recorded = []; this.startedAt = performance.now(); this.recording = true; },
      stopRecording: () => { this.recording = false; return this.report(); },
    } });
    this.drawFrame();
  }
  update(_: number, delta: number) {
    if (!paused) clock = this.recording ? Math.min(4, clock + delta / 1000) : (clock + delta / 1000) % 4;
    this.drawFrame();
  }
  geometry() {
    const camera = this.current.position;
    return this.actors.map((actor, i) => {
      const a = anchor(i), raw = actor.renderGeometry();
      const world = (p: { x: number; y: number }) => ({ x: (p.x - a.x) / scale + camera.x, y: (p.y - a.y) / scale + camera.y });
      return { parts: Object.fromEntries(Object.entries(raw.parts).map(([id, p]) => [id, world(p)])), crown: world(raw.crown) };
    });
  }
  snapshot() {
    return { variant, scale, width, height, floorSurfaces: 2, route: route.value, time: this.current.time,
      position: { ...this.current.position }, gameplayDefaultChanged: false, metrics: metrics[route.value],
      rendered: this.geometry(), actors: this.actors.map(a => a.snapshot()) };
  }
  drawFrame() {
    const trace = traces[route.value as Route], f = trace[Math.max(0, Math.min(trace.length - 1, Math.round(clock * 60)))];
    this.current = f; slider.value = String(f.time);
    for (let i = 0; i < 2; i++) {
      const a = anchor(i), camera = f.position;
      // TileSprite samples the same texture in world space. Anchor remains the
      // actor's projected floor origin; only the viewing camera follows it.
      this.floors[i].setTilePosition(camera.x + (panelWidth / 2 - (a.x - i * panelWidth)) / scale,
        camera.y + (height / 2 - a.y) / scale);
      this.actors[i].drawWithPose({ ...f.input, position: a }, i ? f.newPose : f.oldPose);
      this.actors[i].effects(0xffffff, 0, 1, scale);
      const overlay = this.overlays[i]; overlay.clear();
      if (markers.checked) for (const side of ['near', 'far'] as const) {
        const p = i ? f.gait.feet[side].ground : { x: f.position.x + f.oldPose.feet[side].x, y: f.position.y + f.oldPose.feet[side].y };
        const planted = i ? f.gait.contacts[f.gait.feet[side].id].planted : true;
        overlay.lineStyle(1, planted ? 0x69cf9d : 0xe0ac60).strokeCircle(a.x + (p.x - camera.x) * scale, a.y + (p.y - camera.y) * scale, 4 * scale);
      }
    }
    if (this.recording) {
      const rendered = this.geometry()[1];
      const ankleError = Math.max(...(['near', 'far'] as const).map(side => {
        const p = rendered.parts[`foot_${side}`], q = f.gait.feet[side].display; return Math.hypot(p.x - q.x, p.y - q.y);
      }));
      this.recorded.push({ wallTime: (performance.now() - this.startedAt) / 1000, time: f.time,
        position: { ...f.position }, view: f.input.view, flipped: f.input.flipped, motion: f.input.motion,
        nearId: f.gait.nearId, contactSupport: f.gait.contactSupport,
        contacts: f.gait.contacts.map(c => ({ id: c.id, planted: c.planted, epoch: c.epoch, ground: { ...c.ground }, lift: c.lift, bend: c.bend, transfer: c.transfer ? { ...c.transfer } : undefined })),
        steps: f.gait.state.steps, parts: rendered.parts, crown: rendered.crown, ankleError });
    }
    status.textContent = `t ${f.time.toFixed(3)}s | 150 px/s | ${variant} | contacts ${f.gait.contacts.filter(c => c.planted).length} | native trial only; not gameplay acceptance`;
  }
  report() {
    let ankleError = 0, drift = 0, supportDelta = 0, thigh = Infinity, shin = Infinity, ankle = Infinity;
    let walk = 0, flight = 0, maxLayerStep = 0, maxPhysicalKneeStep = 0, maxPhysicalAnkleStep = 0;
    let transferOverlap = 0, reversalTime = 0, reversalFlight = 0;
    const observedLandings: { time: number; id: number; epoch: number }[] = [];
    const renderGaps: number[] = [], simulationGaps: number[] = [];
    for (let i = 0; i < this.recorded.length; i++) {
      const f = this.recorded[i]; ankleError = Math.max(ankleError, f.ankleError);
      for (const side of ['near', 'far']) {
        const h = f.parts[`thigh_${side}`], k = f.parts[`greave_${side}`], a = f.parts[`foot_${side}`];
        thigh = Math.min(thigh, k.y - h.y); shin = Math.min(shin, a.y - k.y); ankle = Math.min(ankle, a.y - h.y);
      }
      if (!i) continue;
      const p = this.recorded[i - 1], dt = f.time - p.time;
      renderGaps.push(f.wallTime - p.wallTime); simulationGaps.push(dt);
      if (dt <= 0) continue;
      if (f.motion === 'walk' && p.motion === 'walk') {
        walk += dt; const flying = f.contacts.every((c: any) => !c.planted); if (flying) flight += dt;
        if (f.contacts.every((c: any) => !!c.transfer)) transferOverlap += dt;
        if (route.value === 'turns' && f.time >= 1.7 && f.time < 2.1) { reversalTime += dt; if (flying) reversalFlight += dt; }
      }
      for (const id of [0, 1]) {
        const a = p.contacts[id], b = f.contacts[id];
        const beforeSide = id === p.nearId ? 'near' : 'far', afterSide = id === f.nearId ? 'near' : 'far';
        const kneeBefore = p.parts[`greave_${beforeSide}`], kneeAfter = f.parts[`greave_${afterSide}`];
        const footBefore = p.parts[`foot_${beforeSide}`], footAfter = f.parts[`foot_${afterSide}`];
        maxPhysicalKneeStep = Math.max(maxPhysicalKneeStep, Math.hypot(kneeAfter.x - kneeBefore.x, kneeAfter.y - kneeBefore.y));
        maxPhysicalAnkleStep = Math.max(maxPhysicalAnkleStep, Math.hypot(footAfter.x - footBefore.x, footAfter.y - footBefore.y));
        if (a.epoch !== b.epoch) observedLandings.push({ time: f.time, id, epoch: b.epoch });
        if (a.planted && b.planted && a.epoch === b.epoch) {
          const delta = Math.hypot(footAfter.x - footBefore.x, footAfter.y - footBefore.y); supportDelta = Math.max(supportDelta, delta); drift = Math.max(drift, delta / dt);
        }
      }
      for (const [id, point] of Object.entries(f.parts) as [string, { x: number; y: number }][]) maxLayerStep = Math.max(maxLayerStep, Math.hypot(point.x - p.parts[id].x, point.y - p.parts[id].y));
    }
    return { variant, scale, canvas: { width, height }, floorSurfaces: 2, gameplayDefaultChanged: false,
      metrics: { samples: this.recorded.length, maxRenderedAnkleError: ankleError, maxRenderedSupportDriftPxPerSecond: drift,
        maxRenderedSupportFrameDelta: supportDelta, minRenderedThighDrop: thigh, minRenderedShinDrop: shin,
        minRenderedAnkleDrop: ankle, maxRenderedLayerFrameDelta: maxLayerStep,
        maxRenderedPhysicalKneeFrameDelta: maxPhysicalKneeStep, maxRenderedPhysicalAnkleFrameDelta: maxPhysicalAnkleStep,
        sampledFlightFraction: walk ? flight / walk : 0, sampledReversalFlightFraction: reversalTime ? reversalFlight / reversalTime : null,
        sampledSimultaneousTransferSeconds: transferOverlap, observedLandings,
        samplingNote: 'Right-endpoint rendered samples, not a continuous-time contact integral; low FPS can omit short support/branch-transfer states' },
      timing: { renderWallGapsSeconds: renderGaps, simulationGapsSeconds: simulationGaps,
        firstSimulationTime: this.recorded[0]?.time, lastSimulationTime: this.recorded.at(-1)?.time,
        firstWallTime: this.recorded[0]?.wallTime, lastWallTime: this.recorded.at(-1)?.wallTime }, samples: this.recorded };
  }
}
new Phaser.Game({ type: Phaser.CANVAS, width, height, parent: 'game', backgroundColor: '#1d282b', scene: CompactCadence,
  banner: false, audio: { noAudio: true }, render: { antialias: true, pixelArt: false } });
