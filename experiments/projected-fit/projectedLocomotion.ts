/** Isolated locomotion geometry experiment. No art, gameplay state or save changes.
 * Ground X/depth and anatomical lengths are model-space units. Screen positions
 * are collision-resolved roots; vertical height is not a second ground axis.
 *
 * Scope: fixed front-template lanes, 60Hz start/travel/stop at150screen px/s.
 * `near`/`far` here are persistent experimental slots, NOT production depth roles.
 * Eight tested root-travel vectors do NOT establish eight accepted body facings.
 * Rear-view lane changes, anatomical left/right identity, turns/reversals,
 * plate transforms and walk-to-action/core hand-contact blending remain absent.
 * Never mirror or swap these world anchors when choosing an artwork view.
 * Stop replans preserve current foot positions but brake inherited swing velocity;
 * this is bounded C0 geometry, not a C1 physical animation or visual acceptance.
 */
export interface ScreenPoint {x:number;y:number}
export interface ModelPoint {x:number;depth:number;height:number}
export type FootId='near'|'far';
export const CAMERA_HEIGHT=Math.sqrt(3)/2;
export const FEMUR=18/CAMERA_HEIGHT,TIBIA=20/CAMERA_HEIGHT,ANKLE_HEIGHT=4/CAMERA_HEIGHT;
const projectedDepthDelta=(screenDown:number,length:number)=>(screenDown-Math.sqrt(3*(length*length-screenDown*screenDown)))/2;
const THIGH_DEPTH=projectedDepthDelta(18,FEMUR),SHIN_DEPTH=projectedDepthDelta(20,TIBIA);
export const HIP_DEPTH=-THIGH_DEPTH-SHIN_DEPTH;
export const NEUTRAL_HIP_HEIGHT=(42+HIP_DEPTH*.5)/CAMERA_HEIGHT;
const STEP_TIME=.18,CONTACT_TIME=.11,SWING_LIFT=3.5,LEAD=9;
const EPS=1e-8;
const copy=(p:ModelPoint):ModelPoint=>({...p});
const add=(a:ModelPoint,b:ModelPoint):ModelPoint=>({x:a.x+b.x,depth:a.depth+b.depth,height:a.height+b.height});
const sub=(a:ModelPoint,b:ModelPoint):ModelPoint=>({x:a.x-b.x,depth:a.depth-b.depth,height:a.height-b.height});
const mul=(p:ModelPoint,n:number):ModelPoint=>({x:p.x*n,depth:p.depth*n,height:p.height*n});
const dot=(a:ModelPoint,b:ModelPoint)=>a.x*b.x+a.depth*b.depth+a.height*b.height;
const norm=(p:ModelPoint)=>Math.sqrt(dot(p,p));
const unit=(p:ModelPoint):ModelPoint=>{const n=norm(p);return n>EPS?mul(p,1/n):{x:0,depth:-1,height:0};};
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const toward=(a:number,b:number,n:number)=>a+clamp(b-a,-n,n);
const finite=(n:number)=>Number.isFinite(n);
const LANE:Record<FootId,{x:number;depth:number}>={near:{x:-5,depth:0},far:{x:7,depth:-6}};
export function projectModel(p:ModelPoint):ScreenPoint{return{x:p.x,y:.5*p.depth-CAMERA_HEIGHT*p.height};}
export function screenGround(p:ScreenPoint):ModelPoint{return{x:p.x,depth:p.y*2,height:0};}
export function distanceModel(a:ModelPoint,b:ModelPoint){return norm(sub(a,b));}
interface Swing {start:number;duration:number;from:ModelPoint;to:ModelPoint;velocity:ModelPoint;lift:number}
export interface FootState {mode:'contact'|'swing';position:ModelPoint;velocity:ModelPoint;anchor:ModelPoint;swing?:Swing;releaseAt:number;plantId:number}
export interface LocomotionState {time:number;root:ScreenPoint;mode:'idle'|'travel'|'settle';direction:ScreenPoint;velocity:ScreenPoint;hipHeight:number;poleAngle:number;nextLanding:number;plantSequence:number;feet:Record<FootId,FootState>}
const ankleAt=(root:ScreenPoint,id:FootId):ModelPoint=>{const p=screenGround(root),lane=LANE[id];return{x:p.x+lane.x,depth:p.depth+lane.depth,height:ANKLE_HEIGHT};};
export function createLocomotion(root:ScreenPoint={x:0,y:0}):LocomotionState{
 const foot=(id:FootId):FootState=>{const p=ankleAt(root,id);return{mode:'contact',position:p,velocity:{x:0,depth:0,height:0},anchor:{...p,height:0},releaseAt:Infinity,plantId:id==='near'?1:2};};
 return{time:0,root:{...root},mode:'idle',direction:{x:0,y:-1},velocity:{x:0,y:0},hipHeight:NEUTRAL_HIP_HEIGHT,poleAngle:-Math.PI/2,nextLanding:Infinity,plantSequence:2,feet:{near:foot('near'),far:foot('far')}};
}
/** The endpoint is honestly clamped when unreachable; error is exposed, never
 * disguised by moving the root or changing anatomical segment lengths. */
export function solveLeg3D(start:ModelPoint,target:ModelPoint,pole:ModelPoint){
 const delta=sub(target,start),raw=norm(delta),d=clamp(raw,Math.abs(FEMUR-TIBIA)+1e-7,FEMUR+TIBIA-1e-7),u=unit(delta),end=add(start,mul(u,d));
 let v=sub(pole,mul(u,dot(pole,u)));if(norm(v)<EPS)v=sub({x:1,depth:0,height:0},mul(u,u.x));if(norm(v)<EPS)v={x:0,depth:1,height:0};v=unit(v);
 const along=(FEMUR*FEMUR-TIBIA*TIBIA+d*d)/(2*d),off=Math.sqrt(Math.max(0,FEMUR*FEMUR-along*along)),knee=add(add(start,mul(u,along)),mul(v,off));
 return{hip:copy(start),knee,ankle:end,requested:copy(target),reachError:distanceModel(end,target),modelLengths:{femur:FEMUR,tibia:TIBIA}};
}
function sampleSwing(s:Swing,t:number):{position:ModelPoint;velocity:ModelPoint}{
 const q=clamp((t-s.start)/s.duration,0,1),q2=q*q,q3=q2*q,h00=2*q3-3*q2+1,h10=q3-2*q2+q,h01=-2*q3+3*q2;
 const dh00=(6*q2-6*q)/s.duration,dh10=(3*q2-4*q+1),dh01=(-6*q2+6*q)/s.duration;
 const position=add(add(mul(s.from,h00),mul(s.velocity,h10*s.duration)),mul(s.to,h01));
 const velocity=add(add(mul(s.from,dh00),mul(s.velocity,dh10)),mul(s.to,dh01));
 const arc=Math.sin(Math.PI*q)**2;position.height+=s.lift*arc;velocity.height+=s.lift*Math.PI*Math.sin(2*Math.PI*q)/s.duration;
 return{position,velocity};
}
function startSwing(state:LocomotionState,id:FootId,to:ModelPoint,duration:number,lift=SWING_LIFT){
 const f=state.feet[id];f.mode='swing';f.swing={start:state.time,duration:Math.max(duration,.08),from:copy(f.position),to:copy(to),velocity:copy(f.velocity),lift};f.releaseAt=Infinity;
}
function travelSwing(state:LocomotionState,id:FootId,landing:number){
 const duration=Math.max(.08,landing-state.time),future={x:state.root.x+state.velocity.x*duration+state.direction.x*LEAD,y:state.root.y+state.velocity.y*duration+state.direction.y*LEAD};
 startSwing(state,id,ankleAt(future,id),duration);
}
function sampleFeet(state:LocomotionState){for(const id of ['near','far'] as const){const f=state.feet[id];if(f.mode==='contact'){f.position={...f.anchor,height:ANKLE_HEIGHT};f.velocity={x:0,depth:0,height:0};continue;}const s=f.swing!,sample=sampleSwing(s,state.time);f.position=sample.position;f.velocity=sample.velocity;if(state.time>=s.start+s.duration-EPS){f.position=copy(s.to);f.velocity={x:0,depth:0,height:0};f.anchor={...s.to,height:0};f.mode='contact';f.swing=undefined;f.plantId=++state.plantSequence;f.releaseAt=state.mode==='travel'?s.start+s.duration+CONTACT_TIME:Infinity;}}}
function requiredHeightCap(state:LocomotionState,contactsOnly:boolean){
 const r=screenGround(state.root);let cap=Infinity;
 for(const id of ['near','far'] as const){const f=state.feet[id];if(contactsOnly&&f.mode!=='contact')continue;const lane=LANE[id],dx=f.position.x-r.x-lane.x,dd=f.position.depth-r.depth-lane.depth-HIP_DEPTH,flat=dx*dx+dd*dd;
  cap=Math.min(cap,f.position.height+Math.sqrt(Math.max(0,(FEMUR+TIBIA-1e-5)**2-flat)));
 }return cap;
}
function movingHeight(state:LocomotionState){
 const {x,y}=state.direction;let maxFlat=0;
 for(const along of [LEAD+1.5,LEAD-150*CONTACT_TIME])maxFlat=Math.max(maxFlat,(along*x)**2+(2*along*y-HIP_DEPTH)**2);
 const safe=ANKLE_HEIGHT+Math.sqrt(Math.max(0,(FEMUR+TIBIA-.1)**2-maxFlat))-1;
 return Math.min(NEUTRAL_HIP_HEIGHT,safe);
}
/** Mutates only the supplied transient controller. dt must be a bounded resolved
 * simulation step; callers must reset explicitly for teleport/area transitions.
 * No movement/collision/input authority is provided by this experiment. */
export function advanceLocomotion(state:LocomotionState,root:ScreenPoint,dt:number){
 if(!finite(root.x)||!finite(root.y)||!finite(dt)||dt<=0||dt>.05)throw new Error('Expected finite collision-resolved root and 0 < dt <= .05');
 const dx=root.x-state.root.x,dy=root.y-state.root.y,speed=Math.hypot(dx,dy)/dt,moving=speed>.01,stopping=!moving&&state.mode==='travel';state.time+=dt;if(!stopping)sampleFeet(state);state.root={...root};state.velocity={x:dx/dt,y:dy/dt};
 if(moving){state.direction={x:dx/(speed*dt),y:dy/(speed*dt)};if(state.mode!=='travel'){
   state.mode='travel';state.nextLanding=state.time+.13;travelSwing(state,'near',state.nextLanding);state.nextLanding+=.12;state.feet.far.releaseAt=state.time+1/60;
  }
  for(const id of ['near','far'] as const){const f=state.feet[id];if(f.mode==='contact'&&state.time>=f.releaseAt-EPS){travelSwing(state,id,Math.max(state.nextLanding,state.time+.12));state.nextLanding=Math.max(state.nextLanding,state.time+.12)+STEP_TIME;}}
 }else{
  if(state.mode==='travel'){
   state.mode='settle';state.nextLanding=Infinity;for(const id of ['near','far'] as const){const f=state.feet[id];f.releaseAt=Infinity;if(f.mode==='swing'){const to=ankleAt(root,id),delta=sub(to,f.position),u=unit(delta);f.velocity=mul(u,clamp(dot(f.velocity,u),0,2*norm(delta)/.16));startSwing(state,id,to,.16,2);}}
  }
  if(state.mode==='settle'&&Object.values(state.feet).every(f=>f.mode==='contact')){
   const id=(['near','far'] as FootId[]).sort((a,b)=>distanceModel(state.feet[b].position,ankleAt(root,b))-distanceModel(state.feet[a].position,ankleAt(root,a)))[0];
   if(distanceModel(state.feet[id].position,ankleAt(root,id))>.001)startSwing(state,id,ankleAt(root,id),.16,2);else state.mode='idle';
  }
 }
 // Heading changes rotate the knee pole; they never mirror planted foot anchors.
 const desired=state.mode==='idle'?-Math.PI/2:Math.atan2(state.direction.y*2,state.direction.x),delta=Math.atan2(Math.sin(desired-state.poleAngle),Math.cos(desired-state.poleAngle));state.poleAngle+=clamp(delta,-8*dt,8*dt);
 const desiredH=state.mode==='travel'?movingHeight(state):state.mode==='settle'?state.hipHeight:NEUTRAL_HIP_HEIGHT;
 state.hipHeight=toward(state.hipHeight,desiredH,75*dt);
 // The actual requested contact/swing reach envelope can lower the pelvis
 // honestly; neither collision root nor anatomical leg lengths are moved.
 state.hipHeight=Math.min(state.hipHeight,requiredHeightCap(state,false));
 sampleFeet(state);
 return locomotionPose(state);
}
export function locomotionPose(state:LocomotionState){
 const r=screenGround(state.root),pole={x:Math.cos(state.poleAngle),depth:Math.sin(state.poleAngle),height:0};
 const legs={} as Record<FootId,ReturnType<typeof solveLeg3D>&{screen:{hip:ScreenPoint;knee:ScreenPoint;ankle:ScreenPoint;sole:ScreenPoint};contact:boolean;plantId:number;worldAnchor:ModelPoint}>;
 for(const id of ['near','far'] as const){const lane=LANE[id],f=state.feet[id],hip={x:r.x+lane.x,depth:r.depth+lane.depth+HIP_DEPTH,height:state.hipHeight},leg=solveLeg3D(hip,f.position,pole);
  legs[id]={...leg,screen:{hip:projectModel(hip),knee:projectModel(leg.knee),ankle:projectModel(leg.ankle),sole:projectModel({...f.position,height:f.position.height-ANKLE_HEIGHT})},contact:f.mode==='contact',plantId:f.plantId,worldAnchor:copy(f.anchor)};
 }
 return{time:state.time,mode:state.mode,root:{...state.root},hipHeight:state.hipHeight,neutralHipHeight:NEUTRAL_HIP_HEIGHT,legs};
}
