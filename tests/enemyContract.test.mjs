import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {enemyPose,enemySourcePoint,enemyEquipmentPoint} from '../.test-build/core/enemyPose.js';
import {enemyEquipmentGeometry,enemyTouchesBody,polygonTouchesCapsule,translateEnemyBody} from '../.test-build/core/enemyGeometry.js';
import {findEnemyStance,moveEnemyToward,createEnemyStancePlan,advanceEnemyStancePlan} from '../.test-build/core/enemyNavigation.js';
import {createEnemyContract,advanceEnemyContract,enemyContractPose,staggerEnemyContract,defeatEnemyContract,ENEMY_CONTRACT_HZ} from '../.test-build/core/enemySimulation.js';
const manifestBytes=readFileSync(new URL('../src/assets/enemies-v1/manifest.json',import.meta.url)),manifest=JSON.parse(manifestBytes);
const alpha=JSON.parse(readFileSync(new URL('../src/assets/enemies-v1/contact-alpha.json',import.meta.url))),sources={manifest,alpha};
const ids=['maw_skeleton','headless_skeleton','iron_giant'],facings=['east','west','north-east','north-west','south-east','south-west'];
const profile={radius:12,speed:60,activationDistance:1000,leashDistance:1000};
const close=(a,b)=>assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-8,`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
const pointBody=p=>[{a:p,b:p,radius:.05}];
function contactPoint(id='maw_skeleton',facing='east'){
 const pose=enemyPose(manifest,id,facing,'active',{x:0,y:0}),p=enemyEquipmentGeometry(pose,alpha).find(p=>!p.equipment.startsWith('shield'));
 return {x:p.points.reduce((n,p)=>n+p.x,0)/4,y:p.points.reduce((n,p)=>n+p.y,0)/4};
}
function openWorld(options={}){return {canOccupy:()=>true,canSweep:()=>true,clearLine:()=>true,project:p=>({...p}),unproject:p=>({...p}),facingForAim:()=> 'east',target:()=>({position:{x:0,y:0},body:pointBody(contactPoint()),alive:true,protected:false}),isSanctuary:()=>false,revision:0,equipmentClear:()=>true,equipmentSweep:()=>true,resolveTargetContact:input=>({kind:input.weaponPolygons.some(p=>input.currentTarget.body.some(b=>polygonTouchesCapsule(p.points,b)))?'body':'none',toi:input.interval.kind==='active-entry'?0:1}),onHit:()=>{},...options};}
function advanceTicks(s,world,n){advanceEnemyContract(s,sources,world,n/120);}
function until(s,world,predicate,max=513){for(let i=0;i<max&&!predicate();i++)advanceTicks(s,world,1);assert.ok(predicate(),'bounded planner did not reach expected state');}

test('exact original PR7 manifest identity; fresh derivative metadata explicitly not R5',()=>{
 const gitSha=createHash('sha1').update(`blob ${manifestBytes.length}\0`).update(manifestBytes).digest('hex');assert.equal(gitSha,'9d0bdd977e3bcaf93a790edeb3671ff0d0a94b75');assert.equal(alpha.sourceCommit,'88339ff21808d812b46607ab50643764990dfc06');assert.match(alpha.method,/not recovered R5/);assert.equal(alpha.alphaThreshold,128);
});
test('opaque-alpha rectangles remain within all six actual equipment extents',()=>{
 assert.equal(Object.keys(alpha.equipment).length,6);
 for(const [id,data] of Object.entries(alpha.equipment)){assert.equal(data.sha256.length,64);const [w,h]=data.size;for(const [l,t,r,b] of data.rects){assert.ok(l>=0&&t>=0&&l<r&&t<b&&r<=w&&b<=h,id);}}
 assert.deepEqual(alpha.equipment.trident.size,[272,41]);assert.deepEqual(alpha.equipment['shield-front'].size,[96,152]);
});
for(const id of ids)test(`${id}: all authored/mirrored frames share exact full-rig transforms and active onset`,()=>{
 for(const facing of facings)for(const phase of ['idle','windup','active','recovery','stagger']){
  const p=enemyPose(manifest,id,facing,phase,{x:17,y:29}),q=enemyPose(manifest,id,facing.replace('west','east'),phase,{x:17,y:29});
  assert.equal(p.frame.index%6,phase==='windup'?3:phase==='active'?4:phase==='recovery'?5:0);
  for(const item of p.frame.equipment){close(enemyEquipmentPoint(p,item,item.grip),enemySourcePoint(p,item.position));for(const a of [{x:0,y:0},{x:100,y:30}]){const x=enemyEquipmentPoint(p,item,a),y=enemyEquipmentPoint(q,item,a);close(x,{x:facing.endsWith('west')?34-y.x:y.x,y:y.y});}}
 }
});
test('target body is injected and no legacy human-body height is assumed',()=>{
 const p=enemyPose(manifest,'iron_giant','east','active',{x:0,y:0}),c=contactPoint('iron_giant');assert.equal(enemyTouchesBody(p,alpha,pointBody(c)),true);assert.equal(enemyTouchesBody(p,alpha,pointBody({x:c.x,y:c.y+500})),false);assert.equal(enemyTouchesBody(p,alpha,[]),false);
});
test('shield is physical geometry but never silently damages as a weapon',()=>{
 const p=enemyPose(manifest,'iron_giant','south-east','active',{x:0,y:0});let found=false;
 for(const poly of enemyEquipmentGeometry(p,alpha).filter(p=>p.equipment.startsWith('shield'))){const c={x:poly.points.reduce((s,p)=>s+p.x,0)/4,y:poly.points.reduce((s,p)=>s+p.y,0)/4},body=pointBody(c);if(enemyTouchesBody(p,alpha,body,'shield')&&!enemyTouchesBody(p,alpha,body)){found=true;break;}}
 assert.ok(found,'a shield-only region exists');
});
test('no bounding-box/invisible reach: transparent source pixels do not contact',()=>{
 const p=enemyPose(manifest,'iron_giant','east','active',{x:0,y:0}),item=p.frame.equipment.find(i=>i.equipment==='trident');const empty=enemyEquipmentPoint(p,item,{x:1,y:0});assert.equal(enemyTouchesBody(p,alpha,pointBody(empty)),false);
});
test('polygon/capsule contacts include crossing, edge and corner but not empty corners',()=>{
 const square=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}];assert.ok(polygonTouchesCapsule(square,{a:{x:-2,y:5},b:{x:12,y:5},radius:0}));assert.ok(polygonTouchesCapsule(square,{a:{x:11,y:5},b:{x:11,y:5},radius:1}));assert.equal(polygonTouchesCapsule(square,{a:{x:12,y:12},b:{x:12,y:12},radius:1}),false);
 assert.throws(()=>polygonTouchesCapsule([{x:NaN,y:0},{x:1,y:0},{x:0,y:1}],pointBody({x:0,y:0})[0]));assert.throws(()=>polygonTouchesCapsule(square,{a:{x:0,y:0},b:{x:0,y:0},radius:-1}));
});
test('active clock contact is the first active pose, never windup or visual delay',()=>{
 const hits=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({onHit:e=>hits.push(e)});
 advanceTicks(s,world,1);assert.equal(s.phase,'windup');assert.equal(s.ticksRemaining,78);assert.equal(hits.length,0);
 advanceTicks(s,world,77);assert.equal(s.phase,'windup');assert.equal(hits.length,0);
 advanceTicks(s,world,1);assert.equal(s.phase,'active');assert.equal(hits.length,1);assert.equal(hits[0].tick,79);assert.equal(hits[0].toi,0);assert.equal(hits[0].contactTick,79);assert.deepEqual(hits[0].interval,{kind:'active-entry',fromTick:79,toTick:79,endExclusive:false});assert.equal(hits[0].pose.frame.pose,'contact');assert.equal(enemyContractPose(s,sources,world).frame.index%6,4);
 advanceTicks(s,world,17);assert.equal(s.phase,'recovery');assert.equal(hits.length,1);assert.equal(enemyContractPose(s,sources,world).frame.index%6,5);
});
for(const id of ids)test(`${id}: fixed-tick hit outcomes identical across dt schedules including delayed calls`,()=>{
 const run=schedule=>{const hits=[],s=createEnemyContract(id,{x:0,y:0},profile),world=openWorld({target:()=>({position:{x:0,y:0},body:pointBody(contactPoint(id)),alive:true,protected:false}),onHit:e=>hits.push([e.tick,e.attack,e.pose.frame.index])});for(const dt of schedule)advanceEnemyContract(s,sources,world,dt);return {hits,tick:s.tick,phase:s.phase,left:s.ticksRemaining,position:s.position};};
 const baseline=run(Array(480).fill(1/120));assert.ok(baseline.hits.length>0);assert.deepEqual(run(Array(120).fill(1/30)),baseline);assert.deepEqual(run(Array(240).fill(1/60)),baseline);assert.deepEqual(run([.13,.07,.8,1.3,.2,1.5]),baseline);
});
test('stagger interrupts a windup without contact and preserves no durable state',()=>{
 let hits=0;const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({onHit:()=>hits++});advanceTicks(s,world,50);staggerEnemyContract(s,.5);advanceTicks(s,world,60);assert.equal(hits,0);assert.equal(s.phase,'idle');assert.equal(s.attack,1);
});
for(const safeguard of ['protected','sanctuary','dead','clear-line','equipment','body-overlap'])test(`${safeguard} blocks physical hits`,()=>{
 let hits=0;const opts={onHit:()=>hits++};if(safeguard==='protected')opts.target=()=>({position:{x:0,y:0},body:pointBody(contactPoint()),alive:true,protected:true});if(safeguard==='sanctuary')opts.isSanctuary=()=>true;if(safeguard==='dead')opts.target=()=>({position:{x:0,y:0},body:pointBody(contactPoint()),alive:false,protected:false});if(safeguard==='clear-line')opts.clearLine=()=>false;if(safeguard==='equipment')opts.equipmentClear=()=>false;if(safeguard==='body-overlap')opts.canOccupy=()=>false;
 const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile);advanceTicks(s,openWorld(opts),240);assert.equal(hits,0);
});
test('entering sanctuary during active cancels damage for a moving target',()=>{
 let hits=0;const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({target:tick=>({position:{x:0,y:0},body:tick<80?pointBody({x:999,y:999}):pointBody(contactPoint()),alive:true,protected:tick>=80}),onHit:()=>hits++});
 // Start windup at a real contact stance, then move target out until protected.
 world.target=tick=>({position:{x:0,y:0},body:tick===1?pointBody(contactPoint()):tick<80?pointBody({x:999,y:999}):pointBody(contactPoint()),alive:true,protected:tick>=80});advanceTicks(s,world,120);assert.equal(hits,0);
});
test('equipment sweep checks every attack transition; blocked active pose cancels without damage',()=>{
 let hits=0;const calls=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({equipmentSweep:(a,b)=>{calls.push([a.frame.pose,b.frame.pose]);return b.phase!=='active';},onHit:()=>hits++});advanceTicks(s,world,79);assert.equal(hits,0);assert.equal(s.phase,'recovery');assert.equal(enemyContractPose(s,sources,world).frame.pose,'windup');assert.ok(calls.some(([a,b])=>a==='windup'&&b==='contact'));
});
test('complete profile radius is passed to occupancy and continuous sweeps',()=>{
 const seen=[],world=openWorld({canOccupy:(p,r)=>{seen.push(r);return p.x+r<=20;},canSweep:(a,b,r)=>{seen.push(r);return b.x+r<=20;}});assert.equal(moveEnemyToward({x:0,y:0},{x:50,y:0},100,26,world).blocked,true);assert.ok(seen.every(r=>r===26));assert.equal(moveEnemyToward({x:0,y:0},{x:50,y:0},5,12,world).point.x,5);
});
test('wall-blocked nearest stance does not lock out a farther open lane',()=>{
 const world=openWorld({canSweep:(a,b)=>!(b.x>0&&Math.abs(b.y)<8)}),stance=findEnemyStance({position:{x:0,y:0},target:{x:50,y:0},radius:12,previousFacing:'east',maxScreenDistance:40,world,contact:p=>p.x>10});assert.ok(stance);assert.ok(Math.abs(stance.point.y)>=8);assert.ok(stance.route.every((p,i)=>world.canSweep(i?stance.route[i-1]:{x:0,y:0},p,12)));
});
test('two-segment detour is bounded, fully swept and not claimed as pathfinding',()=>{
 const start={x:0,y:0};const world=openWorld({canSweep:(a,b)=>!(a.x===0&&a.y===0&&b.x>20&&Math.abs(b.y)<5)}),stance=findEnemyStance({position:start,target:{x:50,y:0},radius:12,previousFacing:'east',maxScreenDistance:8,world,contact:p=>Math.abs(p.y)<1});assert.ok(stance);assert.equal(stance.route.length,2);assert.ok(world.canSweep(start,stance.route[0],12));assert.ok(world.canSweep(stance.route[0],stance.route[1],12));
});
test('unreachable target yields no teleport/attack and retries after bounded cooldown',()=>{
 const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile);let queries=0;const world=openWorld({clearLine:()=>false,canOccupy:()=>{queries++;return true;}});until(s,world,()=>s.navigation==='unreachable');const initial=queries;advanceTicks(s,world,30);assert.equal(queries,initial+30);assert.deepEqual(s.position,{x:0,y:0});assert.equal(s.attack,0);
});
test('invalid dt/profile/geometry fails closed rather than silently changing schedule',()=>{
 assert.equal(ENEMY_CONTRACT_HZ,120);assert.throws(()=>createEnemyContract('maw_skeleton',{x:0,y:0},{radius:12}));const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile);for(const dt of [-1,NaN,Infinity,10.1])assert.throws(()=>advanceEnemyContract(s,sources,openWorld(),dt));assert.throws(()=>enemyPose(manifest,'maw_skeleton','east','bogus',{x:0,y:0}));assert.throws(()=>enemyEquipmentGeometry(enemyPose(manifest,'maw_skeleton','east','active',{x:0,y:0}),{equipment:{}}));
});
test('dynamic short-step obstruction produces at most four lane attempts then cooldown',()=>{
 const s=createEnemyContract('maw_skeleton',{x:-150,y:0},profile),world=openWorld({canSweep:(a,b)=>Math.hypot(b.x-a.x,b.y-a.y)>.51});until(s,world,()=>s.retryAtTick>s.tick);assert.equal(s.navigation,'blocked');assert.equal(s.blockedAttempts,0);assert.equal(s.retryAtTick,s.tick+60);const retry=s.retryAtTick;assert.deepEqual(s.position,{x:-150,y:0});advanceTicks(s,world,20);assert.equal(s.retryAtTick,retry);assert.deepEqual(s.position,{x:-150,y:0});
});
test('blocked windup transition respects cooldown rather than retrying every fixed tick',()=>{
 let attempts=0;const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({equipmentSweep:(a,b)=>{if(b.phase==='windup'){attempts++;return false;}return true;}});advanceTicks(s,world,30);assert.equal(attempts,1);assert.equal(s.phase,'recovery');assert.equal(s.attack,0);
});
test('geometry revision immediately releases a stale unreachable-route cooldown',()=>{
 const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({clearLine:()=>false});until(s,world,()=>s.navigation==='unreachable');world.revision++;world.clearLine=()=>true;advanceTicks(s,world,1);assert.equal(s.phase,'windup');
});
test('movement renderer pose equals the exact walk pose used for equipment clearance',()=>{
 let last;const s=createEnemyContract('maw_skeleton',{x:-150,y:0},profile),world=openWorld({equipmentClear:pose=>{last=pose;return true;}});until(s,world,()=>s.navigation==='approaching');assert.deepEqual(enemyContractPose(s,sources,world),last);assert.equal(last.frame.pose,'step-a');
});
test('profile leash and activation safeguards do not start new attacks',()=>{
 let hits=0;const s=createEnemyContract('maw_skeleton',{x:0,y:0},{...profile,activationDistance:10}),world=openWorld({target:()=>({position:{x:100,y:0},body:pointBody({x:-100+contactPoint().x,y:contactPoint().y}),alive:true,protected:false}),onHit:()=>hits++});advanceTicks(s,world,200);assert.equal(s.attack,0);assert.equal(hits,0);
});
test('blocked recovery cannot skip simulation cooldown or increase repeat damage',()=>{
 const run=block=>{const hits=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({equipmentSweep:(a,b)=>!block||b.phase!=='recovery',onHit:e=>hits.push(e.tick)});advanceTicks(s,world,480);return hits;};assert.deepEqual(run(true),run(false));assert.deepEqual(run(false),[79,235,391]);
});
test('blocked recovery holds safe contact pixels but exposes logical recovery and cannot hit',()=>{
 const hits=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({equipmentSweep:(a,b)=>b.phase!=='recovery',onHit:e=>hits.push(e.tick)});advanceTicks(s,world,96);assert.equal(s.phase,'recovery');const pose=enemyContractPose(s,sources,world);assert.equal(pose.phase,'recovery');assert.equal(pose.frame.pose,'contact');assert.equal(s.ticksRemaining,60);advanceTicks(s,world,59);assert.deepEqual(hits,[79]);
});
test('one accumulated call samples fresh target geometry for every fixed tick',()=>{
 const sampled=[],hits=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({target:tick=>{sampled.push(tick);return {position:{x:0,y:0},body:pointBody(tick===1||tick===85?contactPoint():{x:999,y:999}),alive:true,protected:false};},onHit:e=>hits.push(e.tick)});advanceEnemyContract(s,sources,world,1);assert.equal(sampled.length,120);assert.deepEqual(sampled,Array.from({length:120},(_,i)=>i+1));assert.deepEqual(hits,[85]);
});
test('defeat interrupts active/windup, no later contact or navigation after death',()=>{
 for(const ticks of [1,78,79]){let hits=0;const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({onHit:()=>hits++});advanceTicks(s,world,ticks);const before=hits;defeatEnemyContract(s);advanceTicks(s,world,480);assert.equal(hits,before);assert.equal(s.phase,'idle');assert.equal(s.alive,false);assert.equal(s.navigation,'idle');}
});
test('moving target invalidates blocked stance exclusions and cooldown',()=>{
 const s=createEnemyContract('maw_skeleton',{x:-150,y:0},profile),world=openWorld({canSweep:(a,b)=>Math.hypot(b.x-a.x,b.y-a.y)>.51});until(s,world,()=>s.retryAtTick>s.tick);world.target=()=>({position:{x:20,y:0},body:pointBody(contactPoint()),alive:true,protected:false});advanceTicks(s,world,1);assert.equal(s.retryAtTick,0);assert.equal(s.blockedAttempts,0);assert.equal(s.navigation,'planning');assert.deepEqual(s.planner.input.target,{x:20,y:0});assert.deepEqual(s.lastTarget,{x:20,y:0});
});
test('runtime planning budgets at most64 expensive candidates per tick and reports pending, not false unreachable',()=>{
 let calls=0;const world=openWorld({canOccupy:()=>{calls++;return true;}}),plan=createEnemyStancePlan({position:{x:0,y:0},target:{x:200,y:0},radius:12,previousFacing:'east',maxScreenDistance:400,world,contact:()=>false});assert.equal(calls,0);let result=advanceEnemyStancePlan(plan,64);assert.equal(result.status,'pending');assert.equal(plan.checks,64);assert.equal(calls,64);while(!plan.done){const before=plan.checks;result=advanceEnemyStancePlan(plan,64);assert.ok(plan.checks-before<=64);}assert.equal(result.status,'done');assert.equal(result.stance,null);assert.ok(plan.queue.length<=8192);
});
test('required resolver shield result consumes contact and never also damages body',()=>{
 let bodyHits=0,blocks=0,resolves=0;const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({resolveTargetContact:input=>({kind:++resolves===1?'shield':'body',toi:input.interval.kind==='active-entry'?0:.2}),onBlock:()=>blocks++,onHit:()=>bodyHits++});advanceTicks(s,world,95);assert.equal(blocks,1);assert.equal(bodyHits,0);assert.equal(resolves,1);
});
test('resolver entry is current active instant; later intervals receive fresh prior/current snapshots',()=>{
 const inputs=[],shared={position:{x:0,y:0},body:pointBody(contactPoint()),shield:[],alive:true,protected:false},s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({target:tick=>{shared.body[0].a.x=contactPoint().x+tick/1000;shared.body[0].b.x=shared.body[0].a.x;return shared;},resolveTargetContact:input=>{inputs.push(input);return {kind:'none',toi:1};}});advanceTicks(s,world,80);assert.equal(inputs.length,2);close(inputs[0].weaponPolygons[0].points[0],enemyEquipmentGeometry(enemyPose(manifest,'maw_skeleton','east','active',{x:0,y:0}),alpha).find(p=>!p.equipment.startsWith('shield')).points[0]);assert.deepEqual(inputs[0].previousWeaponPolygons,inputs[0].weaponPolygons);assert.deepEqual(inputs[0].previousTarget,inputs[0].currentTarget);assert.deepEqual(inputs[0].interval,{kind:'active-entry',fromTick:79,toTick:79,endExclusive:false});assert.deepEqual(inputs[1].interval,{kind:'active-step',fromTick:79,toTick:80,endExclusive:false});assert.equal(inputs[0].currentTarget.body[0].a.x,contactPoint().x+.079);assert.equal(inputs[1].previousTarget.body[0].a.x,contactPoint().x+.079);
});
test('resolver output is mandatory and invalid first-contact results fail closed',()=>{
 for(const result of [{kind:'body',toi:-.1},{kind:'body',toi:Infinity},{kind:'unknown',toi:0}]){let hits=0;const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile);assert.throws(()=>advanceTicks(s,openWorld({resolveTargetContact:()=>result,onHit:()=>hits++}),79));assert.equal(hits,0);}
});
test('final active interval resolves interior swept contact before recovery, excluding its endpoint',()=>{
 for(const toi of [.5,1]){const hits=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({resolveTargetContact:input=>({kind:input.tick===96?'body':'none',toi}),onHit:e=>hits.push(e.tick)});advanceTicks(s,world,96);assert.equal(s.phase,'recovery');assert.deepEqual(hits,toi<1?[96]:[]);}
});
test('target geometry revision resets an in-progress planner without reusing stale shape extent',()=>{
 const s=createEnemyContract('maw_skeleton',{x:-150,y:0},profile),world=openWorld();advanceTicks(s,world,1);assert.equal(s.navigation,'planning');const old=s.planner;world.target=()=>({position:{x:0,y:0},body:pointBody(contactPoint()),alive:true,protected:false,geometryRevision:1});advanceTicks(s,world,1);assert.equal(s.targetGeometryRevision,1);assert.notEqual(s.planner,old);assert.equal(s.planner.checks,64);
});
test('completed cached stance is rejected if target body pose no longer contacts it',()=>{
 const s=createEnemyContract('maw_skeleton',{x:-150,y:0},profile),world=openWorld();advanceTicks(s,world,1);assert.equal(s.navigation,'planning');const stale={point:{x:0,y:0},facing:'east',route:[{x:0,y:0}],key:'0.000:0.000',cost:150};s.planner={input:s.planner.input,queue:[],index:0,best:stale,done:false,checks:1};world.target=()=>({position:{x:0,y:0},body:pointBody({x:999,y:999}),alive:true,protected:false});advanceTicks(s,world,1);assert.equal(s.stance,null);assert.equal(s.navigation,'planning');assert.deepEqual(s.position,{x:-150,y:0});assert.equal(s.blockedAttempts,1);assert.ok(s.rejected.has(stale.key));
});
for(const id of ids)test(`${id}: real unrendered windup-to-active interior overlap cannot damage at entry`,()=>{
 const windup=enemyEquipmentGeometry(enemyPose(manifest,id,'east','windup',{x:0,y:0}),alpha).filter(p=>!p.equipment.startsWith('shield'));
 const active=enemyEquipmentGeometry(enemyPose(manifest,id,'east','active',{x:0,y:0}),alpha).filter(p=>!p.equipment.startsWith('shield'));
 let counter;
 for(let i=0;i<active.length&&!counter;i++){
  const intermediate=active[i].points.map((p,j)=>({x:(p.x+windup[i].points[j].x)/2,y:(p.y+windup[i].points[j].y)/2}));
  const c={x:intermediate.reduce((n,p)=>n+p.x,0)/4,y:intermediate.reduce((n,p)=>n+p.y,0)/4},body={a:c,b:c,radius:.001};
  if(polygonTouchesCapsule(intermediate,body)&&![...windup,...active].some(p=>polygonTouchesCapsule(p.points,body)))counter=body;
 }
 assert.ok(counter,'real PR7 gear has an interior-only interpolated overlap');
 // An honest sampled continuous oracle would hit this static target if fed the
 // forbidden windup->active interpolation. Actual entry must not feed that path.
 const continuous=input=>{
  for(const toi of [0,.25,.5,.75,1])for(let i=0;i<input.weaponPolygons.length;i++){
   const points=input.weaponPolygons[i].points.map((p,j)=>({x:input.previousWeaponPolygons[i].points[j].x+(p.x-input.previousWeaponPolygons[i].points[j].x)*toi,y:input.previousWeaponPolygons[i].points[j].y+(p.y-input.previousWeaponPolygons[i].points[j].y)*toi}));
   if(input.currentTarget.body.some(b=>polygonTouchesCapsule(points,b)))return {kind:'body',toi};
  }
  return {kind:'none',toi:1};
 };
 assert.deepEqual(continuous({previousWeaponPolygons:windup,weaponPolygons:active,currentTarget:{body:[counter]}}),{kind:'body',toi:.5});
 const hits=[],inputs=[],s=createEnemyContract(id,{x:0,y:0},profile),world=openWorld({target:tick=>({position:{x:0,y:0},body:tick===1?pointBody(contactPoint(id)):[counter],alive:true,protected:false}),resolveTargetContact:input=>{inputs.push(input);return continuous(input);},onHit:e=>hits.push(e)});
 const entry=1+Math.ceil(manifest.enemies[id].animations.attack[0].durationMs*120/1000);advanceTicks(s,world,entry);assert.equal(s.phase,'active');assert.equal(inputs.length,1);assert.deepEqual(inputs[0].previousWeaponPolygons,inputs[0].weaponPolygons);assert.deepEqual(inputs[0].previousTarget,inputs[0].currentTarget);assert.deepEqual(hits,[]);
});
test('nonzero contact TOI on zero-duration active entry is rejected before damage',()=>{
 let hits=0;const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile);assert.throws(()=>advanceTicks(s,openWorld({resolveTargetContact:()=>({kind:'body',toi:.5}),onHit:()=>hits++}),79),/instantaneous TOI zero/);assert.equal(hits,0);
});
test('ordinary roll/hurt immunity rejects host damage without cancelling committed attack or cooldown',()=>{
 let hp=100;const contacts=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({target:()=>({position:{x:0,y:0},body:pointBody(contactPoint()),alive:true,protected:false}),onHit:event=>{contacts.push(event.contactTick);const ordinaryImmune=event.contactTick>=1&&event.contactTick<=100;if(!ordinaryImmune)hp-=20;}});
 advanceTicks(s,world,78);assert.equal(s.phase,'windup');assert.equal(s.attack,1);advanceTicks(s,world,1);assert.equal(s.phase,'active');assert.equal(hp,100);assert.deepEqual(contacts,[79]);advanceTicks(s,world,17);assert.equal(s.phase,'recovery');assert.equal(s.ticksRemaining,60);advanceTicks(s,world,60);assert.equal(s.phase,'idle');assert.equal(s.attack,1);assert.equal(hp,100);advanceTicks(s,world,79);assert.deepEqual(contacts,[79,235]);assert.equal(hp,80);
});
test('one-tick recovery body obstruction plus revision removal cannot accelerate attack cadence',()=>{
 const run=blocked=>{const hits=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({canOccupy:()=>!blocked||s.tick!==100,onHit:e=>hits.push(e.tick)});Object.defineProperty(world,'revision',{get:()=>blocked&&s.tick>=101?1:0});advanceTicks(s,world,480);return hits;};assert.deepEqual(run(false),[79,235,391]);assert.deepEqual(run(true),run(false));
});
for(const id of ids)test(`${id}: occupancy/revision cadence invariant holds under partitioned and delayed dt`,()=>{
 const run=(blocked,schedule)=>{const hits=[],s=createEnemyContract(id,{x:0,y:0},profile),windup=Math.ceil(manifest.enemies[id].animations.attack[0].durationMs*120/1000),active=Math.ceil(manifest.enemies[id].animations.attack[1].durationMs*120/1000),obstruction=1+windup+active+4,world=openWorld({target:()=>({position:{x:0,y:0},body:pointBody(contactPoint(id)),alive:true,protected:false}),canOccupy:()=>!blocked||s.tick!==obstruction,onHit:e=>hits.push(e.tick)});Object.defineProperty(world,'revision',{get:()=>blocked&&s.tick>obstruction?1:0});for(const dt of schedule)advanceEnemyContract(s,sources,world,dt);return hits;};
 const normal=run(false,[4]);assert.deepEqual(run(true,[4]),normal);assert.deepEqual(run(true,Array(120).fill(1/30)),normal);assert.deepEqual(run(true,Array(480).fill(1/120)),normal);
});
for(const interruption of ['noncombat','zero-stagger'])test(`${interruption} cannot erase the independent committed attack deadline`,()=>{
 const hits=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({target:tick=>({position:{x:0,y:0},body:pointBody(contactPoint()),alive:true,protected:interruption==='noncombat'&&tick===100}),onHit:e=>hits.push(e.tick)});advanceTicks(s,world,99);assert.equal(s.attackReadyAtTick,157);if(interruption==='zero-stagger')staggerEnemyContract(s,0);advanceTicks(s,world,381);assert.deepEqual(hits,[79,235,391]);
});
test('committed attack deadline prevents early attacks but does not freeze safe repositioning',()=>{
 const s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({target:tick=>({position:{x:tick>80?150:0,y:0},body:pointBody(contactPoint()),alive:true,protected:tick===80})});advanceTicks(s,world,80);assert.equal(s.phase,'idle');assert.equal(s.attackReadyAtTick,157);until(s,world,()=>Math.hypot(s.position.x,s.position.y)>0,60);assert.ok(s.tick<157);assert.equal(s.attack,1);
});
test('one-tick noncombat cancellation cadence is invariant across catch-up schedules',()=>{
 const run=schedule=>{const hits=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({target:tick=>({position:{x:0,y:0},body:pointBody(contactPoint()),alive:true,protected:tick===100}),onHit:e=>hits.push(e.tick)});for(const dt of schedule)advanceEnemyContract(s,sources,world,dt);return hits;};for(const schedule of [[4],Array(120).fill(1/30),Array(480).fill(1/120)])assert.deepEqual(run(schedule),[79,235,391]);
});
test('short stagger cannot shorten recovery cadence across equivalent dt partitions',()=>{
 const run=(prefix,suffix)=>{const hits=[],s=createEnemyContract('maw_skeleton',{x:0,y:0},profile),world=openWorld({onHit:e=>hits.push(e.tick)});for(const dt of prefix)advanceEnemyContract(s,sources,world,dt);assert.equal(s.tick,99);staggerEnemyContract(s,.01);assert.equal(s.attackReadyAtTick,157);for(const dt of suffix)advanceEnemyContract(s,sources,world,dt);return hits;};assert.deepEqual(run([99/120],[381/120]),[79,235,391]);assert.deepEqual(run(Array(99).fill(1/120),Array(381).fill(1/120)),[79,235,391]);assert.deepEqual(run(Array(33).fill(1/40),Array(127).fill(1/40)),[79,235,391]);
});
