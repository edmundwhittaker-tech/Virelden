import {evaluateRig,type RigInput,type RigPose,type RigPoint,type RigPartId} from '../../src/core/modularRig.js';
import {locomotionPose,type LocomotionState} from './projectedLocomotion.js';
/** Front-template-only experiment. Not a gameplay evaluator or accepted turn rig. */
export function projectedFitPose(input:RigInput,state:LocomotionState):RigPose{
 const pose=evaluateRig({...input,motion:'idle'}),model=locomotionPose(state),root=model.root;
 const local=(p:RigPoint)=>({x:p.x-root.x,y:p.y-root.y});
 const dy=local(model.legs.near.screen.hip).y-pose.parts.thigh_near.start.y;
 for(const[id,part]of Object.entries(pose.parts))if(!/^(thigh|greave|foot)_/.test(id)){
  part.start={x:part.start.x,y:part.start.y+dy};part.end={x:part.end.x,y:part.end.y+dy};
 }
 const set=(id:RigPartId,start:RigPoint,end:RigPoint,artSpan?:number)=>{
  const old=pose.parts[id];pose.parts[id]={...old,start,end,angle:Math.atan2(end.y-start.y,end.x-start.x),length:Math.hypot(end.x-start.x,end.y-start.y),artSpan};
 };
 for(const side of ['near','far']as const){const leg=model.legs[side],hip=local(leg.screen.hip),knee=local(leg.screen.knee),ankle=local(leg.screen.ankle),oldFoot=pose.parts[`foot_${side}`],vector={x:oldFoot.end.x-oldFoot.start.x,y:oldFoot.end.y-oldFoot.start.y};
  set(`thigh_${side}`,hip,knee,18);set(`greave_${side}`,knee,ankle,20);set(`foot_${side}`,ankle,{x:ankle.x+vector.x,y:ankle.y+vector.y});pose.feet[side]=ankle;
 }
 pose.hand={...pose.parts.hand_near.end};pose.supportHand={...pose.parts.hand_far.end};pose.support=model.legs.near.contact&&model.legs.far.contact?'both':model.legs.near.contact?'near':'far';
 return pose;
}
