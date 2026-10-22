import test from 'node:test';
import assert from 'node:assert/strict';
import {QuietAudio,DEFAULT_SOUND_VOLUME,MAX_SOUND_VOLUME,MAX_SOUND_VOICES} from '../.test-build/audio/QuietAudio.js';
import {SoundCue} from '../.test-build/core/soundEvents.js';
import {createTextureNoise,synthesizeTexture,MAX_TEXTURE_SECONDS} from '../.test-build/audio/textureSynthesis.js';
import {monoPcmWav,renderCuePreview} from '../.test-build/audio/texturePreview.js';

class Param {
 value=0; events=[];
 setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);}
 linearRampToValueAtTime(value,time){this.value=value;this.events.push(['linear',value,time]);}
 exponentialRampToValueAtTime(value,time){this.value=value;this.events.push(['exponential',value,time]);}
 cancelScheduledValues(time){this.events.push(['cancel',time]);}
}
class Node {
 constructor(context,kind){this.context=context;this.kind=kind;this.gain=new Param();this.frequency=new Param();this.Q=new Param();this.disconnected=0;this.connections=[];this.stopped=0;this.onended=null;}
 connect(node){this.connections.push(node);return node;}
 disconnect(){this.disconnected++;this.connections=[];}
 start(...args){this.startArgs=args;this.context.started.push(this);}
 stop(...args){this.stopArgs=args;this.stopped++;}
 finish(){this.onended?.();}
}
class MockContext {
 state='suspended';currentTime=0;sampleRate=44100;nodes=[];started=[];resumes=[];suspends=0;closes=0;buffers=[];defer=false;fail=false;
 constructor(){this.destination=new Node(this,'destination');}
 node(kind){const node=new Node(this,kind);this.nodes.push(node);return node;}
 createGain(){return this.node('gain');}
 createBufferSource(){return this.node('source');}
 createBiquadFilter(){return this.node('filter');}
 createBuffer(channels,length,rate){const data=new Float32Array(length),buffer={sampleRate:rate,length,getChannelData:()=>data};this.buffers.push(buffer);return buffer;}
 resume(){
  if(this.fail)return Promise.reject(new Error('Gesture denied'));
  if(this.defer)return new Promise((resolve,reject)=>this.resumes.push({resolve:()=>{this.state='running';resolve();},reject}));
  this.state='running';return Promise.resolve();
 }
 suspend(){this.suspends++;this.state='suspended';return Promise.resolve();}
 close(){this.closes++;this.state='closed';return Promise.resolve();}
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
const setup=()=>{const context=new MockContext();let factories=0;const audio=new QuietAudio(()=>{factories++;return context;});return {audio,context,factories:()=>factories};};

test('fresh muted controller creates no context or nodes; volume is bounded and not persisted',()=>{
 const {audio,context,factories}=setup();assert.equal(audio.enabled,false);assert.equal(audio.muted,true);assert.equal(audio.volume,DEFAULT_SOUND_VOLUME);
 audio.setAllowed(true);audio.play(SoundCue.Step);audio.setAllowed(false);audio.mute();audio.setVolume(Infinity);assert.equal(audio.volume,DEFAULT_SOUND_VOLUME);audio.setVolume(9);assert.equal(audio.volume,MAX_SOUND_VOLUME);audio.setVolume(-2);assert.equal(audio.volume,0);audio.shutdown();assert.equal(factories(),0);assert.equal(context.nodes.length,0);
 assert.equal(new QuietAudio().volume,DEFAULT_SOUND_VOLUME);
});
test('enable initiates context resume within gesture but menus stay silent until allowed',async()=>{
 const {audio,context,factories}=setup();context.defer=true;
 const enabled=audio.enableFromGesture();assert.equal(factories(),1);assert.equal(context.resumes.length,1);assert.equal(audio.enabled,true);audio.play(SoundCue.Step);assert.equal(context.started.length,0);
 context.resumes[0].resolve();assert.equal(await enabled,true);assert.equal(context.state,'suspended');audio.play(SoundCue.Step);assert.equal(context.started.length,0);
 audio.setAllowed(true);assert.equal(context.resumes.length,2);audio.play(SoundCue.Step);assert.equal(context.started.length,0);context.resumes[1].resolve();await settle();audio.play(SoundCue.Step);assert.equal(context.started.length,1);assert.equal(context.buffers.length,1);audio.shutdown();
});
test('factory and gesture failures are safe and remain silent',async()=>{
 const denied=new QuietAudio(()=>{throw new Error('Unavailable');});assert.equal(await denied.enableFromGesture(),false);assert.equal(denied.enabled,false);denied.setAllowed(true);denied.play(SoundCue.GateOpen);denied.shutdown();
 const {audio,context}=setup();context.fail=true;assert.equal(await audio.enableFromGesture(),false);assert.equal(audio.enabled,false);audio.setAllowed(true);audio.play(SoundCue.Step);assert.equal(context.started.length,0);audio.shutdown();
});
test('late gesture completion after mute never opts back in or plays',async()=>{
 const {audio,context}=setup();context.defer=true;audio.setAllowed(true);const promise=audio.enableFromGesture();audio.mute();context.resumes[0].resolve();assert.equal(await promise,false);assert.equal(audio.enabled,false);assert.equal(context.state,'suspended');audio.setAllowed(true);audio.play(SoundCue.Step);assert.equal(context.started.length,0);audio.shutdown();
});
test('late resume after pause/visibility stop cannot play or replay cues',async()=>{
 const {audio,context}=setup();await audio.enableFromGesture();context.defer=true;audio.setAllowed(true);assert.equal(context.resumes.length,1);audio.setAllowed(false);audio.play(SoundCue.GateOpen);context.resumes[0].resolve();await settle();assert.equal(context.state,'suspended');assert.equal(context.started.length,0);
 audio.setAllowed(true);context.resumes[1].resolve();await settle();assert.equal(context.started.length,0);audio.play(SoundCue.Step);assert.equal(context.started.length,1);audio.shutdown();
});
test('rapid enable, mute, re-enable and out-of-order promises honor newest intention',async()=>{
 const {audio,context}=setup();context.defer=true;audio.setAllowed(true);const first=audio.enableFromGesture();audio.mute();const second=audio.enableFromGesture();audio.setAllowed(true);
 assert.equal(context.resumes.length,3);context.resumes[2].resolve();await settle();context.resumes[0].resolve();assert.equal(await first,false);context.resumes[1].resolve();assert.equal(await second,false);assert.equal(audio.enabled,true);assert.equal(context.state,'running');audio.play(SoundCue.Step);assert.equal(context.started.length,1);audio.shutdown();
});
test('voice cap drops overflow; one precomputed noise buffer, no event queue',async()=>{
 const {audio,context}=setup();audio.setAllowed(true);await audio.enableFromGesture();for(let i=0;i<30;i++)audio.play(SoundCue.HammerContact);assert.equal(audio.activeVoices,MAX_SOUND_VOICES);assert.equal(context.started.length,MAX_SOUND_VOICES);assert.equal(context.buffers.length,1);
 context.started[0].finish();assert.equal(audio.activeVoices,MAX_SOUND_VOICES-1);audio.play(SoundCue.Step);assert.equal(audio.activeVoices,MAX_SOUND_VOICES);audio.stop();assert.equal(audio.activeVoices,0);for(const node of context.nodes.filter(n=>n.kind!=='gain'||n!==context.nodes[0]))assert.ok(node.disconnected>0);
 const count=context.started.length;audio.setAllowed(true);await settle();assert.equal(context.started.length,count);audio.shutdown();
});
test('stop/mute/shutdown disconnect sources idempotently; shutdown defeats pending resume',async()=>{
 const {audio,context}=setup();audio.setAllowed(true);await audio.enableFromGesture();audio.play(SoundCue.SwordContact);const nodes=context.nodes.slice(1);audio.stop();audio.stop();audio.mute();assert.equal(audio.activeVoices,0);for(const node of nodes)assert.equal(node.disconnected,1);
 context.defer=true;const pending=audio.enableFromGesture();audio.shutdown();audio.shutdown();context.resumes[0].resolve();assert.equal(await pending,false);assert.equal(context.state,'closed');assert.equal(audio.enabled,false);assert.equal(await audio.enableFromGesture(),false);audio.setAllowed(true);audio.play(SoundCue.Step);assert.equal(context.started.length,1);
});
test('every authored cue uses bounded filtered event texture and cleans up at natural end',()=>{
 const context=new MockContext(),noise=createTextureNoise(context),second=createTextureNoise(new MockContext());assert.deepEqual(noise.getChannelData(0),second.getChannelData(0));let ended=0;
 for(const cue of Object.values(SoundCue).filter(x=>typeof x==='number')){const voice=synthesizeTexture(context,noise,context.destination,cue,()=>ended++);assert.ok(voice);assert.ok(voice.duration>0&&voice.duration<=MAX_TEXTURE_SECONDS);const source=context.started.at(-1);assert.equal(source.loop,false);assert.equal(source.buffer,noise);source.finish();voice.stop();}
 assert.equal(ended,12);assert.equal(synthesizeTexture(context,noise,context.destination,999),null);for(const node of context.nodes)assert.equal(node.disconnected,1);
});
test('PCM WAV encoding is bounded and offline preview reuses source synthesis without playback',async()=>{
 const wav=monoPcmWav(new Float32Array([-2,-.5,0,.5,2]),44100),view=new DataView(wav);assert.equal(wav.byteLength,54);assert.equal(view.getUint32(24,true),44100);assert.equal(view.getInt16(44,true),-32768);assert.equal(view.getInt16(52,true),32767);assert.equal(new TextDecoder().decode(new Uint8Array(wav,0,4)),'RIFF');
 let created;const bytes=await renderCuePreview(SoundCue.Lever,22050,(channels,length,rate)=>{assert.equal(channels,1);assert.equal(length,Math.ceil(rate*.75));const context=new MockContext();context.sampleRate=rate;context.startRendering=async()=>({sampleRate:rate,getChannelData:()=>new Float32Array(length)});created=context;return context;});assert.equal(created.started.length,1);assert.equal(created.buffers.length,1);assert.equal(new DataView(bytes).getUint32(24,true),22050);await assert.rejects(()=>renderCuePreview(SoundCue.Step,999999));
});
test('repeated unchanged lifecycle calls do not invalidate gesture or multiply resumes',async()=>{
 const {audio,context}=setup();context.defer=true;const enabled=audio.enableFromGesture();for(let i=0;i<60;i++)audio.setAllowed(false);assert.equal(context.resumes.length,1);context.resumes[0].resolve();assert.equal(await enabled,true);audio.setAllowed(true);for(let i=0;i<60;i++)audio.setAllowed(true);assert.equal(context.resumes.length,2);context.resumes[1].resolve();await settle();audio.play(SoundCue.Step);assert.equal(context.started.length,1);audio.shutdown();
});
test('partial context initialization and event graph failures disconnect safely',async()=>{
 let count=0;const broken=new MockContext(),working=new MockContext();broken.createBuffer=()=>{throw new Error('Buffer allocation failed');};const audio=new QuietAudio(()=>++count===1?broken:working);assert.equal(await audio.enableFromGesture(),false);assert.equal(broken.state,'closed');assert.equal(broken.nodes[0].disconnected,1);audio.setAllowed(true);assert.equal(await audio.enableFromGesture(),true);const create=working.createBiquadFilter.bind(working);working.createBiquadFilter=()=>{throw new Error('Filter unavailable');};audio.play(SoundCue.Step);assert.equal(audio.activeVoices,0);assert.equal(working.nodes.at(-1).disconnected,1);working.createBiquadFilter=create;audio.play(SoundCue.Step);assert.equal(audio.activeVoices,1);audio.shutdown();
});
