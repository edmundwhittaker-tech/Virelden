/** Fitted art adapter for the candidate fixed-anatomy directional player jog. */
import{evaluateRig,twoBone,type RigInput,type RigPose,type RigPoint,type RigPartId}from'./modularRig.js';
import{directionalJogPose,type DirectionalJogState}from'./playerGait.js';
export function playerGaitPose(input:RigInput,state:DirectionalJogState):RigPose{
 if(input.motion!=='idle'&&input.motion!=='walk')throw Error('Player gait adapter requires ordinary idle/walk; actions use the shared transition provider');
 if(input.view!==state.frame.view||input.flipped!==state.frame.flipped)throw Error('Player gait source view must match the model frame');
 const pose=evaluateRig({...input,motion:'idle'});if(state.mode==='idle')return pose;
 const model=directionalJogPose(state),down=model.bodyDrop;
 for(const[id,part]of Object.entries(pose.parts))if(!/^(thigh|greave|foot)_/.test(id)){part.start.y+=down;part.end.y+=down;}
 const set=(id:RigPartId,start:RigPoint,end:RigPoint,artSpan?:number)=>{pose.parts[id]={...pose.parts[id],start,end,angle:Math.atan2(end.y-start.y,end.x-start.x),length:Math.hypot(end.x-start.x,end.y-start.y),...(artSpan===undefined?{}:{artSpan})};};
 for(const side of['near','far']as const){const id=side==='near'?state.frame.nearLeg:state.frame.nearLeg==='a'?'b':'a',leg=model.legs[id],local=(p:RigPoint)=>({x:p.x-state.root.x,y:p.y-state.root.y}),foot=pose.parts[`foot_${side}`],v={x:foot.end.x-foot.start.x,y:foot.end.y-foot.start.y};set(`thigh_${side}`,local(leg.screen.hip),local(leg.screen.knee),18);set(`greave_${side}`,local(leg.screen.knee),local(leg.screen.ankle),20);const ankle=local(leg.screen.ankle);set(`foot_${side}`,ankle,{x:ankle.x+v.x,y:ankle.y+v.y});pose.feet[side]={...ankle};}
 if((input.weaponHands??(input.weapon==='poleaxe'?2:1))===1){const far=pose.parts.forearm_far,shoulder=pose.parts.upperarm_far.start,neutral=evaluateRig({...input,motion:'idle'}).feet.far,stroke=(pose.feet.far.x-neutral.x)*state.direction.x+(pose.feet.far.y-neutral.y)*state.direction.y,target={x:far.end.x-state.direction.x*stroke*.12,y:far.end.y-state.direction.y*stroke*.06},arm=twoBone(shoulder,target,10.5,10.5,input.flipped?1:-1);set('upperarm_far',shoulder,arm.joint);set('forearm_far',arm.joint,arm.end);const a=Math.atan2(arm.end.y-arm.joint.y,arm.end.x-arm.joint.x);set('hand_far',arm.end,{x:arm.end.x+Math.cos(a)*4,y:arm.end.y+Math.sin(a)*4});}
 pose.hand={...pose.parts.hand_near.end};pose.supportHand={...pose.parts.hand_far.end};pose.support=model.support==='none'?'none':model.support==='both'?'both':model.support===state.frame.nearLeg?'near':'far';return pose;
}
