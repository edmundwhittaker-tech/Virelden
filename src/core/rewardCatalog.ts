import {type RewardCatalog} from './progression.js';

export const STATION_ENCOUNTERS = Object.freeze(['raider', 'watcher', 'captain', 'ascent-raider', 'ascent-watcher', 'ascent-guard', 'transfer-raider', 'transfer-watcher', 'transfer-guard', 'watch-raider', 'watch-watcher', 'upper-captain'] as const);
/** Values are persistence data: do not retune an existing ID without an explicit schema migration. */
export const STATION_REWARDS: RewardCatalog = Object.freeze({
 ...Object.fromEntries(STATION_ENCOUNTERS.map(id => [`station:${id}`, id === 'captain' ? 100 : id === 'upper-captain' ? 150 : 35])),
 'station:gate-open': 40,
 'station:shortcut-open': 30,
 'station:secure-exit': 50,
 'station:transfer-cache': 20,
});
export const STATION_XP_BUDGET = Object.values(STATION_REWARDS).reduce((sum, amount) => sum + amount, 0);
export const ADDITIONAL_EXPEDITION_REWARDS: RewardCatalog = Object.freeze({
 ...Object.fromEntries(['west-sentinel', 'bridge-guard', 'bow-lookout', 'east-patrol', 'cache-guard'].map(id => [`cistern-viaduct:${id}`, 50])),
 'cistern-viaduct:sluice-warden': 120,
 'cistern-viaduct:secure': 40,
 'cistern-viaduct:optional-cache': 30,
 ...Object.fromEntries(['shutter-sentry', 'corner-raider', 'gallery-lookout', 'stair-guard', 'records-guard'].map(id => [`record-annex:${id}`, 50])),
 'record-annex:annex-keeper': 120,
 'record-annex:secure': 40,
 'record-annex:optional-cache': 30,
});
/** Additional areas are authored data only until the level integrator wires their encounters. */
export const CAMPAIGN_REWARDS: RewardCatalog = Object.freeze({...STATION_REWARDS, ...ADDITIONAL_EXPEDITION_REWARDS});
