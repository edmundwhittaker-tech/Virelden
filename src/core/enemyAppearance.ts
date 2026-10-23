import type {AreaId} from './expeditionCatalog.js';
import type {Enemy} from './adventure.js';

export type EnemyAppearance='maw_skeleton'|'headless_skeleton'|'iron_giant'|'pale_shepherd_keeper';
/** Appearance reuse only: no named canonical person's identity or allegiance. */
export const ENEMY_APPEARANCES:Readonly<Record<string,EnemyAppearance>>=Object.freeze({
 'station:raider':'maw_skeleton',
 'station:ascent-raider':'headless_skeleton',
 'station:ascent-guard':'maw_skeleton',
 'station:transfer-raider':'maw_skeleton',
 'station:watch-raider':'headless_skeleton',
 'station:transfer-guard':'pale_shepherd_keeper',
 'station:captain':'pale_shepherd_keeper',
 'station:upper-captain':'iron_giant',
 'cistern-viaduct:west-sentinel':'maw_skeleton',
 'cistern-viaduct:bridge-guard':'maw_skeleton',
 'cistern-viaduct:east-patrol':'headless_skeleton',
 'cistern-viaduct:cache-guard':'headless_skeleton',
 'cistern-viaduct:sluice-warden':'pale_shepherd_keeper',
 'record-annex:shutter-sentry':'maw_skeleton',
 'record-annex:corner-raider':'headless_skeleton',
 'record-annex:stair-guard':'headless_skeleton',
 'record-annex:records-guard':'pale_shepherd_keeper',
 'record-annex:annex-keeper':'pale_shepherd_keeper',
});
export function enemyAppearance(area:AreaId,enemy:Pick<Enemy,'id'|'kind'>):EnemyAppearance|null {
 // The supplied character sets do not contain a bow. Never make a mace, staff
 // or lantern launch the existing physical arrows just to fill this role.
 return enemy.kind==='watcher'?null:ENEMY_APPEARANCES[`${area}:${enemy.id}`]??(enemy.kind==='captain'?'pale_shepherd_keeper':'maw_skeleton');
}
