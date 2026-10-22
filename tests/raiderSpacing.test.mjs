import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventure,attack,tick,adventureCanStand,weaponDamage} from '../.test-build/core/adventure.js';
import {project,STEP} from '../.test-build/core/game.js';
import {WEAPON_CATALOG,weaponShapeContains} from '../.test-build/core/weaponCatalog.js';
import {meleeFrame,sampleMeleeSweep,weaponTouchesBody} from '../.test-build/core/meleeContact.js';

// Isolated deterministic fixture, not an earned browser route. These positions and
// pointer-derived aim reproduce an observed native five-click close-overlap miss.
const OBSERVED={
 hero:{x:226.19842407970074,y:215.37196753574068},
 raider:{x:227.42508023961346,y:198.7818175746037},
 aim:{x:.9138206100512252,y:-.406118077220907},
};
const vector=(a,b)=>{const p=project(a),q=project(b);return{x:q.x-p.x,y:q.y-p.y};};
const length=p=>Math.hypot(p.x,p.y);
function unobstructed(s,a,b){
 for(let i=0;i<=20;i++)assert.ok(adventureCanStand(s,{x:a.x+(b.x-a.x)*i/20,y:a.y+(b.y-a.y)*i/20}),'fixture path stays on unobstructed station floor');
}
function finishSwing(s){
 assert.equal(attack(s),true);const phases=new Set([s.attack.phase]);
 for(let frame=0;s.attack.phase!=='idle';frame++){
  assert.ok(frame<120,'bounded actual attack/tick completes');tick(s,{x:0,y:0},STEP);phases.add(s.attack.phase);
 }
 assert.deepEqual([...phases],['windup','active','recovery','idle']);
}

test('observed close sword overlap misses; actual collision-checked retreat reaches one physical hit',()=>{
 const s=createAdventure();s.position={...OBSERVED.hero};s.aim={...OBSERVED.aim};
 const raider=s.enemies.find(e=>e.id==='raider');
 raider.position={...OBSERVED.raider};raider.home={...OBSERVED.raider};
 // Freeze only the isolated target's AI, so this test measures blade/body contact.
 raider.phase='stagger';raider.timer=3600;s.enemies=[raider];
 assert.equal(raider.hp,75);assert.equal(s.equipped,'sword');assert.equal(WEAPON_CATALOG.sword.range,75);assert.equal(weaponDamage(s),30);
 unobstructed(s,s.position,raider.position);
 const close=vector(s.position,raider.position),local={x:close.x*s.aim.x+close.y*s.aim.y,y:-close.x*s.aim.y+close.y*s.aim.x};
 assert.ok(Math.abs(length(close)-15.521810529448175)<1e-10);
 assert.ok(weaponShapeContains('sword',local),'a catalog envelope alone must not create an invisible hit');
 const sweep=sampleMeleeSweep({weapon:'sword',aim:s.aim,facing:'north-east',from:0,to:1});
 assert.equal(sweep.some(frame=>weaponTouchesBody(frame,close)),false,'close body does not intersect the registered painted-blade proxy');
 finishSwing(s);
 assert.equal(raider.hp,75);assert.deepEqual(s.attack.hit,[]);assert.deepEqual(s.attack.contacts,{});
 assert.equal(s.currency,0);assert.equal(s.progression.xp,0);

 const before={...s.position};let steps=0;
 while(length(vector(s.position,raider.position))<45){
  assert.ok(steps++<30,'reachable spacing needs only bounded ordinary movement');
  const d=vector(s.position,raider.position),old={...s.position};
  tick(s,{x:-d.x,y:-d.y},STEP);
  unobstructed(s,old,s.position);assert.ok(length(vector(old,s.position))<=150*STEP+1e-8,'retreat uses normal movement speed');
 }
 const spaced=vector(s.position,raider.position),distance=length(spaced);
 assert.ok(distance>=45&&distance<=55);assert.ok(length(vector(before,s.position))>=29);
 assert.deepEqual(raider.position,OBSERVED.raider,'the test repositions the player, not the target');
 unobstructed(s,s.position,raider.position);s.aim={x:spaced.x/distance,y:spaced.y/distance};
 finishSwing(s);
 assert.equal(raider.hp,45,'ordinary unupgraded sword hits exactly once for 30 damage');
 assert.deepEqual(s.attack.hit,['raider']);
 const progress=s.attack.contacts.raider;assert.ok(progress>=0&&progress<=1);
 assert.ok(weaponTouchesBody(meleeFrame('sword',s.attack.aim,s.attack.facing,progress),spaced),'damage records an actual shared-pose blade/body contact');
 for(let i=0;i<12;i++)tick(s,{x:0,y:0},STEP);
 assert.equal(raider.hp,45,'continued ticks cannot repeat the swing damage');
 assert.equal(s.currency,0);assert.equal(s.progression.xp,0,'a nonlethal isolated contact grants no reward');
});
