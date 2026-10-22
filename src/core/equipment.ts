import {ATTRIBUTE_EFFECTS, type Attributes} from './progression.js';

export const ARMOR_SLOTS = Object.freeze(['helmet', 'chest', 'gauntlets', 'legs'] as const);
export type ArmorSlot = typeof ARMOR_SLOTS[number];
export const ARMOR_SETS = Object.freeze(['ward', 'delver', 'marcher'] as const);
export type ArmorSet = typeof ARMOR_SETS[number];
export type ArmorId = `${ArmorSet}-${ArmorSlot}`;
export type ArmorVisualKey = `${ArmorSet}/${ArmorSlot}`;
export interface ArmorItem {
 readonly kind: 'armor'; readonly id: ArmorId; readonly set: ArmorSet; readonly slot: ArmorSlot;
 readonly name: string; readonly visual: ArmorVisualKey;
 readonly defense: number; readonly weight: number; readonly maxHp: number; readonly maxStamina: number;
}
const SET_DATA = {
 ward: {name: 'Ward plate', defense: [3, 7, 2, 4], weight: [2, 6, 2, 4], hp: [0, 0, 0, 0], stamina: [0, 0, 0, 0]},
 delver: {name: 'Delver plate', defense: [2, 5, 1, 3], weight: [1, 4, 1, 3], hp: [-1, -4, -1, -2], stamina: [1, 4, 1, 2]},
 marcher: {name: 'Marcher plate', defense: [4, 9, 3, 6], weight: [3, 8, 3, 6], hp: [2, 5, 2, 3], stamina: [-1, -4, -1, -2]},
} as const;
/** All pieces are ordinary enclosed steel; names are local adaptations, not canonical Warplate. */
export const ARMOR: Readonly<Record<ArmorId, ArmorItem>> = Object.freeze(Object.fromEntries(
 ARMOR_SETS.flatMap(set => ARMOR_SLOTS.map((slot, i) => {
  const data = SET_DATA[set], id: ArmorId = `${set}-${slot}`;
  return [id, Object.freeze({kind: 'armor', id, set, slot, name: `${data.name} ${slot}`, visual: `${set}/${slot}`, defense: data.defense[i], weight: data.weight[i], maxHp: data.hp[i], maxStamina: data.stamina[i]})];
 })),
) as Record<ArmorId, ArmorItem>);
export interface Equipment {
 readonly schema: 1;
 readonly owned: readonly ArmorId[];
 readonly equipped: Readonly<Record<ArmorSlot, ArmorId>>;
}
export interface BasePools {readonly maxHp: number; readonly maxStamina: number}
export const STARTER_POOLS = Object.freeze({vanguard: Object.freeze({maxHp: 140, maxStamina: 90}), wayfarer: Object.freeze({maxHp: 100, maxStamina: 130})});
export interface EquipmentStats {
 readonly maxHp: number; readonly maxStamina: number; readonly defense: number; readonly weight: number;
 readonly damageMultiplier: number; readonly rollCost: number; readonly staminaRegen: number;
}
export function isArmorSlot(value: unknown): value is ArmorSlot {
 return typeof value === 'string' && (ARMOR_SLOTS as readonly string[]).includes(value);
}
export function isArmorId(value: unknown): value is ArmorId {
 return typeof value === 'string' && Object.hasOwn(ARMOR, value);
}
export function freshEquipment(): Equipment {
 return {schema: 1, owned: ARMOR_SLOTS.map(slot => `ward-${slot}` as ArmorId), equipped: {helmet: 'ward-helmet', chest: 'ward-chest', gauntlets: 'ward-gauntlets', legs: 'ward-legs'}};
}
export function grantArmor(equipment: Equipment, id: unknown): Equipment {
 return !isArmorId(id) || equipment.owned.includes(id) ? equipment : {...equipment, owned: [...equipment.owned, id]};
}
export function equipmentStats(equipment: Equipment, base: BasePools, attributes: Attributes): EquipmentStats {
 const pieces = ARMOR_SLOTS.map(slot => ARMOR[equipment.equipped[slot]]);
 const sum = (key: 'defense' | 'weight' | 'maxHp' | 'maxStamina') => pieces.reduce((total, piece) => total + piece[key], 0);
 const defense = sum('defense') + attributes.resolve * ATTRIBUTE_EFFECTS.resolve.defense, weight = sum('weight');
 return {maxHp: base.maxHp + sum('maxHp') + attributes.vigor * 8, maxStamina: base.maxStamina + sum('maxStamina') + attributes.endurance * 5,
  defense, weight, damageMultiplier: 132 / (100 + 2 * defense), rollCost: 24 + weight * .4, staminaRegen: Math.max(20, 34 - weight * .5)};
}
/** Equipping never heals or refills. Increases to a maximum retain the same current amount. */
export function clampPools(current: {readonly hp: number; readonly stamina: number}, stats: EquipmentStats): {hp: number; stamina: number} {
 return {hp: Math.max(0, Math.min(current.hp, stats.maxHp)), stamina: Math.max(0, Math.min(current.stamina, stats.maxStamina))};
}
export interface EquipmentContext {readonly alive: boolean; readonly idle: boolean; readonly rolling: boolean; readonly interacting: boolean}
export type EquipResult = {ok: true; changed: boolean; next: Equipment; stats: EquipmentStats} | {ok: false; reason: 'busy' | 'invalid-slot' | 'unknown-item' | 'wrong-slot' | 'not-owned' | 'missing-visual'};
/** No async loads: validate every candidate piece with all render assets/metadata already available. */
export function prepareEquip(equipment: Equipment, slot: unknown, id: unknown, context: EquipmentContext, base: BasePools, attributes: Attributes, visualReady: (item: ArmorItem) => boolean): EquipResult {
 if (!context.alive || !context.idle || context.rolling || context.interacting) return {ok: false, reason: 'busy'};
 if (!isArmorSlot(slot)) return {ok: false, reason: 'invalid-slot'};
 if (!isArmorId(id)) return {ok: false, reason: 'unknown-item'};
 if (ARMOR[id].slot !== slot) return {ok: false, reason: 'wrong-slot'};
 if (!equipment.owned.includes(id)) return {ok: false, reason: 'not-owned'};
 const changed = equipment.equipped[slot] !== id;
 const next: Equipment = changed ? {...equipment, equipped: {...equipment.equipped, [slot]: id}} : equipment;
 // Readiness must not mutate equipment. A loader/manifest exception is a failed preflight, not a partial commit.
 try { if (!ARMOR_SLOTS.every(key => visualReady(ARMOR[next.equipped[key]]))) return {ok: false, reason: 'missing-visual'}; }
 catch { return {ok: false, reason: 'missing-visual'}; }
 return {ok: true, changed, next, stats: equipmentStats(next, base, attributes)};
}
export function compareArmor(equipment: Equipment, slot: unknown, id: unknown, base: BasePools, attributes: Attributes): {before: EquipmentStats; after: EquipmentStats; delta: EquipmentStats} | null {
 if (!isArmorSlot(slot) || !isArmorId(id) || ARMOR[id].slot !== slot) return null;
 const before = equipmentStats(equipment, base, attributes), after = equipmentStats({...equipment, equipped: {...equipment.equipped, [slot]: id}}, base, attributes);
 const delta = Object.fromEntries(Object.keys(before).map(key => [key, after[key as keyof EquipmentStats] - before[key as keyof EquipmentStats]])) as unknown as EquipmentStats;
 return {before, after, delta};
}
export function readEquipment(raw: unknown): Equipment | null {
 if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
 const d = raw as Record<string, unknown>;
 if (d.schema !== 1 || !Array.isArray(d.owned) || !d.owned.length || d.owned.length > 12 || d.owned.some(id => !isArmorId(id)) || new Set(d.owned).size !== d.owned.length) return null;
 if (d.equipped === null || typeof d.equipped !== 'object' || Array.isArray(d.equipped)) return null;
 const equipped = d.equipped as Record<string, unknown>, owned = d.owned;
 if (Object.keys(equipped).length !== ARMOR_SLOTS.length || ARMOR_SLOTS.some(slot => !isArmorId(equipped[slot]) || ARMOR[equipped[slot] as ArmorId].slot !== slot || !owned.includes(equipped[slot]))) return null;
 return {schema: 1, owned: [...d.owned] as ArmorId[], equipped: {helmet: equipped.helmet as ArmorId, chest: equipped.chest as ArmorId, gauntlets: equipped.gauntlets as ArmorId, legs: equipped.legs as ArmorId}};
}
