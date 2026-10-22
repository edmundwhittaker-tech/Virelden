import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveEnemyContact,tryResolveEnemyContact,EnemyContactError} from '../.test-build/core/enemyContact.js';
import {enemyPose,enemyEquipmentPoint} from '../.test-build/core/enemyPose.js';
import {enemyEquipmentGeometry} from '../.test-build/core/enemyGeometry.js';
const rect=(x,y=0,w=1,h=1,equipment='weapon')=>({equipment,layer:0,points:[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]});
const shift=(p,x,y=0)=>({...p,points:p.points.map(q=>({x:q.x+x,y:q.y+y}))});
const circle=(x,y=.5,r=.5)=>({a:{x,y},b:{x,y},radius:r});
function input(a=[rect(0)],b=[rect(10)],before={body:[circle(5)],shield:[]},after=before,kind='active-step') {return {tick:2,attack:1,interval:{kind,fromTick:kind==='active-entry'?2:1,toTick:2,endExclusive:kind==='active-exit'},previousWeaponPolygons:a,weaponPolygons:b,previousTarget:before,currentTarget:after};}
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<=2**-41,`${actual} != ${expected}`);
const expect=(i,kind,toi)=>{const r=resolveEnemyContact(i);assert.equal(r.kind,kind);if(toi!==undefined)near(r.toi,toi);return r;};
const target=(body=[],shield=[])=>({body,shield});

test('real geometry: shield first intercepts before body',()=>expect(input(undefined,undefined,target([circle(8)],[rect(4,0,1,1,'shield')])), 'shield',.3));
test('real geometry: body first is not overridden by later shield',()=>expect(input(undefined,undefined,target([circle(4)],[rect(8,0,1,1,'shield')])), 'body',.25));
test('exact true tie chooses shield; near-but-distinct contacts do not tie',()=>{
 expect(input(undefined,undefined,target([circle(5.5)],[rect(5,0,1,1,'shield')])), 'shield',.4);
 expect(input(undefined,undefined,target([circle(5.5-1e-10)],[rect(5,0,1,1,'shield')])), 'body',(.4-1e-11));
 expect(input(undefined,undefined,target([circle(5.5+1e-10)],[rect(5,0,1,1,'shield')])), 'shield',.4);
});
test('reversed motion and array order preserve earliest physical contact',()=>{
 const before=target([circle(3),circle(6)]),r=expect(input([rect(10)],[rect(0)],before),'body',.35);
 const reversed=target([...before.body].reverse());const s=resolveEnemyContact(input([rect(10)],[rect(0)],reversed));assert.equal(s.kind,r.kind);near(s.toi,r.toi);
});
test('moving target capsules collide between disjoint snapshots',()=>expect(input([rect(0)],[rect(0)],target([circle(-5)]),target([circle(5)])),'body',.45));
test('both weapon and capsule moving in reverse relative directions',()=>expect(input([rect(0)],[rect(4)],target([circle(8)]),target([circle(4)])),'body',.8125));
test('moving shield intercepts a static weapon between disjoint snapshots',()=>expect(input([rect(0)],[rect(0)],target([], [rect(-4,0,1,1,'shield')]),target([], [rect(4,0,1,1,'shield')])),'shield',.375));
test('shield and body moving together still use their physical order',()=>expect(input([rect(0)],[rect(10)],target([circle(8)], [rect(5,0,1,1,'shield')]),target([circle(7)], [rect(4,0,1,1,'shield')])),'shield',4/11));
test('fast sweep does not tunnel through a tiny target despite no endpoint overlap',()=>expect(input([rect(-1000,0,.01,1)],[rect(1000,0,.01,1)],target([circle(0,.5,.001)])),'body',(1000-.011)/2000));
test('exact isolated even-multiplicity corner tangent is a hit, close miss is not',()=>{
 const a=rect(1,5.5),b=rect(5,2.5);expect(input([a],[b],target([circle(0,0,5)])),'body',.5);
 expect(input([a],[b],target([circle(0,0,5-1e-8)])),'none');
});
test('grazing along an edge is contact, nearby parallel pass remains no-hit',()=>{
 expect(input([rect(-3,1)],[rect(3,1)],target([circle(0,0,1)])),'body',1/3);
 expect(input([rect(-3,1+1e-8)],[rect(3,1+1e-8)],target([circle(0,0,1)])),'none');
});
test('collinear shield edges sliding into contact need vertex coincidences',()=>expect(input([rect(-3,1)],[rect(3,1)],target([], [rect(0,0,1,1,'shield')])),'shield',1/3));
test('capsule spine interior crossing is handled even with zero radius',()=>{
 const a={a:{x:0,y:-2},b:{x:0,y:2},radius:0};expect(input([rect(-5,-.5)],[rect(5,-.5)],target([a])),'body',.4);
});
test('moving capsule endpoints and radius are interpolated, not just center',()=>{
 const a={a:{x:5,y:5},b:{x:5,y:6},radius:0},b={a:{x:5,y:-5},b:{x:5,y:7},radius:1};
 expect(input([rect(4,0)],[rect(4,0)],target([a]),target([b])),'body',4/11);
});
test('active-entry checks only current snapshot at exact TOI0; previous windup cannot hit',()=>{
 expect(input([rect(0)],[rect(10)],target([circle(5)]),target([circle(5)]),'active-entry'),'none');
 expect(input([rect(0)],[rect(10)],target([circle(5)]),target([circle(10.5)]),'active-entry'),'body',0);
 const i=input(null,[rect(10)],null,target([circle(10.5)]),'active-entry');expect(i,'body',0);
});
test('entry shield wins TOI0 tie including marked discrete pose',()=>{const i=input([], [rect(0)],target(),target([circle(.5)],[rect(0,0,1,1,'shield')]),'active-entry');i.motion='discontinuous';expect(i,'shield',0);});
test('active-exit excludes exact endpoint1, not a genuinely earlier contact',()=>{
 const t=target([circle(11.5)]);expect(input(undefined,undefined,t),'body',1);expect(input(undefined,undefined,t,t,'active-exit'),'none');
 const earlier=target([circle(11.5-1e-8)]);expect(input(undefined,undefined,earlier,earlier,'active-exit'),'body',1-1e-9);
});
test('current endpoint snapshot is included for ordinary active-step',()=>expect(input(undefined,undefined,target([], [rect(11,0,1,1,'shield')])),'shield',1));
test('starting body overlap does not skip a simultaneous shield',()=>expect(input([rect(0)],[rect(10)],target([circle(.5)],[rect(0,0,1,1,'shield')])),'shield',0));
test('negative coordinates and reversed polygon winding are supported',()=>{
 const a=rect(-10,-10),b=rect(0,-10);a.points.reverse();b.points.reverse();expect(input([a],[b],target([circle(-5,-9.5)])),'body',.35);
});
test('capsule point and spine order reversal describe the same geometry',()=>{
 const c={a:{x:5,y:-2},b:{x:5,y:2},radius:.5},d={...c,a:c.b,b:c.a};near(expect(input(undefined,undefined,target([c])),'body',.35).toi,expect(input(undefined,undefined,target([d])),'body',.35).toi);
});
test('empty physical geometry is a certified no-hit',()=>{expect(input([],[],target()),'none');expect(input(undefined,undefined,target()),'none');});
test('marked discontinuity and topology changes are explicit unsupported errors',()=>{
 const i=input();i.motion='discontinuous';assert.throws(()=>resolveEnemyContact(i),e=>e instanceof EnemyContactError&&e.code==='unsupported');
 for(const change of [i=>i.weaponPolygons.push(rect(0)),i=>i.weaponPolygons[0].equipment='other',i=>i.currentTarget.body.push(circle(2)),i=>i.weaponPolygons[0].points.pop()]){const i=input();i.currentTarget=structuredClone(i.currentTarget);change(i);assert.throws(()=>resolveEnemyContact(i),EnemyContactError);}
});
test('self intersection or collapsing motion is rejected, not bridged',()=>{
 const a=rect(0),b=rect(10);b.points=[b.points[2],b.points[3],b.points[0],b.points[1]];assert.throws(()=>resolveEnemyContact(input([a],[b])),e=>e.code==='unsupported');
 const c=rect(0);c.points[2]={x:.25,y:.25};assert.throws(()=>resolveEnemyContact(input([c],[c],target([circle(.5)]))),e=>e.code==='unsupported');
});
test('malformed scalar/interval inputs fail explicitly',()=>{
 for(const change of [i=>i.weaponPolygons[0].points[0].x=NaN,i=>i.currentTarget.body[0].radius=-1,i=>i.interval.endExclusive=true,i=>i.interval.fromTick=0,i=>i.interval.kind='windup',i=>i.tick=2.5,i=>i.weaponPolygons[0].points[0].x=Infinity,i=>i.weaponPolygons[0].points[0].x=1e7,i=>i.currentTarget.body[0].a=null]){const i=structuredClone(input());change(i);assert.throws(()=>resolveEnemyContact(i),EnemyContactError);}
});
test('bounded work budget failure is not falsely returned as none',()=>assert.throws(()=>resolveEnemyContact(input(),{maxWork:1}),e=>e instanceof EnemyContactError&&e.code==='budget'));
test('extreme exact-grid range is unsupported rather than underflowing contact',()=>{const i=input();i.weaponPolygons[0].points[0].y=Number.MIN_VALUE;assert.throws(()=>resolveEnemyContact(i),e=>e.code==='unsupported');});
test('repeated results and input values are deterministic and unmutated',()=>{const i=input(undefined,undefined,target([circle(5.5)],[rect(5,0,1,1,'shield')])),saved=structuredClone(i),r=resolveEnemyContact(i);for(let n=0;n<30;n++)assert.deepEqual(resolveEnemyContact(i),r);assert.deepEqual(i,saved);});

const manifest=JSON.parse(readFileSync(new URL('../src/assets/enemies-v1/manifest.json',import.meta.url))),alpha=JSON.parse(readFileSync(new URL('../src/assets/enemies-v1/contact-alpha.json',import.meta.url)));
test('exact original PR7 transparent trident corner remains empty, not a filled box',()=>{
 const pose=enemyPose(manifest,'iron_giant','east','active',{x:0,y:0}),polys=enemyEquipmentGeometry(pose,alpha).filter(p=>!p.equipment.startsWith('shield')),item=pose.frame.equipment.find(p=>p.equipment==='trident'),p=enemyEquipmentPoint(pose,item,{x:1,y:0});
 expect(input(polys,polys,target([circle(p.x,p.y,.01)]),undefined,'active-entry'),'none');
});
test('exact original PR7 alpha geometry provides real continuous enemy→player contact',()=>{
 const pose=enemyPose(manifest,'iron_giant','east','active',{x:0,y:0}),polys=enemyEquipmentGeometry(pose,alpha).filter(p=>!p.equipment.startsWith('shield'));
 const r=expect(input(polys,polys,target([circle(250,-180,.5)]),target([circle(250,-80,.5)])),'body');assert.ok(r.toi>0&&r.toi<1);assert.ok(r.diagnostics.polynomials>0);
});
test('same real solver supports incoming player weapon→original PR7 giant shield/body',()=>{
 const pose=enemyPose(manifest,'iron_giant','east','active',{x:0,y:0}),shield=enemyEquipmentGeometry(pose,alpha).filter(p=>p.equipment.startsWith('shield'));
 const giant=target([{a:{x:15,y:-120},b:{x:15,y:-20},radius:8}],shield);const r=expect(input([rect(-100,-60,8,2)],[rect(100,-60,8,2)],giant),'shield');assert.ok(r.toi>0&&r.toi<.5);assert.ok(r.diagnostics.polynomials>0);
});
test('alpha equipment gaps are preserved during a sweep, not bridged as one silhouette box',()=>{
 const separated=[rect(0,0,1,1),rect(0,3,1,1)],moved=separated.map(p=>shift(p,10));expect(input(separated,moved,target([circle(5,2,.25)])),'none');
});

import {createEnemyContract,advanceEnemyContract} from '../.test-build/core/enemySimulation.js';
test('simulation consumes real active-entry contact once using injected body geometry',()=>{
 const pose=enemyPose(manifest,'maw_skeleton','east','active',{x:0,y:0}),poly=enemyEquipmentGeometry(pose,alpha).find(p=>!p.equipment.startsWith('shield')),p={x:poly.points.reduce((n,p)=>n+p.x,0)/4,y:poly.points.reduce((n,p)=>n+p.y,0)/4},hits=[];
 const world={canOccupy:()=>true,canSweep:()=>true,clearLine:()=>true,project:p=>p,unproject:p=>p,facingForAim:()=> 'east',target:()=>({position:{x:0,y:0},body:[circle(p.x,p.y,.01)],alive:true,protected:false}),isSanctuary:()=>false,revision:0,equipmentClear:()=>true,equipmentSweep:()=>true,resolveTargetContact:resolveEnemyContact,onHit:event=>hits.push(event)};
 const state=createEnemyContract('maw_skeleton',{x:0,y:0},{radius:12,speed:60,activationDistance:1000,leashDistance:1000});advanceEnemyContract(state,{manifest,alpha},world,100/120);
 assert.equal(hits.length,1);assert.equal(hits[0].interval.kind,'active-entry');assert.equal(hits[0].toi,0);assert.equal(hits[0].contactTick,79);
});
test('simulation consumes moving-target real shield interception without emitting body damage',()=>{
 const pose=enemyPose(manifest,'maw_skeleton','east','active',{x:0,y:0}),polys=enemyEquipmentGeometry(pose,alpha).filter(p=>!p.equipment.startsWith('shield')),poly=polys[0],p={x:poly.points.reduce((n,p)=>n+p.x,0)/4,y:poly.points.reduce((n,p)=>n+p.y,0)/4},xs=polys.flatMap(p=>p.points.map(p=>p.x)),left=Math.min(...xs)-40,right=Math.max(...xs)+40,blocks=[],hits=[];
 const world={canOccupy:()=>true,canSweep:()=>true,clearLine:()=>true,project:p=>p,unproject:p=>p,facingForAim:()=> 'east',target:tick=>{const x=tick===1?p.x:tick<80?left:right;return {position:{x:0,y:0},body:[circle(x,p.y,.01)],shield:tick===1?[]:[rect(x+10,p.y-.05,.1,.1,'shield')],alive:true,protected:false};},isSanctuary:()=>false,revision:0,equipmentClear:()=>true,equipmentSweep:()=>true,resolveTargetContact:resolveEnemyContact,onHit:e=>hits.push(e),onBlock:e=>blocks.push(e)};
 const state=createEnemyContract('maw_skeleton',{x:0,y:0},{radius:12,speed:60,activationDistance:1000,leashDistance:1000});advanceEnemyContract(state,{manifest,alpha},world,100/120);
 assert.equal(hits.length,0);assert.equal(blocks.length,1);assert.equal(blocks[0].interval.kind,'active-step');assert.ok(blocks[0].contactTick>79&&blocks[0].contactTick<80);
});

test('safe host boundary distinguishes unresolved contact from certified no-hit',()=>{
 const unresolved=tryResolveEnemyContact(input(),{maxWork:1});assert.equal(unresolved.status,'unresolved');assert.equal(unresolved.error.code,'budget');assert.equal('result' in unresolved,false);
 const resolved=tryResolveEnemyContact(input([],[],target()));assert.equal(resolved.status,'resolved');assert.equal(resolved.result.kind,'none');
});
test('sparse malformed geometry arrays produce structured input errors',()=>{
 const i=input();i.weaponPolygons[0].points=Array(4);assert.throws(()=>resolveEnemyContact(i),EnemyContactError);
 const j=input();j.weaponPolygons=Array(1);assert.throws(()=>resolveEnemyContact(j),EnemyContactError);
});

test('exact irrational root tie across different feature polynomials chooses shield',()=>{
 const weapon=rect(-1,0),shield=points=>({equipment:'shield',layer:0,points:points.map(([x,y])=>({x,y}))}),a=shield([[1,0],[-1,-1],[-1,-2],[1,-1]]),b=shield([[1,8],[0,-1],[0,-2],[1,7]]),expected=(1-1/Math.sqrt(2))/2;
 expect(input([weapon],[weapon],target([circle(1,-1,1)],[a]),target([circle(-1,1,1)],[b])),'shield',expected);
});
