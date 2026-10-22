import Phaser from'phaser';import floorUrl from'./assets/environment-v1/slate-court.webp';
import{FixtureKnightSprite,type ArmorSetId}from'../experiments/gait/fixture/FixtureKnightSprite.js';
import{buildTrace,traceMetrics,type Route,type TraceFrame}from'../experiments/gait/routes.js';
const route=document.querySelector<HTMLSelectElement>('#route')!,armour=document.querySelector<HTMLSelectElement>('#armour')!,slider=document.querySelector<HTMLInputElement>('#time')!,markers=document.querySelector<HTMLInputElement>('#markers')!,follow=document.querySelector<HTMLInputElement>('#follow')!,status=document.querySelector('#status')!;
let paused=false,clock=0;document.querySelector('#pause')!.addEventListener('click',()=>paused=!paused);slider.addEventListener('input',()=>{paused=true;clock=Number(slider.value);});route.addEventListener('change',()=>clock=0);
const traces=Object.fromEntries((['east','northeast','southeast','turns']as Route[]).map(r=>[r,buildTrace(r)]))as Record<Route,TraceFrame[]>;
class GaitComparison extends Phaser.Scene{
 actors:FixtureKnightSprite[]=[];floors:{image:Phaser.GameObjects.Image;offset:{x:number;y:number}}[][]=[];debug:Phaser.GameObjects.Graphics[]=[];current!:TraceFrame;recordingActive=false;recorded:any[]=[];
 preload(){FixtureKnightSprite.preload(this);this.load.image('gait-court',floorUrl);}
 create(){
  for(let i=0;i<4;i++){
   const col=i%2,row=Math.floor(i/2),x=col*600,y=row*410;
   const maskGraphic=this.make.graphics({x:0,y:0}).fillStyle(0xffffff).fillRect(x,y,600,410),mask=maskGraphic.createGeometryMask();
   const patches=[];for(const px of[0,450])for(const py of[0,-220,220])patches.push({image:this.add.image(0,0,'gait-court').setTint(0xadb8b7).setDepth(-1000).setMask(mask),offset:{x:px,y:py}});this.floors.push(patches);
   const actor=new FixtureKnightSprite(this);actor.setMask(mask);this.actors.push(actor);this.debug.push(this.add.graphics().setDepth(9000).setMask(mask));
   this.add.text(x+12,y+12,(col?'CANDIDATE world-foot planner':'CURRENT time-only walk')+(row?' /3x':' /88px'),{fontSize:'15px',color:'#e0e4d5',backgroundColor:'#152023'}).setDepth(10000);
  }
  this.add.graphics().lineStyle(1,0x81938a).lineBetween(600,0,600,820).lineBetween(0,410,1200,410).setDepth(10000);
  Object.assign(window,{gaitHarness:{ready:true,gameplayDefaultChanged:false,render:(options:{route?:Route;time?:number;markers?:boolean;follow?:boolean;armour?:ArmorSetId})=>{paused=true;if(options.route)route.value=options.route;if(options.time!==undefined)clock=options.time;if(options.markers!==undefined)markers.checked=options.markers;if(options.follow!==undefined)follow.checked=options.follow;if(options.armour)armour.value=options.armour;this.drawFrame();return this.snapshot();},play:()=>paused=false,pause:()=>paused=true,snapshot:()=>this.snapshot(),metrics:()=>traceMetrics(traces[route.value as Route]),startRecording:()=>{this.recorded=[];this.recordingActive=true;},stopRecording:()=>{this.recordingActive=false;return this.recordingReport();}}});
  this.drawFrame();
 }
 update(_:number,delta:number){if(!paused)clock=(clock+delta/1000)%4;this.drawFrame();}
 captureRendered(){
  const f=this.current,camera=follow.checked?f.position:{x:0,y:0};
  return this.actors.map((actor,i)=>{const row=Math.floor(i/2),scale=row?3:1,anchor={x:(i%2)*600+250,y:row?770:260},raw=actor.renderGeometry();const world=(p:{x:number;y:number})=>({x:(p.x-anchor.x)/scale+camera.x,y:(p.y-anchor.y)/scale+camera.y});return{parts:Object.fromEntries(Object.entries(raw.parts).map(([id,p])=>[id,world(p)])),crown:world(raw.crown)};});
 }
 recordingReport(){
  let maxAnkleError=0,maxSupportFrameDelta=0,maxSupportDrift=0,maxCrownFrameDelta=0,maxJointFrameDelta=0;const jumps:any[]=[];
  for(let i=0;i<this.recorded.length;i++){const f=this.recorded[i];maxAnkleError=Math.max(maxAnkleError,f.ankleError);if(!i)continue;const a=this.recorded[i-1],dt=f.time-a.time;if(dt<=0)continue;
   if(a.supportId===f.supportId&&a.steps===f.steps){const side=f.nearId===f.supportId?'near':'far',oldSide=a.nearId===a.supportId?'near':'far',p=a.parts['foot_'+oldSide],q=f.parts['foot_'+side];const distance=Math.hypot(p.x-q.x,p.y-q.y);maxSupportFrameDelta=Math.max(maxSupportFrameDelta,distance);maxSupportDrift=Math.max(maxSupportDrift,distance/dt);}
   maxCrownFrameDelta=Math.max(maxCrownFrameDelta,Math.abs(f.crown.y-f.position.y-a.crown.y+a.position.y));
   for(const[id,p]of Object.entries(f.parts)as[string,{x:number;y:number}][]){const q=a.parts[id],delta=Math.hypot(p.x-q.x,p.y-q.y);if(delta>maxJointFrameDelta){maxJointFrameDelta=delta;jumps.push({time:f.time,id,delta,viewChanged:f.view!==a.view||f.flipped!==a.flipped});}}
  }
  return{metrics:{samples:this.recorded.length,maxRenderedAnkleError:maxAnkleError,maxRenderedSupportDriftPxPerSecond:maxSupportDrift,maxRenderedSupportFrameDelta:maxSupportFrameDelta,maxRenderedCrownFrameDelta:maxCrownFrameDelta,maxRenderedJointFrameDelta:maxJointFrameDelta,largestJointJumps:jumps.slice(-5),gameplayDefaultChanged:false},samples:this.recorded};
 }
 snapshot(){return{rendered:this.captureRendered(),route:route.value,time:this.current.time,worldPosition:{...this.current.position},metrics:traceMetrics(traces[route.value as Route]),gait:{supportId:this.current.gait.supportId,bodyOffset:{...this.current.gait.bodyOffset},feet:this.current.gait.feet},actors:this.actors.map(a=>a.snapshot())};}
 drawFrame(){
  const trace=traces[route.value as Route],f=trace[Math.max(0,Math.min(trace.length-1,Math.round(clock*60)))];this.current=f;slider.value=String(f.time);
  for(let i=0;i<4;i++){
   const col=i%2,row=Math.floor(i/2),scale=row?3:1,anchor={x:col*600+250,y:row?770:260},camera=follow.checked?f.position:{x:0,y:0};
   const position={x:anchor.x+(f.position.x-camera.x)*scale,y:anchor.y+(f.position.y-camera.y)*scale};
   for(const patch of this.floors[i])patch.image.setPosition(anchor.x+(patch.offset.x-camera.x)*scale,anchor.y+(patch.offset.y-camera.y)*scale).setDisplaySize(1024*scale,512*scale);
   const set=armour.value as ArmorSetId;this.actors[i].setEquipment({helmet:set,chest:set,gauntlets:set,legs:set});this.actors[i].drawWithPose({...f.input,position},col?f.newPose:f.oldPose);this.actors[i].effects(0xffffff,0,1,scale);
   const g=this.debug[i];g.clear();if(markers.checked){for(const side of['near','far']as const){const p=col?f.gait.feet[side].ground:{x:f.position.x+f.oldPose.feet[side].x,y:f.position.y+f.oldPose.feet[side].y};const x=anchor.x+(p.x-camera.x)*scale,y=anchor.y+(p.y-camera.y)*scale;g.lineStyle(1,side==='near'?0xe0ac60:0x86bbcb).strokeCircle(x,y,4*scale);}}
  }
  if(this.recordingActive){const rendered=this.captureRendered();let ankleError=0;for(const i of[1,3])for(const side of['near','far']as const){const p=rendered[i].parts['foot_'+side],q=f.gait.feet[side].display;ankleError=Math.max(ankleError,Math.hypot(p.x-q.x,p.y-q.y));}this.recorded.push({time:f.time,position:{...f.position},view:f.input.view,flipped:f.input.flipped,motion:f.input.motion,supportId:f.gait.supportId,nearId:f.gait.state.nearId,steps:f.gait.state.steps,parts:rendered[1].parts,crown:rendered[1].crown,ankleError});}
  const m=traceMetrics(trace);status.textContent=`t${f.time.toFixed(3)}s |150px/s | support drift current:${m.oldMaxSupportSlidePxPerSecond.toFixed(2)}px/s candidate:${m.newMaxSupportSlidePxPerSecond.toFixed(6)}px/s | max crown drop:${m.maxCrownDrop.toFixed(1)}px | candidate only; not gameplay acceptance`;
 }
}
new Phaser.Game({type:Phaser.CANVAS,width:1200,height:820,parent:'game',backgroundColor:'#1d282b',scene:GaitComparison,banner:false,audio:{noAudio:true},render:{antialias:true,pixelArt:false}});
