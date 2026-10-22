import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTACK_RIG, attackPose, weaponMotion } from '../.test-build/core/knightRig.js';
test('attack poses change articulated body frames in all four supported diagonal facings',()=>{
 for(const facing of ['north-east','north-west','south-east','south-west']){
  const frames=['windup','active','recovery'].map(phase=>attackPose(facing,phase));
  assert.equal(new Set(frames).size,3);
  for(const frame of frames){const p=ATTACK_RIG.hands[frame];assert.ok(p.x>0&&p.x<256&&p.y>0&&p.y<250);}
 }
});
test('contact starts at active transition and weapon profiles differ without changing hand socket',()=>{
 const motions=['sword','spear','hammer'].map(weapon=>weaponMotion({weapon,phase:'active',timer:.12,aim:{x:1,y:0}},false));
 motions.forEach(m=>assert.equal(m.progress,0));
 assert.equal(new Set(motions.map(m=>m.angle)).size,3);
 assert.ok(motions[1].length>motions[0].length);
});
test('west weapon profiles mirror, north contact aims upward, phase values remain bounded',()=>{
 for(const weapon of ['sword','spear','hammer']){
  const c={weapon,phase:'active',timer:.12,aim:{x:1,y:0}};
  assert.equal(weaponMotion(c,true).angle,Math.PI-weaponMotion(c,false).angle);
  assert.equal(weaponMotion({...c,timer:-5},false).progress,1);
 }
 assert.ok(weaponMotion({weapon:'spear',phase:'active',timer:.12,aim:{x:1,y:-1}},false).angle<0);
});
