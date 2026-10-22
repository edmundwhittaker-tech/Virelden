import {facingForInput,type Facing} from './facing.js';
import {sampleMeleeSweep,weaponTouchesBody} from './meleeContact.js';
import {archerProjectileOrigin} from './archerRig.js';
import {STATION_GATE,CHECKPOINTS,FINISH,LEVEL_WALLS} from './level.js';
import {canStand,move,project,SPAWN,STEP,type Point} from './game.js';
export type Archetype='vanguard'|'wayfarer';
export type {WeaponId} from './weaponCatalog.js';
import {WEAPON_CATALOG, WEAPON_IDS, weaponShapeContains, prepareWeaponEquip, prepareWeaponUpgrade, type WeaponId, type Armory, type WeaponProfile} from './weaponCatalog.js';
import {freshEquipment, equipmentStats, clampPools, prepareEquip, grantArmor, ARMOR, type Equipment, type ArmorSlot, type ArmorId, type ArmorItem} from './equipment.js';
import {freshProgression, awardDefeat, awardReward, spendAttribute, availablePoints, level, type Progression, type Attribute} from './progression.js';
import {CAMPAIGN_REWARDS} from './rewardCatalog.js';
/** Compatibility view for older renderer/test consumers; catalog is the sole combat definition. */
export const WEAPONS=Object.freeze(Object.fromEntries(WEAPON_IDS.map(id=>[id,Object.freeze({...WEAPON_CATALOG[id],arc:WEAPON_CATALOG[id].shape.kind==='sector'?WEAPON_CATALOG[id].shape.halfAngle:Math.atan2(17,132)})]))) as Record<WeaponId,WeaponProfile & {arc:number}>;
export const ARCHETYPES={vanguard:{name:'Vanguard',maxHp:140,maxStamina:90,weapon:'sword'},wayfarer:{name:'Wayfarer',maxHp:100,maxStamina:130,weapon:'spear'}} as const;
export const LOCATIONS={checkpoint:{...SPAWN},smith:{x:260,y:330},lever:{x:560,y:400},shortcut:{x:430,y:390}};
export const WALLS:{x:number;y:number;width:number;height:number;gate?:boolean}[]=[...LEVEL_WALLS,{x:350,y:20,width:20,height:150},{x:350,y:280,width:20,height:120},{x:200,y:390,width:150,height:20},{x:350,y:170,width:20,height:110,gate:true}];
export const LOOT=[{id:'west-cache',position:{x:150,y:420},weapon:'hammer' as WeaponId,currency:35},{id:'north-cache',position:{x:420,y:100},weapon:'spear' as WeaponId,currency:35},{id:'south-cache',position:{x:300,y:540},weapon:'sword' as WeaponId,currency:25},{id:'transfer-cache',position:{x:570,y:-750},weapon:'hammer' as WeaponId,currency:45}];
export interface Enemy {id:string;kind:'raider'|'watcher'|'captain';position:Point;home:Point;hp:number;maxHp:number;phase:'idle'|'windup'|'recovery'|'stagger';timer:number;aim:Point;reward:number}
export interface Projectile {position:Point;velocity:Point;life:number}
export interface Adventure {equipment:Equipment;progression:Progression;archetype:Archetype;position:Point;aim:Point;hp:number;maxHp:number;stamina:number;maxStamina:number;attack:{phase:'idle'|'windup'|'active'|'recovery';timer:number;aim:Point;weapon:WeaponId;hit:string[];facing:Facing;contacts:Record<string,number>};rollTimer:number;rollCooldown:number;rollAim:Point;hurtTimer:number;staminaDelay:number;enemies:Enemy[];projectiles:Projectile[];currency:number;owned:WeaponId[];levels:Record<WeaponId,number>;equipped:WeaponId;checkpoint:Point;looted:string[];shortcut:boolean;completed:boolean;gatePhase:'closed'|'pulling'|'opening'|'open';gateProgress:number;interactionTimer:number;message:string;time:number}
const unit=(p:Point):Point=>{const n=Math.hypot(p.x,p.y);return n?{x:p.x/n,y:p.y/n}:{x:1,y:0};};
const vector=(a:Point,b:Point):Point=>{const p=project(a),q=project(b);return {x:q.x-p.x,y:q.y-p.y};};
const distance=(a:Point,b:Point)=>Math.hypot(...Object.values(vector(a,b)));
const near=(s:Adventure,p:Point)=>distance(s.position,p)<38;
function enemies():Enemy[]{return [
 {id:'raider',kind:'raider',position:{x:220,y:160},maxHp:75,reward:25},
 {id:'watcher',kind:'watcher',position:{x:440,y:230},maxHp:60,reward:25},
 {id:'captain',kind:'captain',position:{x:480,y:450},maxHp:220,reward:80},
 {id:'ascent-raider',kind:'raider',position:{x:470,y:-190},maxHp:75,reward:25},
 {id:'ascent-watcher',kind:'watcher',position:{x:520,y:-440},maxHp:60,reward:25},
 {id:'ascent-guard',kind:'raider',position:{x:150,y:-550},maxHp:90,reward:30},
 {id:'transfer-raider',kind:'raider',position:{x:120,y:-790},maxHp:90,reward:30},
 {id:'transfer-watcher',kind:'watcher',position:{x:510,y:-800},maxHp:65,reward:30},
 {id:'transfer-guard',kind:'raider',position:{x:480,y:-1170},maxHp:100,reward:35},
 {id:'watch-raider',kind:'raider',position:{x:480,y:-1400},maxHp:100,reward:35},
 {id:'watch-watcher',kind:'watcher',position:{x:110,y:-1510},maxHp:70,reward:35},
 {id:'upper-captain',kind:'captain',position:{x:320,y:-1760},maxHp:260,reward:100},
].map(e=>({...e,kind:e.kind as Enemy['kind'],home:{...e.position},hp:e.maxHp,phase:'idle',timer:0,aim:{x:1,y:0}}));}
export function createAdventure(archetype:Archetype='vanguard'):Adventure{
 const a=ARCHETYPES[archetype];return {equipment:freshEquipment(),progression:freshProgression(),archetype,position:{...SPAWN},aim:{x:1,y:0},hp:a.maxHp,maxHp:a.maxHp,stamina:a.maxStamina,maxStamina:a.maxStamina,attack:{phase:'idle',timer:0,aim:{x:1,y:0},weapon:a.weapon,hit:[],facing:'east',contacts:{}},rollTimer:0,rollCooldown:0,rollAim:{x:1,y:0},hurtTimer:0,staminaDelay:0,enemies:enemies(),projectiles:[],currency:0,owned:[a.weapon],levels:{sword:0,spear:0,hammer:0,axe:0,falchion:0,poleaxe:0},equipped:a.weapon,checkpoint:{...SPAWN},looted:[],shortcut:false,completed:false,gatePhase:'closed',gateProgress:0,interactionTimer:0,message:'Explore the lower ward. Rest at the beacon; recover equipment from the caches.',time:0};
}
export const weaponDamage=(s:Adventure,id:WeaponId=s.equipped)=>WEAPONS[id].damage*(1+s.levels[id]*.25);
export const upgradeCost=(s:Adventure)=>s.levels[s.equipped]===0?30:60;
export function attack(s:Adventure):boolean{
 if(s.hp<=0||s.gatePhase==='pulling'||s.attack.phase!=='idle'||s.rollTimer>0)return false;
 const w=WEAPONS[s.equipped];if(s.stamina<w.cost){s.message='Not enough stamina. Let it recover.';return false;}
 s.stamina-=w.cost;s.staminaDelay=.7;s.attack={phase:'windup',timer:w.windup,aim:{...s.aim},weapon:s.equipped,hit:[],facing:facingForInput(s.aim,s.attack.facing),contacts:{}};return true;
}
export function roll(s:Adventure,input:Point=s.aim):boolean{
 if(s.hp<=0||s.gatePhase==='pulling'||s.rollCooldown>0||s.rollTimer>0||s.attack.phase!=='idle'||s.stamina<derivedStats(s).rollCost)return false;
 s.stamina-=derivedStats(s).rollCost;s.staminaDelay=.8;s.rollTimer=.38;s.rollCooldown=.8;s.rollAim=unit(input.x||input.y?input:s.aim);return true;
}
export const invulnerable=(s:Adventure)=>s.rollTimer>.08&&s.rollTimer<.36;
function damage(s:Adventure,amount:number){if(s.hp<=0||s.hurtTimer>0||invulnerable(s))return;s.hp=Math.max(0,s.hp-amount*derivedStats(s).damageMultiplier);s.hurtTimer=.45;if(!s.hp){s.message='You fell. Retry at the beacon; equipment and earned currency are retained.';s.attack.phase='idle';s.rollTimer=0;}}
function clearLine(s:Adventure,a:Point,b:Point):boolean{const count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6);for(let i=1;i<count;i++)if(!adventureCanStand(s,{x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count}))return false;return true;}
function hitEnemies(s:Adventure,from:number,to:number){
 const w=WEAPONS[s.attack.weapon],aim=s.attack.aim,frames=sampleMeleeSweep({weapon:s.attack.weapon,aim,facing:s.attack.facing,from,to});
 for(const e of s.enemies){
  if(e.hp<=0||s.attack.hit.includes(e.id))continue;
  const d=vector(s.position,e.position),local={x:d.x*aim.x+d.y*aim.y,y:-d.x*aim.y+d.y*aim.x};
  if(!clearLine(s,s.position,e.position)||!weaponShapeContains(s.attack.weapon,local))continue;
  const contact=frames.find(frame=>weaponTouchesBody(frame,d));if(!contact)continue;
  s.attack.contacts[e.id]=contact.progress;
  const before=e.hp;e.hp=Math.max(0,e.hp-weaponDamage(s,s.attack.weapon));s.attack.hit.push(e.id);
  if(!e.hp){const xpBefore=s.progression.xp;s.progression=awardDefeat(s.progression,`station:${e.id}`,before,e.hp,CAMPAIGN_REWARDS);s.currency+=e.reward;s.message=`${e.kind==='captain'?(e.id==='upper-captain'?'Upper watch captain defeated. Secure the station exit.':'Captain defeated. The lower ward is secured.'):'Enemy defeated.'} +${e.reward} iron marks · +${s.progression.xp-xpBefore} XP. Level ${level(s.progression)} · ${availablePoints(s.progression)} training points.`;}
  else{e.phase='stagger';e.timer=w.stagger;}
 }
}
export function adventureCanStand(s:Adventure,p:Point):boolean{return canStand(p)&&(s.gatePhase==='open'||p.y< -28||p.y>28||p.x<STATION_GATE.left||p.x>STATION_GATE.right)&&WALLS.every(w=>(w.gate&&s.shortcut)||p.x<w.x-12||p.x>w.x+w.width+12||p.y<w.y-12||p.y>w.y+w.height+12);}
function travel(s:Adventure,p:Point,input:Point,dt:number):Point{let result={...p};const count=Math.max(1,Math.ceil(dt/.008));for(let i=0;i<count;i++){const next=move(result,input,dt/count);const x={x:next.x,y:result.y};if(adventureCanStand(s,x))result=x;const y={x:result.x,y:next.y};if(adventureCanStand(s,y))result=y;}return result;}
function step(s:Adventure,input:Point,dt:number){
 if(s.hp<=0)return;s.time+=dt;
 if(s.gatePhase==='pulling'){s.interactionTimer=Math.max(0,s.interactionTimer-dt);if(!s.interactionTimer){s.gatePhase='opening';s.message='The station gate is opening. Stand clear until the leaves are fully withdrawn.';}}
 else if(s.gatePhase==='opening'){s.gateProgress=Math.min(1,s.gateProgress+dt/STATION_GATE.openSeconds);if(s.gateProgress>=1){s.gatePhase='open';s.progression=awardReward(s.progression,'station:gate-open',CAMPAIGN_REWARDS);s.message='Station gate open. Follow the lamps through the arch into the ascent.';}}
s.rollCooldown=Math.max(0,s.rollCooldown-dt);s.hurtTimer=Math.max(0,s.hurtTimer-dt);s.staminaDelay=Math.max(0,s.staminaDelay-dt);
 if(!s.staminaDelay&&s.attack.phase==='idle'&&!s.rollTimer)s.stamina=Math.min(s.maxStamina,s.stamina+derivedStats(s).staminaRegen*dt);
 if(s.rollTimer>0){s.position=travel(s,s.position,s.rollAim,dt*2.4);s.rollTimer=Math.max(0,s.rollTimer-dt);}else if(s.attack.phase==='idle'&&s.gatePhase!=='pulling'){s.position=travel(s,s.position,input,dt);if(input.x||input.y)s.aim=unit(input);}
 if(s.attack.phase==='idle')s.attack.facing=facingForInput(s.aim,s.attack.facing);
 if(s.attack.phase!=='idle'){
  const w=WEAPONS[s.attack.weapon],before=s.attack.timer;s.attack.timer-=dt;
  if(s.attack.phase==='active')hitEnemies(s,1-before/w.active,1-s.attack.timer/w.active);
  if(s.attack.timer<=0){if(s.attack.phase==='windup'){s.attack.phase='active';s.attack.timer=w.active;hitEnemies(s,0,0);}else if(s.attack.phase==='active'){s.attack.phase='recovery';s.attack.timer=w.recovery;}else s.attack.phase='idle';}
 }
 for(const e of s.enemies){if(e.hp<=0)continue;const d=vector(e.position,s.position),range=Math.hypot(d.x,d.y),reach=e.kind==='watcher'?200:e.kind==='captain'?70:52;
 if(e.phase!=='idle'){e.timer-=dt;if(e.timer<=0){if(e.phase==='windup'){if(e.kind==='watcher'){const u=e.aim;s.projectiles.push({position:archerProjectileOrigin(e.position,u),velocity:{x:u.x*160,y:u.y*160},life:2});}else{const u=unit(d);if(clearLine(s,e.position,s.position)&&range<reach+8&&u.x*e.aim.x+u.y*e.aim.y>.1)damage(s,e.kind==='captain'?34:20);}e.phase='recovery';e.timer=e.kind==='captain'?.95:.85;}else e.phase='idle';}continue;}
 // The beacon's immediate radius is a sanctuary. Enemies disengage there.
 if(CHECKPOINTS.some(p=>distance(s.position,p)<50)||range>250){if(distance(e.position,e.home)>4)e.position=travel(s,e.position,vector(e.position,e.home),dt*.4);continue;}
 if(range<reach&&clearLine(s,e.position,s.position)){e.phase='windup';e.timer=e.kind==='watcher'?.9:e.kind==='captain'?.8:.65;e.aim=unit(d);}else e.position=travel(s,e.position,d,dt*(e.kind==='captain'?.38:.48));
 }
 for(const p of s.projectiles){const old={...p.position};const dx=p.velocity.x/1.6+p.velocity.y/.8,dy=p.velocity.y/.8-p.velocity.x/1.6;p.position={x:p.position.x+dx*dt,y:p.position.y+dy*dt};p.life-=dt;if(!adventureCanStand(s,p.position))p.life=0;const a=project(old),b=project(p.position),c=project(s.position),vx=b.x-a.x,vy=b.y-a.y,t=Math.max(0,Math.min(1,((c.x-a.x)*vx+(c.y-a.y)*vy)/(vx*vx+vy*vy||1)));if(p.life>0&&Math.hypot(c.x-a.x-vx*t,c.y-a.y-vy*t)<14){damage(s,18);p.life=0;}}
 s.projectiles=s.projectiles.filter(p=>p.life>0);
}
/** Fixed substeps also make external callers safe after a delayed frame. */
export function tick(s:Adventure,input:Point,dt:number){let remaining=Math.max(0,Math.min(.1,dt));while(remaining>1e-8){const delta=Math.min(STEP,remaining);step(s,input,delta);remaining-=delta;}}
export function interactionHint(s:Adventure):string{
 if(s.hp<=0)return 'Retry at the beacon';if(near(s,STATION_GATE.lever))return s.gatePhase==='closed'?'E · Pull station gate lever':s.gatePhase==='open'?'Station gate open':'Opening station gate…';if(near(s,FINISH))return s.enemies.some(e=>e.id==='upper-captain'&&e.hp>0)?'Defeat the upper watch captain':'E · Secure the upper watch · Finish expedition';if(near(s,CHECKPOINTS[1]))return 'E · Rest at transfer checkpoint';if(LOOT.some(l=>!s.looted.includes(l.id)&&near(s,l.position)))return 'E · Open equipment cache';if(near(s,LOCATIONS.lever))return s.shortcut?'Shortcut is open':'E · Open shortcut';if(near(s,LOCATIONS.smith))return 'E · Smith: open equipment to upgrade';if(near(s,LOCATIONS.checkpoint))return 'E · Rest and replenish';return '';
}
export function interact(s:Adventure):boolean{
 if(s.hp<=0||s.gatePhase==='pulling'||s.attack.phase!=='idle'||s.rollTimer)return false;
 if(near(s,STATION_GATE.lever)){if(s.gatePhase!=='closed'||!adventureCanStand(s,STATION_GATE.stance))return false;s.position={...STATION_GATE.stance};s.gatePhase='pulling';s.interactionTimer=STATION_GATE.pullSeconds;s.aim=unit(vector(s.position,STATION_GATE.lever));s.message='Pulling the heavy station lever…';return true;}
 if(near(s,FINISH)){if(s.enemies.some(e=>e.id==='upper-captain'&&e.hp>0)){s.message='The upper watch captain still holds this station exit.';return false;}s.completed=true;s.progression=awardReward(s.progression,'station:secure-exit',CAMPAIGN_REWARDS);s.message='Upper watch secured. Expedition complete. Explore remaining caches or return down the station route.';return true;}
 if(near(s,CHECKPOINTS[1])){s.hp=s.maxHp;s.stamina=s.maxStamina;s.checkpoint={...CHECKPOINTS[1]};s.projectiles=[];s.message='Transfer checkpoint secured. Reload and retry now return here.';return true;}
 const loot=LOOT.find(l=>!s.looted.includes(l.id)&&near(s,l.position));if(loot){s.looted.push(loot.id);grantStationCache(s,loot.id);if(loot.id==='transfer-cache')s.progression=awardReward(s.progression,'station:transfer-cache',CAMPAIGN_REWARDS);if(!s.owned.includes(loot.weapon))s.owned.push(loot.weapon);s.currency+=loot.currency;s.message=`Found ${WEAPONS[loot.weapon].name} · ${ARMOR[STATION_CACHE_ARMOR[loot.id]].name}${loot.id==='transfer-cache'?' · Ward axe':''} and ${loot.currency} iron marks. Open Equipment to compare.`;return true;}
 if(near(s,LOCATIONS.lever)){s.shortcut=true;s.progression=awardReward(s.progression,'station:shortcut-open',CAMPAIGN_REWARDS);s.message='Shortcut gate opened. The north passage now leads directly to the far court.';return true;}
 if(near(s,LOCATIONS.smith)){s.message='At the smith: choose a weapon in Equipment, then upgrade it.';return true;}
 if(near(s,LOCATIONS.checkpoint)){s.hp=s.maxHp;s.stamina=s.maxStamina;s.checkpoint={...LOCATIONS.checkpoint};s.projectiles=[];s.message='Rested. Health and stamina replenished. Defeated enemies remain defeated.';return true;}return false;
}
export const equipmentContext=(s:Adventure)=>({alive:s.hp>0,idle:s.attack.phase==='idle',rolling:s.rollTimer>0,interacting:s.gatePhase==='pulling'});
export const armory=(s:Adventure):Armory=>({schema:1,owned:s.owned,equipped:s.equipped,levels:s.levels});
export const derivedStats=(s:Adventure)=>equipmentStats(s.equipment,ARCHETYPES[s.archetype],s.progression.attributes);
export function recalculatePools(s:Adventure){const stats=derivedStats(s),pools=clampPools(s,stats);s.maxHp=stats.maxHp;s.maxStamina=stats.maxStamina;s.hp=pools.hp;s.stamina=pools.stamina;}
export const atCheckpoint=(s:Adventure)=>CHECKPOINTS.some(p=>near(s,p));
export const atForge=(s:Adventure)=>near(s,LOCATIONS.smith);
export const STATION_CACHE_ARMOR:Readonly<Record<string,ArmorId>>=Object.freeze({'west-cache':'delver-chest','north-cache':'delver-helmet','south-cache':'delver-gauntlets','transfer-cache':'delver-legs'});
export function grantStationCache(s:Adventure,id:string){
 if(STATION_CACHE_ARMOR[id])s.equipment=grantArmor(s.equipment,STATION_CACHE_ARMOR[id]);
 const original=LOOT.find(loot=>loot.id===id)?.weapon;if(original&&!s.owned.includes(original))s.owned.push(original);
 if(id==='transfer-cache'&&!s.owned.includes('axe'))s.owned.push('axe');
}
export function equipArmor(s:Adventure,slot:ArmorSlot,id:ArmorId,ready:(item:ArmorItem)=>boolean,commitVisual:(equipment:Equipment)=>boolean):boolean{
 const result=prepareEquip(s.equipment,slot,id,equipmentContext(s),ARCHETYPES[s.archetype],s.progression.attributes,ready);
 if(!result.ok){s.message=`Armor unchanged: ${result.reason}.`;return false;}
 try{if(!commitVisual(result.next)){s.message='Armor unchanged: required artwork is not ready.';return false;}}catch{s.message='Armor unchanged: renderer preflight failed.';return false;}
 s.equipment=result.next;recalculatePools(s);s.message=`Equipped ${id}. Health and stamina were not refilled.`;return true;
}
export function equip(s:Adventure,weapon:WeaponId,capabilities={supportHand:false,visualReady:(w:WeaponProfile)=>['sword','spear','hammer'].includes(w.id)}):boolean{
 const result=prepareWeaponEquip(armory(s),weapon,equipmentContext(s),capabilities);if(!result.ok){s.message=`Weapon unchanged: ${result.reason}.`;return false;}
 s.equipped=result.next.equipped;s.message=`Equipped ${WEAPONS[weapon].name} +${s.levels[weapon]}.`;return true;
}
export function train(s:Adventure,attribute:Attribute):boolean{
 if(!equipmentContext(s).alive||!equipmentContext(s).idle||s.rollTimer||s.gatePhase==='pulling'){s.message='Stand idle at a checkpoint to train.';return false;}
 const result=spendAttribute(s.progression,attribute,atCheckpoint(s));if(!result.ok){s.message=`Training unavailable: ${result.reason}.`;return false;}
 s.progression=result.next;recalculatePools(s);s.message=attribute==='resolve'?'Trained resolve: +5 defense. Health and stamina were not changed.':`Trained ${attribute}. Use Rest to replenish your new maximum.`;return true;
}
export function rest(s:Adventure):boolean{if(!atCheckpoint(s)||!equipmentContext(s).alive||!equipmentContext(s).idle||s.rollTimer||s.gatePhase==='pulling')return false;return interact(s);}
export function upgrade(s:Adventure):boolean{
 const result=prepareWeaponUpgrade(armory(s),s.currency,atForge(s),equipmentContext(s));if(!result.ok){s.message=`Upgrade unavailable: ${result.reason}.`;return false;}
 s.currency=result.currency;s.levels={...result.next.levels};s.message=`${WEAPONS[s.equipped].name} upgraded to +${s.levels[s.equipped]}.`;return true;
}
export function retry(s:Adventure):boolean{if(s.hp>0)return false;if(s.gatePhase==='pulling'||s.gatePhase==='opening'){s.gatePhase='closed';s.gateProgress=0;s.interactionTimer=0;}s.position={...s.checkpoint};s.hp=s.maxHp;s.stamina=s.maxStamina;s.rollTimer=0;s.rollCooldown=0;s.hurtTimer=1;s.projectiles=[];s.attack.phase='idle';for(const e of s.enemies){if(e.hp>0){e.hp=e.maxHp;e.position={...e.home};e.phase='idle';e.timer=0;}}s.message='Returned to the beacon. Equipment, cleared foes and iron marks retained.';return true;}
/** Save only durable progression; resume safely at the checkpoint, never mid-swing. */
export function serialize(s:Adventure):string{return JSON.stringify({version:2,gateOpen:s.gatePhase==='open',checkpoint:s.checkpoint.y<0?1:0,completed:s.completed,archetype:s.archetype,currency:s.currency,owned:s.owned,levels:{sword:s.levels.sword,spear:s.levels.spear,hammer:s.levels.hammer},equipped:s.equipped,looted:s.looted,shortcut:s.shortcut,defeated:s.enemies.filter(e=>e.hp<=0).map(e=>e.id)});}
export function restore(raw:string):Adventure|null{try{const d=JSON.parse(raw) as Record<string,unknown>;if((d.version!==1&&d.version!==2)||(d.archetype!=='vanguard'&&d.archetype!=='wayfarer')||!Number.isSafeInteger(d.currency)||Number(d.currency)<0||Number(d.currency)>100000||!Array.isArray(d.owned)||!d.owned.length||d.owned.some(x=>!['sword','spear','hammer'].includes(x))||new Set(d.owned).size!==d.owned.length||!d.owned.includes(d.equipped)||!d.levels||typeof d.levels!=='object'||!Array.isArray(d.looted)||d.looted.some(x=>!LOOT.some(l=>l.id===x))||new Set(d.looted).size!==d.looted.length||typeof d.shortcut!=='boolean'||!Array.isArray(d.defeated)||d.defeated.some(x=>!enemies().some(e=>e.id===x))||new Set(d.defeated).size!==d.defeated.length)return null;if(d.version===2&&(typeof d.gateOpen!=='boolean'||![0,1].includes(d.checkpoint as number)||typeof d.completed!=='boolean'||(d.checkpoint===1&&!d.gateOpen)||(d.completed===true&&(!d.gateOpen||!d.defeated.includes('upper-captain')))))return null;const levels=d.levels as Record<WeaponId,number>;if((['sword','spear','hammer'] as WeaponId[]).some(k=>!Number.isInteger(levels[k])||levels[k]<0||levels[k]>2))return null;const s=createAdventure(d.archetype);s.currency=d.currency as number;s.owned=[...d.owned] as WeaponId[];s.levels={...s.levels,sword:levels.sword,spear:levels.spear,hammer:levels.hammer};s.equipped=d.equipped as WeaponId;s.looted=[...d.looted] as string[];s.shortcut=d.shortcut;for(const e of s.enemies)if(d.defeated.includes(e.id))e.hp=0;if(d.version===2){s.gatePhase=d.gateOpen?'open':'closed';s.gateProgress=d.gateOpen?1:0;s.checkpoint={...CHECKPOINTS[d.checkpoint as 0|1]};s.position={...s.checkpoint};s.completed=d.completed===true&&s.enemies.some(e=>e.id==='upper-captain'&&e.hp<=0);}s.message='Progress restored at the beacon.';return s;}catch{return null;}}
