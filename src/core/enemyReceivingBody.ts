import {HUMAN_BODY,type Capsule} from './meleeContact.js';
import type {AreaId} from './expeditionCatalog.js';
import {ENEMY_APPEARANCES} from './enemyAppearance.js';

/** Only the painted head is removed; torso/legs retain the exact human capsules. */
export const HEADLESS_BODY:readonly Capsule[]=Object.freeze([HUMAN_BODY[0],HUMAN_BODY[2]]);

/** The one176px elite needs a body twice the88px human reference; equipment is
 * never body. This is not blocking, shield collision, reach or navigation. */
export const GIANT_BODY:readonly Capsule[]=Object.freeze(HUMAN_BODY.map(body=>Object.freeze({
 a:Object.freeze({x:body.a.x*2,y:body.a.y*2}),
 b:Object.freeze({x:body.b.x*2,y:body.b.y*2}),radius:body.radius*2,
})));
export function enemyReceivingBody(area:AreaId,id:string):readonly Capsule[] {
 if(area==='station'&&id==='upper-captain')return GIANT_BODY;
 return ENEMY_APPEARANCES[`${area}:${id}`]==='headless_skeleton'?HEADLESS_BODY:HUMAN_BODY;
}
