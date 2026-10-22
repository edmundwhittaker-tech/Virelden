/** Transient, simulation-owned player animation state. No save-format authority. */
import{project,type Point}from'./game.js';import{facingForInput,type Facing}from'./facing.js';
import{createDirectionalJog,advanceDirectionalJog,type DirectionalJogState,type JogFrame}from'./playerGait.js';
import type{RigPose}from'./modularRig.js';
export interface PlayerFacingCut {from:JogFrame;to:JogFrame;reason:'action-source-view-change'}
export interface PlayerMotionState {gait:DirectionalJogState;action?:{kind:'attack'|'roll';facing:Facing;from:RigPose;gait:DirectionalJogState;elapsed:number;facingCut?:PlayerFacingCut};resetReason:string}
/** Persistent camera-side foot tracks, not a claim of anatomical left/right. */
export function playerJogFrame(facing:Facing):JogFrame{const rear=facing.startsWith('north'),flipped=facing.endsWith('west');return{view:rear?'rear':'front',flipped,nearLeg:rear!==flipped?'b':'a'};}
export function createPlayerMotion(position:Point,facing:Facing='east',reason='new-game'):PlayerMotionState{return{gait:createDirectionalJog(project(position),playerJogFrame(facing)),resetReason:reason};}
/** Explicit coordinated2D source-view cut, not a continuous anatomical turn.
 * All ready armour/hand/weapon registrations change together at the SAME root.
 * Old planted tracks are discarded openly rather than reinterpreted as mirrored
 * limbs and blending through an incompatible elbow branch.
 */
export function preparePlayerFacingCut(state:PlayerMotionState,position:Point,facing:Facing):PlayerFacingCut|undefined{
 // Eligibility is checked by attack/roll BEFORE this call. A finished action
 // can be chained on its exit frame, before an ordinary cleanup tick. Its
 // rendered ready pose must also own a neutral lower-body snapshot; stale
 // pre-action walking feet must not reappear in the new entry bridge.
 if(state.action){state.gait=createDirectionalJog(project(position),state.gait.frame);state.action=undefined;state.resetReason='completed-action-chain';}
 const from=state.gait.frame,to=playerJogFrame(facing);
 if(from.view===to.view&&from.flipped===to.flipped)return;
 const cut:PlayerFacingCut={from:{...from},to:{...to},reason:'action-source-view-change'};
 state.gait=createDirectionalJog(project(position),to);state.action=undefined;state.resetReason='action-facing-cut';return cut;
}
export function beginPlayerAction(state:PlayerMotionState,kind:'attack'|'roll',from:RigPose,facing:Facing,facingCut?:PlayerFacingCut){state.action={kind,facing,from:structuredClone(from),gait:structuredClone(state.gait),elapsed:0,...(facingCut?{facingCut}:{} )};}
/** Every call uses the position AFTER normal collision resolution. */
export function advancePlayerMotion(state:PlayerMotionState,position:Point,aim:Point,dt:number,action:'attack'|'roll'|'interact'|null){
 const root=project(position),facing=facingForInput(aim,state.gait.frame.flipped?'west':'east'),frame=playerJogFrame(facing),discontinuity=Math.hypot(root.x-state.gait.root.x,root.y-state.gait.root.y)>12;
 if(discontinuity){const next=createPlayerMotion(position,facing,'external-root-discontinuity');state.gait=next.gait;state.action=undefined;state.resetReason=next.resetReason;return;}
 if(action){state.gait.root={...root};if(state.action)state.action.elapsed+=dt;return;}
 if(state.action){const previous={...state.gait.root};state.gait=createDirectionalJog(previous,frame);state.action=undefined;state.resetReason='completed-action';advanceDirectionalJog(state.gait,root,dt,frame);return;}
 advanceDirectionalJog(state.gait,root,dt,frame);
}
