import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS as LEGACY_WEAPONS} from '../.test-build/core/adventure.js';
import {WEAPON_IDS, WEAPON_CATALOG, weaponShapeContains, freshArmory, grantWeapon, prepareWeaponEquip, nextUpgradeCost, upgradedDamage, prepareWeaponUpgrade, readArmory} from '../.test-build/core/weaponCatalog.js';
const context = Object.freeze({alive: true, idle: true, rolling: false, interacting: false});
const capabilities = Object.freeze({supportHand: true, visualReady: () => true});
const freeze = value => {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;};

test('six weapons have frozen profiles and distinct geometry, timing and stamina, not damage-only variants', () => {
 assert.deepEqual(WEAPON_IDS, ['sword', 'spear', 'hammer', 'axe', 'falchion', 'poleaxe']);
 assert.equal(new Set(Object.values(WEAPON_CATALOG).map(w => JSON.stringify([w.range, w.shape, w.windup, w.active, w.recovery, w.cost, w.stagger]))).size, 6);
 assert.equal(new Set(Object.values(WEAPON_CATALOG).map(w => w.silhouette)).size, 6);
 for (const w of Object.values(WEAPON_CATALOG)) {
  assert.equal(w.kind, 'weapon'); assert.ok(Object.isFrozen(w) && Object.isFrozen(w.shape) && Object.isFrozen(w.motion));
  for (const key of ['damage', 'range', 'windup', 'active', 'recovery', 'cost', 'stagger']) assert.ok(Number.isFinite(w[key]) && w[key] > 0);
 }
});
test('existing sword, spear and hammer stats and sector half-angles remain exact, with intentional forward-only hammer correction', () => {
 for (const id of ['sword', 'spear', 'hammer']) {
  const legacy = LEGACY_WEAPONS[id], profile = WEAPON_CATALOG[id];
  for (const key of ['name', 'damage', 'range', 'windup', 'recovery', 'cost']) assert.equal(profile[key], legacy[key]);
  assert.deepEqual(profile.shape, {kind: 'sector', halfAngle: legacy.arc}); assert.equal(profile.active, .12);
 }
 assert.equal(WEAPON_CATALOG.hammer.legacyRearReach, undefined); assert.equal(WEAPON_CATALOG.hammer.shape.halfAngle,.48);
});
test('aim-local weapon shapes bound front, side, rear and reach with intentional distinctions', () => {
 const contains = (id, x, y) => weaponShapeContains(id, {x, y});
 for (const id of WEAPON_IDS) {assert.equal(contains(id, 40, 0), true); assert.equal(contains(id, 1000, 0), false); assert.equal(contains(id, NaN, 0), false); assert.equal(contains(id, 0, Infinity), false);}
 assert.equal(contains('sword', 50, 50), true); assert.equal(contains('axe', 50, 50), false);
 assert.equal(contains('spear', 100, 0), true); assert.equal(contains('sword', 100, 0), false); assert.equal(contains('spear', 50, 25), false);
 assert.equal(contains('falchion', 30, 60), true); assert.equal(contains('sword', 30, 60), false);
 assert.equal(contains('hammer', -40, 0), false); assert.equal(contains('hammer',40,24),false);
 for (const id of WEAPON_IDS.filter(id => id !== 'hammer')) assert.equal(contains(id, -40, 0), false);
 assert.equal(contains('poleaxe', 132, 0), true); assert.equal(contains('poleaxe', 132.01, 0), false);
 assert.equal(contains('poleaxe', 100, 17), true); assert.equal(contains('poleaxe', 100, 17.01), false); assert.equal(contains('poleaxe', 0, 0), false);
});
test('weapon ownership, preflight, two-hand gate and noop are atomic', () => {
 const initial = freeze(freshArmory('wayfarer')); assert.equal(initial.equipped, 'spear');
 assert.deepEqual(prepareWeaponEquip(initial, 'axe', context, capabilities), {ok: false, reason: 'not-owned'});
 assert.deepEqual(prepareWeaponEquip(initial, '__proto__', context, capabilities), {ok: false, reason: 'unknown-item'});
 let all = initial; for (const id of WEAPON_IDS) all = grantWeapon(all, id); freeze(all);
 const before = JSON.stringify(all);
 for (const c of [{alive: false}, {idle: false}, {rolling: true}, {interacting: true}]) assert.deepEqual(prepareWeaponEquip(all, 'axe', {...context, ...c}, capabilities), {ok: false, reason: 'busy'});
 assert.deepEqual(prepareWeaponEquip(all, 'poleaxe', context, {...capabilities, supportHand: false}), {ok: false, reason: 'support-hand-required'});
 assert.deepEqual(prepareWeaponEquip(all, 'axe', context, {...capabilities, visualReady: () => false}), {ok: false, reason: 'missing-visual'});
 assert.deepEqual(prepareWeaponEquip(all, 'axe', context, {...capabilities, visualReady: () => {throw Error('atlas missing');}}), {ok: false, reason: 'missing-visual'});
 assert.equal(JSON.stringify(all), before);
 const next = prepareWeaponEquip(all, 'poleaxe', context, capabilities); assert.equal(next.ok, true); assert.equal(next.next.equipped, 'poleaxe'); assert.equal(all.equipped, 'spear');
 const noop = prepareWeaponEquip(all, 'spear', context, capabilities); assert.equal(noop.ok, true); assert.equal(noop.changed, false); assert.equal(noop.next, all);
 assert.equal(grantWeapon(all, 'spear'), all); assert.equal(grantWeapon(all, '__proto__'), all);
});
test('upgrades cost 30/60 marks, cap at +2 and retain existing quarter-damage increments', () => {
 let armory = freshArmory('vanguard'), currency = 100;
 assert.equal(nextUpgradeCost(armory), 30); assert.equal(upgradedDamage(armory), 30);
 const first = prepareWeaponUpgrade(armory, currency, true, context); assert.equal(first.ok, true); assert.equal(first.cost, 30); assert.equal(first.currency, 70); assert.equal(first.next.levels.sword, 1); assert.equal(armory.levels.sword, 0);
 armory = first.next; currency = first.currency; assert.equal(upgradedDamage(armory), 37.5); assert.equal(nextUpgradeCost(armory), 60);
 const second = prepareWeaponUpgrade(armory, currency, true, context); assert.equal(second.ok, true); assert.equal(second.currency, 10); assert.equal(second.next.levels.sword, 2); assert.equal(upgradedDamage(second.next), 45); assert.equal(nextUpgradeCost(second.next), null);
 assert.deepEqual(prepareWeaponUpgrade(second.next, 100000, true, context), {ok: false, reason: 'upgrade-cap'});
});
test('upgrade failures leave currency and armory untouched, including nonfinite, fractional and negative marks', () => {
 const armory = freeze(freshArmory('vanguard')), before = JSON.stringify(armory);
 assert.deepEqual(prepareWeaponUpgrade(armory, 29, true, context), {ok: false, reason: 'insufficient-marks'});
 assert.deepEqual(prepareWeaponUpgrade(armory, 100, false, context), {ok: false, reason: 'not-at-forge'});
 assert.deepEqual(prepareWeaponUpgrade(armory, 100, true, {...context, rolling: true}), {ok: false, reason: 'busy'});
 for (const currency of [NaN, Infinity, -Infinity, -1, .5, '100', 100001]) assert.deepEqual(prepareWeaponUpgrade(armory, currency, true, context), {ok: false, reason: 'invalid-currency'});
 assert.equal(JSON.stringify(armory), before);
});
test('armory parser clones and validates every weapon upgrade, ownership and exact known level keys', () => {
 const good = freshArmory('vanguard'), parsed = readArmory(good); parsed.owned.push('axe'); parsed.levels.sword = 1;
 assert.equal(good.owned.length, 1); assert.equal(good.levels.sword, 0);
 for (const raw of [null, [], true, {...good, schema: 2}, {...good, owned: []}, {...good, owned: ['sword', 'sword']}, {...good, owned: ['__proto__']}, {...good, equipped: 'axe'}, {...good, levels: {...good.levels, axe: 3}}, {...good, levels: {...good.levels, sword: -1}}, {...good, levels: {...good.levels, sword: NaN}}, {...good, levels: {...good.levels, sword: '1'}}, {...good, levels: {...good.levels, shield: 0}}]) assert.equal(readArmory(raw), null);
 const missing = {...good.levels}; delete missing.poleaxe; assert.equal(readArmory({...good, levels: missing}), null);
 // Legacy validator allowed an upgrade on an unequipped/unowned weapon: preserve that bounded data.
 assert.equal(readArmory({...good, levels: {...good.levels, hammer: 2}}).levels.hammer, 2);
});
