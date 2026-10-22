import {finitePoint,type EnemyPoint,type EnemyFacing} from './enemyPose.js';
/** Ground-space occupancy/sweep MUST account for the supplied complete radius.
 * Inject exact geometry adapters; no eight-probe approximation is hidden here. */
export interface EnemyNavigationWorld {canOccupy:(point:EnemyPoint,radius:number)=>boolean;canSweep:(from:EnemyPoint,to:EnemyPoint,radius:number)=>boolean;clearLine:(from:EnemyPoint,to:EnemyPoint)=>boolean;project:(point:EnemyPoint)=>EnemyPoint;unproject:(point:EnemyPoint)=>EnemyPoint;facingForAim:(aim:EnemyPoint,previous:EnemyFacing)=>EnemyFacing}
export interface EnemyStance {readonly point:EnemyPoint;readonly facing:EnemyFacing;readonly route:readonly EnemyPoint[];readonly key:string;readonly cost:number}
const distance=(a:EnemyPoint,b:EnemyPoint)=>Math.hypot(b.x-a.x,b.y-a.y);
export function enemyStanceKey(p:EnemyPoint):string{return `${p.x.toFixed(3)}:${p.y.toFixed(3)}`;}
export interface EnemyStanceSearch {readonly position:EnemyPoint;readonly target:EnemyPoint;readonly radius:number;readonly previousFacing:EnemyFacing;readonly maxScreenDistance:number;readonly contact:(stance:EnemyPoint,facing:EnemyFacing)=>boolean;readonly world:EnemyNavigationWorld;readonly rejected?:ReadonlySet<string>}
/** Bounded two-segment lane search, NOT full-map pathfinding. Every accepted lane
 * is swept at body radius; unavailable routes stay unavailable rather than phasing. */
export interface EnemyStancePlan {readonly input:EnemyStanceSearch;readonly queue:readonly {point:EnemyPoint;key:string;lower:number}[];index:number;best:EnemyStance|null;done:boolean;checks:number}
export function createEnemyStancePlan(input:EnemyStanceSearch):EnemyStancePlan{
 const {position,target,radius,world}=input;
 if(!finitePoint(position)||!finitePoint(target)||!Number.isFinite(radius)||radius<=0||!Number.isFinite(input.maxScreenDistance)||input.maxScreenDistance<0||input.maxScreenDistance>1024)throw new Error('Invalid stance search');
 const tf=world.project(target),queue:{point:EnemyPoint;key:string;lower:number}[]=[];
 // Pure arithmetic queue construction is capped at 8192 entries; expensive world
 // occupancy, ray, physical-contact and swept-lane checks are budgeted below.
 for(let ring=8;ring<=input.maxScreenDistance;ring+=4)for(let bearing=0;bearing<32;bearing++){
  const angle=bearing*Math.PI/16,point=world.unproject({x:tf.x+Math.cos(angle)*ring,y:tf.y+Math.sin(angle)*ring}),key=enemyStanceKey(point);
  if(!input.rejected?.has(key))queue.push({point,key,lower:distance(position,point)});
 }
 queue.sort((a,b)=>a.lower-b.lower||(a.key<b.key?-1:a.key>b.key?1:0));return {input,queue,index:0,best:null,done:false,checks:0};
}
export function advanceEnemyStancePlan(plan:EnemyStancePlan,budget=64,contact=plan.input.contact):{status:'pending'|'done';stance:EnemyStance|null}{
 if(!Number.isSafeInteger(budget)||budget<1||budget>8192)throw new Error('Invalid stance work budget');
 const {position,target,radius,world}=plan.input,tf=world.project(target);let work=0;
 while(plan.index<plan.queue.length&&work<budget){
  const {point,key,lower}=plan.queue[plan.index++];
  if(plan.best&&lower>plan.best.cost+1e-9){plan.done=true;break;}work++;plan.checks++;
  if(!world.canOccupy(point,radius)||!world.clearLine(point,target))continue;
  const foot=world.project(point),facing=world.facingForAim({x:tf.x-foot.x,y:tf.y-foot.y},plan.input.previousFacing);
  if(!contact(point,facing))continue;
  let route:readonly EnemyPoint[]|null=world.canSweep(position,point,radius)?[point]:null;
  if(!route){
   const d=distance(position,point),ux=d?(point.x-position.x)/d:1,uy=d?(point.y-position.y)/d:0;let cost=Infinity;
   for(const length of [radius*2,radius*4,radius*8])for(const sign of [-1,1]){
    const waypoint={x:position.x-uy*length*sign+ux*length*.5,y:position.y+ux*length*sign+uy*length*.5},nextCost=distance(position,waypoint)+distance(waypoint,point);
    if(nextCost<cost&&world.canOccupy(waypoint,radius)&&world.canSweep(position,waypoint,radius)&&world.canSweep(waypoint,point,radius)){route=[waypoint,point];cost=nextCost;}
   }
  }
  if(route){const cost=route.reduce((n,p,i)=>n+distance(i?route![i-1]:position,p),0);if(!plan.best||cost<plan.best.cost||cost===plan.best.cost&&key<plan.best.key)plan.best={point,facing,route,key,cost};}
 }
 if(plan.index>=plan.queue.length)plan.done=true;return {status:plan.done?'done':'pending',stance:plan.done?plan.best:null};
}
/** Synchronous reference/test convenience. Runtime driver uses 64-check batches. */
export function findEnemyStance(input:EnemyStanceSearch):EnemyStance|null{return advanceEnemyStancePlan(createEnemyStancePlan(input),8192).stance;}
/** Swept complete-body movement; never teleports, axis-slides or enlarges reach. */
export function moveEnemyToward(position:EnemyPoint,target:EnemyPoint,distanceBudget:number,radius:number,world:EnemyNavigationWorld):{point:EnemyPoint;blocked:boolean;arrived:boolean}{
 if(!finitePoint(position)||!finitePoint(target)||!Number.isFinite(distanceBudget)||distanceBudget<0||!Number.isFinite(radius)||radius<=0)throw new Error('Invalid enemy movement');
 const d=distance(position,target);if(!d)return {point:{...position},blocked:false,arrived:true};
 const t=Math.min(1,distanceBudget/d),next={x:position.x+(target.x-position.x)*t,y:position.y+(target.y-position.y)*t};
 if(!world.canOccupy(next,radius)||!world.canSweep(position,next,radius))return {point:{...position},blocked:true,arrived:false};
 return {point:next,blocked:false,arrived:t===1};
}
