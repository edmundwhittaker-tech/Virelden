/** Engine-independent rules. Coordinates are flat ground positions, never screen pixels. */
export interface Point { x: number; y: number }
export interface Pillar extends Point { radius: number; height: number }
export const SIZE = 640;
export const STEP = 1 / 60;
export const SPAWN: Point = { x: 100, y: 480 };
export const RELIC: Point = { x: 570, y: 550 };
export const PILLARS: Pillar[] = [
  { x: 170, y: 170, radius: 30, height: 150 },
  { x: 470, y: 170, radius: 30, height: 180 },
  { x: 170, y: 420, radius: 30, height: 115 },
  { x: 470, y: 450, radius: 30, height: 145 },
];
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
export function unit(x: number, y: number): Point {
  const n = Math.hypot(x, y);
  return n ? { x: x / n, y: y / n } : { x: 0, y: 0 };
}
export function project(p: Point): Point {
  return { x: 640 + (p.x - p.y) * .9, y: 105 + (p.x + p.y) * .45 };
}
export function unproject(p: Point): Point {
  const x = (p.x - 640) / .9, y = (p.y - 105) / .45;
  return { x: (x + y) / 2, y: (y - x) / 2 };
}
export function screenDirection(x: number, y: number): Point { return unit(x + 2 * y, 2 * y - x); }
export function blocked(p: Point, radius = 13): boolean {
  return p.x < radius || p.y < radius || p.x > SIZE - radius || p.y > SIZE - radius ||
    PILLARS.some(o => distance(p, o) < o.radius + radius);
}
/** Small substeps prevent rolls tunnelling through obstacles; separate axes permit sliding. */
export function move(p: Point, delta: Point, radius = 13): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.y) / 5));
  for (let i = 0; i < steps; i++) {
    const nx = { x: p.x + delta.x / steps, y: p.y };
    if (!blocked(nx, radius)) p.x = nx.x;
    const ny = { x: p.x, y: p.y + delta.y / steps };
    if (!blocked(ny, radius)) p.y = ny.y;
  }
}
export function clearLine(a: Point, b: Point): boolean {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  return !PILLARS.some(o => {
    const t = len2 ? Math.max(0, Math.min(1, ((o.x-a.x)*dx + (o.y-a.y)*dy) / len2)) : 0;
    return distance(o, { x: a.x + t*dx, y: a.y + t*dy }) < o.radius;
  });
}
export function inArc(origin: Point, target: Point, angle: number, reach: number, halfAngle = .95): boolean {
  const d = distance(origin, target);
  const diff = Math.atan2(Math.sin(Math.atan2(target.y-origin.y, target.x-origin.x)-angle), Math.cos(Math.atan2(target.y-origin.y, target.x-origin.x)-angle));
  return d <= reach && Math.abs(diff) <= halfAngle && clearLine(origin, target);
}
export interface Player extends Point {
  hp: number; stamina: number; angle: number; roll: number; rollDir: Point;
  attack: number; attackAngle: number; hitApplied: boolean; recovery: number; hurt: number;
}
export type EnemyMode = 'idle' | 'chase' | 'windup' | 'recover' | 'dead';
export interface Enemy extends Point {
  id: number; hp: number; mode: EnemyMode; timer: number; angle: number; hurt: number;
}
export interface GameState {
  player: Player; enemies: Enemy[]; relic: boolean; time: number;
  stats: { attacks: number; rolls: number; hits: number; damageTaken: number };
}
export interface Input { x: number; y: number; aim: Point; attack?: boolean; roll?: boolean; interact?: boolean }
export function createState(relic = false): GameState {
  return {
    player: { ...SPAWN, hp: 100, stamina: 100, angle: -.7, roll: 0, rollDir: {x:0,y:0}, attack: 0, attackAngle: 0, hitApplied: false, recovery: 0, hurt: 0 },
    enemies: [{ x: 330, y: 350 }, { x: 530, y: 250 }].map((p, id) => ({ ...p, id, hp: 90, mode: 'idle', timer: 0, angle: 0, hurt: 0 })),
    relic, time: 0, stats: { attacks: 0, rolls: 0, hits: 0, damageTaken: 0 },
  };
}
export function tick(s: GameState, input: Input, dt = STEP): GameState {
  dt = Math.max(0, Math.min(.05, dt));
  const p = s.player;
  if (p.hp <= 0) return s;
  s.time += dt;
  const direction = unit(input.x, input.y);
  if (distance(p, input.aim) > 2 && p.roll <= 0) p.angle = Math.atan2(input.aim.y-p.y, input.aim.x-p.x);
  p.recovery = Math.max(0, p.recovery-dt);
  p.hurt = Math.max(0, p.hurt-dt);
  if (input.roll && p.roll <= 0 && p.attack <= 0 && p.stamina >= 28) {
    p.roll = .32;
    p.rollDir = direction.x || direction.y ? direction : { x: Math.cos(p.angle), y: Math.sin(p.angle) };
    p.stamina -= 28; p.recovery = .7; s.stats.rolls++;
  }
  if (input.attack && p.roll <= 0 && p.attack <= 0 && p.stamina >= 16) {
    p.attack = .34; p.attackAngle = p.angle; p.hitApplied = false;
    p.stamina -= 16; p.recovery = .65; s.stats.attacks++;
  }
  if (p.roll > 0) {
    move(p, {x:p.rollDir.x*420*dt, y:p.rollDir.y*420*dt});
    p.roll = Math.max(0, p.roll-dt);
  } else {
    const speed = p.attack > 0 ? 65 : 160;
    move(p, {x:direction.x*speed*dt, y:direction.y*speed*dt});
  }
  if (p.attack > 0) {
    p.attack = Math.max(0, p.attack-dt);
    if (p.attack <= .19 && !p.hitApplied) {
      p.hitApplied = true;
      for (const e of s.enemies) if (e.hp > 0 && inArc(p, e, p.attackAngle, 88)) {
        e.hp = Math.max(0, e.hp-(s.relic ? 45 : 30)); e.hurt = .18; s.stats.hits++;
        if (!e.hp) e.mode = 'dead';
      }
    }
  }
  if (p.recovery <= 0 && p.roll <= 0 && p.attack <= 0) p.stamina = Math.min(100, p.stamina+26*dt);
  if (input.interact) {
    if (!s.relic && distance(p, RELIC) < 65) s.relic = true;
    else if (distance(p, SPAWN) < 65) return createState(s.relic);
  }
  for (const e of s.enemies) {
    e.hurt = Math.max(0, e.hurt-dt);
    if (e.hp <= 0) continue;
    if (e.mode === 'windup') {
      e.timer -= dt;
      if (e.timer <= 0) {
        if (p.roll <= .1 && p.hurt <= 0 && inArc(e, p, e.angle, 84, .8)) {
          p.hp = Math.max(0, p.hp-20); p.hurt = .65; s.stats.damageTaken += 20;
        }
        e.mode = 'recover'; e.timer = .9;
      }
    } else if (e.mode === 'recover') {
      e.timer -= dt;
      if (e.timer <= 0) e.mode = 'chase';
    } else {
      const d = distance(e, p);
      if (d < 74 && clearLine(e, p)) {
        e.mode = 'windup'; e.timer = .72; e.angle = Math.atan2(p.y-e.y, p.x-e.x);
      } else if (d < 255) {
        e.mode = 'chase';
        const v = unit(p.x-e.x, p.y-e.y);
        move(e, {x:v.x*75*dt, y:v.y*75*dt});
        e.angle = Math.atan2(v.y, v.x);
      } else e.mode = 'idle';
    }
  }
  return s;
}
export const SAVE_KEY = 'virelden:prototype:v1';
export function decodeSave(raw: string | null): boolean {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    return typeof value === 'object' && value !== null && 'version' in value && value.version === 1 && 'relic' in value && value.relic === true;
  } catch { return false; }
}
