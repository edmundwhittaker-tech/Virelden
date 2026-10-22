/** Connected-expedition v4. Previous v3/v1 storage remains read-only, including on reset. */
import {createAdventure,activateArea,captureArea,recalculatePools,armory,STATION_CACHE_ARMOR,LOOT,type Adventure} from './adventure.js';
import {readCampaignSave as readV3, campaignCodec} from './legacyCampaignSave.js';
import {readProgressionExtension,MAX_SAVE_CHARACTERS,type ProgressionExtension} from './progressionSave.js';
import {AREA_IDS,EXPEDITIONS,type AreaId} from './expeditionCatalog.js';
import {freshAreaRecords,copyAreaProgress,type AreaProgress,type AreaRecords} from './expeditionState.js';
import {CAMPAIGN_REWARDS,STATION_ENCOUNTERS} from './rewardCatalog.js';
export {campaignCodec};
export interface SaveStorage{getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export interface SaveKeys{readonly current:string;readonly good:string;readonly legacy:string;readonly previous?:string;readonly previousGood?:string;readonly pending?:string}
export function saveKeys(qa:boolean):SaveKeys{const p=qa?'virelden-underworks-qa':'virelden-underworks';return {current:`${p}-v4`,good:`${p}-v4-good`,pending:`${p}-v4-pending`,previous:`${p}-v3`,previousGood:`${p}-v3-good`,legacy:`${p}-v1`};}
const record=(raw:unknown):Record<string,unknown>|null=>raw!==null&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:null;
const list=(raw:unknown,allowed:readonly string[]):raw is string[]=>Array.isArray(raw)&&new Set(raw).size===raw.length&&raw.every(id=>typeof id==='string'&&allowed.includes(id));
function readArea(raw:unknown,id:AreaId):AreaProgress|null{
 const d=record(raw);if(!d||Object.keys(d).sort().join('|')!==['checkpointId','completed','defeated','gateOpen','looted','openedShortcuts'].sort().join('|')||typeof d.completed!=='boolean'||typeof d.gateOpen!=='boolean')return null;
 const foes=id==='station'?STATION_ENCOUNTERS:EXPEDITIONS[id].enemies.map(e=>e.id),loot=id==='station'?LOOT.map(l=>l.id):EXPEDITIONS[id].loot.map(l=>l.id),shortcuts=id==='station'?['ward-shortcut-open']:EXPEDITIONS[id].shortcuts.map(l=>l.id);
 if(!list(d.defeated,foes)||!list(d.looted,loot)||!list(d.openedShortcuts,shortcuts))return null;
 if(id==='station'){
  if(!['ward-beacon','transfer-beacon'].includes(d.checkpointId as string)||(d.checkpointId==='transfer-beacon'&&!d.gateOpen)||(d.completed&&(!d.gateOpen||!d.defeated.includes('upper-captain'))))return null;
 }else{
  const area=EXPEDITIONS[id];if(d.gateOpen||!area.checkpoints.some(p=>p.id===d.checkpointId))return null;
  if(area.loot.some(l=>(d.looted as string[]).includes(l.id)&&!l.reward.requiresDefeated.every(guard=>(d.defeated as string[]).includes(guard))))return null;
  if(area.shortcuts.some(l=>(d.openedShortcuts as string[]).includes(l.id)&&!l.requiresDefeated.every(guard=>(d.defeated as string[]).includes(guard))))return null;
  if(d.completed&&!area.exits.find(e=>e.secureObjective)?.requiresDefeated?.every(guard=>(d.defeated as string[]).includes(guard)))return null;
 }
 return {defeated:[...d.defeated],looted:[...d.looted],openedShortcuts:[...d.openedShortcuts],checkpointId:d.checkpointId as string,completed:d.completed,gateOpen:d.gateOpen};
}
export function expectedCampaignRewards(areas:AreaRecords):string[]{
 const station=areas.station,earned=[...station.defeated.map(id=>`station:${id}`),...(station.gateOpen?['station:gate-open']:[]),...(station.openedShortcuts.length?['station:shortcut-open']:[]),...(station.completed?['station:secure-exit']:[]),...(station.looted.includes('transfer-cache')?['station:transfer-cache']:[])];
 for(const id of ['cistern-viaduct','record-annex'] as const){const progress=areas[id],area=EXPEDITIONS[id];earned.push(...progress.defeated.map(enemy=>`${id}:${enemy}`));if(progress.completed)earned.push(`${id}:secure`);for(const loot of area.loot)if(progress.looted.includes(loot.id)&&loot.reward.xpRewardId)earned.push(`${id}:${loot.reward.xpRewardId}`);}
 return earned;
}
function extensionAgrees(areas:AreaRecords,extension:ProgressionExtension):boolean{
 const expected=expectedCampaignRewards(areas),earned=extension.progression.earned;if(earned.length!==expected.length||earned.some(id=>!expected.includes(id)))return false;
 for(const id of areas.station.looted){const loot=LOOT.find(l=>l.id===id)!;if(!extension.equipment.owned.includes(STATION_CACHE_ARMOR[id])||!extension.armory.owned.includes(loot.weapon)||(id==='transfer-cache'&&!extension.armory.owned.includes('axe')))return false;}
 for(const id of ['cistern-viaduct','record-annex'] as const)for(const loot of EXPEDITIONS[id].loot)if(areas[id].looted.includes(loot.id)&&(!loot.reward.armor.every(piece=>extension.equipment.owned.includes(piece))||(loot.reward.weapon&&!extension.armory.owned.includes(loot.reward.weapon))))return false;
 return true;
}
const materialize=(s:Adventure,extension:ProgressionExtension):Adventure=>{s.equipment=extension.equipment;s.progression=extension.progression;s.owned=[...extension.armory.owned];s.equipped=extension.armory.equipped;s.levels={...extension.armory.levels};recalculatePools(s);s.hp=s.maxHp;s.stamina=s.maxStamina;return s;};
export function campaignExtension(s:Adventure):ProgressionExtension{return {schema:1,equipment:s.equipment,progression:s.progression,armory:armory(s)};}
/** Only strict, complete v3/v2/v1 records can migrate. The full equipment/progression extension survives. */
export function migrateCampaignSave(raw:string):Adventure|null{
 const s=readV3(raw);if(!s)return null;s.areas=freshAreaRecords();s.areaId='station';captureArea(s);activateArea(s,'station');s.message='Earlier station progress preserved. The service stairs lead to two connected expeditions.';return s;
}
export function readCampaignSave(raw:string):Adventure|null{
 if(typeof raw!=='string'||raw.length>MAX_SAVE_CHARACTERS)return null;
 try{
  const envelope=record(JSON.parse(raw));if(!envelope)return null;if(envelope.version!==4)return migrateCampaignSave(raw);
  const world=record(envelope.world),extension=readProgressionExtension(envelope.extension,CAMPAIGN_REWARDS);if(!world||Object.keys(world).sort().join('|')!==['schema','activeArea','archetype','currency','areas'].sort().join('|')||world.schema!==2||!extension||(world.archetype!=='vanguard'&&world.archetype!=='wayfarer')||!Number.isSafeInteger(world.currency)||Number(world.currency)<0||Number(world.currency)>100000||!AREA_IDS.includes(world.activeArea as AreaId))return null;
  const records=record(world.areas);if(!records||Object.keys(records).sort().join('|')!==[...AREA_IDS].sort().join('|'))return null;
  const areas=freshAreaRecords();for(const id of AREA_IDS){const progress=readArea(records[id],id);if(!progress)return null;areas[id]=progress;}
  // Downstream facts cannot precede the guarded ordinary physical connection.
  for(const id of ['cistern-viaduct','record-annex'] as const){const progress=areas[id],entry=EXPEDITIONS[id].entry;if((world.activeArea===id||progress.defeated.length||progress.looted.length||progress.openedShortcuts.length||progress.completed)&&!areas[entry.requiresExternalDefeated.expeditionId].defeated.includes(entry.requiresExternalDefeated.enemyId))return null;}
  if(!extensionAgrees(areas,extension))return null;
  const s=createAdventure(world.archetype);s.areas=areas;s.currency=world.currency as number;activateArea(s,world.activeArea as AreaId);materialize(s,extension);s.message='Progress restored at this expedition’s safe beacon.';return s;
 }catch{return null;}
}
export function prepareCampaignSave(s:Adventure):string|null{
 try{captureArea(s);const areas=Object.fromEntries(AREA_IDS.map(id=>[id,copyAreaProgress(s.areas[id])]));const raw=JSON.stringify({version:4,world:{schema:2,activeArea:s.areaId,archetype:s.archetype,currency:s.currency,areas},extension:campaignExtension(s)});return readCampaignSave(raw)?raw:null;}catch{return null;}
}
export type CampaignLoad={status:'loaded';state:Adventure;notice:string|null;migrated:boolean;source:'current'|'last-known-good'|'legacy'}|{status:'empty'|'corrupt'|'unavailable'|'future';notice:string|null};
export const RESET_TOMBSTONE=JSON.stringify({version:4,reset:true});
export function isResetTombstone(raw:string|null):boolean{if(raw===null)return false;try{const d=record(JSON.parse(raw));return !!d&&d.version===4&&d.reset===true&&Object.keys(d).sort().join('|')==='reset|version';}catch{return false;}}
const savedVersion=(raw:string|null):unknown=>{try{return raw===null?null:record(JSON.parse(raw))?.version;}catch{return null;}};
const validDurable=(raw:string|null):boolean=>raw!==null&&savedVersion(raw)===4&&(isResetTombstone(raw)||readCampaignSave(raw)!==null);
const isFutureSave=(raw:string|null):boolean=>{if(raw===null)return false;try{const version=JSON.parse(raw)?.version;return Number.isSafeInteger(version)&&version>4;}catch{return false;}};
const successorKeys=(keys:SaveKeys):string[]=>{const next=keys.current.replace(/-v4$/,'-v5');return next===keys.current?[]:[next,`${next}-good`];};
// Like the released v3 client, protect the next namespace even if its payload is malformed.
const hasFutureCampaign=(storage:SaveStorage,keys:SaveKeys)=>successorKeys(keys).some(key=>storage.getItem(key)!==null)||[keys.current,keys.good,keys.previous,keys.previousGood,keys.legacy].some(key=>key!==undefined&&isFutureSave(storage.getItem(key)));
export function loadCampaign(storage:SaveStorage,keys:SaveKeys):CampaignLoad{
 try{
  const current=storage.getItem(keys.current),good=storage.getItem(keys.good);if(hasFutureCampaign(storage,keys))return {status:'future',notice:'A newer game version saved these expeditions. Its progress has not been erased.'};
  // A broken v4 must never silently fall back across schemas and discard connected-area facts.
  const hasV4=current!==null||good!==null;const candidates:readonly [string,string|null][] =hasV4?[['current',current],['last-known-good',good]]:[['legacy',keys.previous?storage.getItem(keys.previous):null],['legacy',keys.previousGood?storage.getItem(keys.previousGood):null],['legacy',storage.getItem(keys.legacy)]];
  let rejected=false;
  for(const [source,raw] of candidates){if(raw===null)continue;const version=savedVersion(raw);if(source==='legacy'?![1,2,3].includes(version as number):version!==4){rejected=true;continue;}if(source!=='legacy'&&isResetTombstone(raw))return {status:'empty',notice:rejected?'The newest save could not be read. The previous explicit reset was preserved.':null};const s=readCampaignSave(raw);if(s){const migrated=JSON.parse(raw).version!==4;return {status:'loaded',state:s,source:source as 'current'|'last-known-good'|'legacy',migrated,notice:rejected||source==='last-known-good'?'The newest save could not be read. Earlier valid progress was restored.':migrated?'Earlier station equipment, upgrades, marks and training were preserved for the connected expeditions.':null};}rejected=true;}
  return rejected?{status:'corrupt',notice:'Saved progress could not be read. It has not been erased. Reload to retry or explicitly reset only this version.'}:{status:'empty',notice:null};
 }catch{return {status:'unavailable',notice:'Saving unavailable in this browser. Existing progress has not been erased.'};}
}
type PersistResult={ok:boolean;notice:string;blockedByNewerVersion?:boolean;blockedByConcurrentWrite?:boolean};
const newerBlocked=():PersistResult=>({ok:false,blockedByNewerVersion:true,notice:'A newer game version saved these expeditions. Its progress has not been overwritten.'});
const concurrentBlocked=():PersistResult=>({ok:false,blockedByConcurrentWrite:true,notice:'Another tab changed this expedition while saving. Reload before continuing; its progress has not been overwritten.'});
/** Staged readback precedes current replacement. Rechecks bound cross-tab interleavings, not an atomic transaction. */
export function persistCampaign(storage:SaveStorage,keys:SaveKeys,s:Adventure):PersistResult{
 const raw=prepareCampaignSave(s);if(raw===null)return {ok:false,notice:'Progress could not be validated. Earlier durable progress is unchanged.'};
 let previous:string|null=null,written=false;const pending=keys.pending??`${keys.current}-pending`;
 try{
  previous=storage.getItem(keys.current);if(hasFutureCampaign(storage,keys))return newerBlocked();
  const changed=():PersistResult|null=>hasFutureCampaign(storage,keys)?newerBlocked():storage.getItem(keys.current)!==previous?concurrentBlocked():null;
  storage.setItem(pending,raw);const staged=storage.getItem(pending);if(staged!==raw||!readCampaignSave(staged))throw Error('Staged save did not validate');
  let blocked=changed();if(blocked)return blocked;
  if(validDurable(previous))storage.setItem(keys.good,previous!);
  blocked=changed();if(blocked)return blocked;
  storage.setItem(keys.current,raw);written=true;
  if(hasFutureCampaign(storage,keys))return newerBlocked();
  if(storage.getItem(keys.current)!==raw||!readCampaignSave(storage.getItem(keys.current)!))throw Error('Current save readback did not validate');
  try{storage.removeItem(pending);}catch{/* validated current is already durable */}return {ok:true,notice:'Local progress · saved'};
 }catch{
  try{
   // A failed readback/rollback must never erase a future or independently valid newer record.
   if(hasFutureCampaign(storage,keys))return newerBlocked();
   const now=storage.getItem(keys.current);if(written&&validDurable(now)&&now!==raw)return concurrentBlocked();
   if(written&&validDurable(previous)&&!hasFutureCampaign(storage,keys))storage.setItem(keys.current,previous!);
  }catch{/* bounded previous-good copy remains recoverable even when storage is unavailable */}
  return {ok:false,notice:'Saving unavailable · keep this tab open. Earlier valid progress is retained.'};
 }
}
/** A validated reset tombstone suppresses all older-schema fallback, including after later write failure.
 * Reserve the same tombstone as previous-good before the first fresh-character replacement.
 */
export function resetCampaign(storage:SaveStorage,keys:SaveKeys):boolean{
 const pending=keys.pending??`${keys.current}-pending`;
 try{
  const previous=storage.getItem(keys.current);if(hasFutureCampaign(storage,keys))return false;
  storage.setItem(pending,RESET_TOMBSTONE);if(storage.getItem(pending)!==RESET_TOMBSTONE||!isResetTombstone(storage.getItem(pending)))return false;
  if(hasFutureCampaign(storage,keys)||storage.getItem(keys.current)!==previous)return false;
  storage.setItem(keys.current,RESET_TOMBSTONE);if(!isResetTombstone(storage.getItem(keys.current)))return false;
  if(hasFutureCampaign(storage,keys)||storage.getItem(keys.current)!==RESET_TOMBSTONE)return false;
  storage.setItem(keys.good,RESET_TOMBSTONE);if(!isResetTombstone(storage.getItem(keys.good))||hasFutureCampaign(storage,keys)||storage.getItem(keys.current)!==RESET_TOMBSTONE)return false;
  try{storage.removeItem(pending);}catch{/* both validated reset records remain authoritative */}return true;
 }catch{return false;}
}
