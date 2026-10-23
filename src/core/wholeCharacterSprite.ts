import type {RigInput, RigPoint} from './modularRig.js';

/** Presentation-only contract. These frames never supply combat or save state. */
export const WHOLE_CHARACTER_WALK = Object.freeze({frames: 8, fps: 8, sourceSize: 576, root: [288, 480] as const, scale: .25});
export type WholeCharacterCoverage = {kind: 'whole-character'} | {kind: 'legacy-action-fallback'; reason: 'missing-rear-art' | 'missing-action-art'};
export function wholeCharacterCoverage(input: Pick<RigInput, 'view' | 'motion'>): WholeCharacterCoverage {
 if (input.motion !== 'idle' && input.motion !== 'walk') return {kind: 'legacy-action-fallback', reason: 'missing-action-art'};
 if (input.view === 'rear') return {kind: 'legacy-action-fallback', reason: 'missing-rear-art'};
 return {kind: 'whole-character'};
}
export function wholeCharacterWalkFrame(elapsed: number): number {
 return Number.isFinite(elapsed) && elapsed > 0 ? Math.floor(elapsed * WHOLE_CHARACTER_WALK.fps) % WHOLE_CHARACTER_WALK.frames : 0;
}
/** Gauntlet/palm centres measured on the approved registered 352px frames.
 * These are one-handed CARRY sockets, not attack or support-hand assertions. */
export const FRONT_CARRY_HANDS: readonly (readonly [number, number])[] = [[272,333],[277,332],[238,337],[226,344],[230,340],[224,341],[213,338],[262,337]];
export function wholeCharacterHand(frame: number, flipped: boolean): RigPoint {
 const hand = FRONT_CARRY_HANDS[frame] ?? FRONT_CARRY_HANDS[0];
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
