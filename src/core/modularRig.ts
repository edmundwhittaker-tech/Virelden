/** Pure, foot-registered 2D skeletal prototype. All units are game pixels/radians. */
export interface RigPoint {x:number;y:number}
export type RigPartId='helmet'|'torso'|'pelvis'|'upperarm_near'|'upperarm_far'|'forearm_near'|'forearm_far'|'hand_near'|'hand_far'|'thigh_near'|'thigh_far'|'greave_near'|'greave_far'|'foot_near'|'foot_far';
export type RigWeapon='sword'|'spear'|'hammer'|'axe'|'falchion'|'poleaxe';
export interface RigWeaponMotion {kind:'cut'|'thrust'|'overhead'|'hook';startAngle:number;endAngle:number}
export interface RigInput {view:'front'|'rear';flipped:boolean;motion:'idle'|'walk'|'attack'|'roll'|'interact';time:number;phase?:'windup'|'active'|'recovery';progress?:number;weapon?:RigWeapon;aim?:RigPoint;weaponMotion?:RigWeaponMotion;weaponHands?:1|2;weaponReach?:number;handTarget?:RigPoint}
export interface RigPart {start:RigPoint;end:RigPoint;angle:number;length:number;depth:number}
export interface RigPose {interaction?:{requested:RigPoint;actual:RigPoint;error:number;reached:boolean};weaponVisible:boolean;weaponAngle:number;weaponLength:number;parts:Record<RigPartId,RigPart>;hand:RigPoint;supportHand:RigPoint;foot:RigPoint;actor:{angle:number;scaleX:number;scaleY:number};feet:{near:RigPoint;far:RigPoint};support:'near'|'far'|'both'}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const finite=(v:number,fallback=0)=>Number.isFinite(v)?v:fallback;
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const angleLerp=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const smooth=(t:number)=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const plus=(a:RigPoint,b:RigPoint):RigPoint=>({x:a.x+b.x,y:a.y+b.y});
/** End target is projected into the chain's reachable annulus; no segment stretching. */
export function twoBone(start:RigPoint,target:RigPoint,a:number,b:number,bend:1|-1=1):{joint:RigPoint;end:RigPoint}{
 const dx=target.x-start.x,dy=target.y-start.y,raw=Math.hypot(dx,dy);
 const dist=clamp(raw,Math.abs(a-b)+1e-5,a+b-1e-5),theta=raw>1e-8?Math.atan2(dy,dx):Math.PI/2;
 const elbow=theta+bend*Math.acos(clamp((a*a+dist*dist-b*b)/(2*a*dist),-1,1));
 return {joint:{x:start.x+Math.cos(elbow)*a,y:start.y+Math.sin(elbow)*a},end:{x:start.x+Math.cos(theta)*dist,y:start.y+Math.sin(theta)*dist}};
}
const DEPTH:Record<RigPartId,number>={upperarm_far:1,forearm_far:2,hand_far:3,thigh_far:4,greave_far:5,foot_far:6,pelvis:9,torso:10,thigh_near:6,greave_near:7,foot_near:8,helmet:12,upperarm_near:13,forearm_near:15,hand_near:16};
export function evaluateRig(input:RigInput):RigPose {
 const time=finite(input.time),p=clamp(finite(input.progress??0),0,1),walking=input.motion==='walk';
 const cycle=time*Math.PI*2*1.6,swing=walking?Math.sin(cycle):0;
 const bob=walking?-Math.abs(Math.sin(cycle))*1.1:0;
 const attack=input.motion==='attack',phase=input.phase??'windup',weapon=input.weapon??'sword';
 const drive=attack?(phase==='windup'?p:phase==='active'?1-p*.15:.85*(1-p)):0;
 const carry=weapon==='spear'||weapon==='poleaxe'?-.25:.9,hands=input.weaponHands??(weapon==='poleaxe'?2:1);
 let weaponAngle=carry;
 const rear=input.view==='rear';
 const lean=attack?drive*2.3:0;
 let pelvis={x:lean*.3,y:-48+bob},neck={x:lean,y:-72+bob};
 let shoulderNear={x:(rear?10:-10)+lean,y:-64+bob},shoulderFar={x:(rear?-8:8)+lean,y:-66+bob};
 let headOffset={x:0,y:-15};
 const interacting=input.motion==='interact';
 const requested=interacting&&input.handTarget?{x:finite(input.handTarget.x)*(input.flipped?-1:1),y:finite(input.handTarget.y)}:undefined;
 if(requested){
  // Rigid torso rotates about pelvis; search the smallest lean that can reach.
  let bestError=Infinity;
  for(let candidate=0;candidate<=22;candidate+=.25){
   const angle=Math.asin(candidate/31),c=Math.cos(angle),s=Math.sin(angle);
   const rotate=(v:RigPoint):RigPoint=>({x:v.x*c-v.y*s,y:v.x*s+v.y*c});
   const p={x:candidate*.15,y:-40},n=plus(p,rotate({x:0,y:-31}));
   const near=plus(n,rotate({x:rear?11:-11,y:8})),far=plus(n,rotate({x:rear?-9:8,y:4}));
   const distance=Math.hypot(requested.x-near.x,requested.y-near.y),error=Math.max(0,distance-28.99,5.01-distance);
   if(error<bestError){bestError=error;pelvis=p;neck=n;shoulderNear=near;shoulderFar=far;headOffset=rotate({x:0,y:-17});}
   if(error===0)break;
  }
 }

 const hipNear=plus(pelvis,rear?{x:6,y:6}:{x:-5,y:6}),hipFar=plus(pelvis,rear?{x:-5,y:3}:{x:6,y:3});
 const feet={near:{x:(rear?7:-5)+swing*6,y:-4-Math.max(0,swing)*4},far:{x:(rear?-5:7)-swing*6,y:-7-Math.max(0,-swing)*4}};
 let nearTarget={x:(rear?14:-14)-swing*5,y:-44+bob},farTarget={x:(rear?-12:12)+swing*5,y:-47+bob};
 let gripDirection:RigPoint|undefined,gripBlend=1;
 const idleNear={...nearTarget},idleFar={...farTarget};
 if(!attack&&hands===2&&!interacting){const u={x:Math.cos(carry),y:Math.sin(carry)},centre={x:0,y:-60.5+bob};gripDirection=u;nearTarget=plus(centre,{x:u.x*2,y:u.y*2});farTarget=plus(centre,{x:-u.x*9,y:-u.y*9});}

 if(attack){
  const defaults:Record<RigWeapon,RigWeaponMotion>={
   sword:{kind:'cut',startAngle:-1.05,endAngle:1.05},spear:{kind:'thrust',startAngle:0,endAngle:0},
   hammer:{kind:'overhead',startAngle:-1.85,endAngle:.4},axe:{kind:'cut',startAngle:-.72,endAngle:.72},
   falchion:{kind:'cut',startAngle:-1.38,endAngle:1.38},poleaxe:{kind:'hook',startAngle:-.5,endAngle:.3},
  };
  const motion=input.weaponMotion??defaults[weapon];
  const raw=input.aim??{x:input.flipped?-1:1,y:0};
  const ax=finite(raw.x)*(input.flipped?-1:1),ay=finite(raw.y),n=Math.hypot(ax,ay);
  const aim=n>1e-8?Math.atan2(ay,ax):0;
  const start=finite(motion.startAngle),end=finite(motion.endAngle),mid=motion.kind==='overhead'||motion.kind==='hook'?0:(start+end)/2;
  const windup=aim+start,launch=smooth((p-.65)/.35);
  // Overhead/hook descent and thrust extension visibly approach contact during
  // the last windup portion; FIRSTACTIVE remains the same centered impact.
  const prepared=angleLerp(carry,windup,Math.min(1,p/.65));
  const woundAngle=motion.kind==='cut'?angleLerp(carry,windup,p):angleLerp(prepared,aim,launch);
  // Cuts traverse the complete active arc; overhead/thrust retain centered impact.
  // Core contact and renderer consume this same axis and registered hand.
  weaponAngle=motion.kind==='thrust'?(phase==='windup'?angleLerp(carry,aim,smooth(p/.4)):phase==='recovery'?angleLerp(aim,carry,p):aim):phase==='windup'?woundAngle:phase==='active'?aim+lerp(motion.kind==='cut'?start:mid,end,p):angleLerp(aim+end,carry,p);
  const u={x:Math.cos(weaponAngle),y:Math.sin(weaponAngle)};
  if(hands===2){
   const push=phase==='windup'?(p<=.65?lerp(0,-2,p/.65):lerp(-2,2,launch)):phase==='active'?lerp(2,1,p):lerp(1,0,p);
   const centre={x:lean+u.x*push,y:-60.5+bob+u.y*push};
   // Aim wrists four pixels behind each grip; both hands then share the shaft line.
   gripDirection=u;nearTarget=plus(centre,{x:u.x*2,y:u.y*2});farTarget=plus(centre,{x:-u.x*9,y:-u.y*9});
  }else{
   const reach=motion.kind==='thrust'?(phase==='windup'?(p<=.65?lerp(15,10,p/.65):lerp(10,23,launch)):phase==='active'?lerp(23,21,p):lerp(21,15,p)):23;
   if(motion.kind==='thrust')gripDirection=u;
   nearTarget=plus(shoulderNear,{x:u.x*reach,y:u.y*reach});
   farTarget=plus(shoulderFar,{x:(rear?-1:1)*(8-drive*3),y:19-drive*3});
  }
  if(hands===1){
   // Approach/release the ordinary carry pose instead of teleporting the wrists.
   const blend=phase==='windup'?smooth(p/.3):phase==='recovery'?smooth((1-p)/.35):1;
   nearTarget={x:lerp(idleNear.x,nearTarget.x,blend),y:lerp(idleNear.y,nearTarget.y,blend)};
   farTarget={x:lerp(idleFar.x,farTarget.x,blend),y:lerp(idleFar.y,farTarget.y,blend)};gripBlend=blend;
  }
 }
 if(requested){
  const dx=requested.x-shoulderNear.x,dy=requested.y-shoulderNear.y,d=Math.hypot(dx,dy)||1;
  gripDirection={x:dx/d,y:dy/d};nearTarget={x:requested.x-gripDirection.x*4,y:requested.y-gripDirection.y*4};
  farTarget=plus(shoulderFar,{x:rear?-3:3,y:22});
 }
 const nearLeg=twoBone(hipNear,feet.near,18,20,-1),farLeg=twoBone(hipFar,feet.far,18,20,-1);
 const nearArm=twoBone(shoulderNear,nearTarget,10.5,10.5,1),farArm=twoBone(shoulderFar,farTarget,10.5,10.5,-1);
 const parts={} as Record<RigPartId,RigPart>;
 const mirror=(point:RigPoint):RigPoint=>({x:point.x*(input.flipped?-1:1),y:point.y});
 const add=(id:RigPartId,start:RigPoint,end:RigPoint)=>{const s=mirror(start),e=mirror(end);parts[id]={start:s,end:e,angle:Math.atan2(e.y-s.y,e.x-s.x),length:Math.hypot(e.x-s.x,e.y-s.y),depth:DEPTH[id]};};
 add('helmet',neck,plus(neck,headOffset));add('torso',neck,pelvis);add('pelvis',plus(pelvis,{x:rear?-6:6,y:2}),plus(pelvis,{x:rear?6.4:-6.4,y:2}));
 for(const side of ['near','far'] as const){
  const leg=side==='near'?nearLeg:farLeg,hip=side==='near'?hipNear:hipFar;
  add(`thigh_${side}`,hip,leg.joint);add(`greave_${side}`,leg.joint,leg.end);add(`foot_${side}`,leg.end,plus(leg.end,{x:7,y:rear?-3:3}));
  const arm=side==='near'?nearArm:farArm,shoulder=side==='near'?shoulderNear:shoulderFar;
  add(`upperarm_${side}`,shoulder,arm.joint);add(`forearm_${side}`,arm.joint,arm.end);
  const forearmAngle=Math.atan2(arm.end.y-arm.joint.y,arm.end.x-arm.joint.x),angle=gripDirection&&(!interacting||side==='near')?angleLerp(forearmAngle,Math.atan2(gripDirection.y,gripDirection.x),gripBlend):forearmAngle;
  add(`hand_${side}`,arm.end,plus(arm.end,{x:Math.cos(angle)*4,y:Math.sin(angle)*4}));
 }
 // View-specific shoulders/hips match authored armholes; foot origin and chain lengths remain shared.
 // Hands overlay a weapon at depth 14; adjust actor-level ordering against scenery at foot y.
 const roll=input.motion==='roll';
 const defaultReach:Record<RigWeapon,number>={sword:75,spear:115,hammer:68,axe:82,falchion:88,poleaxe:132};
 const styleLength:Record<RigWeapon,number>={sword:39,spear:57,hammer:32,axe:36,falchion:39,poleaxe:56};
 const weaponLength=Math.max(styleLength[weapon],clamp(finite(input.weaponReach??defaultReach[weapon],defaultReach[weapon]),20,180)-22);
 const actual={...parts.hand_near.end},requestedScreen=requested?mirror(requested):undefined;
 const error=requestedScreen?Math.hypot(actual.x-requestedScreen.x,actual.y-requestedScreen.y):0;
 const interaction=requestedScreen?{requested:requestedScreen,actual,error,reached:error<.01}:undefined;
 return {interaction,weaponVisible:!interacting,weaponLength,weaponAngle:input.flipped?Math.PI-weaponAngle:weaponAngle,parts,hand:{...parts.hand_near.end},supportHand:{...parts.hand_far.end},foot:{x:0,y:0},feet:{near:mirror(nearLeg.end),far:mirror(farLeg.end)},support:!walking?'both':swing>0?'far':'near',actor:{angle:roll?p*Math.PI*2*(input.flipped?-1:1):0,scaleX:1,scaleY:roll?.78:1}};
}
/** Apply actor transform only once, including to weapon sockets and all parts. */
export function actorPoint(point:RigPoint,actor:RigPose['actor']):RigPoint {const x=point.x*actor.scaleX,y=point.y*actor.scaleY,c=Math.cos(actor.angle),s=Math.sin(actor.angle);return {x:x*c-y*s,y:x*s+y*c};}

