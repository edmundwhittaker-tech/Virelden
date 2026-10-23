/** Pure presentation adapter. All legal actions and derived arithmetic come from the core. */
import {ARMOR, ARMOR_SLOTS, compareArmor, equipmentStats, prepareEquip,
 type ArmorId, type ArmorItem, type ArmorSlot, type BasePools, type Equipment, type EquipmentContext, type EquipmentStats} from './equipment.js';
import {ATTRIBUTES, ATTRIBUTE_EFFECTS, availablePoints, LEVEL_CAP, spendAttribute, xpRequirement,
 type Attribute, type Progression} from './progression.js';
import {WEAPON_CATALOG, WEAPON_IDS, nextUpgradeCost, prepareWeaponEquip, prepareWeaponUpgrade, upgradedDamage,
 type Armory, type WeaponId, type WeaponProfile} from './weaponCatalog.js';

export interface EquipmentPanelState {
 readonly equipment: Equipment;
 readonly armory: Armory;
 readonly progression: Progression;
 readonly base: BasePools;
 readonly context: EquipmentContext;
 readonly atCheckpoint: boolean;
 readonly atForge: boolean;
 readonly currency: number;
 /** Omit to reveal only owned items. Discovery never grants ownership. */
 readonly discoveredArmor?: readonly ArmorId[];
 readonly discoveredWeapons?: readonly WeaponId[];
 /** Optional durable-save / gameplay feedback, supplied by the owner. */
 readonly message?: string;
}
export interface EquipmentPanelAssets {
 /** Synchronous renderer preflight; never start a load here. */
 readonly armorReady: (item: ArmorItem) => boolean;
 readonly weaponReady: (item: WeaponProfile) => boolean;
 readonly supportHand: boolean;
}
export interface ActionAvailability {readonly enabled: boolean; readonly reason: string | null}
export const EQUIPMENT_REASONS: Readonly<Record<string, string>> = Object.freeze({
 busy: 'Wait until you are alive, standing idle and not interacting.',
 'invalid-slot': 'This armor slot is unavailable.', 'unknown-item': 'This item is unavailable.',
 'wrong-slot': 'This piece does not fit this slot.', 'not-owned': 'Discovered, but not owned.',
 'missing-visual': 'Required item artwork is not ready. Your equipment is unchanged.',
 'support-hand-required': 'Two-handed grip is not ready for this weapon.',
 'not-at-checkpoint': 'Return to a checkpoint to train or rest.',
 'invalid-attribute': 'This attribute is unavailable.', 'no-points': 'Earn another level to gain a training point.',
 'not-at-forge': 'Return to a forge to improve this weapon.', 'invalid-currency': 'Iron marks are unavailable.',
 'upgrade-cap': 'Maximum improvement reached (+2).', 'insufficient-marks': 'Not enough iron marks.',
});
function availability(result: {ok: boolean; reason?: string; changed?: boolean}): ActionAvailability {
 if (!result.ok) return {enabled: false, reason: EQUIPMENT_REASONS[result.reason ?? ''] ?? 'This action is unavailable.'};
 return result.changed === false ? {enabled: false, reason: 'Already equipped.'} : {enabled: true, reason: null};
}
export interface StatComparison {
 readonly key: keyof EquipmentStats;
 readonly label: string;
 readonly unit: string;
 readonly before: number;
 readonly after: number;
 readonly delta: number;
 readonly better: 'higher' | 'lower';
}
const STAT_FIELDS = [
 ['defense', 'Defense', '', 'higher'], ['weight', 'Armor weight', 'units', 'lower'],
 ['maxHp', 'Maximum health', 'HP', 'higher'], ['maxStamina', 'Maximum stamina', 'stamina', 'higher'],
 ['rollCost', 'Roll cost', 'stamina', 'lower'], ['staminaRegen', 'Stamina recovery', 'stamina/s', 'higher'],
] as const;
export function statComparisons(before: EquipmentStats, after: EquipmentStats): readonly StatComparison[] {
 return STAT_FIELDS.map(([key, label, unit, better]) => ({key, label, unit, better, before: before[key], after: after[key], delta: after[key] - before[key]}));
}
export function armorCandidate(state: EquipmentPanelState, assets: EquipmentPanelAssets, slot: ArmorSlot, id: ArmorId) {
 const item = ARMOR[id];
 const result = prepareEquip(state.equipment, slot, id, state.context, state.base, state.progression.attributes, assets.armorReady);
 const comparison = compareArmor(state.equipment, slot, id, state.base, state.progression.attributes);
 return {item, owned: state.equipment.owned.includes(id), equipped: state.equipment.equipped[slot] === id,
  action: availability(result), comparison: comparison ? statComparisons(comparison.before, comparison.after) : null};
}
export function weaponCandidate(state: EquipmentPanelState, assets: EquipmentPanelAssets, id: WeaponId) {
 const item = WEAPON_CATALOG[id];
 const result = prepareWeaponEquip(state.armory, id, state.context, {supportHand: assets.supportHand, visualReady: assets.weaponReady});
 const equipped = state.armory.equipped, target = `${WEAPON_CATALOG[equipped].name} +${state.armory.levels[equipped]}`;
 const upgradeAction: ActionAvailability = id === equipped ? availability(prepareWeaponUpgrade(state.armory, state.currency, state.atForge, state.context)) :
  {enabled: false, reason: `Equip ${item.name} before improving it. ${target} is still equipped; no marks will be spent on it from this selection.`};
 return {item, owned: state.armory.owned.includes(id), equipped: state.armory.equipped === id,
  upgrade: state.armory.levels[id], damage: upgradedDamage(state.armory, id),
  upgradeDamage: upgradedDamage(state.armory, id) - item.damage, upgradeAction, action: availability(result)};
}
export function buildEquipmentPanelModel(state: EquipmentPanelState, assets: EquipmentPanelAssets) {
 const visibleArmor = new Set([...state.equipment.owned, ...(state.discoveredArmor ?? [])]);
 const visibleWeapons = new Set([...state.armory.owned, ...(state.discoveredWeapons ?? [])]);
 const requirement = xpRequirement(state.progression);
 const points = availablePoints(state.progression);
 const upgradeResult = prepareWeaponUpgrade(state.armory, state.currency, state.atForge, state.context);
 const cost = nextUpgradeCost(state.armory);
 const nextArmory = {...state.armory, levels: {...state.armory.levels, [state.armory.equipped]: state.armory.levels[state.armory.equipped] + 1}};
 return {
  stats: equipmentStats(state.equipment, state.base, state.progression.attributes),
  slots: ARMOR_SLOTS.map(slot => ({slot, equipped: ARMOR[state.equipment.equipped[slot]],
   candidates: Object.values(ARMOR).filter(item => item.slot === slot && visibleArmor.has(item.id)).map(item => armorCandidate(state, assets, slot, item.id))})),
  weapons: WEAPON_IDS.filter(id => visibleWeapons.has(id)).map(id => weaponCandidate(state, assets, id)),
  progression: {...requirement, cap: LEVEL_CAP, xp: state.progression.xp, points,
   attributes: ATTRIBUTES.map((id: Attribute) => ({id, ...ATTRIBUTE_EFFECTS[id], value: state.progression.attributes[id],
    action: availability(!state.context.alive||!state.context.idle||state.context.rolling||state.context.interacting?{ok:false,reason:'busy'}:spendAttribute(state.progression, id, state.atCheckpoint))}))},
  rest: {enabled: state.atCheckpoint && state.context.alive && state.context.idle && !state.context.rolling && !state.context.interacting,
   reason: !state.atCheckpoint ? EQUIPMENT_REASONS['not-at-checkpoint'] : !state.context.alive || !state.context.idle || state.context.rolling || state.context.interacting ? EQUIPMENT_REASONS.busy : null} satisfies ActionAvailability,
  // Preview remains useful away from the forge or without enough marks; it never spends or grants anything.
  upgrade: {cost, damage: upgradedDamage(state.armory), nextDamage: cost === null ? null : upgradedDamage(nextArmory), action: availability(upgradeResult)},
 };
}
export type EquipmentPanelModel = ReturnType<typeof buildEquipmentPanelModel>;
export function formatStat(value: number): string { return String(Math.round(value * 100) / 100); }
export function formatDelta(value: number): string { return Math.abs(value) < .000001 ? '—' : `${value > 0 ? '+' : '−'}${formatStat(Math.abs(value))}`; }
