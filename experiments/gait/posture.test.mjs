import test from 'node:test';
import assert from 'node:assert/strict';
import { updateWorldGait } from '../../.gait-build/experiments/gait/worldGait.js';
import { evaluateGaitPose } from '../../.gait-build/experiments/gait/experimentalPose.js';
import { constrainProjectedGait } from '../../.gait-build/experiments/gait/projectedPosture.js';
const close=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
function run(segments,dt=1/60){
 let sourceState,postureState,time=0,position={x:0,y:0},previous,view='front',flipped=false;const frames=[];
 for(const segment of segments)for(let frame=0;frame<segment.frames;frame++){
  time+=dt;const v=segment.velocity,moving=!!(v.x||v.y);position={x:position.x+v.x*dt,y:position.y+v.y*dt};
  view=segment.view??(moving?(v.y<0?'rear':'front'):view);flipped=segment.flipped??(moving?v.x<0:flipped);
  const input={view,flipped,motion:moving?'walk':'idle',time,weapon:'sword'};
  const source=updateWorldGait(sourceState,{position,time,moving,view,flipped});sourceState=source.state;
  const result=constrainProjectedGait(postureState,source,input,position);postureState=result.state;
  const gait=result.sample,pose=evaluateGaitPose(input,position,gait),reference=evaluateGaitPose(input,position,source);
  for(const side of['near','far']){
   const thigh=pose.parts['thigh_'+side],shin=pose.parts['greave_'+side];
   close(thigh.length,18);close(shin.length,20);
   assert.ok(thigh.end.y-thigh.start.y>=9.99999,'thigh points upward');
   assert.ok(shin.end.y-shin.start.y>=10.99999,'shin folds horizontally');
   assert.ok(shin.end.y-thigh.start.y>=27.99999,'ankle folds beside hip');
   close(pose.feet[side].x+position.x,gait.feet[side].display.x);
   close(pose.feet[side].y+position.y,gait.feet[side].display.y);
  }
  if(previous)for(const id of[0,1]){
   const a=previous.gait.contacts[id],b=gait.contacts[id];
   if(a.planted&&b.planted&&a.epoch===b.epoch){assert.deepEqual(a.ground,b.ground);assert.equal(b.lift,0);}
  }
  for(const[id,p]of Object.entries(pose.parts))if(!/^(thigh|greave|foot)/.test(id))assert.deepEqual(p,reference.parts[id],'body/control must not change');
  assert.deepEqual(pose.hand,reference.hand);assert.equal(pose.weaponAngle,reference.weaponAngle);
  const f={input,position:{...position},source,gait,pose,reference,state:postureState};frames.push(f);previous=f;
 }
 return frames;
}
test('posture policy keeps rendered fixed bones descending in all eight directions/views/mirrors',()=>{
 for(const speed of[90,150,180])for(const view of['front','rear'])for(const flipped of[false,true])for(let i=0;i<8;i++){
  const a=i*Math.PI/4;run([{velocity:{x:0,y:0},frames:4,view,flipped},{velocity:{x:Math.cos(a)*speed,y:Math.sin(a)*speed},frames:70,view,flipped},{velocity:{x:0,y:0},frames:35,view,flipped}]);
 }
});
test('east remains the unchanged control, and diagonal flight is explicit rather than planted sliding',()=>{
 const east=run([{velocity:{x:0,y:0},frames:10},{velocity:{x:150,y:0},frames:120},{velocity:{x:0,y:0},frames:40}]);
 for(const f of east)for(const side of['near','far'])for(const axis of['x','y'])close(f.pose.feet[side][axis],f.reference.feet[side][axis],1e-9);
 const diagonal=run([{velocity:{x:106.066,y:-106.066},frames:120}]);assert.ok(diagonal.some(f=>f.gait.posture.flight));
 for(const f of diagonal)for(const foot of f.gait.contacts)if(foot.planted)assert.equal(foot.lift,0);
});
test('posture correction is stable at30/120fps, turns and paused immutable samples',()=>{
 for(const dt of[1/30,1/120]){for(let i=0;i<8;i++){const a=i*Math.PI/4;run([{velocity:{x:Math.cos(a)*150,y:Math.sin(a)*150},frames:Math.round(1.2/dt)},{velocity:{x:0,y:0},frames:Math.round(.5/dt)}],dt);}run([{velocity:{x:150,y:0},frames:30},{velocity:{x:106.066,y:-106.066},frames:30},{velocity:{x:-106.066,y:106.066},frames:30},{velocity:{x:-150,y:0},frames:30},{velocity:{x:0,y:0},frames:30}],dt);}
 const last=run([{velocity:{x:106.066,y:-106.066},frames:30}]).at(-1),before=JSON.stringify(last.state);
 const freeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);Object.values(o).forEach(freeze);}return o;};freeze(last.state);freeze(last.source);
 constrainProjectedGait(last.state,last.source,last.input,last.position);assert.equal(JSON.stringify(last.state),before);
});
