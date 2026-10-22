import{evaluateRig,twoBone,type RigInput,type RigPose,type RigPartId,type RigPoint}from'../../src/core/modularRig.js';import type{GaitSample}from'./worldGait.js';
/** Pose-only experimental adapter; frozen evaluateRig and live game remain unchanged. */
export function applyGaitPose(base:RigPose,input:RigInput,worldPosition:RigPoint,gait:GaitSample):RigPose{
 if(input.motion!=='walk'&&input.motion!=='idle')return base;
 const pose:RigPose={...base,parts:Object.fromEntries(Object.entries(base.parts).map(([id,p])=>[id,{...p,start:{...p.start},end:{...p.end}}]))as RigPose['parts'],feet:{near:{...base.feet.near},far:{...base.feet.far}},actor:{...base.actor},hand:{...base.hand},supportHand:{...base.supportHand},foot:{...base.foot}};const d=gait.bodyOffset;
 const moved=(p:RigPoint)=>({x:p.x+d.x,y:p.y+d.y});
 const part=(id:RigPartId,a:RigPoint,b:RigPoint)=>{const p=pose.parts[id];p.start=a;p.end=b;p.angle=Math.atan2(b.y-a.y,b.x-a.x);p.length=Math.hypot(b.x-a.x,b.y-a.y);};
 for(const[id,p]of Object.entries(pose.parts))if(!id.startsWith('thigh')&&!id.startsWith('greave')&&!id.startsWith('foot'))part(id as RigPartId,moved(p.start),moved(p.end));
 for(const side of['near','far']as const){const hip=moved(pose.parts[`thigh_${side}`].start),target={x:gait.feet[side].display.x-worldPosition.x,y:gait.feet[side].display.y-worldPosition.y};const bend=(gait as GaitSample&{bends?:Record<'near'|'far',1|-1>}).bends?.[side]??((input.view==='rear'?1:-1)*(input.flipped?-1:1))as 1|-1,leg=twoBone(hip,target,18,20,bend);part(`thigh_${side}`,hip,leg.joint);part(`greave_${side}`,leg.joint,leg.end);part(`foot_${side}`,leg.end,{x:leg.end.x+(input.flipped?-7:7),y:leg.end.y+(input.view==='rear'?-3:3)});pose.feet[side]={...leg.end};}
 // RigPose.support is frozen legacy cadence metadata and cannot encode flight.
 // Experimental contact consumers MUST use gait.contactSupport/contacts instead.
 pose.hand={...pose.parts.hand_near.end};pose.supportHand={...pose.parts.hand_far.end};pose.support=gait.active?(gait.state.nearId===gait.supportId?'near':'far'):'both';return pose;
}

/** Lab convenience only. Production adapter should pass its CURRENT combat-safe base pose. */
export function evaluateGaitPose(input:RigInput,worldPosition:RigPoint,gait:GaitSample):RigPose{
 if(input.motion!=='walk'&&input.motion!=='idle')return evaluateRig(input);
 return applyGaitPose(evaluateRig({...input,motion:gait.active?'walk':'idle',time:gait.phase/1.6}),input,worldPosition,gait);
}
