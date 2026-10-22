import {SoundCue} from '../core/soundEvents.js';

/** Event-only, filtered noise. No downloaded assets, oscillators, loops or ambience. */
export interface TextureVoice { readonly duration:number; stop():void }
export const MAX_TEXTURE_SECONDS=.48;
/** One deterministic shared buffer per context. Also usable by OfflineAudioContext. */
export function createTextureNoise(context:BaseAudioContext):AudioBuffer {
 const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.65),context.sampleRate),data=buffer.getChannelData(0);
 let seed=0x51f15e;
 for(let i=0;i<data.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed>>>0)/0x80000000-1;}
 return buffer;
}
interface Texture {duration:number;level:number;low:number;high:number;body:number}
function texture(cue:SoundCue):Texture|null {
 switch(cue){
  case SoundCue.Step:return {duration:.085,level:.3,low:950,high:100,body:240};
  case SoundCue.SwordContact:return {duration:.16,level:.35,low:1450,high:110,body:680};
  case SoundCue.SpearContact:return {duration:.13,level:.3,low:1250,high:100,body:510};
  case SoundCue.HammerContact:return {duration:.23,level:.4,low:800,high:65,body:170};
  case SoundCue.AxeContact:return {duration:.19,level:.35,low:1150,high:80,body:370};
  case SoundCue.FalchionContact:return {duration:.14,level:.32,low:1400,high:120,body:590};
  case SoundCue.PoleaxeContact:return {duration:.22,level:.37,low:1050,high:75,body:280};
  case SoundCue.BowRelease:return {duration:.095,level:.22,low:1150,high:170,body:430};
  case SoundCue.Lever:return {duration:.22,level:.25,low:900,high:80,body:310};
  case SoundCue.GateOpening:return {duration:.46,level:.23,low:650,high:55,body:140};
  case SoundCue.GateOpen:return {duration:.27,level:.29,low:750,high:60,body:180};
  case SoundCue.ShortcutOpen:return {duration:.3,level:.28,low:750,high:65,body:210};
  default:return null;
 }
}
/** Same synthesis is used for live playback and source-backed offline listening samples. */
export function synthesizeTexture(context:BaseAudioContext,noise:AudioBuffer,destination:AudioNode,cue:SoundCue,onEnded:()=>void=()=>{}):TextureVoice|null {
 const spec=texture(cue);if(!spec)return null;
 const nodes:AudioNode[]=[];let source:AudioBufferSourceNode|null=null,disposed=false;
 const keep=<T extends AudioNode>(node:T):T=>{nodes.push(node);return node;};
 const dispose=()=>{if(disposed)return;disposed=true;if(source)source.onended=null;for(const node of nodes){try{node.disconnect();}catch{/* Already disconnected. */}}onEnded();};
 try{
  source=keep(context.createBufferSource());const high=keep(context.createBiquadFilter()),low=keep(context.createBiquadFilter()),body=keep(context.createBiquadFilter()),gain=keep(context.createGain());
  const now=context.currentTime;
  source.buffer=noise;source.loop=false;
  high.type='highpass';high.frequency.value=spec.high;high.Q.value=.5;
  low.type='lowpass';low.frequency.value=spec.low;low.Q.value=.5;
  body.type='peaking';body.frequency.value=spec.body;body.Q.value=.75;body.gain.value=3;
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(spec.level,now+.005);gain.gain.exponentialRampToValueAtTime(.0001,now+spec.duration);
  source.connect(high);high.connect(low);low.connect(body);body.connect(gain);gain.connect(destination);
  source.onended=dispose;source.start(now,0,spec.duration);source.stop(now+spec.duration);
 }catch(error){if(source){try{source.stop();}catch{/* Source was not started. */}}dispose();throw error;}
 return {duration:spec.duration,stop(){if(disposed)return;try{source?.stop();}catch{/* Ended source. */}dispose();}};
}
