import {enemyPose,finitePoint,type EnemyArtId,type EnemyArtManifest,type EnemyFacing,type EnemyPhase,type EnemyPoint,type EnemyPose} from './enemyPose.js';
import {enemyEquipmentGeometry,enemyTouchesBody,translateEnemyBody,type EnemyAlphaGeometry,type EnemyTargetBody,type EnemyPolygon} from './enemyGeometry.js';
import {createEnemyStancePlan,advanceEnemyStancePlan,moveEnemyToward,type EnemyNavigationWorld,type EnemyStance,type EnemyStancePlan} from './enemyNavigation.js';
export const ENEMY_CONTRACT_HZ=120;
const HZ=ENEMY_CONTRACT_HZ;
export interface EnemyContractProfile {readonly radius:number;readonly speed:number;readonly activationDistance:number;readonly leashDistance:number}
export interface EnemyContractTarget {
 readonly position:EnemyPoint;readonly body:EnemyTargetBody;readonly alive:boolean;
 /** Noncombat/sanctuary-style exclusion that CANCELS engagement.
  * NOT ordinary roll/hurt invulnerability: resolve that in onHit at contactTick. */
 readonly protected:boolean;
 readonly shield?:readonly EnemyPolygon[];readonly geometryRevision?:number;
}
export interface EnemyContactInterval {readonly kind:'active-entry'|'active-step'|'active-exit';readonly fromTick:number;readonly toTick:number;readonly endExclusive:boolean}
export interface EnemyContractContactEvent {readonly tick:number;readonly attack:number;readonly pose:EnemyPose;readonly toi:number;readonly interval:EnemyContactInterval;readonly contactTick:number}
export interface EnemyContactInput {
 readonly tick:number;readonly attack:number;
 /** Matched features move linearly; split authored cuts, swaps and teleports. */
 readonly motion?:'linear'|'discontinuous';
 /** Entry is an instantaneous active endpoint, never an interpolated windup sweep. */
 readonly interval:EnemyContactInterval;
 readonly previousWeaponPolygons:readonly EnemyPolygon[];readonly weaponPolygons:readonly EnemyPolygon[];
 /** Body endpoints and shield polygons here are absolute projected pixels. */
 readonly previousTarget:{readonly body:EnemyTargetBody;readonly shield:readonly EnemyPolygon[]};readonly currentTarget:{readonly body:EnemyTargetBody;readonly shield:readonly EnemyPolygon[]};
}
export interface EnemyContactResult {readonly kind:'none'|'shield'|'body';readonly toi:number}
export interface EnemyContractWorld extends EnemyNavigationWorld {
 /** The same tick-indexed world input yields the same result for all dt partitions. */
 target:(tick:number)=>EnemyContractTarget;
 isSanctuary:(point:EnemyPoint)=>boolean;
 /** Increment when geometry/gates/shortcuts change; clears stale lane exclusions. */
 revision:number;
 /** Exact obstacle test for transformed equipment polygons in projected space. */
 equipmentClear:(pose:EnemyPose,polygons:readonly EnemyPolygon[])=>boolean;
 /** Continuous clearance between complete equipment placements; reject if uncertain. */
 equipmentSweep:(from:EnemyPose,to:EnemyPose,fromPolygons:readonly EnemyPolygon[],toPolygons:readonly EnemyPolygon[])=>boolean;
 /** Shared swept first-contact resolver: earliest physical contact, shield wins ties.
  * Required for incoming PLAYER weapons too. enemyContact implements matched linear
  * geometry; safe host adapters/discrete transitions remain an activation gate. */
 resolveTargetContact:(input:EnemyContactInput)=>EnemyContactResult;
 onBlock?:(event:EnemyContractContactEvent)=>void;
 /** Contact request only: host applies ordinary roll/hurt immunity at contactTick.
  * Rejected damage still consumes this attack; animation/cooldown continues. */
 onHit:(event:EnemyContractContactEvent)=>void;
}
export interface EnemyContractState {
 readonly id:EnemyArtId;readonly profile:EnemyContractProfile;readonly home:EnemyPoint;alive:boolean;
 position:EnemyPoint;facing:EnemyFacing;phase:EnemyPhase;ticksRemaining:number;tick:number;fractionalTicks:number;
 attack:number;hit:boolean;renderPose:EnemyPose|null;targetSnapshot:EnemyContractTarget|null;previousRenderedPose:EnemyPose|null;navigation:'idle'|'planning'|'approaching'|'blocked'|'unreachable'|'returning';stance:EnemyStance|null;planner:EnemyStancePlan|null;routeIndex:number;
 blockedAttempts:number;retryAtTick:number;attackReadyAtTick:number;rejected:Set<string>;lastTarget:EnemyPoint|null;revision:number;targetGeometryRevision:number|undefined;
}
export interface EnemyContractSources {readonly manifest:EnemyArtManifest;readonly alpha:EnemyAlphaGeometry}
const dist=(a:EnemyPoint,b:EnemyPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
function duration(s:EnemyContractState,sources:EnemyContractSources,phase:'windup'|'active'|'recovery'):number{
 const index=phase==='windup'?0:phase==='active'?1:2,ms=sources.manifest.enemies[s.id].animations.attack[index].durationMs;
 if(!Number.isFinite(ms)||ms<=0)throw new Error('Invalid attack duration');return Math.max(1,Math.ceil(ms*HZ/1000));
}
export function createEnemyContract(id:EnemyArtId,position:EnemyPoint,profile:EnemyContractProfile):EnemyContractState{
 if(!finitePoint(position)||['radius','speed','activationDistance','leashDistance'].some(key=>!Number.isFinite(profile[key as keyof EnemyContractProfile])||profile[key as keyof EnemyContractProfile]<=0))throw new Error('Invalid enemy profile');
 return {id,alive:true,profile:{...profile},home:{...position},position:{...position},facing:'east',phase:'idle',ticksRemaining:0,tick:0,fractionalTicks:0,attack:0,hit:false,renderPose:null,targetSnapshot:null,previousRenderedPose:null,navigation:'idle',stance:null,planner:null,routeIndex:0,blockedAttempts:0,retryAtTick:0,attackReadyAtTick:0,rejected:new Set(),lastTarget:null,revision:-1,targetGeometryRevision:undefined};
}
export function enemyContractPose(s:EnemyContractState,sources:EnemyContractSources,world:EnemyNavigationWorld):EnemyPose{
 return s.renderPose?{...s.renderPose,phase:s.phase}:enemyPose(sources.manifest,s.id,s.facing,s.phase,world.project(s.position),s.phase==='idle'&&s.navigation==='approaching'?s.tick/HZ*1000:0);
}
function activePose(s:EnemyContractState,sources:EnemyContractSources,world:EnemyNavigationWorld,position=s.position,facing=s.facing){return enemyPose(sources.manifest,s.id,facing,'active',world.project(position));}
function physicalContact(s:EnemyContractState,sources:EnemyContractSources,world:EnemyContractWorld,target:EnemyContractTarget,position=s.position,facing=s.facing):boolean{
 const pose=activePose(s,sources,world,position,facing);
 return world.clearLine(position,target.position)&&enemyTouchesBody(pose,sources.alpha,translateEnemyBody(target.body,world.project(target.position)))&&equipmentClear(pose,sources,world);
}
function equipmentClear(pose:EnemyPose,sources:EnemyContractSources,world:EnemyContractWorld){return world.equipmentClear(pose,enemyEquipmentGeometry(pose,sources.alpha));}
function commitPose(s:EnemyContractState,sources:EnemyContractSources,world:EnemyContractWorld,to:EnemyPose):boolean{
 const from=enemyContractPose(s,sources,world),fg=enemyEquipmentGeometry(from,sources.alpha),tg=enemyEquipmentGeometry(to,sources.alpha);
 if(!world.equipmentClear(to,tg)||!world.equipmentSweep(from,to,fg,tg))return false;
 s.renderPose=to;return true;
}
function equipmentMovement(s:EnemyContractState,sources:EnemyContractSources,world:EnemyContractWorld,next:EnemyPoint,walking=true):boolean{
 const a=world.project(s.position),b=world.project(next),facing=world.facingForAim({x:b.x-a.x,y:b.y-a.y},s.facing);
 return commitPose(s,sources,world,enemyPose(sources.manifest,s.id,facing,'idle',b,walking?s.tick/HZ*1000:0));
}
function transition(s:EnemyContractState,sources:EnemyContractSources,world:EnemyContractWorld,phase:EnemyPhase):boolean{
 if(!commitPose(s,sources,world,enemyPose(sources.manifest,s.id,s.facing,phase,world.project(s.position)))){s.phase=phase==='active'||phase==='windup'?'recovery':phase;s.ticksRemaining=s.phase==='recovery'?duration(s,sources,'recovery'):0;s.hit=true;s.navigation='blocked';return false;}
 s.phase=phase;return true;
}
function clearNavigation(s:EnemyContractState){s.stance=null;s.planner=null;s.routeIndex=0;}
export function defeatEnemyContract(s:EnemyContractState){s.alive=false;cancelAttack(s);clearNavigation(s);s.navigation='idle';}
function cancelAttack(s:EnemyContractState){s.phase='idle';s.ticksRemaining=0;s.hit=false;}
/** Stagger is explicit and transient; durable saves/reward identities are untouched. */
export function staggerEnemyContract(s:EnemyContractState,seconds:number){if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid stagger duration');s.phase='stagger';s.ticksRemaining=Math.ceil(seconds*HZ);s.hit=false;clearNavigation(s);}
/** Upper search bound derived from the actual active artwork and injected target.
 * This only bounds candidate enumeration; a stance still needs physical contact. */
function stanceBound(s:EnemyContractState,sources:EnemyContractSources,target:EnemyContractTarget):number{
 let extent=0;for(const facing of ['east','west','north-east','north-west','south-east','south-west'] as const){
  const pose=enemyPose(sources.manifest,s.id,facing,'active',{x:0,y:0});
  for(const poly of enemyEquipmentGeometry(pose,sources.alpha))if(!poly.equipment.startsWith('shield'))for(const p of poly.points)extent=Math.max(extent,Math.hypot(p.x,p.y));
 }
 let bodyExtent=0;for(const b of target.body)bodyExtent=Math.max(bodyExtent,Math.max(Math.hypot(b.a.x,b.a.y),Math.hypot(b.b.x,b.b.y))+b.radius);extent+=bodyExtent;
 return Math.min(1024,Math.ceil(extent/4)*4);
}
function cloneTarget(target:EnemyContractTarget):EnemyContractTarget{
 return {...target,position:{...target.position},body:target.body.map(b=>({a:{...b.a},b:{...b.b},radius:b.radius})),shield:(target.shield??[]).map(p=>({...p,points:p.points.map(q=>({...q}))}))};
}
function tryHit(s:EnemyContractState,sources:EnemyContractSources,world:EnemyContractWorld,target:EnemyContractTarget,previous:EnemyContractTarget,kind:'active-entry'|'active-step'|'active-exit'='active-step'){
 const pose=activePose(s,sources,world);if(s.hit||!world.clearLine(s.position,target.position)||!equipmentClear(pose,sources,world))return;
 const weapons=(p:EnemyPose)=>enemyEquipmentGeometry(p,sources.alpha).filter(p=>!p.equipment.startsWith('shield'));
 const snapshot=(t:EnemyContractTarget)=>({body:translateEnemyBody(t.body,world.project(t.position)),shield:t.shield??[]});
 const entry=kind==='active-entry',currentWeapons=weapons(pose),currentTarget=snapshot(target),interval:EnemyContactInterval={kind,fromTick:entry?s.tick:s.tick-1,toTick:s.tick,endExclusive:kind==='active-exit'};
 const result=world.resolveTargetContact({tick:s.tick,attack:s.attack,interval,previousWeaponPolygons:entry?currentWeapons:weapons(s.previousRenderedPose??pose),weaponPolygons:currentWeapons,previousTarget:entry?currentTarget:snapshot(previous),currentTarget});
 if(!['none','shield','body'].includes(result.kind)||!Number.isFinite(result.toi)||result.toi<0||result.toi>1)throw new Error('Invalid first-contact result');
 if(result.kind==='none'||kind==='active-exit'&&result.toi===1)return;
 if(entry&&result.toi!==0)throw new Error('Active-entry contact must have instantaneous TOI zero');s.hit=true;
 const event={tick:s.tick,attack:s.attack,pose,toi:result.toi,interval,contactTick:interval.fromTick+(interval.toTick-interval.fromTick)*result.toi};if(result.kind==='shield')world.onBlock?.(event);else world.onHit(event);
}
function step(s:EnemyContractState,sources:EnemyContractSources,world:EnemyContractWorld){
 s.tick++;if(!s.alive)return;s.previousRenderedPose=enemyContractPose(s,sources,world);const target=cloneTarget(world.target(s.tick)),previous=s.targetSnapshot??target;s.targetSnapshot=target;
 if(!world.canOccupy(s.position,s.profile.radius)){
  // Invalid body placement cannot deal damage or erase a committed cooldown.
  if(s.phase==='windup'||s.phase==='active'){s.phase='recovery';s.ticksRemaining=duration(s,sources,'recovery');s.hit=true;}
  else if(s.phase==='recovery'||s.phase==='stagger'){s.ticksRemaining=Math.max(0,s.ticksRemaining-1);if(!s.ticksRemaining)s.phase='idle';}
  clearNavigation(s);s.navigation='blocked';s.retryAtTick=s.tick+HZ/2;return;
 }
 if(typeof target.alive!=='boolean'||typeof target.protected!=='boolean'||!finitePoint(target.position)||(target.shield??[]).some(p=>p.points.length<3||p.points.some(q=>!finitePoint(q)))||target.body.some(b=>!finitePoint(b.a)||!finitePoint(b.b)||!Number.isFinite(b.radius)||b.radius<0))throw new Error('Invalid enemy target');
 if(s.revision!==world.revision||s.targetGeometryRevision!==target.geometryRevision||!s.lastTarget||dist(s.lastTarget,target.position)>8){s.revision=world.revision;s.targetGeometryRevision=target.geometryRevision;s.lastTarget={...target.position};s.rejected.clear();s.blockedAttempts=0;s.retryAtTick=0;clearNavigation(s);}
 const unsafe=!target.alive||target.protected||world.isSanctuary(target.position)||world.isSanctuary(s.position)||dist(s.position,target.position)>s.profile.activationDistance||dist(s.position,s.home)>s.profile.leashDistance;
 if(unsafe){cancelAttack(s);transition(s,sources,world,'idle');clearNavigation(s);s.navigation='idle';if(dist(s.position,s.home)>1){const move=moveEnemyToward(s.position,s.home,s.profile.speed/HZ,s.profile.radius,world);const allowed=!move.blocked&&equipmentMovement(s,sources,world,move.point,false);if(allowed)s.position=move.point;s.navigation=allowed?'returning':'blocked';}return;}
 if(s.phase==='stagger'){if(--s.ticksRemaining<=0)transition(s,sources,world,'idle');return;}
 if(s.phase==='windup'){
  if(--s.ticksRemaining<=0&&transition(s,sources,world,'active')){s.ticksRemaining=duration(s,sources,'active');tryHit(s,sources,world,target,previous,'active-entry');}return;
 }
 if(s.phase==='active'){
  if(--s.ticksRemaining<=0){tryHit(s,sources,world,target,previous,'active-exit');if(transition(s,sources,world,'recovery'))s.ticksRemaining=duration(s,sources,'recovery');return;}
  tryHit(s,sources,world,target,previous);return;
 }
 if(s.phase==='recovery'){if(--s.ticksRemaining<=0)transition(s,sources,world,'idle');return;}
 if(s.tick<s.retryAtTick)return;
 const pf=world.project(s.position),tf=world.project(target.position),facing=world.facingForAim({x:tf.x-pf.x,y:tf.y-pf.y},s.facing);
 if(physicalContact(s,sources,world,target,s.position,facing)){
  if(s.tick<s.attackReadyAtTick)return;
  s.facing=facing;if(!transition(s,sources,world,'windup')){s.retryAtTick=s.tick+HZ/2;return;}s.ticksRemaining=duration(s,sources,'windup');
  // Independent of navigation retries/revisions and animation cancellation.
  s.attackReadyAtTick=s.tick+duration(s,sources,'windup')+duration(s,sources,'active')+duration(s,sources,'recovery')+1;
  s.hit=false;s.attack++;s.navigation='idle';clearNavigation(s);return;
 }
 if(!s.stance){
  if(!s.planner)s.planner=createEnemyStancePlan({position:s.position,target:target.position,radius:s.profile.radius,previousFacing:s.facing,maxScreenDistance:stanceBound(s,sources,target),world,rejected:s.rejected,contact:()=>false});
  const plan=advanceEnemyStancePlan(s.planner,64,(p,f)=>physicalContact(s,sources,world,target,p,f));
  if(plan.status==='pending'){s.navigation='planning';return;}
  s.stance=plan.stance;s.planner=null;s.routeIndex=0;
  if(s.stance){
   const stance=s.stance,foot=world.project(stance.point),tf=world.project(target.position),facing=world.facingForAim({x:tf.x-foot.x,y:tf.y-foot.y},s.facing);
   const valid=world.canOccupy(stance.point,s.profile.radius)&&physicalContact(s,sources,world,target,stance.point,facing)&&stance.route.every((p,i)=>world.canSweep(i?stance.route[i-1]:s.position,p,s.profile.radius));
   if(!valid){s.rejected.add(stance.key);clearNavigation(s);s.navigation='planning';if(++s.blockedAttempts>=4){s.retryAtTick=s.tick+HZ/2;s.blockedAttempts=0;s.rejected.clear();}return;}
   s.stance={...stance,facing};
  }
  if(!s.stance){s.navigation='unreachable';s.retryAtTick=s.tick+HZ/2;s.rejected.clear();s.blockedAttempts=0;return;}
 }
 const next=s.stance.route[s.routeIndex],movement=moveEnemyToward(s.position,next,s.profile.speed/HZ,s.profile.radius,world);
 if(movement.blocked||!equipmentMovement(s,sources,world,movement.point)){s.rejected.add(s.stance.key);clearNavigation(s);s.navigation='blocked';if(++s.blockedAttempts>=4){s.retryAtTick=s.tick+HZ/2;s.blockedAttempts=0;s.rejected.clear();}return;}
 const before=world.project(s.position),after=world.project(movement.point);s.position=movement.point;s.facing=world.facingForAim({x:after.x-before.x,y:after.y-before.y},s.facing);s.navigation='approaching';
 if(movement.arrived&&++s.routeIndex>=s.stance.route.length)clearNavigation(s);
}
/** No dropped elapsed time. Fixed simulation ticks own contact AND render poses.
 * Callbacks must be read-only world samples except onHit; never provide a UI clock.
 * Large invalid time values throw rather than silently changing outcomes. */
export function advanceEnemyContract(s:EnemyContractState,sources:EnemyContractSources,world:EnemyContractWorld,dt:number):void{
 if(!Number.isFinite(dt)||dt<0||dt>10)throw new Error('Invalid enemy elapsed time');
 const total=s.fractionalTicks+dt*HZ,ticks=Math.floor(total+1e-9);s.fractionalTicks=total-ticks;
 if(s.fractionalTicks<0&&s.fractionalTicks> -1e-8)s.fractionalTicks=0;
 for(let i=0;i<ticks;i++)step(s,sources,world);
}
