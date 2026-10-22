import {test,expect,chromium} from '@playwright/test';
import {spawn,type ChildProcess} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {audioObserverInit} from './audio-observer';

/** Raw browser CDP: no Playwright page/session exists to force focus emulation. */
class RawCDP{
 private next=0;
 private pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 private constructor(private socket:WebSocket){
  socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id)return;const pending=this.pending.get(message.id);if(!pending)return;clearTimeout(pending.timer);this.pending.delete(message.id);if(message.error)pending.reject(new Error(JSON.stringify(message.error)));else pending.resolve(message.result);});
  socket.addEventListener('close',()=>{for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error('Raw CDP connection closed'));}this.pending.clear();});
 }
 static async connect(url:string){const socket=new WebSocket(url);await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{socket.close();reject(new Error('Raw CDP connection timeout'));},15_000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Raw CDP connection failed'));},{once:true});});return new RawCDP(socket);}
 send(method:string,params:Record<string,unknown>={},sessionId?:string):Promise<any>{const id=++this.next;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`Raw CDP timeout: ${method}`));},15_000);this.pending.set(id,{resolve,reject,timer});this.socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
 async evaluate<T=any>(session:string,expression:string):Promise<T>{const result=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},session);if(result.exceptionDetails)throw new Error('Raw page evaluation failed: '+JSON.stringify(result.exceptionDetails));return result.result.value as T;}
 close(){this.socket.close();}
}
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until<T>(read:()=>Promise<T>,accept:(value:T)=>boolean,label:string,timeout=8_000):Promise<T>{const deadline=Date.now()+timeout;let last:T|undefined;while(Date.now()<deadline){try{last=await read();if(accept(last))return last;}catch(error){const message=error instanceof Error?error.message:String(error);if(!/Execution context was destroyed|Cannot find context|Cannot find default execution context|Inspected target navigated/.test(message))throw error;}await pause(30);}throw new Error(`${label}: ${JSON.stringify(last)}`);}
async function click(cdp:RawCDP,session:string,selector:string){
 const point=await cdp.evaluate<{x:number;y:number}>(session,`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)throw Error('Missing native click target');element.scrollIntoView({block:'center',inline:'center'});const rect=element.getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};})()`);
 await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point},session);await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1},session);await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1},session);
}
async function key(cdp:RawCDP,session:string,down:boolean){await cdp.send('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68,nativeVirtualKeyCode:68,...(down?{text:'d',unmodifiedText:'d'}:{})},session);}
async function terminate(child:ChildProcess){if(child.exitCode!==null)return;const exited=new Promise<void>(resolve=>child.once('exit',()=>resolve()));child.kill('SIGTERM');await Promise.race([exited,pause(2_000)]);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([exited,pause(2_000)]);}}

// This is deliberately CI-only. Local Chromium launch denial must never be retried.
test('raw headed Chromium actual tab visibility suspends enabled production audio without replay',async()=>{
 test.skip(!process.env.CI,'Raw headed Chromium is authorized only inside the CI QA job.');test.setTimeout(90_000);
 const artifact='test-results/audio-lifecycle',profile=await mkdtemp(join(tmpdir(),'virelden-raw-audio-'));
 const sentinels=Object.fromEntries(['v1','v3','v3-good','v4','v4-good','v4-pending'].map((suffix,index)=>[`virelden-underworks-${suffix}`,`raw-visibility-normal-sentinel-${index}`]));
 let child:ChildProcess|undefined,cdp:RawCDP|undefined,session='',stderr='',browser:any=null,error:string|null=null;
 const observations:any[]=[];
 const capture=async(label:string)=>{if(!cdp||!session)return null;const result=await cdp.evaluate<any>(session,`({hidden:document.hidden,visibility:document.visibilityState,focus:document.hasFocus(),title:document.title,panel:document.querySelector('#panel')?.textContent,paused:window.vireldenDebug?.().paused,position:window.vireldenDebug?.().position,audio:window.__audioProbe?.snapshot(),normal:Object.fromEntries(Object.keys(${JSON.stringify(sentinels)}).map(key=>[key,localStorage.getItem(key)]))})`);observations.push({label,...result});return result;};
 try{
  child=spawn(chromium.executablePath(),['--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--window-size=1280,900','about:blank'],{stdio:['ignore','pipe','pipe'],env:process.env});
  const endpoint=await new Promise<string>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Raw Chromium did not publish a DevTools endpoint')),15_000);child!.once('error',e=>{clearTimeout(timer);reject(e);});child!.once('exit',code=>{clearTimeout(timer);reject(new Error(`Raw Chromium exited before endpoint: ${code}`));});child!.stderr!.on('data',data=>{stderr=(stderr+String(data)).slice(-64_000);const match=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
  cdp=await RawCDP.connect(endpoint);browser=await cdp.send('Browser.getVersion');
  const targets=await cdp.send('Target.getTargets'),initial=targets.targetInfos.find((target:any)=>target.type==='page'&&target.url==='about:blank');expect(initial).toBeTruthy();session=(await cdp.send('Target.attachToTarget',{targetId:initial.targetId,flatten:true})).sessionId;
  await cdp.send('Page.enable',{},session);await cdp.send('Runtime.enable',{},session);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`(${audioObserverInit.toString()})();for(const [key,value]of Object.entries(${JSON.stringify(sentinels)}))localStorage.setItem(key,value);`},session);
  await cdp.send('Page.navigate',{url:'http://127.0.0.1:4179/?qa=1&debug=1'},session);await cdp.send('Target.activateTarget',{targetId:initial.targetId});
  await until(()=>cdp!.evaluate(session,"!!document.querySelector('button[data-action=\"start:wayfarer\"]')"),Boolean,'Loadout choice appears');await click(cdp,session,'button[data-action="start:wayfarer"]');await until(()=>cdp!.evaluate(session,'window.vireldenDebug?.().paused===false'),Boolean,'Loadout entered through native click');
  expect((await capture('fresh-muted'))!.audio.contextCount).toBe(0);
  await click(cdp,session,'#help-button');await click(cdp,session,'button[data-action="audio-enable"]');await until(()=>cdp!.evaluate(session,"window.__audioProbe.snapshot().contexts[0]?.state==='suspended'"),Boolean,'Menu-enabled context remains suspended');const enabled=(await capture('trusted-enable-menu-silent'))!;expect(enabled.audio.contextCount).toBe(1);expect(enabled.audio.contexts[0].constructorActivation).toBe(true);expect(enabled.audio.totalStarts).toBe(0);
  await click(cdp,session,'button[data-action="resume"]');await until(()=>cdp!.evaluate(session,"window.__audioProbe.snapshot().contexts[0]?.state==='running'"),Boolean,'Native return resumes context');
  const beforeMove=await cdp.evaluate<number>(session,'window.__audioProbe.snapshot().totalStarts');await key(cdp,session,true);try{await until(()=>cdp!.evaluate<number>(session,'window.__audioProbe.snapshot().totalStarts'),value=>value>beforeMove,'Real movement produces one stone step',5_000);}finally{await key(cdp,session,false);}
  const beforeHidden=(await capture('enabled-after-native-step'))!;expect(beforeHidden.audio.totalStarts).toBeGreaterThan(0);expect(beforeHidden.hidden).toBe(false);expect(beforeHidden.focus).toBe(true);expect(Math.hypot((beforeHidden.position.x-beforeHidden.position.y)*.8,(beforeHidden.position.x+beforeHidden.position.y-640)*.4)).toBeLessThan(50);
  const background=await cdp.send('Target.createTarget',{url:'about:blank',newWindow:false});await cdp.send('Target.activateTarget',{targetId:background.targetId});
  await until(()=>cdp!.evaluate<any>(session,'({hidden:document.hidden,focus:document.hasFocus(),state:window.__audioProbe.snapshot().contexts[0].state,active:window.__audioProbe.snapshot().activeSources})'),value=>value.hidden===true&&value.focus===false&&value.state==='suspended'&&value.active===0,'Actual background tab hides and suspends game');
  const hidden=(await capture('actual-hidden-suspended'))!;expect(hidden.visibility).toBe('hidden');expect(hidden.audio.contexts[0].suspendCalls).toBeGreaterThan(beforeHidden.audio.contexts[0].suspendCalls);expect(hidden.audio.sources.every((source:any)=>source.disconnected)).toBe(true);await pause(650);expect((await capture('hidden-no-replay'))!.audio.totalStarts).toBe(hidden.audio.totalStarts);
  await cdp.send('Target.activateTarget',{targetId:initial.targetId});await until(()=>cdp!.evaluate<any>(session,"({hidden:document.hidden,focus:document.hasFocus(),panel:document.querySelector('#panel')?.textContent,state:window.__audioProbe.snapshot().contexts[0].state})"),value=>value.hidden===false&&value.focus===true&&value.panel?.includes('A moment beneath the stone')&&value.state==='suspended','Returning tab is visibly paused, not silently resumed');
  await pause(650);expect((await capture('foreground-paused-no-replay'))!.audio.totalStarts).toBe(hidden.audio.totalStarts);
  const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true},session);await mkdir(artifact,{recursive:true});await writeFile(`${artifact}/raw-visibility-return-paused.png`,Buffer.from(screenshot.data,'base64'));
  await click(cdp,session,'button[data-action="resume"]');await until(()=>cdp!.evaluate(session,"window.__audioProbe.snapshot().contexts[0].state==='running'"),Boolean,'Explicit trusted Continue resumes');await pause(650);const resumed=(await capture('explicit-resume-no-old-cues'))!;expect(resumed.audio.totalStarts).toBe(hidden.audio.totalStarts);expect(resumed.audio.activeSources).toBe(0);expect(resumed.audio.overflowed).toBe(false);expect(resumed.normal).toEqual(sentinels);await cdp.send('Target.closeTarget',{targetId:background.targetId});
 }catch(reason){error=reason instanceof Error?reason.stack??reason.message:String(reason);try{await capture('failure');}catch{/* Endpoint or document may be gone. */}throw reason;}
 finally{
  await mkdir(artifact,{recursive:true});await writeFile(`${artifact}/raw-native-visibility.json`,JSON.stringify({source:process.env.GITHUB_SHA??'local',browser,mode:'independent headed Chromium, raw flattened CDP via Node WebSocket; no Playwright page/session, focus emulation or autoplay bypass',acceptance:'actual visibility/lifecycle evidence only; not acoustic acceptance',error,observations,stderr:stderr.slice(-16_000)},null,2));
  if(cdp){try{await cdp.send('Browser.close');}catch{/* Browser closes the transport itself. */}cdp.close();}if(child)await terminate(child);await rm(profile,{recursive:true,force:true});
 }
});
