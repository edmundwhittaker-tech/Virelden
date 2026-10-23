import type {Page} from '@playwright/test';

/** QA-owned canvas/recorder only. Calls the game's copied read-only debug getter;
 * never writes the game, its saves, assets, time, root, equipment or input state.
 * A new source-game frame is copied once at integer coordinates,1:1. */
export async function startControllerCapture(page:Page){
 return page.evaluate(()=>{
  const source=document.querySelector('#game canvas')as HTMLCanvasElement;
  if(!source||source.width!==1280||source.height!==800)throw Error('Expected unchanged1280×800 source-game canvas');
  const canvas=document.createElement('canvas');canvas.id='qa-player-controller-crop';canvas.width=720;canvas.height=300;
  Object.assign(canvas.style,{position:'fixed',left:'0',top:'-400px',pointerEvents:'none'});document.body.append(canvas);
  const context=canvas.getContext('2d')!;context.imageSmoothingEnabled=false;
  const own:any={source,canvas,context,stage:'initial',samples:[],events:[],running:true,lastFrame:-1,raf:0,copyCallbacks:0};
  const event=(e:KeyboardEvent|MouseEvent)=>{if(e instanceof MouseEvent&&e.target!==source)return;const s=(window as any).vireldenDebug();own.events.push({kind:'native-input',type:e.type,code:'code'in e?e.code:undefined,button:'button'in e?e.button:undefined,clientX:'clientX'in e?e.clientX:undefined,clientY:'clientY'in e?e.clientY:undefined,wall:performance.now(),gameFrame:s.timing.frames,simulationTime:s.time,stage:own.stage});};
  own.event=event;for(const name of['keydown','keyup','mousedown','mouseup','click'])window.addEventListener(name,event as EventListener,true);
  const copy=()=>{
   if(!own.running)return;own.copyCallbacks++;
   const debug=(window as any).vireldenDebug();
   if(debug.timing.frames!==own.lastFrame){
    own.lastFrame=debug.timing.frames;
    // Centre the root vertically too: a real360-degree roll swings the spear
    // below the feet. The standing-only225px anchor would clip that motion.
    const x=Math.max(0,Math.min(source.width-720,Math.round(debug.screen.x-360))),y=Math.max(0,Math.min(source.height-300,Math.round(debug.screen.y-150)));
    context.drawImage(source,x,y,720,300,0,0,720,300);
    own.samples.push({wall:performance.now(),stage:own.stage,crop:{x,y,width:720,height:300,sourceWidth:source.width,sourceHeight:source.height,destinationWidth:720,destinationHeight:300,integerSourceCrop:true,rescaled:false,interpolation:false},debug});
   }
   own.raf=requestAnimationFrame(copy);
  };
  copy();
  const stream=canvas.captureStream(30),mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp8')?'video/webm;codecs=vp8':'video/webm',recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4_000_000}),chunks:Blob[]=[];
  own.stream=stream;own.recorder=recorder;own.done=new Promise<string>(resolve=>recorder.addEventListener('stop',()=>{const reader=new FileReader();reader.onloadend=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:mimeType}));}));
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start(100);(window as any).__qaPlayerControllerEvidence=own;
  return{settings:stream.getVideoTracks()[0].getSettings(),requestedFPS:30,sourceWidth:source.width,sourceHeight:source.height,cropWidth:720,cropHeight:300,rescaled:false,syntheticFrameFilling:false};
 });
}

export async function controllerStage(page:Page,label:string,detail:unknown=null){
 await page.evaluate(({label,detail})=>{const own=(window as any).__qaPlayerControllerEvidence;if(!own)return;const s=(window as any).vireldenDebug();own.stage=label;own.events.push({kind:'stage',label,detail,wall:performance.now(),gameFrame:s.timing.frames,simulationTime:s.time});},{label,detail});
}

export async function stopControllerCapture(page:Page){
 return page.evaluate(async()=>{
  const own=(window as any).__qaPlayerControllerEvidence;if(!own)return null;
  own.running=false;cancelAnimationFrame(own.raf);for(const name of['keydown','keyup','mousedown','mouseup','click'])window.removeEventListener(name,own.event,true);
  own.recorder.stop();const video=await own.done;own.stream.getTracks().forEach((track:MediaStreamTrack)=>track.stop());const finalPNG=own.canvas.toDataURL('image/png').split(',')[1];own.canvas.remove();
  const result={video,finalPNG,samples:own.samples,events:own.events,copyCallbacks:own.copyCallbacks,uniqueSourceGameFrames:own.samples.length,sourceCanvasUnchanged:true,integerCrop:true,rescaled:false,syntheticFrameFilling:false};delete(window as any).__qaPlayerControllerEvidence;return result;
 });
}

export async function nextGameFrame(page:Page){const frame=await page.evaluate(()=>(window as any).vireldenDebug().timing.frames);await page.waitForFunction(frame=>(window as any).vireldenDebug().timing.frames>frame,frame,{polling:'raf',timeout:5_000});}
