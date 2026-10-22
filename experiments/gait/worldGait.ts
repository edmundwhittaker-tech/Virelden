/** Experimental world-space foot planner. Does not change travel speed or frozen rig. */
export interface P{x:number;y:number}
export type Side='near'|'far';
interface Foot{id:0|1;ground:P;lift:number}
interface Swing{id:0|1;from:P;to:P;start:number;duration:number;startLift:number;height:number;stopping:boolean}
export interface GaitState{position:P;time:number;view:'front'|'rear';flipped:boolean;feet:[Foot,Foot];nearId:0|1;supportId:0|1;swing?:Swing;direction:P;speed:number;body:P;steps:number;phase:number;moving:boolean}
export interface GaitInput{position:P;time:number;moving:boolean;view:'front'|'rear';flipped:boolean;velocity?:P}
export interface GaitSample{state:GaitState;feet:Record<Side,{id:0|1;ground:P;display:P;lift:number}>;supportId:0|1;bodyOffset:P;phase:number;active:boolean;reachError:number;maxFootSpeed:number}
const add=(a:P,b:P):P=>({x:a.x+b.x,y:a.y+b.y});const sub=(a:P,b:P):P=>({x:a.x-b.x,y:a.y-b.y});const mul=(a:P,s:number):P=>({x:a.x*s,y:a.y*s});const len=(a:P)=>Math.hypot(a.x,a.y);const dist=(a:P,b:P)=>len(sub(a,b));const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));const mix=(a:P,b:P,t:number)=>add(mul(a,1-t),mul(b,t));const smooth=(t:number)=>t*t*(3-2*t);
const norm=(a:P,f:P={x:1,y:0})=>len(a)>1e-7?mul(a,1/len(a)):{...f};
export function baseFeet(view:'front'|'rear',flipped:boolean):Record<Side,P>{const m=flipped?-1:1;return{near:{x:(view==='rear'?7:-5)*m,y:-4},far:{x:(view==='rear'?-5:7)*m,y:-8}};}
function hipBases(view:'front'|'rear',flipped:boolean,phase:number,active:boolean){const m=flipped?-1:1,bob=active?-Math.abs(Math.sin(phase*Math.PI*2))*1.1:0;return{near:{x:(view==='rear'?6:-5)*m,y:-40+bob},far:{x:(view==='rear'?-5:6)*m,y:-43+bob}};}
function role(s:GaitState,id:0|1):Side{return id===s.nearId?'near':'far';}function foot(s:GaitState,id:0|1){return s.feet[id];}
/** Bounded body crouch/lag, preserving rigid body and both 38px leg chains. */
function fitBody(position:P,targets:Record<Side,P>,view:'front'|'rear',flipped:boolean,phase:number,active:boolean,previous:P,targetY:number,maxY=12){
 const hips=hipBases(view,flipped,phase,active);let best={body:{x:0,y:0},error:Infinity,score:Infinity};
 const centre=(targets.near.x+targets.far.x)/2-(hips.near.x+hips.far.x)/2,targetX=clamp(centre,-3,3);
 for(let y=0;y<=maxY;y+=.5)for(let x=-6;x<=6;x+=.5){let error=0;for(const side of['near','far']as const){const d=dist(add(hips[side],{x,y}),targets[side]);error+=Math.max(0,d-36.8,3-d)**2;}
  const score=error*10000+(x-targetX)**2*.4+(y-targetY)**2+(x-previous.x)**2*.35+(y-previous.y)**2*.35;
  if(score<best.score)best={body:{x,y},error:Math.sqrt(error),score};
 }return best;
}
function localTargets(s:GaitState,position=s.position){const out={}as Record<Side,P>;for(const id of[0,1]as const){const f=foot(s,id);out[role(s,id)]=add(sub(f.ground,position),{x:0,y:-f.lift});}return out;}
function lookAhead(dir:P){return dir.y<-.2?24:dir.y>.2?4:18;}
function makeSwing(s:GaitState,id:0|1,now:number,velocity:P,stopping:boolean,maxDuration=.24):Swing{
 const f=foot(s,id),bases=baseFeet(s.view,s.flipped),side=role(s,id),speed=len(velocity),u=norm(velocity,s.direction);
 let selected:Swing|undefined;
 const durations=stopping?[.14]:[maxDuration,.21,.18,.15,.12,.10,.08,.06,.04].filter((x,i,a)=>x<=maxDuration&&a.indexOf(x)===i);
 for(const duration of durations){const future=stopping?s.position:add(s.position,mul(velocity,duration));let goal=add(add(future,bases[side]),stopping?{x:0,y:0}:mul(u,maxDuration<=.12?Math.min(lookAhead(u),duration<=.06?8:u.y<-.2?18:12):lookAhead(u)));const travel=sub(goal,f.ground),limit=duration*560;if(len(travel)>limit)goal=add(f.ground,mul(norm(travel),limit));
  const checkedFuture=stopping?future:add(future,mul(velocity,.04));const targets=localTargets(s,checkedFuture);targets[side]=sub(goal,checkedFuture);const fit=fitBody(checkedFuture,targets,s.view,s.flipped,s.phase,true,s.body,stopping?1:2.5,6);
  const candidate={id,from:{...f.ground},to:goal,start:now,duration,startLift:f.lift,height:stopping?1:1.8,stopping};selected=candidate;if(fit.error<1e-5&&dist(f.ground,goal)/duration<650)break;
 }return selected!;
}
function sampleSwing(s:GaitState,now:number){const w=s.swing;if(!w)return;const t=clamp((now-w.start)/w.duration,0,1),f=foot(s,w.id);f.ground=mix(w.from,w.to,smooth(t));f.lift=w.startLift*(1-t)+w.height*Math.sin(Math.PI*t);s.phase=((s.supportId===s.nearId?0:1)+t)/2;if(t>=1-1e-8){f.ground={...w.to};f.lift=0;s.supportId=w.id;s.swing=undefined;s.steps++;}}
function copy(s:GaitState):GaitState{return{...s,position:{...s.position},feet:s.feet.map(f=>({...f,ground:{...f.ground}}))as[Foot,Foot],direction:{...s.direction},body:{...s.body},swing:s.swing?{...s.swing,from:{...s.swing.from},to:{...s.swing.to}}:undefined};}
export function updateWorldGait(previous:GaitState|undefined,input:GaitInput):GaitSample{
 const time=Number.isFinite(input.time)?input.time:0,position={x:input.position.x,y:input.position.y};let s:GaitState;
 const reset=!previous||time<previous.time||time-previous.time>.25||dist(position,previous.position)>70;
 if(reset){const b=baseFeet(input.view,input.flipped);s={position,time,view:input.view,flipped:input.flipped,feet:[{id:0,ground:add(position,b.near),lift:0},{id:1,ground:add(position,b.far),lift:0}],nearId:0,supportId:0,direction:{x:input.flipped?-1:1,y:0},speed:0,body:{x:0,y:0},steps:0,phase:0,moving:false};}
 else s=copy(previous!);
 const oldTime=s.time,oldPosition={...s.position},dt=Math.max(0,time-oldTime),wasMoving=s.moving;
 const oldFeet=s.feet.map(f=>add(f.ground,{x:0,y:-f.lift}));
 if(!reset&&dt<=1e-9&&dist(position,s.position)<1e-9&&s.view===input.view&&s.flipped===input.flipped)return finishSample(s,oldFeet,0);
 const delta=sub(position,oldPosition),velocity=input.velocity??(dt>1e-6?mul(delta,1/dt):{x:0,y:0});
 const speed=input.moving?len(velocity):0,newDirection=norm(velocity,s.direction);
 const walking=input.moving&&speed>1,turn=wasMoving&&walking&&(newDirection.x*s.direction.x+newDirection.y*s.direction.y)<.8;
 if(s.view!==input.view||s.flipped!==input.flipped){
  s.view=input.view;s.flipped=input.flipped;const b=baseFeet(s.view,s.flipped);
  const a=fitBody(oldPosition,localTargets(s),s.view,s.flipped,s.phase,wasMoving,s.body,wasMoving?2.5:0).score;
  s.nearId=(1-s.nearId)as 0|1;
  const z=fitBody(oldPosition,localTargets(s),s.view,s.flipped,s.phase,wasMoving,s.body,wasMoving?2.5:0).score;
  if(a<=z)s.nearId=(1-s.nearId)as 0|1;
 }
 const settle=(at:number)=>{
  const b=baseFeet(s.view,s.flipped),errors=s.feet.map(f=>dist(f.ground,add(s.position,b[role(s,f.id)])));
  const id=(errors[0]>errors[1]?0:1)as 0|1;
  if(errors[id]>.4){if(id===s.supportId)s.supportId=(1-id)as 0|1;s.swing=makeSwing(s,id,at,{x:0,y:0},true);}
 };
 // Commands start at the beginning of the observed simulation interval, not a
 // frame late. Consume exact landing events, including the remainder of dt.
 if(walking){
  if(s.swing&&(turn||s.swing.stopping))s.swing=makeSwing(s,s.swing.id,oldTime,velocity,false,Math.min(.12,s.swing.duration));
  if(!s.swing)s.swing=makeSwing(s,(1-s.supportId)as 0|1,oldTime,velocity,false,wasMoving?.24:.10);
  s.direction=newDirection;s.speed=speed;
 }else{
  if(s.swing&&!s.swing.stopping)s.swing=makeSwing(s,s.swing.id,oldTime,{x:0,y:0},true);
  if(!s.swing)settle(oldTime);s.speed=0;
 }
 for(let events=0;s.swing&&s.swing.start+s.swing.duration<=time+1e-9&&events<8;events++){
  const landed=s.swing.start+s.swing.duration;sampleSwing(s,landed);
  s.position=dt>1e-6?mix(oldPosition,position,clamp((landed-oldTime)/dt,0,1)):{...position};
  if(walking)s.swing=makeSwing(s,(1-s.supportId)as 0|1,landed,velocity,false,.24);else settle(landed);
 }
 sampleSwing(s,time);s.position=position;s.time=time;
 s.moving=input.moving&&speed>1;const active=s.moving||!!s.swing;
 const fit=fitBody(position,localTargets(s),s.view,s.flipped,s.phase,active,s.body,active?2.5:0);s.body=fit.body;
 return finishSample(s,oldFeet,dt);
}
function finishSample(s:GaitState,oldFeet:P[],dt:number):GaitSample{
 const active=s.moving||!!s.swing;
 let maxFootSpeed=0;for(const id of[0,1]as const)if(dt>1e-6)maxFootSpeed=Math.max(maxFootSpeed,dist(oldFeet[id],add(s.feet[id].ground,{x:0,y:-s.feet[id].lift}))/dt);
 const feet={}as GaitSample['feet'];for(const id of[0,1]as const){const f=s.feet[id];feet[role(s,id)]={id,ground:{...f.ground},display:add(f.ground,{x:0,y:-f.lift}),lift:f.lift};}
 return{state:s,feet,supportId:s.supportId,bodyOffset:{...s.body},phase:s.phase,active,reachError:Math.max(...Object.entries(localTargets(s)).map(([side,target])=>Math.max(0,dist(add(hipBases(s.view,s.flipped,s.phase,active)[side as Side],s.body),target)-38))),maxFootSpeed};
}
