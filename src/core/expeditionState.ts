import {AREA_IDS,EXPEDITIONS,type AreaId} from './expeditionCatalog.js';
/** Durable records contain no combat timers, projectiles, or partial shortcut animation. */
export interface AreaProgress {defeated:string[];looted:string[];openedShortcuts:string[];checkpointId:string;completed:boolean;gateOpen:boolean}
export type AreaRecords=Record<AreaId,AreaProgress>;
export const freshAreaProgress=(id:AreaId):AreaProgress=>({defeated:[],looted:[],openedShortcuts:[],checkpointId:id==='station'?'ward-beacon':EXPEDITIONS[id].checkpoints[0].id,completed:false,gateOpen:false});
export const freshAreaRecords=():AreaRecords=>Object.fromEntries(AREA_IDS.map(id=>[id,freshAreaProgress(id)])) as AreaRecords;
export const copyAreaProgress=(p:AreaProgress):AreaProgress=>({...p,defeated:[...p.defeated],looted:[...p.looted],openedShortcuts:[...p.openedShortcuts]});
