import {canStand,move,project,SPAWN,STEP,type Point} from './game.js';
export type Archetype='vanguard'|'wayfarer';
export type WeaponId='sword'|'spear'|'hammer';
export const WEAPONS={
 sword:{name:'Arming sword',damage:30,range:75,arc:1.05,windup:.2,recovery:.34,cost:22,description:'Broad, quick sweep. Reliable against close groups.'},
 spear:{name:'Iron spear',damage:25,range:115,arc:.32,windup:.28,recovery:.4,cost:20,description:'Long, narrow thrust. Keep enemies at a distance.'},
 hammer:{name:'War hammer',damage:52,range:68,arc:Math.PI,windup:.58,recovery:.68,cost:38,description:'Slow crushing impact. Staggers nearby enemies.'},
} as const;
export const ARCHETYPES={vanguard:{name:'Vanguard',maxHp:140,maxStamina:90,weapon:'sword'},wayfarer:{name:'Wayfarer',maxHp:100,maxStamina:130,weapon:'spear'}} as const;
export const LOCATIONS={checkpoint:{...SPAWN},smith:{x:260,y:330},lever:{x:560,y:400},shortcut:{x:430,y:390}};
export const WALLS=[{x:350,y:20,width:20,height:150},{x:350,y:280,width:20,height:120},{x:200,y:390,width:150,height:20},{x:350,y:170,width:20,height:110,gate:true}];
export const LOOT=[{id:'west-cache',position:{x:150,y:420},weapon:'hammer' as WeaponId,currency:35},{id:'north-cache',position:{x:420,y:100},weapon:'spear' as WeaponId,currency:35},{id:'south-cache',position:{x:300,y:540},weapon:'sword' as WeaponId,currency:25}];
export interface Enemy {id:string;kind:'raider'|'watcher'|'captain';position:Point;home:Point;hp:number;maxHp:number;phase:'idle'|'windup'|'recovery'|'stagger';timer:number;aim:Point;reward:number}
export interface Projectile {position:Point;velocity:Point;life:number}
export interface Adventure {archetype:Archetype;position:Point;aim:Point;hp:number;maxHp:number;stamina:number;maxStamina:number;attack:{phase:'idle'|'windup'|'active'|'recovery';timer:number;aim:Point;weapon:WeaponId;hit:string[]};rollTimer:number;rollCooldown:number;rollAim:Point;hurtTimer:number;staminaDelay:number;enemies:Enemy[];projectiles:Projectile[];currency:number;owned:WeaponId[];levels:Record<WeaponId,number>;equipped:WeaponId;checkpoint:Point;looted:string[];shortcut:boolean;completed:boolean;message:string;time:number}
const unit=(p:Point):Point=>{const n=Math.hypot(p.x,p.y);return n?{x:p.x/n,y:p.y/n}:{x:1,y:0};};
const vector=(a:Point,b:Point):Point=>{const p=project(a),q=project(b);return {x:q.x-p.x,y:q.y-p.y};};
const distance=(a:Point,b:Point)=>Math.hypot(...Object.values(vector(a,b)));
const near=(s:Adventure,p:Point)=>distance(s.position,p)<38;
function enemies():Enemy[]{return [
 {id:'raider',kind:'raider',position:{x:220,y:160},maxHp:75,reward:25},
 {id:'watcher',kind:'watcher',position:{x:440,y:230},maxHp:60,reward:25},
 {id:'captain',kind:'captain',position:{x:480,y:450},maxHp:220,reward:80},
].map(e=>({...e,kind:e.kind as Enemy['kind'],home:{...e.position},hp:e.maxHp,phase:'idle',timer:0,aim:{x:1,y:0}}));}
export function createAdventure(archetype:Archetype='vanguard'):Adventure{
 const a=ARCHETYPES[archetype];return {archetype,position:{...SPAWN},aim:{x:1,y:0},hp:a.maxHp,maxHp:a.maxHp,stamina:a.maxStamina,maxStamina:a.maxStamina,attack:{phase:'idle',timer:0,aim:{x:1,y:0},weapon:a.weapon,hit:[]},rollTimer:0,rollCooldown:0,rollAim:{x:1,y:0},hurtTimer:0,staminaDelay:0,enemies:enemies(),projectiles:[],currency:0,owned:[a.weapon],levels:{sword:0,spear:0,hammer:0},equipped:a.weapon,checkpoint:{...SPAWN},looted:[],shortcut:false,completed:false,message:'Explore the courtyard. Rest at the beacon; recover equipment from the caches.',time:0};
}
export const weaponDamage=(s:Adventure,id:WeaponId=s.equipped)=>WEAPONS[id].damage*(1+s.levels[id]*.25);
export const upgradeCost=(s:Adventure)=>s.levels[s.equipped]===0?30:60;
export function attack(s:Adventure):boolean{
 if(s.hp<=0||s.attack.phase!=='idle'||s.rollTimer>0)return false;
 const w=WEAPONS[s.equipped];if(s.stamina<w.cost){s.message='Not enough stamina. Let it recover.';return false;}
 s.stamina-=w.cost;s.staminaDelay=.7;s.attack={phase:'windup',timer:w.windup,aim:{...s.aim},weapon:s.equipped,hit:[]};return true;
}
export function roll(s:Adventure,input:Point=s.aim):boolean{
 if(s.hp<=0||s.rollCooldown>0||s.rollTimer>0||s.attack.phase!=='idle'||s.stamina<28)return false;
 s.stamina-=28;s.staminaDelay=.8;s.rollTimer=.38;s.rollCooldown=.8;s.rollAim=unit(input.x||input.y?input:s.aim);return true;
}
export const invulnerable=(s:Adventure)=>s.rollTimer>.08&&s.rollTimer<.36;
function damage(s:Adventure,amount:number){if(s.hp<=0||s.hurtTimer>0||invulnerable(s))return;s.hp=Math.max(0,s.hp-amount);s.hurtTimer=.45;if(!s.hp){s.message='You fell. Retry at the beacon; equipment and earned currency are retained.';s.attack.phase='idle';s.rollTimer=0;}}
function clearLine(s:Adventure,a:Point,b:Point):boolean{const count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6);for(let i=1;i<count;i++)if(!adventureCanStand(s,{x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count}))return false;return true;}
function hitEnemies(s:Adventure){const w=WEAPONS[s.attack.weapon];for(const e of s.enemies){if(e.hp<=0||s.attack.hit.includes(e.id))continue;const d=vector(s.position,e.position),r=Math.hypot(d.x,d.y),u=unit(d);if(!clearLine(s,s.position,e.position)||r>w.range||Math.acos(Math.max(-1,Math.min(1,u.x*s.attack.aim.x+u.y*s.attack.aim.y)))>w.arc)continue;e.hp=Math.max(0,e.hp-weaponDamage(s,s.attack.weapon));s.attack.hit.push(e.id);if(!e.hp){s.currency+=e.reward;s.message=`${e.kind==='captain'?'Captain defeated. The courtyard is secured.':'Enemy defeated.'} +${e.reward} iron marks.`;if(e.kind==='captain')s.completed=true;}else {e.phase='stagger';e.timer=s.attack.weapon==='hammer'?.85:.22;}}}
export function adventureCanStand(s:Adventure,p:Point):boolean{return canStand(p)&&WALLS.every(w=>(w.gate&&s.shortcut)||p.x<w.x-12||p.x>w.x+w.width+12||p.y<w.y-12||p.y>w.y+w.height+12);}
function travel(s:Adventure,p:Point,input:Point,dt:number):Point{let result={...p};const count=Math.max(1,Math.ceil(dt/.008));for(let i=0;i<count;i++){const next=move(result,input,dt/count);const x={x:next.x,y:result.y};if(adventureCanStand(s,x))result=x;const y={x:result.x,y:next.y};if(adventureCanStand(s,y))result=y;}return result;}
function step(s:Adventure,input:Point,dt:number){
 if(s.hp<=0)return;s.time+=dt;s.rollCooldown=Math.max(0,s.rollCooldown-dt);s.hurtTimer=Math.max(0,s.hurtTimer-dt);s.staminaDelay=Math.max(0,s.staminaDelay-dt);
 if(!s.staminaDelay&&s.attack.phase==='idle'&&!s.rollTimer)s.stamina=Math.min(s.maxStamina,s.stamina+30*dt);
 if(s.rollTimer>0){s.position=travel(s,s.position,s.rollAim,dt*2.4);s.rollTimer=Math.max(0,s.rollTimer-dt);}else if(s.attack.phase==='idle'){s.position=travel(s,s.position,input,dt);if(input.x||input.y)s.aim=unit(input);}
 if(s.attack.phase!=='idle'){s.attack.timer-=dt;if(s.attack.phase==='active')hitEnemies(s);if(s.attack.timer<=0){const w=WEAPONS[s.attack.weapon];if(s.attack.phase==='windup'){s.attack.phase='active';s.attack.timer=.12;hitEnemies(s);}else if(s.attack.phase==='active'){s.attack.phase='recovery';s.attack.timer=w.recovery;}else s.attack.phase='idle';}}
 for(const e of s.enemies){if(e.hp<=0)continue;const d=vector(e.position,s.position),range=Math.hypot(d.x,d.y),reach=e.kind==='watcher'?200:e.kind==='captain'?70:52;
 if(e.phase!=='idle'){e.timer-=dt;if(e.timer<=0){if(e.phase==='windup'){if(e.kind==='watcher'){const u=e.aim;s.projectiles.push({position:{...e.position},velocity:{x:u.x*160,y:u.y*160},life:2});}else{const u=unit(d);if(clearLine(s,e.position,s.position)&&range<reach+8&&u.x*e.aim.x+u.y*e.aim.y>.1)damage(s,e.kind==='captain'?34:20);}e.phase='recovery';e.timer=e.kind==='captain'?.95:.85;}else e.phase='idle';}continue;}
 // The beacon's immediate radius is a sanctuary. Enemies disengage there.
 if(distance(s.position,LOCATIONS.checkpoint)<50||range>250){if(distance(e.position,e.home)>4)e.position=travel(s,e.position,vector(e.position,e.home),dt*.4);continue;}
 if(range<reach&&clearLine(s,e.position,s.position)){e.phase='windup';e.timer=e.kind==='watcher'?.9:e.kind==='captain'?.8:.65;e.aim=unit(d);}else e.position=travel(s,e.position,d,dt*(e.kind==='captain'?.38:.48));
 }
 for(const p of s.projectiles){const old={...p.position};const dx=p.velocity.x/1.6+p.velocity.y/.8,dy=p.velocity.y/.8-p.velocity.x/1.6;p.position={x:p.position.x+dx*dt,y:p.position.y+dy*dt};p.life-=dt;if(!adventureCanStand(s,p.position))p.life=0;const a=project(old),b=project(p.position),c=project(s.position),vx=b.x-a.x,vy=b.y-a.y,t=Math.max(0,Math.min(1,((c.x-a.x)*vx+(c.y-a.y)*vy)/(vx*vx+vy*vy||1)));if(p.life>0&&Math.hypot(c.x-a.x-vx*t,c.y-a.y-vy*t)<14){damage(s,18);p.life=0;}}
 s.projectiles=s.projectiles.filter(p=>p.life>0);
}
/** Fixed substeps also make external callers safe after a delayed frame. */
export function tick(s:Adventure,input:Point,dt:number){let remaining=Math.max(0,Math.min(.1,dt));while(remaining>1e-8){const delta=Math.min(STEP,remaining);step(s,input,delta);remaining-=delta;}}
export function interactionHint(s:Adventure):string{
 if(s.hp<=0)return 'Retry at the beacon';if(LOOT.some(l=>!s.looted.includes(l.id)&&near(s,l.position)))return 'E · Open equipment cache';if(near(s,LOCATIONS.lever))return s.shortcut?'Shortcut is open':'E · Open shortcut';if(near(s,LOCATIONS.smith))return 'E · Smith: open equipment to upgrade';if(near(s,LOCATIONS.checkpoint))return 'E · Rest and replenish';return '';
}
export function interact(s:Adventure):boolean{
 if(s.hp<=0||s.attack.phase!=='idle'||s.rollTimer)return false;
 const loot=LOOT.find(l=>!s.looted.includes(l.id)&&near(s,l.position));if(loot){s.looted.push(loot.id);if(!s.owned.includes(loot.weapon))s.owned.push(loot.weapon);s.currency+=loot.currency;s.message=`Found ${WEAPONS[loot.weapon].name} and ${loot.currency} iron marks. Open equipment to compare.`;return true;}
 if(near(s,LOCATIONS.lever)){s.shortcut=true;s.message='Shortcut gate opened. The north passage now leads directly to the far court.';return true;}
 if(near(s,LOCATIONS.smith)){s.message='At the smith: choose a weapon in Equipment, then upgrade it.';return true;}
 if(near(s,LOCATIONS.checkpoint)){s.hp=s.maxHp;s.stamina=s.maxStamina;s.checkpoint={...LOCATIONS.checkpoint};s.projectiles=[];s.message='Rested. Health and stamina replenished. Defeated enemies remain defeated.';return true;}return false;
}
export function equip(s:Adventure,weapon:WeaponId):boolean{if(s.hp<=0||s.attack.phase!=='idle'||s.rollTimer||!s.owned.includes(weapon))return false;s.equipped=weapon;s.message=`Equipped ${WEAPONS[weapon].name} +${s.levels[weapon]}.`;return true;}
export function upgrade(s:Adventure):boolean{if(s.hp<=0||!near(s,LOCATIONS.smith)||s.attack.phase!=='idle'||s.rollTimer){s.message='Visit the smith to upgrade equipment.';return false;}if(s.levels[s.equipped]>=2){s.message='Maximum upgrade reached (+2).';return false;}const cost=upgradeCost(s);if(s.currency<cost){s.message=`Need ${cost} iron marks for this upgrade.`;return false;}s.currency-=cost;s.levels[s.equipped]++;s.message=`${WEAPONS[s.equipped].name} upgraded to +${s.levels[s.equipped]}.`;return true;}
export function retry(s:Adventure):boolean{if(s.hp>0)return false;s.position={...s.checkpoint};s.hp=s.maxHp;s.stamina=s.maxStamina;s.rollTimer=0;s.rollCooldown=0;s.hurtTimer=1;s.projectiles=[];s.attack.phase='idle';for(const e of s.enemies){if(e.hp>0){e.hp=e.maxHp;e.position={...e.home};e.phase='idle';e.timer=0;}}s.message='Returned to the beacon. Equipment, cleared foes and iron marks retained.';return true;}
/** Save only durable progression; resume safely at the checkpoint, never mid-swing. */
export function serialize(s:Adventure):string{return JSON.stringify({version:1,archetype:s.archetype,currency:s.currency,owned:s.owned,levels:s.levels,equipped:s.equipped,looted:s.looted,shortcut:s.shortcut,defeated:s.enemies.filter(e=>e.hp<=0).map(e=>e.id)});}
export function restore(raw:string):Adventure|null{try{const d=JSON.parse(raw) as Record<string,unknown>;if(d.version!==1||(d.archetype!=='vanguard'&&d.archetype!=='wayfarer')||!Number.isSafeInteger(d.currency)||Number(d.currency)<0||Number(d.currency)>100000||!Array.isArray(d.owned)||!d.owned.length||d.owned.some(x=>!['sword','spear','hammer'].includes(x))||new Set(d.owned).size!==d.owned.length||!d.owned.includes(d.equipped)||!d.levels||typeof d.levels!=='object'||!Array.isArray(d.looted)||d.looted.some(x=>!LOOT.some(l=>l.id===x))||new Set(d.looted).size!==d.looted.length||typeof d.shortcut!=='boolean'||!Array.isArray(d.defeated)||d.defeated.some(x=>!['raider','watcher','captain'].includes(x)))return null;const levels=d.levels as Record<WeaponId,number>;if((['sword','spear','hammer'] as WeaponId[]).some(k=>!Number.isInteger(levels[k])||levels[k]<0||levels[k]>2))return null;const s=createAdventure(d.archetype);s.currency=d.currency as number;s.owned=[...d.owned] as WeaponId[];s.levels={sword:levels.sword,spear:levels.spear,hammer:levels.hammer};s.equipped=d.equipped as WeaponId;s.looted=[...d.looted] as string[];s.shortcut=d.shortcut;for(const e of s.enemies)if(d.defeated.includes(e.id))e.hp=0;s.completed=s.enemies.some(e=>e.kind==='captain'&&e.hp<=0);s.message='Progress restored at the beacon.';return s;}catch{return null;}}
