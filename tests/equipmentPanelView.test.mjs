import test from 'node:test';
import assert from 'node:assert/strict';
import {ARMOR, ARMOR_SLOTS, freshEquipment, grantArmor, STARTER_POOLS, compareArmor} from '../.test-build/core/equipment.js';
import {freshArmory, grantWeapon, WEAPON_IDS} from '../.test-build/core/weaponCatalog.js';
import {freshProgression, spendAttribute, awardReward} from '../.test-build/core/progression.js';
import {armorCandidate, weaponCandidate, buildEquipmentPanelModel, formatDelta, formatStat} from '../.test-build/core/equipmentPanelView.js';
const assets = {armorReady: () => true, weaponReady: () => true, supportHand: true};
const state = (extra = {}) => ({equipment: freshEquipment(), armory: freshArmory('vanguard'), progression: freshProgression(),
 base: STARTER_POOLS.vanguard, context: {alive: true, idle: true, rolling: false, interacting: false}, atCheckpoint: false, atForge: false, currency: 90, ...extra});
function deeplyFreeze(value) {Object.freeze(value); for (const item of Object.values(value)) if (item && typeof item === 'object' && !Object.isFrozen(item)) deeplyFreeze(item); return value;}

test('panel has all four independent slots and six complete real whole-loadout comparisons', () => {
 let equipment = freshEquipment(); for (const slot of ARMOR_SLOTS) equipment = grantArmor(equipment, `delver-${slot}`);
 const source = deeplyFreeze(state({equipment}));
 const snapshot = JSON.stringify(source); const model = buildEquipmentPanelModel(source, assets);
 assert.deepEqual(model.slots.map(entry => entry.slot), ARMOR_SLOTS);
 for (const slot of ARMOR_SLOTS) {
  const id = `delver-${slot}`; const candidate = model.slots.find(entry => entry.slot === slot).candidates.find(entry => entry.item.id === id);
  assert.equal(candidate.action.enabled, true); assert.equal(candidate.comparison.length, 6);
  const core = compareArmor(source.equipment, slot, id, source.base, source.progression.attributes);
  for (const stat of candidate.comparison) {assert.equal(stat.before, core.before[stat.key]); assert.equal(stat.after, core.after[stat.key]); assert.equal(stat.delta, core.delta[stat.key]);}
 }
 assert.equal(JSON.stringify(source), snapshot);
});

test('noops stay disabled, unowned discovery is preview-only, and undiscovered items do not leak', () => {
 const source = state({discoveredArmor: ['delver-helmet'], discoveredWeapons: ['axe']}); const model = buildEquipmentPanelModel(source, assets);
 assert.equal(model.slots[0].candidates[0].action.reason, 'Already equipped.');
 assert.equal(model.slots[0].candidates.find(c => c.item.id === 'delver-helmet').action.reason, 'Discovered, but not owned.');
 assert.equal(model.slots.flatMap(s => s.candidates).length, 5);
 assert.deepEqual(model.weapons.map(c => c.item.id), ['sword', 'axe']);
 assert.equal(model.weapons[1].action.enabled, false);
 assert.equal(model.weapons[0].action.reason, 'Already equipped.');
});

test('all owned weapons including new silhouettes are visible without granting anything', () => {
 let armory = freshArmory('vanguard'); for (const id of WEAPON_IDS) armory = grantWeapon(armory, id);
 const model = buildEquipmentPanelModel(state({armory}), assets);
 assert.deepEqual(model.weapons.map(c => c.item.id), WEAPON_IDS);
 assert.equal(model.weapons.find(c => c.item.id === 'poleaxe').action.enabled, true);
 assert.equal(weaponCandidate(state({armory}), {...assets, supportHand: false}, 'poleaxe').action.reason, 'Two-handed grip is not ready for this weapon.');
});

test('missing armor in another candidate slot and throwing readiness reject rather than invent asset paths', () => {
 const source = state({equipment: grantArmor(freshEquipment(), 'delver-helmet')});
 for (const armorReady of [item => item.id !== 'ward-chest', () => {throw new Error('missing registry');}]) {
  const candidate = armorCandidate(source, {...assets, armorReady}, 'helmet', 'delver-helmet');
  assert.equal(candidate.action.enabled, false); assert.match(candidate.action.reason, /artwork is not ready/);
  assert.equal(source.equipment.equipped.helmet, 'ward-helmet');
 }
 const armory = grantWeapon(freshArmory('vanguard'), 'axe');
 assert.match(weaponCandidate(state({armory}), {...assets, weaponReady: () => false}, 'axe').action.reason, /artwork is not ready/);
});

test('attack, roll, death and interaction disable equips with the exact core preflight reason', () => {
 const equipment = grantArmor(freshEquipment(), 'delver-chest'), armory = grantWeapon(freshArmory('vanguard'), 'axe');
 for (const context of [{alive: false}, {idle: false}, {rolling: true}, {interacting: true}]) {
  const source = state({equipment, armory, context: {...state().context, ...context}});
  assert.match(armorCandidate(source, assets, 'chest', 'delver-chest').action.reason, /standing idle/);
  assert.match(weaponCandidate(source, assets, 'axe').action.reason, /standing idle/);
 }
});

test('training uses core checkpoint rules, XP totals/thresholds and three unspent-point choices', () => {
 const progression = {...freshProgression(), xp: 150};
 const away = buildEquipmentPanelModel(state({progression}), assets);
 assert.equal(away.progression.level, 3); assert.equal(away.progression.xp, 150); assert.equal(away.progression.nextTotal, 270); assert.equal(away.progression.points, 2);
 assert.deepEqual(away.progression.attributes.map(a => a.id), ['vigor', 'endurance', 'resolve']);
 for (const choice of away.progression.attributes) {assert.equal(choice.action.enabled, false); assert.match(choice.action.reason, /checkpoint/);}
 assert.equal(away.rest.enabled, false);
 const at = buildEquipmentPanelModel(state({progression, atCheckpoint: true}), assets);
 assert.ok(at.progression.attributes.every(a => a.action.enabled)); assert.equal(at.rest.enabled, true);
 const trained = spendAttribute(progression, 'vigor', true).next;
 const model = buildEquipmentPanelModel(state({progression: trained, atCheckpoint: true}), assets);
 assert.equal(model.stats.maxHp, 148); assert.equal(model.progression.points, 1);
 assert.equal(Object.hasOwn(model, 'hp'), false); assert.equal(Object.hasOwn(model, 'stamina'), false);
});

test('zero points and level cap remain explicit; training does not clone validation or mutate XP', () => {
 const initial = buildEquipmentPanelModel(state({atCheckpoint: true}), assets);
 assert.ok(initial.progression.attributes.every(a => !a.action.enabled && /another level/.test(a.action.reason)));
 const capped = buildEquipmentPanelModel(state({progression: {...freshProgression(), xp: 1620}}), assets);
 assert.equal(capped.progression.level, 10); assert.equal(capped.progression.nextTotal, null); assert.equal(capped.progression.remaining, 0);
});

test('additive forge UI retains core +1/+2 costs and disabled-away explanation', () => {
 const away = buildEquipmentPanelModel(state(), assets); assert.equal(away.upgrade.cost, 30); assert.match(away.upgrade.action.reason, /forge/);
 const at = buildEquipmentPanelModel(state({atForge: true}), assets); assert.equal(at.upgrade.action.enabled, true);
 const armory = freshArmory('vanguard');
 const plusOne = {...armory, levels: {...armory.levels, sword: 1}};
 assert.equal(buildEquipmentPanelModel(state({armory: plusOne, atForge: true}), assets).upgrade.cost, 60);
 const plusTwo = {...armory, levels: {...armory.levels, sword: 2}};
 const max = buildEquipmentPanelModel(state({armory: plusTwo, atForge: true}), assets);
 assert.equal(max.upgrade.cost, null); assert.match(max.upgrade.action.reason, /Maximum/);
});

test('comparison formatter retains hundredth-second timings and signed readable deltas', () => {
 assert.equal(formatStat(.14), '0.14'); assert.equal(formatStat(140), '140'); assert.equal(formatDelta(.4), '+0.4');
 assert.equal(formatDelta(-1), '−1'); assert.equal(formatDelta(0), '—'); assert.equal(formatDelta(1e-12), '—');
});

test('busy checkpoint training is disabled rather than advertising an action core will reject',()=>{
 const s=state();s.progression=awardReward(s.progression,'test:level',{'test:level':60});s.atCheckpoint=true;s.context={...s.context,idle:false};
 const model=buildEquipmentPanelModel(s,assets);assert.ok(model.progression.attributes.every(a=>!a.action.enabled&&a.action.reason.includes('idle')));
});
