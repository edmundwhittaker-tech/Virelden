import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyVisualState,sampleEnemyVisual,enemyVisualFrame,validEnemyVisualClips} from '../.test-build/core/enemyVisualPhase.js';
import {createAdventure,tick} from '../.test-build/core/adventure.js';
import {STEP} from '../.test-build/core/game.js';

// A supplied whole-character layout, used only as a bounded sampler contract.
// This test does not choose which design should replace any gameplay role.
const clip=(frames,durationsMs,loop=false)=>({frames,durationsMs,loop});
const clips={frameCount:24,idle:clip([0,1,2,3],[250,250,250,250],true),walk:clip([4,5,6,7,8,9,10,11],Array(8).fill(95),true),hurt:clip([18,19],[120,180]),death:clip([20,21,22,23],[160,180,180,200]),dead:clip([23],[1000]),phaseFrames:{windup:[12,13,14],active:[15],recovery:[16,17]}};
const timing={windupSeconds:.65,recoverySeconds:.85,contactSeconds:.18,deathSeconds:.72};
const enemy=()=>({hp:75,phase:'idle',timer:0,aim:{x:1,y:0}});
const sample=(state,e,time=0,extra={})=>sampleEnemyVisual(state,{identity:'station:raider',enemy:e,time,walking:false,timing,...extra});
const picture=(state,e,time=0,extra={})=>enemyVisualFrame(sample(state,e,time,extra),clips);

test('enemy visual clips reject empty, mismatched, nonfinite and out-of-sheet frames',()=>{
 assert.equal(validEnemyVisualClips(clips),true);
 for(const bad of [
  {...clips,frameCount:23},
  {...clips,idle:clip([],[],true)},
  {...clips,hurt:clip([18,19],[120])},
  {...clips,death:clip([20],[NaN])},
  {...clips,phaseFrames:{...clips.phaseFrames,active:[24]}},
  {...clips,phaseFrames:{...clips.phaseFrames,windup:[-1]}},
  {...clips,phaseFrames:{active:[15],windup:[12]}},
 ])assert.equal(validEnemyVisualClips(bad),false);
});

test('windup, immediate contact and recovery are normalized onto existing AI timers',()=>{
 for(const [windupSeconds,recoverySeconds]of [[.65,.85],[.8,.95],[.7,.85],[.95,.95]]){
  const state=createEnemyVisualState(),e=enemy(),t={...timing,windupSeconds,recoverySeconds};
  for(const [progress,expected]of [[0,12],[.34,13],[.67,14],[1,14]]){
   e.phase='windup';e.timer=windupSeconds*(1-progress);
   assert.equal(picture(state,e,1+progress,{timing:t}),expected);
  }
  e.phase='recovery';e.timer=recoverySeconds;
  assert.equal(picture(state,e,2,{timing:t}),15,'contact is selected on the damage edge, with no new windup');
  assert.equal(sample(state,e,2,{timing:t}).phase,'active');
  e.timer=recoverySeconds-.181;
  assert.equal(picture(state,e,2.181,{timing:t}),16);
  e.timer=0;
  assert.equal(picture(state,e,3,{timing:t}),17);
  e.phase='idle';e.timer=0;
  assert.equal(sample(state,e,3,{timing:t}).motion,'idle');
 }
});

test('real unchanged enemy AI damage transition selects the first contact picture',()=>{
 for(const kind of ['raider','captain']){
  const s=createAdventure();s.position={x:220,y:210};s.enemies=[s.enemies[0]];
  const e=s.enemies[0];e.kind=kind;e.aim={x:0,y:1};
  const state=createEnemyVisualState(),t={...timing,windupSeconds:kind==='captain'?.8:.65,recoverySeconds:kind==='captain'?.95:.85};
  const draw=()=>sampleEnemyVisual(state,{identity:`station:${e.id}`,enemy:e,time:s.time,walking:false,timing:t});
  draw();tick(s,{x:0,y:0},STEP);assert.equal(e.phase,'windup');assert.equal(draw().phase,'windup');
  const before=s.hp;let guard=0;
  while(e.phase==='windup'&&guard++<100){tick(s,{x:0,y:0},STEP);const visual=draw();if(e.phase==='windup')assert.notEqual(visual.phase,'active');}
  assert.equal(e.phase,'recovery');assert.ok(s.hp<before,'the original AI resolves actual damage at this edge');
  assert.equal(enemyVisualFrame(draw(),clips),15);
  assert.equal(e.timer,t.recoverySeconds,'the renderer did not insert extra active time into the AI');
 }
});

test('delayed first draws use current recovery position, not a replayed contact',()=>{
 const e={...enemy(),phase:'recovery',timer:.1},state=createEnemyVisualState();
 assert.equal(picture(state,e,10),17);
 for(let n=0;n<5;n++)assert.equal(picture(state,e,10),17);
});

test('all eight aim orientations preserve phase, mirrored foot-side choice and bounded frames',()=>{
 for(const [aim,view,flipped]of [
  [{x:1,y:0},'front',false],[{x:-1,y:0},'front',true],
  [{x:1,y:1},'front',false],[{x:-1,y:1},'front',true],
  [{x:1,y:-1},'rear',false],[{x:-1,y:-1},'rear',true],
  [{x:0,y:1},'front',true],[{x:0,y:-1},'rear',true],
 ]){
  const e={...enemy(),aim},state=createEnemyVisualState();state.identity='station:raider';state.hp=e.hp;state.facing='west';
  for(const [phase,timer,expected]of [['idle',0,0],['windup',.65,12],['recovery',.85,15],['recovery',0,17],['stagger',.22,18]]){
   Object.assign(e,{phase,timer});const visual=sample(state,e,0);
   assert.equal(visual.view,view);assert.equal(visual.flipped,flipped);assert.equal(enemyVisualFrame(visual,clips),expected);
   assert.ok(enemyVisualFrame(visual,clips)>=0&&enemyVisualFrame(visual,clips)<24);
  }
 }
});

test('interrupted and repeated attacks select hurt; recovery cannot override current stagger',()=>{
 const state=createEnemyVisualState(),e={...enemy(),phase:'windup',timer:.2};sample(state,e,1);
 Object.assign(e,{hp:45,phase:'stagger',timer:.22});assert.equal(picture(state,e,1.1),18);
 e.timer=.05;assert.equal(picture(state,e,1.27),19);
 Object.assign(e,{hp:15,timer:.22});assert.equal(picture(state,e,1.28),18,'same-phase repeated hit restarts hurt');
 e.phase='idle';e.timer=0;assert.equal(sample(state,e,1.5).motion,'idle');
 e.phase='windup';e.timer=.65;assert.equal(picture(state,e,1.6),12,'a later fresh strike starts at windup, not stale contact');
});

test('death starts once at observed HP crossing and holds final complete-body frame',()=>{
 const state=createEnemyVisualState(),e=enemy();sample(state,e,1);
 Object.assign(e,{hp:0,phase:'stagger',timer:.2});
 assert.equal(picture(state,e,2),20);assert.equal(picture(state,e,2),20);
 assert.equal(picture(state,e,2.161),21);assert.equal(picture(state,e,2.341),22);
 assert.equal(picture(state,e,2.521),23);assert.equal(sample(state,e,2.721).motion,'dead');
 assert.equal(picture(state,e,100),23);assert.equal(picture(state,e,100),23);
 const saved=createEnemyVisualState();assert.equal(sample(saved,e,100).motion,'dead');assert.equal(picture(saved,e,100),23);
 e.hp=75;e.phase='idle';e.timer=0;assert.equal(sample(state,e,100).motion,'idle','retry/revival cannot retain corpse state');
});

test('simulation pause, rewind and reused area pools do not drift or retain old animation state',()=>{
 const state=createEnemyVisualState(),e=enemy();
 const before=structuredClone(e),walk=sample(state,e,.285,{walking:true});assert.equal(enemyVisualFrame(walk,clips),7);
 for(let n=0;n<20;n++)assert.deepEqual(sample(state,e,.285,{walking:true}),walk);
 assert.deepEqual(e,before,'visual samples never mutate gameplay');
 e.hp=0;sample(state,e,1);assert.equal(picture(state,e,2),23);
 assert.equal(sample(state,e,2,{identity:'annex:other'}).motion,'dead','new saved corpse does not replay death');
 e.hp=75;e.phase='idle';assert.equal(sample(state,e,0,{identity:'station:raider'}).motion,'idle');
 assert.equal(picture(state,e,0),0);
});
