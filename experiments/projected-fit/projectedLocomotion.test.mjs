import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocomotion,advanceLocomotion,locomotionPose,projectModel,solveLeg3D,distanceModel,FEMUR,TIBIA,CAMERA_HEIGHT,ANKLE_HEIGHT,NEUTRAL_HIP_HEIGHT} from './projectedLocomotion.ts';
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} vs ${b}`);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const directions=Array.from({length:8},(_,i)=>({x:Math.cos(i*Math.PI/4),y:Math.sin(i*Math.PI/4)}));
const DT=1/60;
function geometry(pose){for(const leg of Object.values(pose.legs)){
 for(const point of [leg.hip,leg.knee,leg.ankle])for(const value of Object.values(point))assert.ok(Number.isFinite(value));
 close(distanceModel(leg.hip,leg.knee),FEMUR);close(distanceModel(leg.knee,leg.ankle),TIBIA);assert.ok(leg.reachError<1e-5,`honest requested endpoint must be reachable: ${leg.reachError}`);
 if(leg.contact){close(leg.worldAnchor.height,0);close(leg.ankle.x,leg.worldAnchor.x);close(leg.ankle.depth,leg.worldAnchor.depth);close(leg.ankle.height,ANKLE_HEIGHT);const sole=projectModel(leg.worldAnchor);close(sole.x,leg.screen.sole.x);close(sole.y,leg.screen.sole.y);}
}}
function run(direction,travelFrames=90,totalFrames=180){const state=createLocomotion(),root={x:0,y:0},poses=[locomotionPose(state)];for(let i=0;i<totalFrames;i++){if(i<travelFrames){root.x+=direction.x*150*DT;root.y+=direction.y*150*DT;}poses.push(advanceLocomotion(state,root,DT));}return{state,poses};}
test('neutral projected geometry respects elevated ankles and true ground sole lanes',()=>{
 const p=locomotionPose(createLocomotion());geometry(p);close(p.legs.near.screen.hip.y,-42);close(p.legs.far.screen.hip.y,-45);close(p.legs.near.screen.ankle.y,-4);close(p.legs.far.screen.ankle.y,-7);close(p.legs.near.screen.sole.y,0);close(p.legs.far.screen.sole.y,-3);
 for(const leg of Object.values(p.legs)){close(distance(leg.screen.hip,leg.screen.knee),18,.002);close(distance(leg.screen.knee,leg.screen.ankle),20,.002);}
});
test('3D IK preserves anatomical lengths and exposes unreachable target error',()=>{
 const p=solveLeg3D({x:0,depth:0,height:40},{x:3,depth:8,height:4},{x:0,depth:-1,height:0});close(distanceModel(p.hip,p.knee),FEMUR);close(distanceModel(p.knee,p.ankle),TIBIA);assert.ok(p.reachError<1e-6);
 const impossible=solveLeg3D({x:0,depth:0,height:40},{x:200,depth:300,height:4},{x:0,depth:-1,height:0});assert.ok(impossible.reachError>100);close(distanceModel(impossible.hip,impossible.knee),FEMUR);close(distanceModel(impossible.knee,impossible.ankle),TIBIA);
});
test('150 screen px/s eight-direction starts, travel and stops keep world plants fixed',()=>{
 for(const direction of directions){const{state,poses}=run(direction),plants=new Map();for(const p of poses){geometry(p);for(const[id,leg]of Object.entries(p.legs))if(leg.contact){const key=`${id}/${leg.plantId}`;if(plants.has(key))assert.deepEqual(leg.worldAnchor,plants.get(key));else plants.set(key,leg.worldAnchor);}}assert.ok(plants.size>=8);assert.equal(state.mode,'idle');close(state.hipHeight,NEUTRAL_HIP_HEIGHT,2e-5);}
});
test('60Hz projected endpoint changes and hip lowering are bounded, not visually accepted',()=>{
 const measurements=[];for(const direction of directions){const{poses}=run(direction);let ankle=0,knee=0,hipRelative=0,drop=0;
  for(let i=1;i<poses.length;i++){const p=poses[i],old=poses[i-1];for(const id of ['near','far']){ankle=Math.max(ankle,distance(p.legs[id].screen.ankle,old.legs[id].screen.ankle));knee=Math.max(knee,distance(p.legs[id].screen.knee,old.legs[id].screen.knee));}hipRelative=Math.max(hipRelative,Math.abs(p.hipHeight-old.hipHeight)*CAMERA_HEIGHT);drop=Math.max(drop,(NEUTRAL_HIP_HEIGHT-p.hipHeight)*CAMERA_HEIGHT);}
  assert.ok(ankle<7);assert.ok(knee<8);assert.ok(hipRelative<1.1);assert.ok(drop<6);measurements.push({direction,ankle,knee,hipRelative,drop});
 }console.log('Geometry-only endpoint observations:',JSON.stringify(measurements));
});
test('phase-varied short travel stops settle without teleporting either plant',()=>{
 for(const direction of directions)for(const travelFrames of [1,2,3,5,8,11,17,23,31,47,63,72]){const{state,poses}=run(direction,travelFrames,travelFrames+120);for(const p of poses)geometry(p);assert.equal(state.mode,'idle');const last=poses.at(-1);for(const id of ['near','far'])close(distance(last.legs[id].screen.sole,{x:last.root.x+(id==='near'?-5:7),y:last.root.y+(id==='near'?0:-3)}),0);}
});
test('stopping replaces in-flight feet rather than resetting them directly to neutral',()=>{
 const s=createLocomotion(),root={x:0,y:0};let before;for(let i=0;i<17;i++){root.y+=2.5;before=advanceLocomotion(s,root,DT);}const beforeFeet=structuredClone(s.feet),after=advanceLocomotion(s,root,DT);assert.equal(after.mode,'settle');
 for(const id of ['near','far'])if(beforeFeet[id].mode==='swing'){close(distanceModel(s.feet[id].position,beforeFeet[id].position),0);assert.equal(s.feet[id].mode,'swing');}
 assert.ok(Object.values(s.feet).some(f=>f.mode==='swing'));
});
test('collision-stationary resolved root never advances locomotion from held input or global clock',()=>{
 const s=createLocomotion({x:120,y:85}),a=locomotionPose(s);for(let i=0;i<300;i++)advanceLocomotion(s,{x:120,y:85},DT);const b=locomotionPose(s);assert.equal(s.mode,'idle');for(const id of ['near','far']){assert.equal(a.legs[id].plantId,b.legs[id].plantId);assert.deepEqual(a.legs[id].worldAnchor,b.legs[id].worldAnchor);close(distance(a.legs[id].screen.ankle,b.legs[id].screen.ankle),0);}
});
test('same resolved travel and steps produce exactly reproducible transient geometry',()=>{
 const a=run(directions[3],47,180),b=run(directions[3],47,180);assert.deepEqual(a,b);
});
test('invalid roots and oversized/nonpositive integration steps are rejected explicitly',()=>{
 for(const dt of [0,-.1,.051,NaN,Infinity])assert.throws(()=>advanceLocomotion(createLocomotion(),{x:0,y:0},dt));for(const root of [{x:NaN,y:0},{x:0,y:Infinity}])assert.throws(()=>advanceLocomotion(createLocomotion(),root,DT));
});
