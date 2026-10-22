import {SoundCue} from '../core/soundEvents.js';
import {createTextureNoise,synthesizeTexture,type TextureVoice} from './textureSynthesis.js';

export const DEFAULT_SOUND_VOLUME=.12;
export const MAX_SOUND_VOLUME=.35;
export const MAX_SOUND_VOICES=6;
export type AudioContextFactory=()=>AudioContext;
const browserContext:AudioContextFactory=()=>new AudioContext();

/** Separate from Phaser (which stays noAudio). No context until a direct enable gesture. */
export class QuietAudio {
 private context:AudioContext|null=null;
 private noise:AudioBuffer|null=null;
 private output:GainNode|null=null;
 private readonly voices=new Set<TextureVoice>();
 private optedIn=false;
 private allowed=false;
 private ready=false;
 private destroyed=false;
 private generation=0;
 private gain=DEFAULT_SOUND_VOLUME;
 constructor(private readonly factory:AudioContextFactory=browserContext){}
 get enabled(){return this.optedIn;}
 get muted(){return !this.optedIn;}
 get volume(){return this.gain;}
 get activeVoices(){return this.voices.size;}
 private desired(){return !this.destroyed&&this.optedIn&&this.allowed;}
 /** Called directly by the Controls button, not from an async task or a simulation tick. */
 enableFromGesture():Promise<boolean>{
  if(this.destroyed)return Promise.resolve(false);
  const generation=++this.generation;
  try{
   if(!this.context){
    const context=this.factory();let output:GainNode|null=null;
    try{output=context.createGain();output.gain.value=0;output.connect(context.destination);const noise=createTextureNoise(context);this.context=context;this.output=output;this.noise=noise;}
    catch(error){try{output?.disconnect();}catch{/* Partially initialized graph. */}try{Promise.resolve(context.close()).catch(()=>{});}catch{/* Context was not usable. */}throw error;}
   }
   this.optedIn=true;this.ready=false;
   // This invocation intentionally occurs synchronously in the trusted click handler.
   const resumed=this.context.resume();
   return Promise.resolve(resumed).then(()=>{
    if(this.destroyed||generation!==this.generation){this.reconcileStopped();return false;}
    if(this.allowed){this.ready=true;this.applyVolume();}else this.suspendQuietly();
    return true;
   },()=>{if(generation===this.generation){this.optedIn=false;this.stop();}else this.reconcileStopped();return false;});
  }catch{this.optedIn=false;this.stop();return Promise.resolve(false);}
 }
 setAllowed(allowed:boolean):void{
  if(this.destroyed||this.allowed===allowed)return;
  if(!allowed){this.stop();return;}
  this.allowed=true;
  if(!this.optedIn||!this.context)return;
  const generation=++this.generation;this.ready=false;
  try{Promise.resolve(this.context.resume()).then(()=>{
   if(generation===this.generation&&this.desired()){this.ready=true;this.applyVolume();}else this.reconcileStopped();
  },()=>{if(generation===this.generation){this.optedIn=false;this.stop();}else this.reconcileStopped();});}catch{this.optedIn=false;this.stop();}
 }
 setVolume(volume:number):void{if(!Number.isFinite(volume))return;this.gain=Math.max(0,Math.min(MAX_SOUND_VOLUME,volume));this.applyVolume();}
 private applyVolume():void{
  if(!this.context||!this.output)return;
  const gain=this.output.gain,now=this.context.currentTime;
  try{gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);gain.linearRampToValueAtTime(this.ready&&this.desired()?this.gain:0,now+.008);}catch{/* A rejected optional graph must not interrupt gameplay or cleanup. */}
 }
 play(cue:SoundCue):void{
  if(!this.ready||!this.desired()||!this.context||this.context.state!=='running'||!this.output||!this.noise||this.voices.size>=MAX_SOUND_VOICES)return;
  let voice:TextureVoice|null=null;
  try{voice=synthesizeTexture(this.context,this.noise,this.output,cue,()=>{if(voice)this.voices.delete(voice);});if(voice)this.voices.add(voice);}catch{/* Optional texture failure must never affect gameplay. */}
 }
 /** No event queue: interrupted cues are discarded, never replayed after a menu. */
 stop():void{
  ++this.generation;this.allowed=false;this.ready=false;
  this.applyVolume();for(const voice of this.voices)voice.stop();this.voices.clear();this.suspendQuietly();
 }
 mute():void{this.optedIn=false;this.stop();}
 private suspendQuietly():void{
  const context=this.context;if(!context||context.state==='closed')return;
  try{Promise.resolve(context.suspend()).catch(()=>{});}catch{/* A closed/interrupted context remains silent. */}
 }
 private reconcileStopped():void{if(!this.desired()){this.ready=false;this.applyVolume();for(const voice of this.voices)voice.stop();this.voices.clear();if(this.destroyed){try{Promise.resolve(this.context?.close()).catch(()=>{});}catch{/* Already closed. */}}else this.suspendQuietly();}}
 shutdown():void{
  if(this.destroyed)return;this.destroyed=true;this.optedIn=false;this.stop();
  const context=this.context;try{this.output?.disconnect();}catch{/* Already disconnected. */}
  this.output=null;this.noise=null;
  if(context&&context.state!=='closed'){try{Promise.resolve(context.close()).catch(()=>{});}catch{/* No usable context remains. */}}
 }
}
