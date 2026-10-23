/** Short shared skeletal action entry, finished before the earliest active tick.
 * No renderer-only offset, actor-root adjustment or limb-length interpolation.
 */
import{twoBone,type RigPose,type RigInput,type RigPartId,type RigPoint}from'./modularRig.js';
import{createDirectionalJog,JOG_CAMERA,JOG_ANKLE}from'./playerGait.js';import{playerGaitPose}from'./playerGaitPose.js';
import type{PlayerMotionState}from'./playerMotion.js';
const mix=(a:number,b:number,t:number)=>a+(b-a)*t,point=(a:RigPoint,b:RigPoint,t:number)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)}),angle=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function blendPlayerAction(input:RigInput,target:RigPose,action:NonNullable<PlayerMotionState['action']>):RigPose{
 const t=Math.max(0,Math.min(1,action.elapsed/.1)),b=t*t*(3-2*t);if(b>=1)return target;
 const from=action.from,pose=structuredClone(target),state=structuredClone(action.gait),frame={view:input.view,flipped:input.flipped,nearLeg:state.frame.nearLeg},neutral=createDirectionalJog(state.root,frame);
 state.frame=frame;state.mode='settle';state.redirect=undefined;state.stop=undefined;state.weight*=1-b;
 for(const leg of['a','b']as const){const side=leg===state.frame.nearLeg?'near':'far',hip=target.parts[`thigh_${side}`].start,ankle=target.feet[side],h=neutral.hips[leg],f=neutral.feet[leg],targetHip={...h,x:hip.x,height:(.5*h.depth-hip.y)/JOG_CAMERA},targetFoot={...f,x:ankle.x,depth:2*(ankle.y+JOG_CAMERA*JOG_ANKLE)};
  for(const k of['x','depth','height']as const){state.hips[leg][k]=mix(state.hips[leg][k],targetHip[k],b);state.feet[leg][k]=mix(state.feet[leg][k],targetFoot[k],b);}state.feet[leg].height+=.8*Math.sin(Math.PI*t)**2/JOG_CAMERA;state.requestedGrounded[leg]=false;
 }
 const lower=playerGaitPose({...input,motion:'idle'},state);
 for(const side of['near','far']as const)for(const id of[`thigh_${side}`,`greave_${side}`,`foot_${side}`]as const)pose.parts[id]=lower.parts[id];pose.feet=lower.feet;pose.support='none';
 const set=(id:RigPartId,start:RigPoint,end:RigPoint)=>{pose.parts[id]={...pose.parts[id],start,end,length:Math.hypot(end.x-start.x,end.y-start.y),angle:Math.atan2(end.y-start.y,end.x-start.x)};};
 for(const id of['helmet','torso']as const)set(id,point(from.parts[id].start,target.parts[id].start,b),point(from.parts[id].end,target.parts[id].end,b));
 // Pelvis source axes reverse between front/rear sheets. Keep its fitted,
 // horizontal registration, not a180-degree mid-turn plate inversion.
 const sourceCentre={x:(from.parts.pelvis.start.x+from.parts.pelvis.end.x)/2,y:(from.parts.pelvis.start.y+from.parts.pelvis.end.y)/2},targetCentre={x:(target.parts.pelvis.start.x+target.parts.pelvis.end.x)/2,y:(target.parts.pelvis.start.y+target.parts.pelvis.end.y)/2},centre=point(sourceCentre,targetCentre,b),offset={x:centre.x-targetCentre.x,y:centre.y-targetCentre.y};set('pelvis',{x:target.parts.pelvis.start.x+offset.x,y:target.parts.pelvis.start.y+offset.y},{x:target.parts.pelvis.end.x+offset.x,y:target.parts.pelvis.end.y+offset.y});
 pose.weaponAngle=angle(from.weaponAngle,target.weaponAngle,b);
 const hands=input.weaponHands??(input.weapon==='poleaxe'?2:1),u={x:Math.cos(pose.weaponAngle),y:Math.sin(pose.weaponAngle)},shoulders={near:point(from.parts.upperarm_near.start,target.parts.upperarm_near.start,b),far:point(from.parts.upperarm_far.start,target.parts.upperarm_far.start,b)};
 const fingers=Object.fromEntries((['near','far']as const).map(side=>{const a=angle(from.parts[`hand_${side}`].angle,target.parts[`hand_${side}`].angle,b);return[side,{x:Math.cos(a),y:Math.sin(a)}];}))as Record<'near'|'far',RigPoint>;
 let primary=point(from.hand,target.hand,b),secondary=point(from.supportHand,target.supportHand,b);
 if(hands===2){
  // The two wrist-reach disks share a feasible shaft centre. Project only a
  // visible requested grip, never a root/hidden anchor or a stretched arm.
  const centres=[{x:shoulders.near.x+4*fingers.near.x,y:shoulders.near.y+4*fingers.near.y},{x:shoulders.far.x+11*u.x+4*fingers.far.x,y:shoulders.far.y+11*u.y+4*fingers.far.y}];
  for(let i=0;i<24;i++)for(const c of centres){const d=Math.hypot(primary.x-c.x,primary.y-c.y);if(d>21)primary={x:c.x+(primary.x-c.x)*21/d,y:c.y+(primary.y-c.y)*21/d};}
  secondary={x:primary.x-11*u.x,y:primary.y-11*u.y};
 }
 for(const side of['near','far']as const){const grip=side==='near'?primary:secondary,finger=fingers[side],wrist={x:grip.x-4*finger.x,y:grip.y-4*finger.y},bend=(side==='near'?1:-1)*(input.flipped?-1:1)as 1|-1,arm=twoBone(shoulders[side],wrist,10.5,10.5,bend);set(`upperarm_${side}`,shoulders[side],arm.joint);set(`forearm_${side}`,arm.joint,arm.end);set(`hand_${side}`,arm.end,{x:arm.end.x+4*finger.x,y:arm.end.y+4*finger.y});}
 pose.hand={...pose.parts.hand_near.end};pose.supportHand={...pose.parts.hand_far.end};return pose;
}
