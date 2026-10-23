import {facingForInput,type Facing} from './facing.js';
import type {Enemy} from './adventure.js';

/** Rendering only. AI still owns its timers, damage edge, reach and recovery. */
export interface EnemyVisualTiming {
  windupSeconds:number;
  recoverySeconds:number;
  /** A contact picture occupies the beginning of existing recovery, not extra AI time. */
  contactSeconds:number;
  deathSeconds:number;
}
export interface EnemyVisualState {
  identity:string|null;
  time:number;
  hp:number;
  phase:Enemy['phase'];
  timer:number;
  hurtDuration:number;
  deathStartedAt:number|null;
  facing:Facing;
}
export interface EnemyVisualSample {
  motion:'idle'|'walk'|'attack'|'hurt'|'death'|'dead';
  phase?:'windup'|'active'|'recovery';
  progress:number;
  elapsedSeconds:number;
  facing:Facing;
  view:'front'|'rear';
  flipped:boolean;
}
export interface EnemyVisualInput {
  /** Include the area/encounter identity so reused renderer pools cannot retain death. */
  identity:string;
  enemy:Pick<Enemy,'hp'|'phase'|'timer'|'aim'>;
  time:number;
  walking:boolean;
  timing:EnemyVisualTiming;
}
const unit=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const duration=(value:number)=>Math.max(1e-6,Number.isFinite(value)?value:1e-6);
export function createEnemyVisualState():EnemyVisualState {
  return {identity:null,time:0,hp:0,phase:'idle',timer:0,hurtDuration:0,deathStartedAt:null,facing:'east'};
}

/**
 * Sample from simulation time only: repeated draws/pause never advance animation.
 * The current AI has no active phase. Its windup→recovery transition resolves the
 * strike immediately, so the first recovery picture is the contact pose.
 * This adapter does not introduce an animation event or a second damage event.
 */
export function sampleEnemyVisual(state:EnemyVisualState,input:EnemyVisualInput):EnemyVisualSample {
  const {enemy:e,timing}=input,time=Number.isFinite(input.time)?input.time:0;
  const reset=state.identity!==input.identity||time<state.time||e.hp>state.hp&&state.hp<=0;
  if(reset){
    Object.assign(state,createEnemyVisualState(),{identity:input.identity,time,hp:e.hp,phase:e.phase,timer:e.timer});
    // A defeated foe loaded from a save is already dead, not a fresh death event.
    if(e.hp<=0)state.deathStartedAt=-Infinity;
  }
  if(e.hp>0||reset)state.facing=facingForInput(e.aim,state.facing);
  const facing=state.facing,base={facing,view:facing.startsWith('north')?'rear' as const:'front' as const,flipped:facing.endsWith('west')};
  let sample:EnemyVisualSample;
  if(e.hp<=0){
    if(state.deathStartedAt===null)state.deathStartedAt=time;
    const elapsed=Math.max(0,time-state.deathStartedAt),seconds=duration(timing.deathSeconds);
    sample={...base,motion:elapsed>=seconds?'dead':'death',progress:elapsed>=seconds?1:unit(elapsed/seconds),elapsedSeconds:elapsed};
  }else if(e.phase==='stagger'){
    // Repeated hits can restart stagger without leaving the phase. Observe HP as
    // well as timer increases, rather than continuing an interrupted strike.
    if(reset||state.phase!=='stagger'||e.timer>state.timer+1e-8||e.hp<state.hp)state.hurtDuration=duration(e.timer);
    const elapsed=Math.max(0,state.hurtDuration-e.timer);
    sample={...base,motion:'hurt',progress:unit(elapsed/duration(state.hurtDuration)),elapsedSeconds:elapsed};
  }else if(e.phase==='windup'){
    const seconds=duration(timing.windupSeconds),elapsed=Math.max(0,seconds-e.timer);
    sample={...base,motion:'attack',phase:'windup',progress:unit(elapsed/seconds),elapsedSeconds:elapsed};
  }else if(e.phase==='recovery'){
    const seconds=duration(timing.recoverySeconds),contact=Math.min(seconds,duration(timing.contactSeconds)),elapsed=Math.max(0,seconds-e.timer);
    sample=elapsed<contact
      ?{...base,motion:'attack',phase:'active',progress:unit(elapsed/contact),elapsedSeconds:elapsed}
      :{...base,motion:'attack',phase:'recovery',progress:unit((elapsed-contact)/duration(seconds-contact)),elapsedSeconds:Math.max(0,elapsed-contact)};
  }else sample={...base,motion:input.walking?'walk':'idle',progress:0,elapsedSeconds:Math.max(0,time)};
  Object.assign(state,{identity:input.identity,time,hp:e.hp,phase:e.phase,timer:e.timer});
  return sample;
}

export interface EnemyVisualClip {frames:readonly number[];durationsMs:readonly number[];loop:boolean}
export interface EnemyVisualClips {
  frameCount:number;
  idle:EnemyVisualClip;
  walk:EnemyVisualClip;
  hurt:EnemyVisualClip;
  death:EnemyVisualClip;
  dead:EnemyVisualClip;
  phaseFrames:Readonly<Record<'windup'|'active'|'recovery',readonly number[]>>;
}
/** Validate complete sheets once, before a renderer accepts their registration. */
export function validEnemyVisualClips(clips:EnemyVisualClips):boolean {
  const frames=(items:readonly number[])=>Array.isArray(items)&&items.length>0&&items.every(frame=>Number.isInteger(frame)&&frame>=0&&frame<clips.frameCount);
  return Number.isInteger(clips.frameCount)&&clips.frameCount>0
    &&[clips.idle,clips.walk,clips.hurt,clips.death,clips.dead].every(clip=>frames(clip.frames)&&clip.frames.length===clip.durationsMs.length&&clip.durationsMs.every(ms=>Number.isFinite(ms)&&ms>0))
    &&(['windup','active','recovery'] as const).every(phase=>frames(clips.phaseFrames[phase]));
}
function frameAtProgress(frames:readonly number[],progress:number):number {
  return frames[Math.min(frames.length-1,Math.floor(unit(progress)*frames.length))];
}
function frameAtTime(clip:EnemyVisualClip,elapsedSeconds:number):number {
  const total=clip.durationsMs.reduce((sum,ms)=>sum+ms,0),elapsed=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds*1000:total);
  let remaining=clip.loop?elapsed%total:Math.min(elapsed,total);
  for(let i=0;i<clip.frames.length;i++){if(remaining<clip.durationsMs[i])return clip.frames[i];remaining-=clip.durationsMs[i];}
  return clip.frames[clip.frames.length-1];
}
/** A manifest-driven frame sampler; no asset family or enemy-role mapping is assumed. */
export function enemyVisualFrame(sample:EnemyVisualSample,clips:EnemyVisualClips):number {
  if(sample.motion==='attack')return frameAtProgress(clips.phaseFrames[sample.phase!],sample.progress);
  if(sample.motion==='hurt')return frameAtTime({...clips.hurt,loop:false},unit(sample.progress)*clips.hurt.durationsMs.reduce((sum,ms)=>sum+ms,0)/1000);
  return frameAtTime(clips[sample.motion],sample.elapsedSeconds);
}
