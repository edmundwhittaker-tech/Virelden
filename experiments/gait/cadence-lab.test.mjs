import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildCadenceTrace, updateCadenceLab } from '../../.gait-build/experiments/gait/cadenceLab.js';
import { buildTrace } from '../../.gait-build/experiments/gait/routes.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rel=(p,h)=>({x:p.x-h.x,y:p.y-h.y});
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const output='review/cadence-lab';
mkdirSync(output,{recursive:true});
const report={kind:'CPU-only bounded local experiment; NOT native render or visual acceptance',node:process.version,
 baselineCommit:'6583b2fcd0487e915d1338ebe90b06b60fbbfd6a',baselineTree:'d0704ee0dd0c03ce32de42776939ec7041657efc',
 interval:.15,upperBody:'Exact frozen baseline reference; phase/body/socket data unchanged',results:[]};

function metrics(frames,route,hz,variant){
 let drift=0,flight=0,walk=0,overlap=0,turnFlight=0,turnDuration=0,maxKnee=0,maxKneeRelative=0,maxAnkle=0,boneError=0;
 let minThigh=Infinity,minShin=Infinity,minAnkle=Infinity,minSwitchReach=Infinity,switches=0,epochErrors=0;
 let upperBodyDifferences=0,pausedDifferences=0,maxEnabledLateralReach=0,maxAnklePoseError=0;
 const contacts=[],schedule=[];
 for(let i=0;i<frames.length;i++){
  const f=frames[i],p=f.pose??f.newPose,g=f.gait,old=frames[i-1],dt=old?f.time-old.time:0;
  for(const side of ['near','far']){
   const thigh=p.parts['thigh_'+side],shin=p.parts['greave_'+side];
   minThigh=Math.min(minThigh,thigh.end.y-thigh.start.y);minShin=Math.min(minShin,shin.end.y-shin.start.y);minAnkle=Math.min(minAnkle,shin.end.y-thigh.start.y);
   boneError=Math.max(boneError,Math.abs(thigh.length-18),Math.abs(shin.length-20));
   maxAnklePoseError=Math.max(maxAnklePoseError,distance({x:p.feet[side].x+f.position.x,y:p.feet[side].y+f.position.y},g.feet[side].display));
   if(f.state?.enabled)maxEnabledLateralReach=Math.max(maxEnabledLateralReach,Math.abs(shin.end.x-thigh.start.x));
  }
  if(f.reference){
   for(const[id,part]of Object.entries(p.parts))if(!/^(thigh|greave|foot)/.test(id)&&JSON.stringify(part)!==JSON.stringify(f.reference.parts[id]))upperBodyDifferences++;
   for(const key of ['hand','supportHand','weaponAngle','weaponLength','actor'])if(JSON.stringify(p[key])!==JSON.stringify(f.reference[key]))upperBodyDifferences++;
   const before=JSON.stringify(f.state),paused=updateCadenceLab(f.state,f.source,f.input,f.position,variant);
   if(paused!==f.state||JSON.stringify(paused)!==before||JSON.stringify(f.state)!==before)pausedDifferences++;
  }
  if(!old)continue;
  if(f.input.motion==='walk'&&old.input.motion==='walk'){
   walk+=dt;if(g.posture.flight)flight+=dt;
   if(g.contacts.every(c=>!!c.transfer))overlap+=dt;
   if(route==='turns'&&f.time>=1.7&&f.time<2.1){turnDuration+=dt;if(g.posture.flight)turnFlight+=dt;}
  }
  if(g.state.steps!==old.gait.state.steps)schedule.push({time:f.time,steps:g.state.steps});
  for(const id of[0,1]){
   const a=old.gait.contacts[id],b=g.contacts[id];
   if(a.planted&&b.planted&&a.epoch===b.epoch)drift=Math.max(drift,distance(a.ground,b.ground));
   if(b.epoch!==a.epoch){contacts.push({time:f.time,id,epoch:b.epoch,planted:b.planted});if(!b.planted)epochErrors++;}
   if(b.planted&&b.lift!==0)epochErrors++;
   maxKnee=Math.max(maxKnee,distance(a.knee,b.knee));maxKneeRelative=Math.max(maxKneeRelative,distance(rel(a.knee,a.hip),rel(b.knee,b.hip)));maxAnkle=Math.max(maxAnkle,distance(a.world,b.world));
   if(a.bend!==b.bend){switches++;minSwitchReach=Math.min(minSwitchReach,distance(a.world,a.hip),distance(b.world,b.hip));if(b.planted)epochErrors++;}
  }
 }
 const steady=contacts.filter(c=>c.time>.65&&c.time<2.2),times=steady.map(c=>c.time),gaps=times.slice(1).map((t,i)=>t-times[i]);
 return {route,hz,variant,flightFraction:flight/walk,maxAnchorDriftPx:drift,maxBoneError:boneError,minThigh,minShin,minAnkle,
  maxPhysicalKneeStepPx:maxKnee,maxHipRelativeKneeStepPx:maxKneeRelative,maxPhysicalAnkleStepPx:maxAnkle,
  branchSwitches:switches,minAdjacentBranchSwitchReach:Number.isFinite(minSwitchReach)?minSwitchReach:null,
  epochErrors,upperBodyDifferences,pausedDifferences,maxEnabledLateralReach,maxAnklePoseError,simultaneousTransferSeconds:overlap,
  reversalFlightFraction:turnDuration?turnFlight/turnDuration:null,actualSteadyLandingIntervals:gaps,
  actualContacts:contacts,scheduledLandings:schedule,finalSupport:frames.at(-1).gait.contactSupport};
}

for(const hz of[30,60,120])for(const route of['east','northeast','southeast','turns']){
 const baseline=buildTrace(route,hz),base=metrics(baseline,route,hz,'baseline');report.results.push(base);
 for(const floor of[28,24])test(`cadence${floor} ${route} ${hz}Hz invariants`,()=>{
  const frames=buildCadenceTrace(route,hz,floor),m=metrics(frames,route,hz,floor);report.results.push(m);
  assert.equal(m.maxAnchorDriftPx,0);assert.ok(m.maxBoneError<1e-8);assert.ok(m.minThigh>=10-1e-6);assert.ok(m.minShin>=11-1e-6);assert.ok(m.minAnkle>=floor-1e-6);
  assert.equal(m.epochErrors,0);assert.equal(m.upperBodyDifferences,0);assert.equal(m.pausedDifferences,0);
  assert.ok(m.maxEnabledLateralReach<=12+1e-6);assert.ok(m.maxAnklePoseError<1e-6);
  if(m.branchSwitches)assert.ok(m.minAdjacentBranchSwitchReach>37.95);
  assert.equal(m.finalSupport,'both');
  if(route==='northeast'||route==='southeast'){
   for(const f of frames)if(f.state.enabled&&f.input.motion==='walk'&&f.gait.state.swing&&!f.gait.state.swing.stopping)near(f.gait.state.swing.duration,.15);
   assert.ok(m.actualSteadyLandingIntervals.length>=8);
   for(const gap of m.actualSteadyLandingIntervals)near(gap,.15,hz===30?1/30+1e-8:1e-8);
  }
  if(route==='east')for(let i=0;i<frames.length;i++)assert.deepEqual(frames[i].gait,baseline[i].gait);
  // Preserve raw physical-foot/branch trajectories for an independent audit.
  if(hz===60)writeFileSync(`${output}/${route}-${floor}-trace.json`,JSON.stringify(frames.map(f=>({time:f.time,position:f.position,input:f.input,contacts:f.gait.contacts,contactSupport:f.gait.contactSupport,steps:f.gait.state.steps,swing:f.gait.state.swing,posture:f.gait.posture})),null,2));
 });
}
for(const floor of[28,24])test(`cadence${floor} advancing frozen reversal states is immutable`,()=>{
 const frames=buildCadenceTrace('turns',60,floor),seen=new WeakSet();
 const freeze=o=>{if(o&&typeof o==='object'&&!seen.has(o)){seen.add(o);Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
 for(let i=1;i<frames.length;i++){
  const a=frames[i-1],b=frames[i],before=JSON.stringify(a.state);freeze(a.state);freeze(b.source);
  const result=updateCadenceLab(a.state,b.source,b.input,b.position,floor);
  assert.equal(JSON.stringify(a.state),before);assert.deepEqual(result,b.state);
 }
});
test.after(()=>writeFileSync(`${output}/metrics.json`,JSON.stringify(report,null,2)));
