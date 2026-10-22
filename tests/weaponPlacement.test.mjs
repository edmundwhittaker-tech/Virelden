import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {placeWeaponArt} from '../.test-build/core/weaponPlacement.js';
import {evaluateRig} from '../.test-build/core/modularRig.js';
import {WEAPON_CATALOG,WEAPON_IDS} from '../.test-build/core/weaponCatalog.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../src/assets/weapons/manifest.json',import.meta.url))).weapons;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('six textured silhouettes are individually packaged with measured grip, extent and provenance',()=>{
 assert.deepEqual(Object.keys(manifest),WEAPON_IDS);for(const id of WEAPON_IDS){const a=manifest[id];assert.ok(fs.statSync(new URL(`../src/assets/weapons/${a.image}`,import.meta.url)).size>1000);assert.match(a.sourceSha256,/^[a-f0-9]{64}$/);assert.equal(a.sourceAngleRadians,0);close(a.axisTip[0]-a.grip[0],a.nominalLength*4);assert.ok(a.alphaBounds[0]>0&&a.alphaBounds[1]>0&&a.alphaBounds[2]<a.sourceSize[0]&&a.alphaBounds[3]<a.sourceSize[1]);}
});
test('real source grips and shaft tips consume the same runtime pose through all phases, views and facings',()=>{
 for(const id of WEAPON_IDS)for(const view of ['front','rear'])for(const flipped of [false,true])for(const phase of ['windup','active','recovery'])for(const progress of [0,.25,.5,.75,1])for(let direction=0;direction<8;direction++){
  const angle=direction*Math.PI/4,w=WEAPON_CATALOG[id],pose=evaluateRig({view,flipped,motion:'attack',time:0,phase,progress,weapon:id,weaponMotion:w.motion,weaponHands:w.hands,weaponReach:w.range,aim:{x:Math.cos(angle),y:Math.sin(angle)}}),p=placeWeaponArt(manifest[id],pose.hand,pose.weaponAngle,pose.weaponLength,flipped);assert.ok(p);close(p.x,pose.hand.x);close(p.y,pose.hand.y);close(p.tip.x-p.x,Math.cos(pose.weaponAngle)*pose.weaponLength);close(p.tip.y-p.y,Math.sin(pose.weaponAngle)*pose.weaponLength);assert.equal(Math.sign(p.scaleY),flipped?-1:1);
  if(id==='poleaxe'){close(p.support.x,pose.supportHand.x);close(p.support.y,pose.supportHand.y);}
 }
});
test('asymmetric painted shapes reflect laterally rather than merely rotating the shaft',()=>{
 const asset={sourceSize:[20,10],grip:[2,2],axisTip:[12,4]},a=placeWeaponArt(asset,{x:0,y:0},.3,10,false),b=placeWeaponArt(asset,{x:0,y:0},Math.PI-.3,10,true);close(a.tip.x,-b.tip.x);close(a.tip.y,b.tip.y);
});
test('invalid texture geometry cannot produce an equipment render candidate',()=>{
 const good=manifest.sword;for(const asset of [{...good,sourceSize:[0,0]},{...good,grip:[-1,0]},{...good,axisTip:[0,0]},{...good,sourceSize:[NaN,100]}])assert.equal(placeWeaponArt(asset,{x:0,y:0},0,53,false),null);for(const length of [0,-1,NaN,Infinity])assert.equal(placeWeaponArt(good,{x:0,y:0},0,length,false),null);
});
