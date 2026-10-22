import {SoundCue} from '../core/soundEvents.js';
import {DEFAULT_SOUND_VOLUME} from './QuietAudio.js';
import {createTextureNoise,synthesizeTexture} from './textureSynthesis.js';

/** Explicit review utility only: offline render, never connects a live playback context. */
export async function renderCuePreview(cue:SoundCue,sampleRate=44100,makeContext:(channels:number,length:number,sampleRate:number)=>OfflineAudioContext=(channels,length,rate)=>new OfflineAudioContext(channels,length,rate)):Promise<ArrayBuffer>{
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>48000)throw new Error('Preview sample rate must be 8000–48000 Hz');
 const rate=sampleRate,context=makeContext(1,Math.ceil(rate*.75),rate),output=context.createGain();output.gain.value=DEFAULT_SOUND_VOLUME;output.connect(context.destination);
 const voice=synthesizeTexture(context,createTextureNoise(context),output,cue);if(!voice){output.disconnect();throw new Error('Unknown texture cue');}
 const rendered=await context.startRendering();output.disconnect();return monoPcmWav(rendered.getChannelData(0),rendered.sampleRate);
}
/** No acoustic acceptance is inferred from these bytes: native listening remains required. */
export function monoPcmWav(samples:Float32Array,sampleRate:number):ArrayBuffer{
 const bytes=new ArrayBuffer(44+samples.length*2),view=new DataView(bytes),write=(offset:number,text:string)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};
 write(0,'RIFF');view.setUint32(4,36+samples.length*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const value=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true);}return bytes;
}
