import test from 'node:test';
import assert from 'node:assert/strict';
import {ARMOR, ARMOR_SLOTS, ARMOR_SETS, STARTER_POOLS, freshEquipment, grantArmor, equipmentStats, clampPools, prepareEquip, compareArmor, readEquipment} from '../.test-build/core/equipment.js';
const attributes = Object.freeze({vigor: 0, endurance: 0, resolve: 0});
const context = Object.freeze({alive: true, idle: true, rolling: false, interacting: false});
const base = STARTER_POOLS.vanguard;
const freeze = value => {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;};
const allOwned = () => ({...freshEquipment(), owned: Object.keys(ARMOR)});
const equip = (e, slot, id, c = context, ready = () => true) => prepareEquip(e, slot, id, c, base, attributes, ready);

test('twelve typed ordinary plate pieces have stable IDs, all four mandatory slots and frozen descriptors', () => {
 assert.equal(Object.keys(ARMOR).length, 12);
 assert.deepEqual(ARMOR_SLOTS, ['helmet', 'chest', 'gauntlets', 'legs']);
 for (const item of Object.values(ARMOR)) {
  assert.equal(item.kind, 'armor'); assert.equal(item.id, `${item.set}-${item.slot}`); assert.equal(item.visual, `${item.set}/${item.slot}`);
  assert.ok(Object.isFrozen(item)); assert.ok(item.defense > 0 && item.weight > 0);
 }
 assert.ok(Object.isFrozen(ARMOR));
});
test('starter Ward equipment preserves both starting health/stamina pools, not unchanged incoming damage', () => {
 const ward = freshEquipment();
 for (const pools of Object.values(STARTER_POOLS)) {
  const stats = equipmentStats(ward, pools, attributes);
  assert.equal(stats.maxHp, pools.maxHp); assert.equal(stats.maxStamina, pools.maxStamina);
  assert.equal(stats.defense, 16); assert.equal(stats.weight, 14); assert.equal(stats.damageMultiplier, 1);
 }
});
test('three full sets have health, defense, stamina and roll-economy tradeoffs; no set bonus', () => {
 const stat = set => equipmentStats({...allOwned(), equipped: Object.fromEntries(ARMOR_SLOTS.map(slot => [slot, `${set}-${slot}`]))}, base, attributes);
 const ward = stat('ward'), light = stat('delver'), heavy = stat('marcher');
 assert.deepEqual([light.defense, light.weight, heavy.defense, heavy.weight], [11, 9, 22, 20]);
 assert.ok(light.maxHp < ward.maxHp && light.maxStamina > ward.maxStamina && light.rollCost < ward.rollCost && light.staminaRegen > ward.staminaRegen);
 assert.ok(heavy.maxHp > ward.maxHp && heavy.maxStamina < ward.maxStamina && heavy.rollCost > ward.rollCost && heavy.staminaRegen < ward.staminaRegen);
});
test('all 81 mixed combinations validate and every single slot can change independently', () => {
 let count = 0;
 for (const h of ARMOR_SETS) for (const c of ARMOR_SETS) for (const g of ARMOR_SETS) for (const l of ARMOR_SETS) {
  const equipment = freeze({...allOwned(), equipped: {helmet: `${h}-helmet`, chest: `${c}-chest`, gauntlets: `${g}-gauntlets`, legs: `${l}-legs`}});
  assert.deepEqual(readEquipment(equipment), equipment);
  const stats = equipmentStats(equipment, base, attributes);
  assert.ok(Object.values(stats).every(Number.isFinite)); assert.ok(stats.damageMultiplier > 0 && stats.damageMultiplier < 1.4);
  for (const slot of ARMOR_SLOTS) for (const set of ARMOR_SETS) {
   const result = equip(equipment, slot, `${set}-${slot}`); assert.equal(result.ok, true);
   for (const other of ARMOR_SLOTS.filter(other => other !== slot)) assert.equal(result.next.equipped[other], equipment.equipped[other]);
  }
  count++;
 }
 assert.equal(count, 81);
});
test('equip failures preserve all state: invalid IDs, wrong slot, ownership, busy context and missing assets', () => {
 const equipment = freeze(grantArmor(freshEquipment(), 'marcher-chest')), before = JSON.stringify(equipment);
 const errors = [
  ['head', 'ward-helmet', context, () => true, 'invalid-slot'],
  ['helmet', '__proto__', context, () => true, 'unknown-item'],
  ['helmet', null, context, () => true, 'unknown-item'],
  ['helmet', 'marcher-chest', context, () => true, 'wrong-slot'],
  ['chest', 'delver-chest', context, () => true, 'not-owned'],
  ...[{alive: false}, {idle: false}, {rolling: true}, {interacting: true}].map(c => ['chest', 'marcher-chest', {...context, ...c}, () => true, 'busy']),
  ['chest', 'marcher-chest', context, () => false, 'missing-visual'],
  ['chest', 'marcher-chest', context, () => {throw Error('missing atlas');}, 'missing-visual'],
 ];
 for (const [slot, id, c, ready, reason] of errors) assert.deepEqual(equip(equipment, slot, id, c, ready), {ok: false, reason});
 assert.equal(JSON.stringify(equipment), before);
});
test('candidate preflights all four assets, includes unchanged pieces, and returns same state for a valid noop', () => {
 const equipment = freeze(allOwned()), checked = [];
 const result = equip(equipment, 'chest', 'marcher-chest', context, item => {checked.push(item.id); return true;});
 assert.equal(result.ok, true); assert.equal(result.changed, true);
 assert.deepEqual(checked, ['ward-helmet', 'marcher-chest', 'ward-gauntlets', 'ward-legs']);
 assert.equal(equipment.equipped.chest, 'ward-chest');
 assert.deepEqual(equip(equipment, 'chest', 'marcher-chest', context, item => item.slot !== 'legs'), {ok: false, reason: 'missing-visual'});
 const noop = equip(equipment, 'helmet', 'ward-helmet'); assert.equal(noop.ok, true); assert.equal(noop.changed, false); assert.equal(noop.next, equipment);
});
test('comparison is ownership-independent, returns complete signed derived stats and never equips', () => {
 const equipment = freeze(freshEquipment()), result = compareArmor(equipment, 'chest', 'marcher-chest', base, attributes);
 assert.ok(result.delta.defense > 0 && result.delta.weight > 0 && result.delta.rollCost > 0 && result.delta.staminaRegen < 0 && result.delta.maxHp > 0 && result.delta.maxStamina < 0 && result.delta.damageMultiplier < 0);
 for (const key of Object.keys(result.before)) assert.equal(result.delta[key], result.after[key] - result.before[key]);
 assert.equal(compareArmor(equipment, 'helmet', 'ward-chest', base, attributes), null);
 assert.equal(compareArmor(equipment, 'helmet', '__proto__', base, attributes), null);
 assert.equal(equipment.equipped.chest, 'ward-chest');
});
test('equipment maximum changes clamp but never refill current pools, including a dead player', () => {
 const stats = equipmentStats(freshEquipment(), base, {vigor: 9, endurance: 0, resolve: 0});
 assert.deepEqual(clampPools({hp: 17, stamina: 12}, stats), {hp: 17, stamina: 12});
 assert.deepEqual(clampPools({hp: 999, stamina: 999}, stats), {hp: stats.maxHp, stamina: stats.maxStamina});
 assert.deepEqual(clampPools({hp: 0, stamina: 0}, stats), {hp: 0, stamina: 0});
});
test('ownership grants are idempotent, reject unknown IDs, and do not mutate the previous inventory', () => {
 const original = freeze(freshEquipment()), next = grantArmor(original, 'delver-helmet');
 assert.equal(next.owned.length, 5); assert.equal(original.owned.length, 4);
 assert.equal(grantArmor(next, 'delver-helmet'), next); assert.equal(grantArmor(next, '__proto__'), next);
});
test('equipment parser clones its data and rejects missing slots, duplicates, foreign IDs and type corruption', () => {
 const good = freshEquipment(), parsed = readEquipment(good);
 parsed.owned.push('marcher-chest'); parsed.equipped.chest = 'marcher-chest';
 assert.equal(good.owned.length, 4); assert.equal(good.equipped.chest, 'ward-chest');
 const corrupt = [null, [], true, {...good, schema: 2}, {...good, owned: []}, {...good, owned: [...good.owned, good.owned[0]]}, {...good, owned: ['__proto__']}, {...good, equipped: {...good.equipped, helmet: 'ward-chest'}}, {...good, equipped: {...good.equipped, helmet: 'delver-helmet'}}, {...good, equipped: {...good.equipped, offhand: 'shield'}}, {...good, equipped: []}, {...good, owned: [NaN]}];
 const missing = {...good.equipped}; delete missing.legs; corrupt.push({...good, equipped: missing});
 for (const raw of corrupt) assert.equal(readEquipment(raw), null);
});
