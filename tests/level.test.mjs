import {archerProjectileOrigin,archerNockOffset} from '../.test-build/core/archerRig.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventure,adventureCanStand,tick,interact,attack,roll,retry,serialize,restore,LOOT} from '../.test-build/core/adventure.js';
import {STATION_GATE,CHECKPOINTS,FINISH,LEVEL_METRICS,LEVEL_SECTIONS,ROUTE} from '../.test-build/core/level.js';
import {project} from '../.test-build/core/game.js';
const advance=(s,seconds,input={x:0,y:0})=>{for(let n=0;n<Math.ceil(seconds*60);n++)tick(s,input,1/60);};
const isolated=()=>{const s=createAdventure();s.enemies=[];return s;};
test('four connected encounter sections expand area and content, not actor scale',()=>{
 const s=createAdventure();assert.equal(LEVEL_SECTIONS.length,4);assert.equal(s.enemies.length,12);assert.equal(LEVEL_METRICS.expandedArea/LEVEL_METRICS.baselineArea,4);assert.ok(LEVEL_METRICS.expandedRoute/LEVEL_METRICS.baselineRoute>=4);
 for(const section of LEVEL_SECTIONS)assert.equal(s.enemies.filter(e=>e.home.y>=section.y&&e.home.y<section.y+section.height).length,3);
});
test('station lever pull locks movement; opening leaves remain solid until fully open',()=>{
 const s=isolated();s.position={x:560,y:115};const original={...s.position};assert.equal(interact(s),true);assert.deepEqual(s.position,original,'activation must not teleport to operating stance');assert.equal(s.gatePhase,'closed');for(let i=0;s.leverAlignment&&i<120;i++){const before=project(s.position);tick(s,{x:0,y:-1},1/60);const after=project(s.position);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<=2.500001);assert.ok(adventureCanStand(s,s.position));}assert.equal(s.leverAlignment,null);assert.equal(s.gatePhase,'pulling');assert.ok(Math.hypot(s.position.x-STATION_GATE.stance.x,s.position.y-STATION_GATE.stance.y)<1e-5);assert.ok(adventureCanStand(s,s.position));const p={...s.position};assert.equal(attack(s),false);assert.equal(roll(s),false);advance(s,.5,{x:0,y:-1});assert.deepEqual(s.position,p);assert.equal(adventureCanStand(s,{x:485,y:0}),false);advance(s,.4);assert.equal(s.gatePhase,'opening');assert.ok(s.gateProgress>0);advance(s,1);assert.equal(adventureCanStand(s,{x:485,y:0}),false);advance(s,1.3);assert.equal(s.gatePhase,'open');assert.equal(s.gateProgress,1);assert.equal(adventureCanStand(s,{x:485,y:0}),true);assert.equal(adventureCanStand(s,{x:300,y:0}),false);
 s.position={x:485,y:50};advance(s,.7,{x:1,y:-.5});assert.ok(s.position.y<0,'walks through actual aperture');
});
test('station activation across the solid approach is rejected without teleport or opening',()=>{const s=isolated();s.position={x:530,y:80};const before={...s.position};assert.equal(interact(s),false);assert.deepEqual(s.position,before);assert.equal(s.leverAlignment,null);assert.equal(s.gatePhase,'closed');assert.match(s.message,/clear operating side/);});
test('all encounters, cache, checkpoint and finish are reachable through the opened gate',()=>{
 const s=createAdventure();s.gatePhase='open';const grid=10,key=p=>`${p.x},${p.y}`,queue=[{x:320,y:320}],seen=new Set([key(queue[0])]);
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[grid,0],[-grid,0],[0,grid],[0,-grid]]){const p={x:queue[i].x+dx,y:queue[i].y+dy};if(!seen.has(key(p))&&adventureCanStand(s,p)){seen.add(key(p));queue.push(p);}}
 for(const target of [...s.enemies.map(e=>e.home),...LOOT.map(l=>l.position),...CHECKPOINTS,FINISH,STATION_GATE.lever]){const q=project(target);assert.ok(queue.some(p=>{const r=project(p);return Math.hypot(q.x-r.x,q.y-r.y)<35;}),JSON.stringify(target));}
});
test('partial gate reload and death restart safely; fully open gate and checkpoint persist',()=>{
 for(const phase of ['pulling','opening']){const s=isolated();s.gatePhase=phase;s.gateProgress=.5;s.interactionTimer=.3;const restored=restore(serialize(s));assert.equal(restored.gatePhase,'closed');assert.equal(restored.gateProgress,0);s.hp=0;retry(s);assert.equal(s.gatePhase,'closed');assert.deepEqual(s.position,CHECKPOINTS[0]);}
 const s=createAdventure();s.gatePhase='open';s.gateProgress=1;s.position={...CHECKPOINTS[1]};s.hp=1;interact(s);assert.equal(s.hp,s.maxHp);const restored=restore(serialize(s));assert.deepEqual(restored.position,CHECKPOINTS[1]);assert.equal(restored.gatePhase,'open');s.hp=0;retry(s);assert.deepEqual(s.position,CHECKPOINTS[1]);assert.equal(s.gatePhase,'open');
});
test('version one saves migrate earned gear without falsely finishing the larger expedition',()=>{
 const s=createAdventure();s.currency=88;s.owned.push('hammer');s.levels.hammer=2;s.looted=['west-cache'];s.enemies[2].hp=0;const old=JSON.parse(serialize(s));old.version=1;delete old.gateOpen;delete old.checkpoint;delete old.completed;const restored=restore(JSON.stringify(old));assert.ok(restored);assert.equal(restored.currency,88);assert.equal(restored.levels.hammer,2);assert.equal(restored.enemies[2].hp,0);assert.equal(restored.enemies.at(-1).hp,260);assert.equal(restored.completed,false);assert.equal(restored.gatePhase,'closed');
});
test('upper watch exit requires its captain; completion survives reload and optional exploration',()=>{
 const s=createAdventure();s.gatePhase='open';s.position={...FINISH};s.gatePhase='open';assert.equal(interact(s),false);s.enemies.find(e=>e.id==='upper-captain').hp=0;assert.equal(interact(s),true);assert.equal(s.completed,true);assert.equal(restore(serialize(s)).completed,true);assert.equal(interact(s),true);
});

test('surveyed main route segments are all walkable, not straight lines through walls',()=>{const s=createAdventure();s.gatePhase='open';for(let i=1;i<ROUTE.length;i++){const a=ROUTE[i-1],b=ROUTE[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2);for(let n=0;n<=steps;n++){const p={x:a.x+(b.x-a.x)*n/steps,y:a.y+(b.y-a.y)*n/steps};assert.ok(adventureCanStand(s,p),JSON.stringify({segment:i,p}));}}});

test('watcher arrows spawn at shared drawn nock and advance along actual aim',()=>{
 for(const aim of [{x:1,y:0},{x:-1,y:0},{x:.6,y:.8},{x:-.6,y:-.8}]){const s=createAdventure();const e=s.enemies.find(e=>e.kind==='watcher');s.enemies=[e];e.position={x:200,y:200};e.phase='windup';e.timer=0;e.aim=aim;s.position={x:300,y:300};const origin=archerProjectileOrigin(e.position,aim),nock=archerNockOffset(aim),foot=project(e.position),p=project(origin);assert.ok(Math.abs(p.x-foot.x-nock.x)<1e-8);assert.ok(Math.abs(p.y-foot.y-nock.y)<1e-8);tick(s,{x:0,y:0},1/60);assert.equal(s.projectiles.length,1);const arrow=s.projectiles[0],actual=project(arrow.position);assert.ok(Math.abs(actual.x-p.x-aim.x*160/60)<1e-8);assert.ok(Math.abs(actual.y-p.y-aim.y*160/60)<1e-8);assert.deepEqual(arrow.velocity,{x:aim.x*160,y:aim.y*160});}
});

