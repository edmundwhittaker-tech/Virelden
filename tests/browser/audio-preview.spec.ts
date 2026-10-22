import {test,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

/** Real OfflineAudioContext exports, not a live playback or an acoustic acceptance test. */
test('export source-backed cue and overlap WAVs for separate human listening review',async({page,browser},testInfo)=>{
 expect(process.versions.node.split('.')[0],'QA uses the pinned Node 22 major line').toBe('22');
 const candidateSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(process.env.AUDIO_CANDIDATE_SHA)expect(candidateSha,'export exact authorized QA candidate').toBe(process.env.AUDIO_CANDIDATE_SHA);
 const trackedChanges=execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim();
 expect(trackedChanges,'source-backed export requires committed candidate bytes').toBe('');
 const errors:string[]=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('/tests/browser/audio-preview.html');
 await expect(page.getByRole('heading',{name:'Offline texture review export'})).toBeVisible();
 const rendered=await page.evaluate(async()=>{
  const previewUrl='/src/audio/texturePreview.ts',synthesisUrl='/src/audio/textureSynthesis.ts',controllerUrl='/src/audio/QuietAudio.ts',eventsUrl='/src/core/soundEvents.ts';
  const [{renderCuePreview,monoPcmWav},{createTextureNoise,synthesizeTexture},{DEFAULT_SOUND_VOLUME,MAX_SOUND_VOLUME},{SoundCue}]=await Promise.all([import(previewUrl),import(synthesisUrl),import(controllerUrl),import(eventsUrl)]);
  if(typeof OfflineAudioContext!=='function')throw new Error('Native OfflineAudioContext is unavailable');
  const encode=(bytes:ArrayBuffer)=>{const data=new Uint8Array(bytes);let binary='';for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(binary);};
  const exports:{name:string;kind:string;cues:number[];volume:number;base64:string;graph:{offline:boolean;contexts:number;sharedNoiseBuffers:number;voices:number}}[]=[];
  const cues=Object.values(SoundCue).filter((cue):cue is number=>typeof cue==='number');
  if(cues.length!==12)throw new Error(`Review fixture expected 12 cue types, got ${cues.length}`);
  for(const cue of cues){
   // Omit makeContext: this calls the source module's real default OfflineAudioContext.
   const wav:ArrayBuffer=await renderCuePreview(cue,44100);
   exports.push({name:`cue-${String(cue).padStart(2,'0')}-${SoundCue[cue]}.wav`,kind:'individual',cues:[cue],volume:DEFAULT_SOUND_VOLUME,base64:encode(wav),graph:{offline:true,contexts:1,sharedNoiseBuffers:1,voices:1}});
  }
  const contacts=[SoundCue.SwordContact,SoundCue.SpearContact,SoundCue.HammerContact,SoundCue.AxeContact,SoundCue.FalchionContact,SoundCue.PoleaxeContact];
  for(const [name,volume] of [['default',DEFAULT_SOUND_VOLUME],['maximum',MAX_SOUND_VOLUME]] as const){
   const context=new OfflineAudioContext(1,33075,44100),output=context.createGain(),noise=createTextureNoise(context);
   output.gain.value=volume;output.connect(context.destination);
   for(const cue of contacts)if(!synthesizeTexture(context,noise,output,cue))throw new Error(`Missing contact cue ${cue}`);
   const buffer=await context.startRendering();output.disconnect();
   exports.push({name:`overlap-six-contacts-${name}.wav`,kind:'six-voice-overlap',cues:contacts,volume,base64:encode(monoPcmWav(buffer.getChannelData(0),buffer.sampleRate)),graph:{offline:context instanceof OfflineAudioContext,contexts:1,sharedNoiseBuffers:1,voices:6}});
  }
  return {exports,userAgent:navigator.userAgent};
 });
 expect(rendered.exports).toHaveLength(14);expect(errors).toEqual([]);
 const output=resolve('test-results/audio-listening');await mkdir(output,{recursive:true});
 const files:Array<Record<string,unknown>>=[];
 for(const item of rendered.exports){
  const bytes=Buffer.from(item.base64,'base64');
  expect(bytes.toString('ascii',0,4)).toBe('RIFF');expect(bytes.toString('ascii',8,12)).toBe('WAVE');expect(bytes.toString('ascii',12,16)).toBe('fmt ');expect(bytes.toString('ascii',36,40)).toBe('data');
  expect(bytes.length).toBe(66194);expect(bytes.readUInt32LE(4)).toBe(bytes.length-8);expect(bytes.readUInt32LE(16)).toBe(16);expect(bytes.readUInt16LE(20)).toBe(1);expect(bytes.readUInt16LE(22)).toBe(1);expect(bytes.readUInt32LE(24)).toBe(44100);expect(bytes.readUInt32LE(28)).toBe(88200);expect(bytes.readUInt16LE(32)).toBe(2);expect(bytes.readUInt16LE(34)).toBe(16);expect(bytes.readUInt32LE(40)).toBe(66150);
  let energy=0,peak=0,nonzeroSamples=0,clippedSamples=0,tailPeak=0;
  for(let i=44;i<bytes.length;i+=2){const value=bytes.readInt16LE(i)/32768;energy+=value*value;peak=Math.max(peak,Math.abs(value));if(value!==0)nonzeroSamples++;if(value<=-1||value>=32767/32768)clippedSamples++;if(i>=bytes.length-8820)tailPeak=Math.max(tailPeak,Math.abs(value));}
  expect(nonzeroSamples,'render is nonempty, not an acoustic judgment').toBeGreaterThan(0);expect(peak).toBeLessThanOrEqual(1);expect(clippedSamples,'PCM clipping is a file-validity guard, not listening acceptance').toBe(0);expect(tailPeak,'event nodes finish before trailing review silence').toBe(0);
  const path=resolve(output,item.name);await writeFile(path,bytes);await testInfo.attach(item.name,{path,contentType:'audio/wav'});
  files.push({name:item.name,kind:item.kind,cues:item.cues,volume:item.volume,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),format:{encoding:'PCM16LE',channels:1,sampleRate:44100,frames:33075,durationSeconds:.75},graph:item.graph,metrics:{peakPcm:peak,rmsPcm:Math.sqrt(energy/33075),nonzeroSamples,clippedSamples,tailPeakPcm:tailPeak}});
 }
 const sourceFiles=['src/audio/QuietAudio.ts','src/audio/textureSynthesis.ts','src/audio/texturePreview.ts','src/core/soundEvents.ts','package-lock.json'];
 const sourceSha256:Record<string,string>={};for(const file of sourceFiles)sourceSha256[file]=createHash('sha256').update(await readFile(file)).digest('hex');
 const manifest={candidateSha,workingTreeClean:true,nodeVersion:process.versions.node,browser:{name:browser.browserType().name(),version:browser.version(),userAgent:rendered.userAgent},renderer:'native OfflineAudioContext',playbackPerformed:false,acousticAcceptance:false,acceptanceScope:'Only source provenance, bounded graph construction, WAV/PCM format and nonempty/no-clipping/trailing-silence checks. A human must listen before acoustic acceptance.',sourceSha256,files};
 const manifestPath=resolve(output,'manifest.json');await writeFile(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);await testInfo.attach('audio-listening-manifest',{path:manifestPath,contentType:'application/json'});
});
