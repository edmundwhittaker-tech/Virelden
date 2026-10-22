import type {Point} from './game.js';
export const ARROW_HEIGHT=67.23;
/** Screen-space socket in full draw. Same contract for body renderer and projectile spawn. */
export function archerNockOffset(aim:Point,draw=1):Point {
 const length=Math.hypot(aim.x,aim.y)||1,u={x:aim.x/length,y:aim.y/length};
 return {x:(aim.x<0?-1:1)*37.665-u.x*(4+43*draw),y:-u.y*(4+43*draw)};
}
export function archerProjectileOrigin(position:Point,aim:Point):Point {
 const o=archerNockOffset(aim);return {x:position.x+o.x/1.6+o.y/.8,y:position.y+o.y/.8-o.x/1.6};
}
