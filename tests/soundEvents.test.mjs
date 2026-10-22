/** Seeded rule fixtures: not browser lifecycle or acoustic acceptance. */
import test from 'node:test';import assert from 'node:assert/strict';
import {SoundCue,SoundEventRecorder,WEAPON_CONTACT_CUES,stepSoundEligible,recordPlayerStep} from '../.test-build/core/soundEvents.js';
import {createAdventure,attack,tick,interact,activateArea,adventureCanStand,LOCATIONS,serialize} from '../.test-build/core/adventure.js';
import {prepareCampaignSave} from '../.test-build/core/campaignSave.js';
import {STATION_GATE} from '../.test-build/core/level.js';
import {EXPEDITIONS} from '../.test-build/core/expeditionCatalog.js';
import {WEAPON_IDS,WEAPON_CATALOG} from '../.test-build/core/weaponCatalog.js';
const still={x:0,y:0};
const drain=r=>{const events=[];r.drain(c=>events.push(c));return events;};
const wait=(s,n,r)=>{for(let i=0;i<Math.ceil(n*60);i++)tick(s,still,1/60,r);};
const groundFor=(p,t)=>({x:p.x+t.x/1.6+t.y/.8,y:p.y+t.y/.8-t.x/1.6});
function arena(id,hit=true,hp=1000){
 const s=createAdventure(),range=WEAPON_CATALOG[id].range+(hit?0:80);s.gatePhase='open';
 let found=false;outer:for(let y=-1800;y<600;y+=40)for(let x=80;x<580;x+=40){
  const p={x,y},q=groundFor(p,{x:range,y:0}),count=Math.ceil(Math.hypot(q.x-x,q.y-y)/6);
  if(!adventureCanStand(s,p)||!adventureCanStand(s,q))continue;
  for(let i=1;i<count;i++)if(!adventureCanStand(s,{x:x+(q.x-x)*i/count,y:y+(q.y-y)*i/count}))continue outer;
  s.position=p;const e=s.enemies[0];e.position=q;e.home={...q};e.hp=hp;e.maxHp=Math.max(hp,75);e.phase='stagger';e.timer=100;s.enemies=[e];found=true;break outer;
 }
 assert.ok(found);s.equipped=id;s.owned=[id];s.aim={x:1,y:0};return s;
}
function finishSwing(s,r){assert.ok(attack(s));wait(s,2,r);assert.equal(s.attack.phase,'idle');}

test('fixed primitive recorder drops overflow, preserves FIFO and clears without replay',()=>{
 const r=new SoundEventRecorder(2);r.record(SoundCue.Step);r.record(SoundCue.BowRelease);r.record(SoundCue.Lever);
 assert.equal(r.size,2);assert.equal(r.dropped,1);assert.deepEqual(drain(r),[SoundCue.Step,SoundCue.BowRelease]);assert.equal(r.size,0);
 r.record(SoundCue.GateOpen);r.clear();r.clear();assert.deepEqual(drain(r),[]);assert.equal(r.dropped,1);
 assert.equal(new SoundEventRecorder(999999).capacity,128);assert.equal(new SoundEventRecorder(NaN).capacity,32);
 r.record(-1);r.record(0);r.record(999);assert.equal(r.size,0);
 r.record(SoundCue.Step);r.drain(()=>{throw Error('presentation failure');});assert.equal(r.size,0);
 r.record(SoundCue.Step);let calls=0;r.drain(()=>{calls++;r.record(SoundCue.Lever);});assert.equal(calls,1);assert.deepEqual(drain(r),[SoundCue.Lever]);
 r.record(SoundCue.Step);r.record(SoundCue.Lever);r.drain(()=>r.clear());assert.equal(r.size,0);assert.deepEqual(drain(r),[]);
});
test('all six weapons cue exactly one physical HP-reducing contact, not swings or proximity misses',()=>{
 for(const id of WEAPON_IDS){const hit=arena(id),r=new SoundEventRecorder();assert.ok(attack(hit));assert.equal(r.size,0);wait(hit,2,r);
  assert.ok(hit.enemies[0].hp<1000);assert.deepEqual(drain(r),[WEAPON_CONTACT_CUES[id]],id);
  // A new successful swing is a new contact; active samples in the old swing were silent.
  hit.stamina=hit.maxStamina;finishSwing(hit,r);assert.deepEqual(drain(r),[WEAPON_CONTACT_CUES[id]],id+' repeat attack');
  const miss=arena(id,false);finishSwing(miss,r);assert.equal(miss.enemies[0].hp,1000);assert.deepEqual(drain(r),[],id+' miss');
  const dead=arena(id,true,1);finishSwing(dead,r);assert.equal(dead.enemies[0].hp,0);assert.deepEqual(drain(r),[WEAPON_CONTACT_CUES[id]],id+' fatal contact');
  dead.stamina=dead.maxStamina;finishSwing(dead,r);assert.deepEqual(drain(r),[],id+' already dead');
 }
 const s=arena('sword');s.hp=0;const r=new SoundEventRecorder();assert.equal(attack(s),false);wait(s,2,r);assert.deepEqual(drain(r),[]);
});
test('bow release is emitted at actual projectile insertion, never inferred from projectile count or lifetime',()=>{
 const s=createAdventure(),r=new SoundEventRecorder();s.position={x:220,y:180};const bow=s.enemies.find(e=>e.kind==='watcher');s.enemies=[bow];bow.position={x:220,y:160};bow.home={...bow.position};bow.phase='windup';bow.timer=.08;bow.aim={x:0,y:1};
 tick(s,still,1/60,r);assert.deepEqual(drain(r),[]);wait(s,.1,r);assert.deepEqual(drain(r),[SoundCue.BowRelease]);
 s.projectiles=[];tick(s,still,1/60,r);assert.deepEqual(drain(r),[],'removing a projectile is not a release');
 s.projectiles=[{position:{...s.position},velocity:{x:0,y:0},life:.001}];tick(s,still,1/60,r);assert.deepEqual(drain(r),[],'expiry is not a release');
 // Both expedition gates suppress the actual spawn (sanctuary or out of range).
 for(const id of ['cistern-viaduct','record-annex']){const a=createAdventure();activateArea(a,id);const e=a.enemies.find(e=>e.kind==='watcher');a.enemies=[e];e.phase='windup';e.timer=0;wait(a,.1,r);assert.deepEqual(drain(r),[]);assert.equal(a.projectiles.length,0);a.arrivalGrace=0;a.position={x:200,y:450};e.position={x:800,y:450};e.phase='windup';e.timer=0;tick(a,still,1/60,r);assert.deepEqual(drain(r),[]);}
});
test('station gate cues only its three real transitions, repeated E and finished/dead states remain silent',()=>{
 const s=createAdventure(),r=new SoundEventRecorder();s.enemies=[];s.position={...STATION_GATE.lever};assert.ok(interact(s,r));assert.deepEqual(drain(r),[SoundCue.Lever]);
 assert.equal(interact(s,r),false);assert.deepEqual(drain(r),[]);wait(s,STATION_GATE.pullSeconds+.1,r);assert.equal(s.gatePhase,'opening');assert.deepEqual(drain(r),[SoundCue.GateOpening]);
 assert.equal(interact(s,r),false);wait(s,STATION_GATE.openSeconds+.1,r);assert.equal(s.gatePhase,'open');assert.deepEqual(drain(r),[SoundCue.GateOpen]);
 wait(s,1,r);assert.equal(interact(s,r),false);assert.deepEqual(drain(r),[]);
 const dead=createAdventure();dead.hp=0;dead.position={...STATION_GATE.stance};assert.equal(interact(dead,r),false);wait(dead,10,r);assert.deepEqual(drain(r),[]);
});
test('ordinary shortcut only cues false→true; each expedition lever/opening/completion cues once',()=>{
 const s=createAdventure(),r=new SoundEventRecorder();s.enemies=[];s.position={...LOCATIONS.lever};assert.ok(interact(s,r));assert.deepEqual(drain(r),[SoundCue.ShortcutOpen]);assert.ok(interact(s,r));assert.deepEqual(drain(r),[]);
 for(const id of ['cistern-viaduct','record-annex']){const a=createAdventure();activateArea(a,id);const def=EXPEDITIONS[id].shortcuts[0];for(const e of a.enemies)e.hp=0;a.position={...def.stance};assert.ok(interact(a,r));assert.deepEqual(drain(r),[SoundCue.Lever]);assert.equal(interact(a,r),false);assert.deepEqual(drain(r),[]);
  wait(a,.9,r);assert.equal(a.shortcutAnimation.phase,'opening');assert.deepEqual(drain(r),[SoundCue.GateOpening]);
  assert.equal(interact(a,r),false);wait(a,def.animationSeconds+.1,r);assert.ok(a.shortcut);assert.equal(a.shortcutAnimation,null);assert.deepEqual(drain(r),[SoundCue.ShortcutOpen]);
  assert.equal(interact(a,r),false);wait(a,1,r);assert.deepEqual(drain(r),[]);
 }
});
function stepCase(change=()=>{},beforeChange=()=>{}){const s=createAdventure(),r=new SoundEventRecorder();s.time=.31;beforeChange(s);const before=[s.time,s.position.x,s.position.y,stepSoundEligible(s)];s.time=.32;s.position.x+=1;change(s);recordPlayerStep(s,...before,r);return drain(r);}
test('footsteps match support boundary and actual eligible displacement, suppressing idle/blocked/roll/attack/interaction/death',()=>{
 assert.deepEqual(stepCase(),[SoundCue.Step]);
 for(const change of [s=>s.position.x--,s=>s.time=.311,s=>s.time=.30,s=>s.hp=0,s=>s.rollTimer=.1,s=>s.attack.phase='active',s=>s.gatePhase='pulling',s=>{s.areaId='cistern-viaduct';s.shortcutAnimation={phase:'pulling'};}])assert.deepEqual(stepCase(change),[]);
 for(const before of [s=>s.hp=0,s=>s.rollTimer=.1,s=>s.attack.phase='recovery',s=>s.gatePhase='pulling'])assert.deepEqual(stepCase(s=>{s.hp=100;s.rollTimer=0;s.attack.phase='idle';s.gatePhase='closed';},before),[],'transition out of excluded motion is not a step');
 const s=createAdventure();recordPlayerStep(s,0,0,0,true); // no recorder is a no-op
});
test('recorder absent, draining and overflowing retain exact deterministic full state and durable save bytes',()=>{
 const plain=createAdventure(),observed=structuredClone(plain),overflowed=structuredClone(plain),r=new SoundEventRecorder(),full=new SoundEventRecorder(1);
 const states=[plain,observed,overflowed],recorders=[undefined,r,full];
 const same=()=>{assert.deepEqual(observed,plain);assert.deepEqual(overflowed,plain);assert.equal(serialize(observed),serialize(plain));const raw=prepareCampaignSave(plain);assert.ok(raw,'durable state remains valid');assert.equal(prepareCampaignSave(observed),raw);assert.equal(prepareCampaignSave(overflowed),raw);assert.deepEqual(observed,plain);};
 for(const state of states)for(const e of state.enemies){e.phase='stagger';e.timer=1000;}
 for(let i=0;i<240;i++){for(let j=0;j<3;j++){const s=states[j],before=[s.time,s.position.x,s.position.y,stepSoundEligible(s)];if(i===12||i===150)attack(s);tick(s,{x:i<100?1:0,y:i>100?-1:0},1/60,recorders[j]);recordPlayerStep(s,...before,recorders[j]);}r.clear();same();}
 for(let j=0;j<3;j++){states[j].position={...STATION_GATE.lever};interact(states[j],recorders[j]);}
 for(let i=0;i<400;i++)for(let j=0;j<3;j++)tick(states[j],still,1/60,recorders[j]);same();
 for(let j=0;j<3;j++){states[j].position={...LOCATIONS.lever};interact(states[j],recorders[j]);interact(states[j],recorders[j]);}same();assert.ok(full.dropped>0);
 assert.equal(Object.keys(plain).some(k=>/sound|audio|event/i.test(k)),false);assert.doesNotMatch(prepareCampaignSave(plain),/sound|audio|event/i);
});

test('actual fatal contact and bow-spawn simulation remain state/save identical with and without observation',()=>{
 const cases=[arena('sword',true,1),createAdventure()];
 cases[0].gatePhase='closed';cases[0].gateProgress=0;
 const bowState=cases[1],bow=bowState.enemies.find(e=>e.kind==='watcher');bowState.position={x:220,y:180};bowState.enemies=[bow];bow.position={x:220,y:160};bow.home={...bow.position};bow.phase='windup';bow.timer=.08;bow.aim={x:0,y:1};
 for(let index=0;index<cases.length;index++){const a=cases[index],b=structuredClone(a),r=new SoundEventRecorder();if(index===0){assert.ok(attack(a));assert.ok(attack(b));}
  for(let i=0;i<120;i++){tick(a,still,1/60);tick(b,still,1/60,r);assert.deepEqual(b,a);}
  const events=drain(r);assert.ok(events.includes(index===0?SoundCue.SwordContact:SoundCue.BowRelease));
  const raw=prepareCampaignSave(a);assert.ok(raw);assert.equal(prepareCampaignSave(b),raw);assert.deepEqual(b,a);
 }
});
