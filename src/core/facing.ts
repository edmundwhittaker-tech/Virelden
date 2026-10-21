import type { Point } from './game.js';

export type Facing = 'east' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west';

/** Screen-relative movement chooses artwork; idle keeps the last facing. */
export function facingForInput(input: Point, previous: Facing): Facing {
  if (input.y) {
    const west = input.x < 0 || (input.x === 0 && previous.endsWith('west'));
    return input.y < 0 ? (west ? 'north-west' : 'north-east') : (west ? 'south-west' : 'south-east');
  }
  if (input.x) return input.x < 0 ? 'west' : 'east';
  return previous;
}
