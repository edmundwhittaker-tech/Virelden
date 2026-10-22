/** The active save path. Legacy keys are read-only until the user explicitly resets. */
import {createAdventure, restore, serialize, grantStationCache, recalculatePools, armory, STATION_CACHE_ARMOR, LOOT, type Adventure} from './adventure.js';
import {readVersionedProgressionSave, prepareVersionedProgressionSave, selectProgressionSave, type WorldSaveCodec, type ProgressionExtension} from './progressionSave.js';
import {CAMPAIGN_REWARDS, STATION_ENCOUNTERS} from './rewardCatalog.js';

const legacyFields=(s:Adventure)=>JSON.parse(serialize(s)) as Record<string,unknown>;
const stationEarned=(s:Adventure)=>[
 ...s.enemies.filter(e=>e.hp<=0).map(e=>`station:${e.id}`),
 ...(s.gatePhase==='open'?['station:gate-open']:[]),...(s.shortcut?['station:shortcut-open']:[]),
 ...(s.completed?['station:secure-exit']:[]),...(s.looted.includes('transfer-cache')?['station:transfer-cache']:[]),
];
/** Weapon/equipment/progression data are authoritative only in the extension, never duplicated in world v3. */
export const campaignCodec:WorldSaveCodec<Adventure>={
 readWorld(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const d=raw as Record<string,unknown>;
  if(d.version!==undefined||d.schema!==1||d.expedition!=='station'||d.owned!==undefined||d.levels!==undefined||d.equipped!==undefined)return null;
  if(d.archetype!=='vanguard'&&d.archetype!=='wayfarer')return null;
  const defaults=legacyFields(createAdventure(d.archetype));
  const s=restore(JSON.stringify({...d,version:2,owned:defaults.owned,levels:defaults.levels,equipped:defaults.equipped}));
  if(!s||d.completed!==s.completed||!Array.isArray(d.defeated)||new Set(d.defeated).size!==d.defeated.length)return null;
  return s;
 },
 readLegacyWorld(raw){return restore(JSON.stringify(raw));},
 completeLegacyExtension(s,extension){
  const copy={...s,equipment:extension.equipment,owned:[...extension.armory.owned]};
  for(const id of s.looted)grantStationCache(copy,id);
  return {...extension,equipment:copy.equipment,armory:{...extension.armory,owned:copy.owned}};
 },
 writeWorld(s){const d=legacyFields(s);delete d.version;delete d.owned;delete d.levels;delete d.equipped;return {...d,schema:1,expedition:'station'};},
 legacyProgress(s){return {archetype:s.archetype,owned:s.owned.filter((id):id is 'sword'|'spear'|'hammer'=>['sword','spear','hammer'].includes(id)),equipped:s.equipped as 'sword'|'spear'|'hammer',levels:s.levels,defeated:s.enemies.filter(e=>e.hp<=0).map(e=>e.id),looted:s.looted,shortcut:s.shortcut,gateOpen:s.gatePhase==='open',completed:s.completed};},
 extensionAgrees(s,extension){
  const expected=stationEarned(s),earned=extension.progression.earned;
  // Additional expedition records are enabled together with their world model, never accepted in advance.
  return s.looted.every(id=>extension.equipment.owned.includes(STATION_CACHE_ARMOR[id])&&extension.armory.owned.includes(LOOT.find(loot=>loot.id===id)!.weapon))
   &&(!s.looted.includes('transfer-cache')||extension.armory.owned.includes('axe'))
   &&earned.length===expected.length&&earned.every(id=>expected.includes(id))
   &&s.enemies.every(e=>(STATION_ENCOUNTERS as readonly string[]).includes(e.id));
 },
};
export function campaignExtension(s:Adventure):ProgressionExtension{return {schema:1,equipment:s.equipment,progression:s.progression,armory:armory(s)};}
export function prepareCampaignSave(s:Adventure):string|null{return prepareVersionedProgressionSave({version:3,world:s,extension:campaignExtension(s)},campaignCodec,CAMPAIGN_REWARDS)?.raw??null;}
function materialize(save:{world:Adventure;extension:ProgressionExtension}):Adventure{
 const s=save.world,extension=save.extension;s.equipment=extension.equipment;s.progression=extension.progression;s.owned=[...extension.armory.owned];s.equipped=extension.armory.equipped;s.levels={...extension.armory.levels};
 recalculatePools(s);s.hp=s.maxHp;s.stamina=s.maxStamina;return s;
}
export function readCampaignSave(raw:string):Adventure|null{const result=readVersionedProgressionSave(raw,campaignCodec,CAMPAIGN_REWARDS);return result?materialize(result.save):null;}
export interface SaveStorage{getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export interface SaveKeys{readonly current:string;readonly good:string;readonly legacy:string}
export function saveKeys(qa:boolean):SaveKeys{const prefix=qa?'virelden-underworks-qa':'virelden-underworks';return {current:`${prefix}-v3`,good:`${prefix}-v3-good`,legacy:`${prefix}-v1`};}
export type CampaignLoad={status:'loaded';state:Adventure;notice:string|null;migrated:boolean;source:'current'|'last-known-good'|'legacy'}|{status:'empty'|'corrupt'|'unavailable';notice:string|null};
const isFutureSave=(raw:string|null):boolean=>{if(raw===null)return false;try{const version=JSON.parse(raw)?.version;return Number.isSafeInteger(version)&&version>3;}catch{return false;}};
export function loadCampaign(storage:SaveStorage,keys:SaveKeys):CampaignLoad{
 try{
  const current=storage.getItem(keys.current);
  if(isFutureSave(current))return {status:'corrupt',notice:'A newer game version saved this expedition. Open the newer version; this progress has not been erased.'};
  const selected=selectProgressionSave([{source:'current',raw:current},{source:'last-known-good',raw:storage.getItem(keys.good)},{source:'legacy',raw:storage.getItem(keys.legacy)}],campaignCodec,CAMPAIGN_REWARDS);
  return selected.status==='loaded'?{status:'loaded',state:materialize(selected.save),notice:selected.notice,migrated:selected.migrated,source:selected.source}:selected;
 }catch{return {status:'unavailable',notice:'Saving unavailable in this browser. Existing progress has not been erased.'};}
}
/** Bounded previous-good write, then current write+readback. Failure never clears or writes the legacy key. */
export function persistCampaign(storage:SaveStorage,keys:SaveKeys,s:Adventure):{ok:boolean;notice:string}{
 const raw=prepareCampaignSave(s);if(raw===null)return {ok:false,notice:'Progress could not be validated. Earlier durable progress is unchanged.'};
 let previous:string|null=null,written=false;
 try{
  previous=storage.getItem(keys.current);
  if(isFutureSave(previous))return {ok:false,notice:'A newer game version saved this expedition. Its progress has not been overwritten.'};
  if(previous!==null&&readCampaignSave(previous))storage.setItem(keys.good,previous);
  storage.setItem(keys.current,raw);written=true;
  const readback=storage.getItem(keys.current);
  if(readback!==raw||readCampaignSave(readback)===null)throw new Error('Save readback did not validate');
  return {ok:true,notice:'Local progress · saved'};
 }catch{
  // Best effort rollback is bounded. A valid previous-good copy already exists if a valid current was replaced.
  if(written&&previous!==null&&readCampaignSave(previous)){try{storage.setItem(keys.current,previous);}catch{/* last-known-good remains recoverable */}}
  return {ok:false,notice:'Saving unavailable · keep this tab open. Earlier valid progress is retained.'};
 }
}
export function resetCampaign(storage:SaveStorage,keys:SaveKeys):boolean{try{for(const key of [keys.current,keys.good,keys.legacy])storage.removeItem(key);return true;}catch{return false;}}
