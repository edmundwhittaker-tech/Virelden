import test from 'node:test';
import assert from 'node:assert/strict';
import { STEP, SPAWN, RELIC, PILLARS, createState, tick, project, unproject, screenDirection, distance, blocked, inArc, decodeSave } from '../.test-build/core/game.js';
const idle = { x: 0, y: 0, aim: {x:600,y:300} };
function advance(s, seconds, input = idle) { for(let n=0;n<Math.ceil(seconds/STEP);n++) s=tick(s,input); return s; }
function arena() { const s=createState(); Object.assign(s.player,{x:300,y:300}); s.enemies=[]; return s; }

test('isometric projection is reversible',()=>{
  for(const p of [SPAWN,RELIC,...PILLARS,{x:0,y:0},{x:640,y:640}]) assert.ok(distance(p,unproject(project(p)))<1e-8);
});
test('WASD directions are relative to the screen',()=>{
  const origin=project({x:0,y:0}),right=project(screenDirection(1,0)),up=project(screenDirection(0,-1));
  assert.ok(right.x>origin.x); assert.ok(Math.abs(right.y-origin.y)<1e-8);
  assert.ok(up.y<origin.y); assert.ok(Math.abs(up.x-origin.x)<1e-8);
});
test('diagonal movement has no ground-speed boost',()=>{
  const a=arena(),b=arena(),start={x:300,y:300};
  advance(a,.25,{...idle,x:1}); advance(b,.25,{...idle,x:1,y:1});
  assert.ok(Math.abs(distance(a.player,start)-distance(b.player,start))<1e-8);
});
test('movement stops at the room boundary',()=>{
  const s=arena(); s.player.x=18; advance(s,1,{...idle,x:-1});
  assert.ok(s.player.x>=13); assert.equal(blocked(s.player),false);
});
test('a fast roll cannot tunnel through a pillar',()=>{
  let s=arena(); Object.assign(s.player,{x:100,y:170});
  s=tick(s,{...idle,x:1,roll:true}); advance(s,.4,{...idle,x:1});
  assert.ok(s.player.x<=127); assert.equal(blocked(s.player),false); assert.equal(s.stats.rolls,1);
});
test('one swing applies damage exactly once per target',()=>{
  let s=arena(); const e=createState().enemies[0]; Object.assign(e,{x:350,y:300}); s.enemies=[e];
  s=tick(s,{...idle,attack:true}); advance(s,.4); assert.equal(e.hp,60); assert.equal(s.stats.hits,1);
});
test('attacks do not hit behind the player or through a pillar',()=>{
  assert.equal(inArc({x:300,y:300},{x:260,y:300},0,88),false);
  assert.equal(inArc({x:120,y:170},{x:220,y:170},0,120),false);
});
test('attack cooldown prevents input-spam damage',()=>{
  const s=arena(); advance(s,.2,{...idle,attack:true}); assert.equal(s.stats.attacks,1);
});
test('insufficient stamina prevents a roll and an attack',()=>{
  const s=arena(); s.player.stamina=10; tick(s,{...idle,attack:true,roll:true});
  assert.equal(s.stats.attacks,0); assert.equal(s.stats.rolls,0); assert.ok(s.player.stamina>=0);
});
test('enemy telegraphs before dealing damage, once per attack',()=>{
  const s=arena(); const e=createState().enemies[0]; Object.assign(e,{x:350,y:300}); s.enemies=[e];
  advance(s,.4); assert.equal(e.mode,'windup'); assert.equal(s.player.hp,100);
  advance(s,.5); assert.equal(e.mode,'recover'); assert.equal(s.player.hp,80);
  advance(s,.3); assert.equal(s.player.hp,80);
});
test('early roll frames avoid enemy damage',()=>{
  const s=arena(); const e=createState().enemies[0]; Object.assign(e,{x:350,y:300,mode:'windup',timer:.01,angle:Math.PI}); s.enemies=[e];
  s.player.roll=.25; tick(s,idle); assert.equal(s.player.hp,100);
});
test('relic pickup requires proximity and improves sword damage',()=>{
  const s=arena(); tick(s,{...idle,interact:true}); assert.equal(s.relic,false);
  Object.assign(s.player,RELIC); tick(s,{...idle,interact:true}); assert.equal(s.relic,true);
  Object.assign(s.player,{x:300,y:300}); const e=createState().enemies[0]; Object.assign(e,{x:350,y:300}); s.enemies=[e];
  tick(s,{...idle,attack:true}); advance(s,.35); assert.equal(e.hp,45);
});
test('checkpoint rest heals and retains the discovered relic',()=>{
  let s=createState(true); s.player.hp=20;
  s=tick(s,{...idle,interact:true}); assert.equal(s.player.hp,100); assert.equal(s.relic,true); assert.equal(s.enemies[0].hp,90);
});
test('death stops simulation until an explicit restart',()=>{
  const s=arena(); s.player.hp=0; const x=s.player.x; tick(s,{...idle,x:1}); assert.equal(s.player.x,x); assert.equal(s.time,0);
});
test('save parsing safely rejects corrupt and incompatible data',()=>{
  for(const value of [null,'','{','null','[]','{"version":2,"relic":true}','{"version":1,"relic":"true"}']) assert.equal(decodeSave(value),false);
  assert.equal(decodeSave('{"version":1,"relic":true}'),true);
});
