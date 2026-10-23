import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventure,activateArea,adventureCanStand,roll,attack,tick} from '../.test-build/core/adventure.js';
import {project,STEP} from '../.test-build/core/game.js';
import {visibleNativeCombatKeys,nativeCombatDestination,NATIVE_ROLL_TRAVEL_PIXELS} from './browser/native-combat-steering.mjs';
const OBSERVED={hero:{x:519.7695931084739,y:425.1012649549784},guard:{x:550.8136156481464,y:410.785135837244},lostSight:{x:385.39459310847377,y:316.22626495497764}};
const input=keys=>({x:Number(keys.includes('KeyD'))-Number(keys.includes('KeyA')),y:Number(keys.includes('KeyS'))-Number(keys.includes('KeyW'))});
const distance=(a,b)=>Math.hypot(project(b).x-project(a).x,project(b).y-project(a).y);
function fixture(){const s=createAdventure('wayfarer');activateArea(s,'record-annex');s.position={...OBSERVED.hero};s.arrivalGrace=0;s.enemies=[];return s;}
function clear(s,a,b){const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/3));for(let i=0;i<=n;i++)if(!adventureCanStand(s,{x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;return true;}
test('observed annex45px roll preflight misses the real138px obstruction; safe native roll retains physical path and sight',()=>{
 const s=fixture(),can=(a,b)=>clear(s,a,b),before={...s.position};
 assert.ok(can(before,OBSERVED.guard));assert.equal(can(OBSERVED.lostSight,OBSERVED.guard),false);
 assert.ok(can(before,nativeCombatDestination(before,['KeyA'],45)),'old45px preflight appeared clear');
 assert.equal(can(before,nativeCombatDestination(before,['KeyA'],NATIVE_ROLL_TRAVEL_PIXELS)),false,'complete real roll is not clear');
 const keys=visibleNativeCombatKeys({hero:before,target:OBSERVED.guard,preferred:[['KeyS'],['KeyW'],['KeyA']],pixels:NATIVE_ROLL_TRAVEL_PIXELS,clearSegment:can});
 assert.deepEqual(keys,['KeyA','KeyW']);assert.equal(roll(s,input(keys)),true);let ticks=0;
 while(s.rollTimer>0){assert.ok(ticks++<30);tick(s,{x:0,y:0},STEP);assert.ok(can(s.position,OBSERVED.guard),'every actual fixed-step roll position keeps target sight');}
 assert.ok(Math.abs(distance(before,s.position)-138)<1e-8);assert.equal(ticks,23);
 assert.ok(distance(s.position,OBSERVED.guard)<220,'physical dodge does not make a living target disappear from the driver band');
});
test('observed coffer engagement can retreat with native movement then hit the actual headless body without changing contact or guard stats',()=>{
 const s=fixture(),can=(a,b)=>clear(s,a,b);let ticks=0;
 while(distance(s.position,OBSERVED.guard)<70){
  const keys=visibleNativeCombatKeys({hero:s.position,target:OBSERVED.guard,preferred:[['KeyA']],pixels:20,retreat:true,clearSegment:can});assert.ok(keys);
  tick(s,input(keys),STEP);assert.ok(can(s.position,OBSERVED.guard));assert.ok(ticks++<60);
 }
 assert.ok(distance(s.position,OBSERVED.guard)<=90);
 const guard={id:'stair-guard',kind:'raider',position:{...OBSERVED.guard},home:{x:650,y:310},hp:145,maxHp:145,phase:'stagger',timer:3600,reward:45};
 // Isolated contact target only; no browser progress/HP is seeded by this rule test.
 s.enemies=[guard];const a=project(s.position),b=project(guard.position),n=Math.hypot(b.x-a.x,b.y-a.y);s.aim={x:(b.x-a.x)/n,y:(b.y-a.y)/n};
 assert.equal(attack(s),true);for(let i=0;s.attack.phase!=='idle';i++){assert.ok(i<120);tick(s,{x:0,y:0},STEP);}
 assert.equal(guard.maxHp,145);assert.equal(guard.hp,120);assert.deepEqual(s.attack.hit,['stair-guard']);assert.ok(s.attack.contacts['stair-guard']>=0);assert.equal(s.progression.xp,0);
});
