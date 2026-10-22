import test from 'node:test';
import assert from 'node:assert/strict';
import {XP_THRESHOLDS, XP_CAP, ATTRIBUTES, freshProgression, level, availablePoints, xpRequirement, awardReward, awardDefeat, spendAttribute, readProgression} from '../.test-build/core/progression.js';
import {STATION_REWARDS, STATION_XP_BUDGET, CAMPAIGN_REWARDS} from '../.test-build/core/rewardCatalog.js';
const capCatalog = Object.freeze({'test:cap': XP_CAP, 'test:extra': 1});

test('ten levels have transparent total requirements and exact threshold boundaries', () => {
 assert.deepEqual(XP_THRESHOLDS, [0, 60, 150, 270, 420, 600, 810, 1050, 1320, 1620]);
 assert.deepEqual(xpRequirement(freshProgression()), {level: 1, nextTotal: 60, remaining: 60});
 for (let i = 1; i < XP_THRESHOLDS.length; i++) {
  assert.equal(level({xp: XP_THRESHOLDS[i] - 1}), i); assert.equal(level({xp: XP_THRESHOLDS[i]}), i + 1);
  assert.equal(xpRequirement({xp: XP_THRESHOLDS[i] - 1}).remaining, 1);
 }
 assert.deepEqual(xpRequirement({xp: XP_CAP}), {level: 10, nextTotal: null, remaining: 0});
});
test('finite authored budget is 740+440+440; complete existing station alone does not reach cap', () => {
 assert.equal(STATION_XP_BUDGET, 740);
 const totals = {};
 for (const [id, amount] of Object.entries(CAMPAIGN_REWARDS)) totals[id.split(':')[0]] = (totals[id.split(':')[0]] ?? 0) + amount;
 assert.deepEqual(totals, {station: 740, 'cistern-viaduct': 440, 'record-annex': 440});
 let p = freshProgression();
 for (const id of Object.keys(STATION_REWARDS)) p = awardReward(p, id, CAMPAIGN_REWARDS);
 assert.equal(p.xp, 740); assert.equal(level(p), 6);
 for (const id of Object.keys(CAMPAIGN_REWARDS)) p = awardReward(p, id, CAMPAIGN_REWARDS);
 assert.equal(p.xp, XP_CAP); assert.equal(availablePoints(p), 9); assert.ok(readProgression(p, CAMPAIGN_REWARDS));
});
test('rewards are catalogued, atomic, once-only and retained at cap without unsafe numeric addition', () => {
 const p = freshProgression(), catalog = {'boss': Number.MAX_SAFE_INTEGER, other: 2, zero: 0, negative: -1, fraction: 1.5, bad: Infinity};
 const next = awardReward(p, 'boss', catalog);
 assert.equal(next.xp, XP_CAP); assert.equal(p.xp, 0); assert.deepEqual(next.earned, ['boss']);
 assert.equal(awardReward(next, 'boss', catalog), next);
 const capped = awardReward(next, 'other', catalog); assert.equal(capped.xp, XP_CAP); assert.deepEqual(capped.earned, ['boss', 'other']);
 for (const id of ['fake', '__proto__', 'zero', 'negative', 'fraction', 'bad', null, 1]) assert.equal(awardReward(p, id, catalog), p);
});
test('only alive-to-defeated edges reward XP, and repeated death/reload/travel cannot farm it', () => {
 const catalog = {'station:raider': 60}, initial = freshProgression();
 for (const [before, after] of [[0, 0], [0, 10], [10, 1], [NaN, 0], [Infinity, 0], [10, -Infinity]]) assert.equal(awardDefeat(initial, 'station:raider', before, after, catalog), initial);
 const earned = awardDefeat(initial, 'station:raider', 1, 0, catalog);
 const loaded = readProgression(JSON.parse(JSON.stringify(earned)), catalog);
 assert.equal(loaded.xp, 60); assert.equal(awardDefeat(loaded, 'station:raider', 100, 0, catalog), loaded);
});
test('checkpoint training chooses three attributes, spends one point, and cannot overallocate', () => {
 const capped = awardReward(freshProgression(), 'test:cap', capCatalog), original = JSON.stringify(capped);
 assert.deepEqual(spendAttribute(capped, 'vigor', false), {ok: false, reason: 'not-at-checkpoint'});
 assert.deepEqual(spendAttribute(capped, '__proto__', true), {ok: false, reason: 'invalid-attribute'});
 assert.equal(JSON.stringify(capped), original);
 let p = capped;
 for (let i = 0; i < 9; i++) {const result = spendAttribute(p, ATTRIBUTES[i % 3], true); assert.equal(result.ok, true); p = result.next;}
 assert.deepEqual(p.attributes, {vigor: 3, endurance: 3, resolve: 3}); assert.equal(availablePoints(p), 0);
 assert.deepEqual(spendAttribute(p, 'resolve', true), {ok: false, reason: 'no-points'});
 assert.ok(readProgression(p, capCatalog)); assert.deepEqual(capped.attributes, {vigor: 0, endurance: 0, resolve: 0});
});
test('progression save parser clones and ties XP to the reward ledger, rejects non-finites/types/unknown IDs', () => {
 const p = awardReward(freshProgression(), 'test:cap', capCatalog), parsed = readProgression(p, capCatalog);
 parsed.attributes.vigor = 1; parsed.earned.push('test:extra'); assert.equal(p.attributes.vigor, 0); assert.equal(p.earned.length, 1);
 const corrupt = [null, [], true, {...p, schema: 2}, ...[NaN, Infinity, -Infinity, -1, XP_CAP + 1, 0.5, '1620', null].map(xp => ({...p, xp})), {...p, xp: 60}, {...p, earned: []}, {...p, earned: ['__proto__']}, {...p, earned: ['test:cap', 'test:cap']}, {...p, earned: [1]}, {...p, attributes: {vigor: 9, endurance: 1, resolve: 0}}, {...p, attributes: {vigor: -1, endurance: 0, resolve: 0}}, {...p, attributes: {vigor: Infinity, endurance: 0, resolve: 0}}, {...p, attributes: {vigor: '1', endurance: 0, resolve: 0}}, {...p, attributes: {vigor: 0, endurance: 0}}, {...p, attributes: {vigor: 0, endurance: 0, resolve: 0, luck: 0}}];
 for (const raw of corrupt) assert.equal(readProgression(raw, capCatalog), null);
 assert.equal(readProgression({...freshProgression(), xp: 1}, capCatalog), null);
});
