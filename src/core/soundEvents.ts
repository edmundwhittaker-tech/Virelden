import type {Adventure} from './adventure.js';
import type {WeaponId} from './weaponCatalog.js';

/** Transient presentation cues only. Never part of Adventure or a save. */
export enum SoundCue {
 Step=1, SwordContact, SpearContact, HammerContact, AxeContact, FalchionContact,
 PoleaxeContact, BowRelease, Lever, GateOpening, GateOpen, ShortcutOpen,
}
export const WEAPON_CONTACT_CUES:Readonly<Record<WeaponId,SoundCue>>=Object.freeze({
 sword:SoundCue.SwordContact,spear:SoundCue.SpearContact,hammer:SoundCue.HammerContact,
 axe:SoundCue.AxeContact,falchion:SoundCue.FalchionContact,poleaxe:SoundCue.PoleaxeContact,
});

/** Fixed storage, bounded work, no callbacks in simulation and no back-pressure. */
export class SoundEventRecorder {
 readonly capacity:number;
 private readonly cues:Uint8Array;
 private head=0;
 private count=0;
 private lost=0;
 constructor(capacity=32){
  this.capacity=Number.isFinite(capacity)?Math.max(1,Math.min(128,Math.floor(capacity))):32;
  this.cues=new Uint8Array(this.capacity);
 }
 get size(){return this.count;}
 get dropped(){return this.lost;}
 record(cue:SoundCue):void {
  if(!Number.isInteger(cue)||cue<SoundCue.Step||cue>SoundCue.ShortcutOpen)return;
  if(this.count===this.capacity){this.lost=Math.min(Number.MAX_SAFE_INTEGER,this.lost+1);return;}
  this.cues[(this.head+this.count)%this.capacity]=cue;this.count++;
 }
 /** Drain only the initial batch: a consumer cannot make this an unbounded loop. */
 drain(consume:(cue:SoundCue)=>void):void {
  const length=this.count;
  for(let i=0;i<length&&this.count>0;i++){
   const cue=this.cues[this.head] as SoundCue;this.head=(this.head+1)%this.capacity;this.count--;
   try{consume(cue);}catch{/* Optional presentation failures must not stop play. */}
  }
 }
 clear():void {this.head=0;this.count=0;}
}

/** Capture this boolean and position/time primitives around a Scene fixed step. */
export const stepSoundEligible=(s:Adventure):boolean=>s.hp>0&&s.attack.phase==='idle'&&s.rollTimer<=0&&
 !(s.areaId==='station'?s.gatePhase==='pulling':s.shortcutAnimation?.phase==='pulling');
/** Match the modular walk rig's support switches; blocked movement is silent. */
export function recordPlayerStep(s:Adventure,beforeTime:number,beforeX:number,beforeY:number,wasEligible:boolean,recorder?:SoundEventRecorder):void {
 if(!recorder||!wasEligible||!stepSoundEligible(s)||s.time<=beforeTime||
  (s.position.x===beforeX&&s.position.y===beforeY)||Math.floor(beforeTime*3.2)===Math.floor(s.time*3.2))return;
 recorder.record(SoundCue.Step);
}
