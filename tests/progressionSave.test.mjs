import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventure, serialize, restore} from '../.test-build/core/adventure.js';
import {freshProgressionExtension, migrateLegacyProgression, readProgressionExtension, readVersionedProgressionSave, prepareVersionedProgressionSave, selectProgressionSave, legacyWeaponStateAgrees, MAX_SAVE_CHARACTERS} from '../.test-build/core/progressionSave.js';
import {STATION_REWARDS, STATION_ENCOUNTERS} from '../.test-build/core/rewardCatalog.js';
import {awardReward, spendAttribute} from '../.test-build/core/progression.js';

const progress = world => {
 const d = JSON.parse(serialize(world));
 return {archetype: d.archetype, owned: d.owned, equipped: d.equipped, levels: d.levels, defeated: d.defeated, looted: d.looted, shortcut: d.shortcut, gateOpen: d.gateOpen, completed: d.completed};
};
// The application integrator must supply its own world/extension invariants. This fixture adopts the unchanged v2 world.
const codec = {
 readWorld: raw => restore(JSON.stringify(raw)), writeWorld: world => JSON.parse(serialize(world)), legacyProgress: progress,
 extensionAgrees: (world, extension) => {
  const legacy = progress(world), expected = migrateLegacyProgression(legacy, STATION_REWARDS);
  return expected !== null && legacyWeaponStateAgrees(extension, legacy)
   && extension.progression.earned.length === expected.progression.earned.length
   && extension.progression.earned.every(id => expected.progression.earned.includes(id));
 },
};
const loadedLegacy = (world = createAdventure()) => readVersionedProgressionSave(serialize(world), codec, STATION_REWARDS);

test('extension starts with chosen legacy weapon and four Ward pieces, without changing starter choice', () => {
 for (const [archetype, weapon] of [['vanguard', 'sword'], ['wayfarer', 'spear']]) {
  const extension = freshProgressionExtension(archetype);
  assert.equal(extension.armory.equipped, weapon); assert.deepEqual(extension.armory.owned, [weapon]);
  assert.equal(extension.equipment.owned.length, 4); assert.equal(extension.progression.xp, 0);
  assert.deepEqual(readProgressionExtension(extension, STATION_REWARDS), extension);
 }
});
test('v2 migration preserves marks, owned weapons, all upgrades, caches, defeated foes, gate, shortcut and checkpoint', () => {
 const world = createAdventure('wayfarer'); world.currency = 515; world.owned = ['spear', 'hammer']; world.equipped = 'hammer'; world.levels.hammer = 2;
 world.levels.sword = 1; // Bounded legacy upgrade data is preserved even if no longer owned.
 world.looted = ['west-cache', 'transfer-cache']; world.shortcut = true; world.gatePhase = 'open'; world.checkpoint = {x: 140, y: -1000};
 for (const e of world.enemies) e.hp = 0; world.completed = true;
 const old = serialize(world), loaded = readVersionedProgressionSave(old, codec, STATION_REWARDS);
 assert.equal(loaded.migrated, true); assert.equal(serialize(loaded.save.world), old); assert.equal(loaded.save.extension.progression.xp, 740);
 assert.deepEqual(loaded.save.extension.armory.owned, ['spear', 'hammer']); assert.equal(loaded.save.extension.armory.levels.hammer, 2); assert.equal(loaded.save.extension.armory.levels.sword, 1);
 assert.equal(loaded.save.extension.armory.equipped, 'hammer'); assert.equal(serialize(world), old);
 const prepared = prepareVersionedProgressionSave(loaded.save, codec, STATION_REWARDS); assert.ok(prepared);
 const reloaded = readVersionedProgressionSave(prepared.raw, codec, STATION_REWARDS); assert.equal(reloaded.migrated, false);
 assert.equal(reloaded.save.extension.progression.xp, 740); assert.equal(serialize(reloaded.save.world), old);
 assert.equal(awardReward(reloaded.save.extension.progression, 'station:raider', STATION_REWARDS), reloaded.save.extension.progression);
});
test('v1 migration uses the existing world validator and never reinterprets the old captain as the new final exit', () => {
 const world = createAdventure(); world.currency = 42; world.owned.push('hammer'); world.levels.hammer = 2; world.shortcut = true; world.enemies[0].hp = 0; world.enemies[2].hp = 0;
 const raw = {...JSON.parse(serialize(world)), version: 1, completed: true}; delete raw.gateOpen; delete raw.checkpoint;
 const text = JSON.stringify(raw), loaded = readVersionedProgressionSave(text, codec, STATION_REWARDS);
 assert.equal(loaded.migrated, true); assert.equal(loaded.save.world.completed, false); assert.equal(loaded.save.world.gatePhase, 'closed');
 assert.equal(loaded.save.world.currency, 42); assert.equal(loaded.save.extension.armory.levels.hammer, 2);
 assert.equal(loaded.save.extension.progression.xp, 165); assert.equal(loaded.save.extension.progression.earned.includes('station:secure-exit'), false);
 assert.equal(JSON.stringify(raw), text);
});
test('legacy reward reconstruction deduplicates repeated defeated IDs, returns detached state and rejects unknown encounters', () => {
 const old = progress(createAdventure()); old.defeated = ['raider', 'raider', 'captain'];
 const before = JSON.stringify(old), next = migrateLegacyProgression(old);
 assert.equal(next.progression.xp, 135); assert.deepEqual(next.progression.earned, ['station:raider', 'station:captain']);
 next.armory.levels.sword = 1; assert.equal(old.levels.sword, 0); assert.equal(JSON.stringify(old), before);
 assert.equal(migrateLegacyProgression({...old, defeated: ['unknown-foe']}), null);
});
test('versioned roundtrip keeps allocated attributes and detached equipment data; invalid prepares never replace previous raw', () => {
 const world = createAdventure(); world.enemies[2].hp = 0;
 const loaded = loadedLegacy(world), previous = serialize(world);
 loaded.save.extension.progression = spendAttribute(loaded.save.extension.progression, 'endurance', true).next;
 const prepared = prepareVersionedProgressionSave(loaded.save, codec, STATION_REWARDS);
 assert.equal(prepared.save.extension.progression.attributes.endurance, 1);
 prepared.save.extension.equipment.owned.push('delver-helmet'); assert.equal(loaded.save.extension.equipment.owned.length, 4);
 const invalid = {...loaded.save, extension: {...loaded.save.extension, armory: {...loaded.save.extension.armory, equipped: 'poleaxe'}}};
 assert.equal(prepareVersionedProgressionSave(invalid, codec, STATION_REWARDS), null); assert.equal(serialize(world), previous);
 assert.equal(prepareVersionedProgressionSave(loaded.save, {...codec, writeWorld: () => {throw Error('unavailable');}}, STATION_REWARDS), null);
});
test('outer parser rejects unsupported versions, malformed JSON, corrupt full-world data and inconsistent extension', () => {
 const loaded = loadedLegacy(), prepared = prepareVersionedProgressionSave(loaded.save, codec, STATION_REWARDS), valid = JSON.parse(prepared.raw);
 const bad = [
  'null', '[]', '{', JSON.stringify({...valid, version: 4}), ' '.repeat(MAX_SAVE_CHARACTERS + 1),
  JSON.stringify({...valid, world: {...valid.world, currency: Infinity}}),
  JSON.stringify({...valid, world: {...valid.world, checkpoint: 1, gateOpen: false}}),
  JSON.stringify({...valid, world: {...valid.world, owned: ['__proto__']}}),
  JSON.stringify({...valid, extension: null}),
  JSON.stringify({...valid, extension: {...valid.extension, progression: {...valid.extension.progression, xp: 60}}}),
  JSON.stringify({...valid, extension: {...valid.extension, progression: awardReward(valid.extension.progression, 'station:raider', STATION_REWARDS)}}),
  JSON.stringify({...valid, extension: {...valid.extension, equipment: {...valid.extension.equipment, equipped: {...valid.extension.equipment.equipped, helmet: 'ward-chest'}}}}),
  JSON.stringify({...valid, extension: {...valid.extension, armory: {...valid.extension.armory, owned: ['sword', 'spear'], equipped: 'spear'}}}),
 ];
 for (const raw of bad) assert.equal(readVersionedProgressionSave(raw, codec, STATION_REWARDS), null);
 assert.equal(readVersionedProgressionSave(prepared.raw, {...codec, extensionAgrees: () => {throw Error('bad world');}}, STATION_REWARDS), null);
});
test('save selection restores valid current, bounded last-known-good or legacy without writes or silent resets', () => {
 const legacy = serialize(createAdventure()), loaded = loadedLegacy(), current = prepareVersionedProgressionSave(loaded.save, codec, STATION_REWARDS).raw;
 const best = selectProgressionSave([{source: 'current', raw: current}, {source: 'legacy', raw: legacy}], codec, STATION_REWARDS);
 assert.equal(best.status, 'loaded'); assert.equal(best.source, 'current'); assert.equal(best.notice, null);
 const fallback = selectProgressionSave([{source: 'current', raw: '{'}, {source: 'last-known-good', raw: current}, {source: 'legacy', raw: legacy}], codec, STATION_REWARDS);
 assert.equal(fallback.status, 'loaded'); assert.equal(fallback.source, 'last-known-good'); assert.match(fallback.notice, /newest save could not be read/i);
 const migrated = selectProgressionSave([{source: 'current', raw: '{'}, {source: 'last-known-good', raw: null}, {source: 'legacy', raw: legacy}], codec, STATION_REWARDS);
 assert.equal(migrated.status, 'loaded'); assert.equal(migrated.source, 'legacy'); assert.equal(migrated.migrated, true);
 const corrupt = selectProgressionSave([{source: 'current', raw: 'null'}], codec, STATION_REWARDS);
 assert.equal(corrupt.status, 'corrupt'); assert.match(corrupt.notice, /not been erased.*Confirm a reset/);
 assert.deepEqual(selectProgressionSave([{source: 'current', raw: null}], codec, STATION_REWARDS), {status: 'empty', notice: null});
});
test('all twelve existing encounter IDs map once, even when migrating an already fully cleared expedition', () => {
 const legacy = {...progress(createAdventure()), defeated: [...STATION_ENCOUNTERS]};
 const extension = migrateLegacyProgression(legacy);
 assert.equal(extension.progression.earned.length, 12); assert.equal(extension.progression.xp, 600);
 for (const id of STATION_ENCOUNTERS) assert.equal(awardReward(extension.progression, `station:${id}`, STATION_REWARDS), extension.progression);
});
