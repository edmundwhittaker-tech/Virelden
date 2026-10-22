import type {Page} from '@playwright/test';

/** Test-only observation of real WebAudio. Never changes gameplay or bypasses autoplay. */
export async function installAudioObserver(page:Page):Promise<void>{
 await page.addInitScript(()=>{
  const Native=window.AudioContext,contexts:any[]=[],sources:any[]=[],events:any[]=[],pending:{resolve:()=>void;reject:(error:unknown)=>void}[]=[];
  let defer=false,nextSource=0,overflowed=false;
  const emit=(kind:string,detail:any={})=>{if(events.length<256)events.push({kind,at:performance.now(),...detail});};
  const activation=()=>navigator.userActivation.isActive;
  const snapshot=()=>({overflowed,contextCount:contexts.length,contexts:contexts.map(c=>({state:c.context.state,constructorActivation:c.constructorActivation,buffers:c.buffers,resumeCalls:c.resumeCalls,suspendCalls:c.suspendCalls,closeCalls:c.closeCalls})),totalStarts:sources.filter(s=>s.started).length,activeSources:sources.filter(s=>s.active).length,maxActiveSources:Math.max(0,...contexts.map(c=>c.maxActive)),bufferCount:contexts.reduce((n,c)=>n+c.buffers,0),pendingResumes:pending.length,events:events.map(e=>({...e})),sources:sources.map(({node,...s})=>({...s}))});
  const observe=(context:AudioContext)=>{
   const record={context,constructorActivation:activation(),buffers:0,resumeCalls:0,suspendCalls:0,closeCalls:0,maxActive:0};contexts.push(record);emit('context',{activation:record.constructorActivation});
   const resume=context.resume.bind(context),suspend=context.suspend.bind(context),close=context.close.bind(context),createBuffer=context.createBuffer.bind(context),createSource=context.createBufferSource.bind(context);
   context.resume=()=>{record.resumeCalls++;emit('resume',{activation:activation()});const actual=resume();if(!defer)return actual;return new Promise<void>((resolve,reject)=>{actual.then(()=>pending.push({resolve,reject}),reject);});};
   context.suspend=()=>{record.suspendCalls++;emit('suspend');return suspend();};
   context.close=()=>{record.closeCalls++;emit('close');for(const source of sources)if(source.context===contexts.indexOf(record))source.active=false;return close();};
   context.createBuffer=(...args:Parameters<AudioContext['createBuffer']>)=>{record.buffers++;return createBuffer(...args);};
   context.createBufferSource=()=>{
    const node=createSource();if(sources.length>=10000){overflowed=true;return node;}const source={node,id:++nextSource,context:contexts.indexOf(record),started:false,active:false,stops:0,immediateStops:0,disconnected:false};sources.push(source);
    const start=node.start.bind(node),stop=node.stop.bind(node),disconnect=node.disconnect.bind(node);
    node.start=((...args:any[])=>{start(...args as [number,number,number]);source.started=true;source.active=true;record.maxActive=Math.max(record.maxActive,sources.filter(s=>s.context===source.context&&s.active).length);emit('start',{id:source.id});}) as AudioBufferSourceNode['start'];
    node.stop=(when?:number)=>{source.stops++;if(when===undefined||when<=context.currentTime){source.immediateStops++;source.active=false;}emit('stop',{id:source.id,scheduled:when!==undefined&&when>context.currentTime});return stop(when);};
    node.disconnect=((...args:any[])=>{source.disconnected=true;source.active=false;emit('disconnect',{id:source.id});return (disconnect as any)(...args);}) as AudioBufferSourceNode['disconnect'];
    node.addEventListener('ended',()=>{source.active=false;emit('ended',{id:source.id});},{once:true});return node;
   };
   return context;
  };
  window.AudioContext=new Proxy(Native,{construct(target,args){return observe(Reflect.construct(target,args,target));}});
  document.addEventListener('keydown',event=>{if((event.target as HTMLElement)?.id==='sound-volume'&&event.code.startsWith('Arrow'))queueMicrotask(()=>emit('range-key',{code:event.code,prevented:event.defaultPrevented}));});
  (window as any).__audioProbe={snapshot,setDeferred:(value:boolean)=>{defer=value;},release:(reverse=false)=>{const batch=pending.splice(0);if(reverse)batch.reverse();for(const item of batch)item.resolve();}};
 });
}
export const audioSnapshot=(page:Page):Promise<any>=>page.evaluate(()=>(window as any).__audioProbe.snapshot());
export const setAudioResumeDeferral=(page:Page,value:boolean)=>page.evaluate(value=>(window as any).__audioProbe.setDeferred(value),value);
export const releaseAudioResumes=(page:Page,reverse=false)=>page.evaluate(reverse=>(window as any).__audioProbe.release(reverse),reverse);
