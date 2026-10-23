import type {RigInput, RigPoint} from './modularRig.js';

/** Presentation-only contract. These frames never supply combat or save state. */
export const WHOLE_CHARACTER_WALK = Object.freeze({frames: 8, fps: 8, sourceSize: 576, root: [288, 480] as const, scale: .25});
export type WholeCharacterCoverage = {kind: 'whole-character'} | {kind: 'legacy-action-fallback'; reason: 'missing-action-art'};
export function wholeCharacterCoverage(input: Pick<RigInput, 'view' | 'motion'>): WholeCharacterCoverage {
 if (input.motion !== 'idle' && input.motion !== 'walk') return {kind: 'legacy-action-fallback', reason: 'missing-action-art'};
 return {kind: 'whole-character'};
}
export function wholeCharacterWalkFrame(elapsed: number): number {
 return Number.isFinite(elapsed) && elapsed > 0 ? Math.floor(elapsed * WHOLE_CHARACTER_WALK.fps) % WHOLE_CHARACTER_WALK.frames : 0;
}
/** Gauntlet/palm centres measured on the approved registered 352px frames.
 * These are one-handed CARRY sockets, not attack or support-hand assertions. */
export const FRONT_CARRY_HANDS: readonly (readonly [number, number])[] = [[272,333],[277,332],[238,337],[226,344],[230,340],[224,341],[213,338],[262,337]];
export const REAR_CARRY_HANDS: readonly (readonly [number, number])[] = [[371.0215120461045,300.9615076808421],[372.2594413916878,305.72809226883226],[358.0907496800145,304.8375309510513],[357.8657514421159,320.2649015392403],[353.70461873079785,325.35992626045135],[353.68253313631965,325.6203440242399],[371.71442997877983,300.5454696373745],[370.9419434826226,296.8535104478055]];
export const FRONT_IDLE_HAND = [217.78540503885534, 326.54970313380124] as const;
export const REAR_IDLE_HAND = [347.49204055008727, 327.03716357589894] as const;
export function wholeCharacterHand(frame: number, flipped: boolean, view:'front'|'rear'='front'): RigPoint {
 const hands=view==='rear'?REAR_CARRY_HANDS:FRONT_CARRY_HANDS;
 const hand = hands[frame] ?? hands[0];
 return {x: (hand[0] - WHOLE_CHARACTER_WALK.root[0]) * WHOLE_CHARACTER_WALK.scale * (flipped ? -1 : 1), y: (hand[1] - WHOLE_CHARACTER_WALK.root[1]) * WHOLE_CHARACTER_WALK.scale};
}
/** Phaser UV flip reflects pixels about frame centre, not an off-centre origin. */
export function wholeCharacterOriginX(width:number,rootX:number,flipped:boolean):number {
 return (flipped?width-rootX:rootX)/width;
}
/** Whole-body effects pivot on the unchanged world foot root, including carry art. */
export function wholeCharacterEffectPoint(point:RigPoint,angle:number,size:number):RigPoint {
 const c=Math.cos(angle),s=Math.sin(angle);
 return {x:(point.x*c-point.y*s)*size,y:(point.x*s+point.y*c)*size};
}
