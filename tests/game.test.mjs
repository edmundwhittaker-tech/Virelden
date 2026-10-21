import test from 'node:test';
import assert from 'node:assert/strict';
import {move,project,SPAWN,STEP,canStand,PILLARS,RADIUS,SIZE,SPEED} from '../.test-build/core/game.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('screen-relative cardinal and diagonal movement use the same speed',()=>{
  for(const input of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:1,y:1}]){
    const a=project(SPAWN), b=project(move(SPAWN,input,STEP));
    assert.ok(Math.abs(distance(a,b)-SPEED*STEP)<1e-8);
    assert.equal(Math.sign(b.x-a.x),Math.sign(input.x));
    assert.equal(Math.sign(b.y-a.y),Math.sign(input.y));
  }
});
test('movement stays inside the courtyard under sustained input',()=>{
  for(const input of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:1,y:1}]){
    let p={...SPAWN};
    for(let i=0;i<2000;i++)p=move(p,input,STEP);
    assert.ok(canStand(p));assert.ok(p.x>=RADIUS && p.x<=SIZE-RADIUS);
  }
});
test('pillars block their footprints even during a delayed frame',()=>{
  const o=PILLARS[0];
  let p={x:o.x-80,y:o.y};
  for(let i=0;i<100;i++)p=move(p,{x:1,y:.5},.1);
  assert.ok(canStand(p));
  assert.ok(p.x<=o.x-o.radius-RADIUS+1e-8);
});
test('stationary input does not mutate the original position',()=>{
  const p={...SPAWN};assert.deepEqual(move(p,{x:0,y:0},STEP),SPAWN);
  move(p,{x:1,y:1},STEP);assert.deepEqual(p,SPAWN);
});
test('fixed simulation produces the same movement for an equal duration',()=>{
  let a={...SPAWN},b={...SPAWN};
  for(let i=0;i<30;i++)a=move(a,{x:1,y:0},STEP);
  for(let i=0;i<15;i++)b=move(b,{x:1,y:0},STEP*2);
  assert.ok(distance(a,b)<1e-8);
});

