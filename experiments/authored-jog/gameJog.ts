/** East-only authored game-pose experiment. No gameplay/input/save authority.
 * Compact visible foot return is24px per27px root half-step (~3px slip);
 * relaxed uses24px return per24px stance travel (not rendered sole-lock proof),
 * not a foot-lock claim. Skeletal segment lengths and actual carry grips stay fixed.
 */
import {evaluateRig,twoBone,type RigInput,type RigPose,type RigPoint,type RigPartId} from '../../src/core/modularRig.js';
type Side='near'|'far';
const TAU=Math.PI*2,AMPLITUDE=12,PICKUP=1.2,WEIGHT=2.5;
const SIDES=['near','far']as const;
const copy=(p:RigPoint)=>({...p});
const mix=(a:RigPoint,b:RigPoint,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const neutral=(s:Side):RigPoint=>s==='near'?{x:-5,y:-4}:{x:7,y:-7};
export interface GameJogState{root:RigPoint;mode:'idle'|'travel'|'settle';phase:number;weight:number;cycleDistance:number;stanceFraction:number;feet:Record<Side,RigPoint>;contact:Record<Side,boolean>;stop?:{first:Side;stage:number;time:number;from:Record<Side,RigPoint>};}
export function createGameJog(root:RigPoint={x:0,y:0},cadence:'compact'|'relaxed'='compact'):GameJogState{return{cycleDistance:cadence==='relaxed'?72:54,stanceFraction:cadence==='relaxed'?1/3:.5,root:copy(root),mode:'idle',phase:0,weight:0,feet:{near:neutral('near'),far:neutral('far')},contact:{near:true,far:true}};}
function travelFoot(phase:number,side:Side,stanceFraction:number){
 const q=((phase/TAU+(side==='far'?.5:0))%1+1)%1,n=neutral(side);
 if(q<stanceFraction)return{point:{x:n.x+AMPLITUDE*(1-2*q/stanceFraction),y:n.y},contact:true};
 const t=(q-stanceFraction)/(1-stanceFraction);return{point:{x:n.x+AMPLITUDE*(-1+2*smooth(t)),y:n.y-PICKUP*Math.sin(Math.PI*t)**2},contact:false};
}
/** East resolved root only. Restart during settling is explicitly unaccepted. */
export function advanceGameJog(s:GameJogState,root:RigPoint,dt:number){
 if(!Number.isFinite(root.x)||!Number.isFinite(root.y)||!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('Expected bounded finite resolved root step');
 const distance=Math.hypot(root.x-s.root.x,root.y-s.root.y),moving=distance>.0001;s.root=copy(root);
 if(moving){if(s.mode==='idle'){s.phase=TAU*s.stanceFraction/2;s.weight=0;}s.mode='travel';s.stop=undefined;s.phase+=TAU*distance/s.cycleDistance;s.weight=Math.min(1,s.weight+dt/.1);
  const blend=smooth(s.weight);for(const side of SIDES){const f=travelFoot(s.phase,side,s.stanceFraction);s.feet[side]=f.contact?f.point:mix(neutral(side),f.point,blend);s.contact[side]=f.contact;}return;
 }
 if(s.mode==='travel'){const first:Side=s.contact.near?'far':s.contact.far?'near':neutral('near').y-s.feet.near.y<neutral('far').y-s.feet.far.y?'near':'far';s.mode='settle';s.stop={first,stage:0,time:0,from:{near:copy(s.feet.near),far:copy(s.feet.far)}};return;}
 if(s.mode==='settle'){
  const stop=s.stop!;stop.time+=dt;
  if(stop.stage<2){const side=stop.stage===0?stop.first:stop.first==='near'?'far':'near',held:Side=side==='near'?'far':'near';
   // A foot already in flight is not a fixed support: let its visible sole land
   // before holding that position during the other foot's replacement.
   if(stop.stage===0&&!s.contact[held]){const land=Math.min(1,stop.time/.06);s.feet[held]={x:stop.from[held].x,y:stop.from[held].y+(neutral(held).y-stop.from[held].y)*smooth(land)};if(land>=1)s.contact[held]=true;}
   const q=Math.min(1,stop.time/.14),p=mix(stop.from[side],neutral(side),smooth(q));p.y-=PICKUP*Math.sin(Math.PI*q)**2;s.feet[side]=p;s.contact[side]=q>=1;
   if(q>=1){stop.stage++;stop.time=0;stop.from={near:copy(s.feet.near),far:copy(s.feet.far)};}
  }else{s.weight=Math.max(0,s.weight-dt/.12);if(s.weight===0){s.mode='idle';s.stop=undefined;for(const side of SIDES){s.feet[side]=neutral(side);s.contact[side]=true;}}}
 }
}
/** Coherent connected body with authored low-pickup feet; fixed18/20px IK legs. */
export function gameJogPose(input:RigInput,s:GameJogState):RigPose{
 const pose=evaluateRig({...input,motion:'idle'});if(s.mode==='idle')return pose;
 if(input.view!=='front'||input.flipped)throw Error('Authored jog currently accepts front/east only');
 const weight=smooth(s.weight),down=WEIGHT*weight;
 for(const[id,part]of Object.entries(pose.parts))if(!/^(thigh|greave|foot)_/.test(id)){part.start.y+=down;part.end.y+=down;}
 const set=(id:RigPartId,start:RigPoint,end:RigPoint)=>{pose.parts[id]={...pose.parts[id],start,end,angle:Math.atan2(end.y-start.y,end.x-start.x),length:Math.hypot(end.x-start.x,end.y-start.y)};};
 for(const side of SIDES){const old=pose.parts[`thigh_${side}`],hip={x:old.start.x,y:old.start.y+down},leg=twoBone(hip,s.feet[side],18,20,-1),foot=pose.parts[`foot_${side}`],v={x:foot.end.x-foot.start.x,y:foot.end.y-foot.start.y};set(`thigh_${side}`,hip,leg.joint);set(`greave_${side}`,leg.joint,leg.end);set(`foot_${side}`,leg.end,{x:leg.end.x+v.x,y:leg.end.y+v.y});pose.feet[side]=copy(leg.end);}
 if((input.weaponHands??(input.weapon==='poleaxe'?2:1))===1){
  const upper=pose.parts.upperarm_far,wrist=pose.parts.forearm_far.end,off=(s.feet.far.x-7)*-.12;
  const arm=twoBone(upper.start,{x:wrist.x+off,y:wrist.y},10.5,10.5,-1);set('upperarm_far',upper.start,arm.joint);set('forearm_far',arm.joint,arm.end);const a=Math.atan2(arm.end.y-arm.joint.y,arm.end.x-arm.joint.x);set('hand_far',arm.end,{x:arm.end.x+Math.cos(a)*4,y:arm.end.y+Math.sin(a)*4});
 }
 pose.hand=copy(pose.parts.hand_near.end);pose.supportHand=copy(pose.parts.hand_far.end);pose.support=s.contact.near&&s.contact.far?'both':s.contact.near?'near':s.contact.far?'far':'none';return pose;
}
export function gameJogModel(input:RigInput,s:GameJogState){const pose=gameJogPose(input,s);const world=(p:RigPoint)=>({x:s.root.x+p.x,y:s.root.y+p.y});return{kind:'authored-2d',cycleDistance:s.cycleDistance,stanceFraction:s.stanceFraction,mode:s.mode,hipScreenY:pose.parts.thigh_near.start.y,legs:Object.fromEntries(SIDES.map(side=>[side,{contact:s.contact[side],screen:{hip:world(pose.parts[`thigh_${side}`].start),knee:world(pose.parts[`greave_${side}`].start),ankle:world(pose.parts[`foot_${side}`].start),sole:world({...pose.feet[side],y:pose.feet[side].y+4})}}]))};}
