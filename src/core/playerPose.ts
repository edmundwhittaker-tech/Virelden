/** Player-only pose authority. NPC HUMAN_BODY and sprite animation stay separate.
 * Transient gait/action state is intentionally not durable campaign progress.
 */
import type {Adventure} from './adventure.js';
import {project,type Point} from './game.js';
import {facingForInput,type Facing} from './facing.js';
import {evaluateRig,actorPoint,type RigInput,type RigPose,type RigPoint} from './modularRig.js';
import {WEAPON_CATALOG} from './weaponCatalog.js';
import{playerGaitPose}from'./playerGaitPose.js';
import{blendPlayerAction}from'./playerTransition.js';
import type {Capsule} from './meleeContact.js';
export interface PlayerLeverPose {lever:Point;pull:number;reach?:number}
export interface PlayerPoseFrame {input:RigInput;pose:RigPose;facing:Facing}
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Renderer and melee sampling call this same pure pose provider. */
export function playerPoseFrame(s:Adventure,interaction:PlayerLeverPose|null=null,_moving=false,override:Partial<Pick<RigInput,'phase'|'progress'>>={}):PlayerPoseFrame{
 const attack=s.attack,id=attack.phase==='idle'?s.equipped:attack.weapon,w=WEAPON_CATALOG[id];
 // A completed roll remains authoritative through its last rendered tick.
 // Ordinary resolved movement updates aim on the following simulation tick;
 // do not flash the stale pre-roll pointer/movement facing between them.
 const rollFacing=s.playerMotion.action?.kind==='roll'?s.playerMotion.action.facing:undefined;
 const facing=attack.phase!=='idle'?attack.facing:rollFacing??facingForInput(s.rollTimer>0?s.rollAim:s.aim,attack.facing);
 const duration=attack.phase==='windup'?w.windup:attack.phase==='active'?w.active:w.recovery;
 const input:RigInput={view:facing.startsWith('north')?'rear':'front',flipped:facing.endsWith('west'),motion:s.rollTimer>0?'roll':attack.phase!=='idle'?'attack':'idle',time:s.time,phase:attack.phase==='idle'?undefined:attack.phase,progress:s.rollTimer>0?1-s.rollTimer/.38:attack.phase==='idle'?0:Math.max(0,Math.min(1,1-attack.timer/duration)),weapon:id,weaponMotion:w.motion,weaponHands:w.hands,weaponReach:w.range,aim:attack.phase==='idle'?s.aim:attack.aim,...override};
 if(interaction){
  input.view='rear';input.flipped=false;input.motion='interact';input.phase=undefined;
  const foot=project(s.position),lever=project(interaction.lever),target={x:lever.x-13+interaction.pull*23-foot.x,y:lever.y-43+interaction.pull*13-foot.y};
  const carry=evaluateRig({...input,motion:'idle',handTarget:undefined}),blend=smooth(interaction.reach??1);
  input.handTarget={x:carry.hand.x+(target.x-carry.hand.x)*blend,y:carry.hand.y+(target.y-carry.hand.y)*blend};
 }
 // Render-loop moving is an observation, never an alternate gait authority.
 // In particular, the final root-moving roll tick must render the shared ready
 // exit rather than falling through to legacy global-time walk.
 const ordinary=!interaction&&input.motion!=='attack'&&input.motion!=='roll';
 let pose:RigPose;
 if(ordinary&&!s.playerMotion.action){input.view=s.playerMotion.gait.frame.view;input.flipped=s.playerMotion.gait.frame.flipped;input.motion=s.playerMotion.gait.mode==='idle'?'idle':'walk';pose=playerGaitPose(input,s.playerMotion.gait);}
 else{pose=evaluateRig(input);if(s.playerMotion.action&&(input.motion==='roll'||input.motion==='attack'&&input.phase==='windup'))pose=blendPlayerAction(input,pose,s.playerMotion.action);}
 // Ease into/out of the existing minimum roll size; own it here rather than a
 // renderer-only extra scale that a target/contact provider could not see.
 if(input.motion==='roll'){const envelope=Math.sin(Math.PI*(input.progress??0))**2;pose.actor.scaleX=1-.08*envelope;pose.actor.scaleY=(1-.22*envelope)*pose.actor.scaleX;}
 const sourceFacing:Facing=input.view==='rear'?(input.flipped?'north-west':'north-east'):facing.startsWith('south')?(input.flipped?'south-west':'south-east'):(input.flipped?'west':'east');
 return{input,pose,facing:sourceFacing};
}
/** Explicit pose-derived player target proxies, not the legacy upright NPC body.
 * Bounded capsules approximate fitted plate/body; they are not opaque-alpha masks.
 * Endpoints are projected foot-local pixels and include the actor/roll transform.
 */
export function playerTargetBody(pose:RigPose):readonly Capsule[]{
 const result:Capsule[]=[],put=(a:RigPoint,b:RigPoint,radius:number)=>{result.push({a:actorPoint(a,pose.actor),b:actorPoint(b,pose.actor),radius:radius*Math.max(Math.abs(pose.actor.scaleX),Math.abs(pose.actor.scaleY))});};
 const segment=(id:keyof RigPose['parts'],radius:number,inset=0)=>{const p=pose.parts[id],length=p.length||1,t=Math.min(.49,inset/length),at=(q:number)=>({x:p.start.x+(p.end.x-p.start.x)*q,y:p.start.y+(p.end.y-p.start.y)*q});put(at(t),at(1-t),radius);};
 segment('helmet',6.2,5.5);segment('torso',9,5);segment('pelvis',5.2,1.5);
 for(const side of ['near','far']as const){segment(`upperarm_${side}`,3.8,2);segment(`forearm_${side}`,3.1,1.5);segment(`hand_${side}`,2.3);segment(`thigh_${side}`,3.8,1.5);segment(`greave_${side}`,3.1,1.5);segment(`foot_${side}`,2.2);}
 return result;
}
