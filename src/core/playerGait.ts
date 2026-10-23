/** Candidate player directional geometry; not a released/accepted animation.
 * P(X,D,H)=(X,.5D-sqrt(3)/2 H). Fixed ANATOMICAL lengths are18/C,20/C;
 * projected segment lengths genuinely vary. `artSpan` is transverse plate-fit
 * calibration, not permission to stretch an unreachable axial endpoint.
 *
 * East foot path/cadence/drop remain the authored72px control. Its projected
 * knees are NOT numerically identical to the old fixed-screen18/20 IK.
 * Caller supplies persistent-leg→visual-role mapping explicitly; source near/far
 * labels alone do not prove anatomical identity. A changed mapping/view replans
 * visible feet, never instantly mirrors world plants. Redirects are authored
 * airborne C0 blends, not foot-lock/velocity-continuity or turn acceptance.
 * Stationary view/role changes blend both hips and feet together with an honest
 * airborne pickup. Native body/plate cohesion and turn acceptance are pending,
 * even when all model bones and requested endpoints are exact.
 * No art, input, collision, action, save, or time authority is provided.
 */
export interface JogScreen {x:number;y:number}
export interface JogModel {x:number;depth:number;height:number}
export type JogLeg='a'|'b';
export interface JogFrame {view:'front'|'rear';flipped:boolean;nearLeg:JogLeg}
export const JOG_CAMERA=Math.sqrt(3)/2;
export const JOG_FEMUR=18/JOG_CAMERA,JOG_TIBIA=20/JOG_CAMERA,JOG_ANKLE=4/JOG_CAMERA;
const TAU=2*Math.PI,LEGS=['a','b']as const,EPS=1e-8,REPLACEMENT_SECONDS=.18;
const copy=(p:JogModel):JogModel=>({...p});
const add=(a:JogModel,b:JogModel):JogModel=>({x:a.x+b.x,depth:a.depth+b.depth,height:a.height+b.height});
const sub=(a:JogModel,b:JogModel):JogModel=>({x:a.x-b.x,depth:a.depth-b.depth,height:a.height-b.height});
const mul=(p:JogModel,n:number):JogModel=>({x:p.x*n,depth:p.depth*n,height:p.height*n});
const dot=(a:JogModel,b:JogModel)=>a.x*b.x+a.depth*b.depth+a.height*b.height;
const norm=(p:JogModel)=>Math.sqrt(dot(p,p));
const unit=(p:JogModel):JogModel=>norm(p)>EPS?mul(p,1/norm(p)):{x:0,depth:-1,height:0};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const smooth=(n:number)=>{n=clamp(n,0,1);return n*n*(3-2*n);};
const mix=(a:JogModel,b:JogModel,t:number)=>add(a,mul(sub(b,a),t));
// Redirects may begin mid-flight. Fill only the remaining authored pickup
// envelope instead of adding another arc and accumulating lift on rapid turns.
const pickup=(p:JogModel,q:number):JogModel=>({...p,height:p.height+Math.max(0,JOG_ANKLE+1.2/JOG_CAMERA-p.height)*Math.sin(Math.PI*q)**2});
const other=(leg:JogLeg):JogLeg=>leg==='a'?'b':'a';
export function projectJog(p:JogModel):JogScreen{return{x:p.x,y:.5*p.depth-JOG_CAMERA*p.height};}
export function directionalProfile(direction:JogScreen){const vertical=Math.abs(direction.y),amplitude=12-3*vertical;return{amplitude,stanceFraction:2*amplitude/72,bodyDrop:2.5+vertical,launchSeconds:.1-.02*vertical};}
function template(frame:JogFrame){
 const rear=frame.view==='rear',mirror=frame.flipped?-1:1;
 const role=(near:boolean)=>({foot:{x:(near?(rear?7:-5):(rear?-5:7))*mirror,depth:near?0:-6,height:JOG_ANKLE},hip:{x:(near?(rear?7:-5):(rear?-5:7))*mirror,depth:near?0:-6,height:42/JOG_CAMERA}});
 const n=role(true),f=role(false);return frame.nearLeg==='a'?{a:n,b:f}:{a:f,b:n};
}
function equalFrame(a:JogFrame,b:JogFrame){return a.view===b.view&&a.flipped===b.flipped&&a.nearLeg===b.nearLeg;}
interface Redirect {reason:'restart'|'reversal'|'turn'|'view';time:number;feet:Record<JogLeg,JogModel>;hips:Record<JogLeg,JogModel>;poleAngle:number;weight:number}
interface Stop {first:JogLeg;stage:number;time:number;from:Record<JogLeg,JogModel>}
export interface DirectionalJogState {
 root:JogScreen;frame:JogFrame;direction:JogScreen;phase:number;weight:number;poleAngle:number;
 mode:'idle'|'travel'|'settle'|'turn';feet:Record<JogLeg,JogModel>;hips:Record<JogLeg,JogModel>;
 requestedGrounded:Record<JogLeg,boolean>;redirect?:Redirect;stop?:Stop;
}
export function createDirectionalJog(root:JogScreen={x:0,y:0},frame:JogFrame={view:'front',flipped:false,nearLeg:'a'}):DirectionalJogState{
 const t=template(frame);return{root:{...root},frame:{...frame},direction:{x:1,y:0},phase:0,weight:0,poleAngle:0,mode:'idle',feet:{a:copy(t.a.foot),b:copy(t.b.foot)},hips:{a:copy(t.a.hip),b:copy(t.b.hip)},requestedGrounded:{a:true,b:true}};
}
function sampleTravel(s:DirectionalJogState,leg:JogLeg){
 const profile=directionalProfile(s.direction),t=template(s.frame)[leg],q=((s.phase/TAU+(leg==='b'?.5:0))%1+1)%1;
 const grounded=q<profile.stanceFraction,u=grounded?q/profile.stanceFraction:(q-profile.stanceFraction)/(1-profile.stanceFraction);
 const stroke=profile.amplitude*(grounded?1-2*u:-1+2*smooth(u)),lift=grounded?0:1.2*Math.sin(Math.PI*u)**2;
 const amount=grounded?1:smooth(s.weight);
 return{foot:{x:t.foot.x+s.direction.x*stroke*amount,depth:t.foot.depth+2*s.direction.y*stroke*amount,height:JOG_ANKLE+lift*amount/JOG_CAMERA},hip:{...t.hip,height:t.hip.height-profile.bodyDrop*smooth(s.weight)/JOG_CAMERA},grounded};
}
function beginRedirect(s:DirectionalJogState,reason:Redirect['reason']){s.redirect={reason,time:0,feet:{a:copy(s.feet.a),b:copy(s.feet.b)},hips:{a:copy(s.hips.a),b:copy(s.hips.b)},poleAngle:s.poleAngle,weight:s.weight};}
/** Call once per bounded collision-resolved simulation step, not render frame.
 * Reset on teleport/area/load. Pauses must not call this with invented time.
 * Root is copied exactly. Contact intent is separate from actual reach/sole.
 */
export function advanceDirectionalJog(s:DirectionalJogState,root:JogScreen,dt:number,frame:JogFrame=s.frame){
 if(!Number.isFinite(root.x)||!Number.isFinite(root.y)||!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('Expected finite collision-resolved root and0<dt<=.05');
 const dx=root.x-s.root.x,dy=root.y-s.root.y,distance=Math.hypot(dx,dy),moving=distance>.0001,viewChanged=!equalFrame(s.frame,frame),previousMode=s.mode;
 s.root={...root};s.frame={...frame};
 if(moving){
  const direction={x:dx/distance,y:dy/distance},alignment=direction.x*s.direction.x+direction.y*s.direction.y;
  if(previousMode==='settle'||previousMode==='turn')beginRedirect(s,'restart');else if(viewChanged)beginRedirect(s,'view');else if(previousMode==='travel'&&alignment<.985)beginRedirect(s,alignment<0?'reversal':'turn');
  s.direction=direction;const profile=directionalProfile(direction);
  if(previousMode==='idle'){s.phase=TAU*profile.stanceFraction/2;s.weight=0;}
  s.mode='travel';s.stop=undefined;s.phase+=TAU*distance/72;s.weight=Math.min(1,s.weight+dt/profile.launchSeconds);
  if(s.redirect)s.redirect.time+=dt;
  const desiredPole=Math.atan2(2*direction.y,direction.x);
  if(s.redirect){const r=s.redirect,delta=Math.atan2(Math.sin(desiredPole-r.poleAngle),Math.cos(desiredPole-r.poleAngle));s.poleAngle=r.poleAngle+delta*smooth(r.time/REPLACEMENT_SECONDS);}else s.poleAngle=desiredPole;
  for(const leg of LEGS){const f=sampleTravel(s,leg),r=s.redirect;
   if(r){const q=Math.min(1,r.time/REPLACEMENT_SECONDS),b=smooth(q);s.feet[leg]=pickup(mix(r.feet[leg],f.foot,b),q);s.hips[leg]=mix(r.hips[leg],f.hip,b);s.requestedGrounded[leg]=q>=1&&f.grounded;}
   else{s.feet[leg]=f.foot;s.hips[leg]=f.hip;s.requestedGrounded[leg]=f.grounded;}
  }
  if(s.redirect&&s.redirect.time>=REPLACEMENT_SECONDS)s.redirect=undefined;
 }else{
  // A stationary view/identity change has no planted-foot fiction: both hip
  // and foot vectors use the identical blend, hence their difference remains
  // in the convex reachable ball. The visible pickup shortens vertical reach.
  if(viewChanged||(previousMode==='travel'&&s.redirect)){
   beginRedirect(s,viewChanged?'view':'turn');s.mode='turn';s.stop=undefined;
   for(const leg of LEGS)s.requestedGrounded[leg]=false;
   return directionalJogPose(s);
  }
  if(s.mode==='turn'){
   const r=s.redirect!,t=template(s.frame);r.time+=dt;const q=Math.min(1,r.time/REPLACEMENT_SECONDS),b=smooth(q);
   for(const leg of LEGS){s.feet[leg]=pickup(mix(r.feet[leg],t[leg].foot,b),q);s.hips[leg]=mix(r.hips[leg],t[leg].hip,b);s.requestedGrounded[leg]=q>=1;}
   s.weight=r.weight*(1-b);
   if(q>=1){s.mode='idle';s.redirect=undefined;s.weight=0;for(const leg of LEGS){s.feet[leg]=copy(t[leg].foot);s.hips[leg]=copy(t[leg].hip);}}
   return directionalJogPose(s);
  }
  if(previousMode==='travel'){
   const first:JogLeg=s.requestedGrounded.a?'b':s.requestedGrounded.b?'a':s.feet.a.height<s.feet.b.height?'a':'b';
   s.mode='settle';s.redirect=undefined;s.stop={first,stage:0,time:0,from:{a:copy(s.feet.a),b:copy(s.feet.b)}};
   return directionalJogPose(s);
  }
  if(s.mode==='settle'){
   const stop=s.stop!,t=template(s.frame);stop.time+=dt;
   if(stop.stage<2){const leg=stop.stage===0?stop.first:other(stop.first),held=other(leg);
    if(stop.stage===0&&!s.requestedGrounded[held]){const land=Math.min(1,stop.time/.06);s.feet[held]={...stop.from[held],height:stop.from[held].height+(JOG_ANKLE-stop.from[held].height)*smooth(land)};s.requestedGrounded[held]=land>=1;}
    const q=Math.min(1,stop.time/.14);s.feet[leg]=mix(stop.from[leg],t[leg].foot,smooth(q));s.feet[leg].height+=1.2*Math.sin(Math.PI*q)**2/JOG_CAMERA;s.requestedGrounded[leg]=q>=1;
    const drop=directionalProfile(s.direction).bodyDrop*smooth(s.weight)/JOG_CAMERA;
    for(const id of LEGS)s.hips[id]=mix(s.hips[id],{...t[id].hip,height:t[id].hip.height-drop},Math.min(1,dt/.04));
    if(q>=1){stop.stage++;stop.time=0;stop.from={a:copy(s.feet.a),b:copy(s.feet.b)};}
   }else{s.weight=Math.max(0,s.weight-dt/.12);const drop=directionalProfile(s.direction).bodyDrop*smooth(s.weight)/JOG_CAMERA;for(const leg of LEGS)s.hips[leg]={...t[leg].hip,height:t[leg].hip.height-drop};if(s.weight===0){s.mode='idle';s.stop=undefined;for(const leg of LEGS){s.feet[leg]=copy(t[leg].foot);s.hips[leg]=copy(t[leg].hip);s.requestedGrounded[leg]=true;}}}
  }
 }
 return directionalJogPose(s);
}
/** Fixed model bones, with honest endpoint clamp and exposed error. No hipcap. */
export function solveDirectionalLeg(hip:JogModel,requested:JogModel,pole:JogModel){
 const delta=sub(requested,hip),raw=norm(delta),d=clamp(raw,Math.abs(JOG_FEMUR-JOG_TIBIA)+1e-7,JOG_FEMUR+JOG_TIBIA),u=unit(delta),ankle=add(hip,mul(u,d));
 let v=sub(pole,mul(u,dot(pole,u)));if(norm(v)<EPS)v=sub({x:1,depth:0,height:0},mul(u,u.x));v=unit(v);
 const along=(JOG_FEMUR**2-JOG_TIBIA**2+d*d)/(2*d),off=Math.sqrt(Math.max(0,JOG_FEMUR**2-along*along)),knee=add(add(hip,mul(u,along)),mul(v,off));
 return{hip:copy(hip),knee,ankle,requested:copy(requested),reachError:norm(sub(ankle,requested)),modelLengths:{femur:JOG_FEMUR,tibia:JOG_TIBIA}};
}
export function directionalJogPose(s:DirectionalJogState){
 const origin={x:s.root.x,depth:2*s.root.y,height:0},t=template(s.frame);
 const legs=Object.fromEntries(LEGS.map(leg=>{
  // Restrained authored bend plane follows travel, not a reach-optimizing pole.
  const pole={x:Math.cos(s.poleAngle),depth:Math.sin(s.poleAngle),height:0},solved=solveDirectionalLeg(add(origin,s.hips[leg]),add(origin,s.feet[leg]),pole);
  const screen={hip:projectJog(solved.hip),knee:projectJog(solved.knee),ankle:projectJog(solved.ankle),sole:projectJog({...solved.ankle,height:solved.ankle.height-JOG_ANKLE})};
  const soleHeight=solved.ankle.height-JOG_ANKLE,grounded=s.requestedGrounded[leg]&&Math.abs(soleHeight)<.025&&solved.reachError<.025;
  return[leg,{...solved,screen,requestedGrounded:s.requestedGrounded[leg],grounded,soleHeight,artSpan:{femur:18,tibia:20},projectedLengths:{femur:Math.hypot(screen.knee.x-screen.hip.x,screen.knee.y-screen.hip.y),tibia:Math.hypot(screen.ankle.x-screen.knee.x,screen.ankle.y-screen.knee.y)},neutral:t[leg].foot}];
 }))as Record<JogLeg,ReturnType<typeof solveDirectionalLeg>&{screen:{hip:JogScreen;knee:JogScreen;ankle:JogScreen;sole:JogScreen};requestedGrounded:boolean;grounded:boolean;soleHeight:number;artSpan:{femur:number;tibia:number};projectedLengths:{femur:number;tibia:number};neutral:JogModel}>;
 const bodyDrop=Math.max(0,42-JOG_CAMERA*(s.hips.a.height+s.hips.b.height)/2);
 return{kind:'directional-authored-2.5d' as const,root:{...s.root},frame:{...s.frame},direction:{...s.direction},mode:s.mode,transition:s.redirect?.reason??null,cycleDistance:72,profile:directionalProfile(s.direction),bodyDrop,legs,support:legs.a.grounded&&legs.b.grounded?'both':legs.a.grounded?'a':legs.b.grounded?'b':'none',contactMeaning:'sole-ground tolerance .025 model px; stance drift not constrained' as const};
}
