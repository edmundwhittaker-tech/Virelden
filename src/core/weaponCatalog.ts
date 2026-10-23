import {type EquipmentContext} from './equipment.js';

export const WEAPON_IDS = Object.freeze(['sword', 'spear', 'hammer', 'axe', 'falchion', 'poleaxe'] as const);
export type WeaponId = typeof WEAPON_IDS[number];
export type ContactShape = Readonly<{kind: 'sector'; halfAngle: number} | {kind: 'capsule'; start: number; radius: number}>;
export interface WeaponProfile {
 readonly kind: 'weapon'; readonly id: WeaponId; readonly name: string; readonly description: string;
 readonly damage: number; readonly range: number; readonly windup: number; readonly active: number; readonly recovery: number;
 readonly cost: number; readonly stagger: number; readonly shape: ContactShape;
 readonly hands: 1 | 2; readonly silhouette: string;
 readonly motion: Readonly<{kind: 'cut' | 'thrust' | 'overhead' | 'hook'; startAngle: number; endAngle: number}>;
}
const profile = (p: WeaponProfile): WeaponProfile => Object.freeze({...p, shape: Object.freeze(p.shape), motion: Object.freeze(p.motion)});
/** Original damage/timing/cost are retained; hammer contact is deliberately forward-only. */
export const WEAPON_CATALOG: Readonly<Record<WeaponId, WeaponProfile>> = Object.freeze({
 sword: profile({kind: 'weapon', id: 'sword', name: 'Arming sword', damage: 30, range: 75, windup: .2, active: .12, recovery: .34, cost: 22, stagger: .22,
  shape: {kind: 'sector', halfAngle: 1.05}, hands: 1, silhouette: 'straight-double-edge', motion: {kind: 'cut', startAngle: -1.05, endAngle: 1.05}, description: 'Broad, quick sweep. Reliable against close groups.'}),
 spear: profile({kind: 'weapon', id: 'spear', name: 'Iron spear', damage: 25, range: 115, windup: .28, active: .12, recovery: .4, cost: 20, stagger: .22,
  shape: {kind: 'sector', halfAngle: .32}, hands: 1, silhouette: 'long-shaft-leaf-tip', motion: {kind: 'thrust', startAngle: -.32, endAngle: .32}, description: 'Long, narrow thrust. Keep enemies at a distance.'}),
 hammer: profile({kind: 'weapon', id: 'hammer', name: 'War hammer', damage: 52, range: 68, windup: .58, active: .12, recovery: .68, cost: 38, stagger: .85,
  shape: {kind: 'sector', halfAngle: .48}, hands: 1, silhouette: 'short-shaft-block-head', motion: {kind: 'overhead', startAngle: -1.85, endAngle: .4}, description: 'Slow forward overhead impact. High stagger, but no rear reach.'}),
 axe: profile({kind: 'weapon', id: 'axe', name: 'Ward axe', damage: 40, range: 82, windup: .38, active: .14, recovery: .52, cost: 29, stagger: .48,
  shape: {kind: 'sector', halfAngle: .72}, hands: 1, silhouette: 'single-wedge-axe', motion: {kind: 'cut', startAngle: -.72, endAngle: .72}, description: 'A deliberate narrow cleave with strong stagger. Commit to the windup.'}),
 falchion: profile({kind: 'weapon', id: 'falchion', name: 'Iron falchion', damage: 27, range: 88, windup: .24, active: .18, recovery: .5, cost: 25, stagger: .16,
  shape: {kind: 'sector', halfAngle: 1.38}, hands: 1, silhouette: 'broad-hooked-single-edge', motion: {kind: 'cut', startAngle: -1.38, endAngle: 1.38}, description: 'Wide lateral cut and longer contact, but little stagger and an exposed recovery.'}),
 poleaxe: profile({kind: 'weapon', id: 'poleaxe', name: 'Station poleaxe', damage: 46, range: 132, windup: .54, active: .16, recovery: .72, cost: 36, stagger: .65,
  shape: {kind: 'capsule', start: 24, radius: 17}, hands: 2, silhouette: 'long-shaft-hook-and-axe', motion: {kind: 'hook', startAngle: -.5, endAngle: .3}, description: 'Two-handed forward hook. Long reach, bounded width and slow recovery.'}),
});
export function isWeaponId(value: unknown): value is WeaponId {
 return typeof value === 'string' && Object.hasOwn(WEAPON_CATALOG, value);
}
/** Point in aim-local projected pixels, x forward/y lateral. Shape is shared by collision and trail authoring. */
export function weaponShapeContains(id: WeaponId, point: {readonly x: number; readonly y: number}): boolean {
 if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
 const w = WEAPON_CATALOG[id],epsilon=1e-8; // Project/unproject roundoff, not gameplay reach padding.
 if (w.shape.kind === 'sector') return Math.hypot(point.x, point.y) <= w.range+epsilon && Math.abs(Math.atan2(point.y, point.x)) <= w.shape.halfAngle+epsilon;
 const x = Math.max(w.shape.start, Math.min(w.range - w.shape.radius, point.x));
 return Math.hypot(point.x - x, point.y) <= w.shape.radius+epsilon;
}
export interface Armory {
 readonly schema: 1; readonly owned: readonly WeaponId[]; readonly equipped: WeaponId;
 readonly levels: Readonly<Record<WeaponId, number>>;
}
export function freshArmory(archetype: 'vanguard' | 'wayfarer'): Armory {
 const id = archetype === 'wayfarer' ? 'spear' : 'sword';
 return {schema: 1, owned: [id], equipped: id, levels: {sword: 0, spear: 0, hammer: 0, axe: 0, falchion: 0, poleaxe: 0}};
}
export function grantWeapon(armory: Armory, id: unknown): Armory {
 return !isWeaponId(id) || armory.owned.includes(id) ? armory : {...armory, owned: [...armory.owned, id]};
}
export type WeaponEquipResult = {ok: true; changed: boolean; next: Armory} | {ok: false; reason: 'busy' | 'unknown-item' | 'not-owned' | 'missing-visual' | 'support-hand-required'};
/** Capability includes a verified support grip across the attack, not merely a second socket in a manifest. */
export function prepareWeaponEquip(armory: Armory, id: unknown, context: EquipmentContext, capabilities: {readonly supportHand: boolean; readonly visualReady: (weapon: WeaponProfile) => boolean}): WeaponEquipResult {
 if (!context.alive || !context.idle || context.rolling || context.interacting) return {ok: false, reason: 'busy'};
 if (!isWeaponId(id)) return {ok: false, reason: 'unknown-item'};
 if (!armory.owned.includes(id)) return {ok: false, reason: 'not-owned'};
 const item = WEAPON_CATALOG[id];
 if (item.hands === 2 && !capabilities.supportHand) return {ok: false, reason: 'support-hand-required'};
 try { if (!capabilities.visualReady(item)) return {ok: false, reason: 'missing-visual'}; }
 catch { return {ok: false, reason: 'missing-visual'}; }
 const changed = armory.equipped !== id;
 return {ok: true, changed, next: changed ? {...armory, equipped: id} : armory};
}
export const MAX_WEAPON_UPGRADE = 2;
export const WEAPON_UPGRADE_COSTS = Object.freeze([30, 60] as const);
/** Each level adds this fraction of the original damage, never compounded. */
export const WEAPON_UPGRADE_DAMAGE_BONUS = .25;
export function nextUpgradeCost(armory: Armory): number | null {
 return WEAPON_UPGRADE_COSTS[armory.levels[armory.equipped]] ?? null;
}
export function upgradedDamage(armory: Armory, id: WeaponId = armory.equipped): number {
 return WEAPON_CATALOG[id].damage * (1 + armory.levels[id] * WEAPON_UPGRADE_DAMAGE_BONUS);
}
export type UpgradeResult = {ok: true; next: Armory; currency: number; cost: number} | {ok: false; reason: 'busy' | 'not-at-forge' | 'invalid-currency' | 'upgrade-cap' | 'insufficient-marks'};
export function prepareWeaponUpgrade(armory: Armory, currency: number, atForge: boolean, context: EquipmentContext): UpgradeResult {
 if (!context.alive || !context.idle || context.rolling || context.interacting) return {ok: false, reason: 'busy'};
 if (!atForge) return {ok: false, reason: 'not-at-forge'};
 if (!Number.isSafeInteger(currency) || currency < 0 || currency > 100000) return {ok: false, reason: 'invalid-currency'};
 const cost = nextUpgradeCost(armory);
 if (cost === null) return {ok: false, reason: 'upgrade-cap'};
 if (currency < cost) return {ok: false, reason: 'insufficient-marks'};
 return {ok: true, next: {...armory, levels: {...armory.levels, [armory.equipped]: armory.levels[armory.equipped] + 1}}, currency: currency - cost, cost};
}
export function readArmory(raw: unknown): Armory | null {
 if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
 const d = raw as Record<string, unknown>;
 if (d.schema !== 1 || !Array.isArray(d.owned) || !d.owned.length || d.owned.length > WEAPON_IDS.length || d.owned.some(id => !isWeaponId(id)) || new Set(d.owned).size !== d.owned.length || !isWeaponId(d.equipped) || !d.owned.includes(d.equipped)) return null;
 if (!d.levels || typeof d.levels !== 'object' || Array.isArray(d.levels)) return null;
 const levels = d.levels as Record<string, unknown>;
 if (Object.keys(levels).length !== WEAPON_IDS.length || WEAPON_IDS.some(id => !Number.isSafeInteger(levels[id]) || Number(levels[id]) < 0 || Number(levels[id]) > MAX_WEAPON_UPGRADE)) return null;
 return {schema: 1, owned: [...d.owned] as WeaponId[], equipped: d.equipped, levels: Object.fromEntries(WEAPON_IDS.map(id => [id, levels[id]])) as Record<WeaponId, number>};
}
