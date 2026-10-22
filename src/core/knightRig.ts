import { WEAPONS, type WeaponId } from './adventure.js';
import type { Point } from './game.js';
import type { Facing } from './facing.js';

export interface KnightCombat {
  phase:'idle'|'windup'|'active'|'recovery';
  timer:number;
  weapon:WeaponId;
  aim:Point;
}
export const ATTACK_RIG = {
  key:'plate-knight-attack-v1', cell:256, scale:.44, ground:250,
  // Measured gauntlet centres in the normalized, transparent 3x2 atlas.
  hands:[{x:99,y:52},{x:212,y:107},{x:157,y:153},{x:96,y:50},{x:209,y:95},{x:179,y:138}],
} as const;

export function attackPose(facing:Facing, phase:KnightCombat['phase']) {
  return (facing.startsWith('north')?3:0)+(phase==='windup'?0:phase==='active'?1:2);
}
export function weaponMotion(combat:KnightCombat, flipped:boolean) {
  const phase=combat.phase, w=WEAPONS[combat.weapon];
  const duration=phase==='windup'?w.windup:phase==='active'?w.active:w.recovery;
  const progress=phase==='idle'?0:Math.max(0,Math.min(1,1-combat.timer/duration));
  // The first ACTIVE sample is contact: damage occurs on that same simulation tick.
  // Independent local weapon profiles share exactly the same body/hand sockets.
  const angles = combat.weapon==='spear'
    ? {idle:-.55,windup:-.18,active:0,recovery:.38}
    : combat.weapon==='hammer'
    ? {idle:-.9,windup:-1.72,active:.65,recovery:1.05}
    : {idle:-1.15,windup:-2.15,active:.22,recovery:.85};
  const aimAngle=Math.atan2(combat.aim.y,Math.abs(combat.aim.x));
  let angle=angles[phase]+aimAngle*(phase==='active'?1:phase==='recovery'?.5:.2);
  if(phase==='windup')angle-=progress*(combat.weapon==='hammer'?.28:.18);
  if(phase==='active')angle+=progress*(combat.weapon==='spear'?.04:.5);
  if(phase==='recovery')angle-=progress*.35;
  // Rear views foreshorten the direction, while mirroring preserves the hand join.
  if(flipped)angle=Math.PI-angle;
  return {angle,progress,length:combat.weapon==='spear'?57:combat.weapon==='hammer'?32:39};
}
