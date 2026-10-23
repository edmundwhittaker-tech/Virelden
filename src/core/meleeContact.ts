/** Bounded geometric contact proxies, calibrated to the registered ordinary-weapon art.
 * All coordinates are projected game pixels. No texture reads or per-pixel collision.
 * Catalog shapes remain hard reach/arc envelopes; these proxies only narrow contact.
 */
import {evaluateRig,type RigPose} from './modularRig.js';
import {WEAPON_CATALOG,type WeaponId} from './weaponCatalog.js';
import type {Facing} from './facing.js';
import type {Point} from './game.js';
export interface Capsule {readonly a:Point;readonly b:Point;readonly radius:number}
type LocalCapsule=readonly [ax:number,ay:number,bx:number,by:number,radius:number];
const PROXIES:Readonly<Record<WeaponId,readonly LocalCapsule[]>>=Object.freeze({
 sword:[[7,0,52,0,1.7]],
 spear:[[1,0,92,0,1.2],[80,0,92,0,2.2]],
 hammer:[[2,0,43,0,1.3],[38,-3.5,43,3.5,3]],
 axe:[[2,0,57,0,1.3],[48,-9,57,-1,4]],
 falchion:[[7,0,25,0,2],[25,0,50,-2,2.6],[50,-2,65.5,-6.7,2]],
 poleaxe:[[0,0,109,0,1.3],[95,-7,105,2,3.7]],
});
const LENGTHS:Readonly<Record<WeaponId,number>>={sword:53,spear:93,hammer:46,axe:60,falchion:66,poleaxe:110};
/** Conservative upright88px body, excluding held weapons, shields and shadow.
 * Separate torso/head/legs avoid treating the empty corners of a sprite box as flesh.
 */
export const HUMAN_BODY:readonly Capsule[]=Object.freeze([
 {a:{x:0,y:-65},b:{x:0,y:-37},radius:12},
 {a:{x:0,y:-79},b:{x:0,y:-75},radius:5},
 {a:{x:0,y:-28},b:{x:0,y:-10},radius:6},
]);
export interface MeleeSweep {readonly weapon:WeaponId;readonly aim:Point;readonly facing:Facing;readonly from:number;readonly to:number;readonly poseAt?:(progress:number)=>RigPose}
export interface MeleeFrame {readonly progress:number;readonly pose:RigPose;readonly capsules:readonly Capsule[]}
const clamp=(p:number)=>Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
export function meleeFrame(weapon:WeaponId,aim:Point,facing:Facing,progress:number,sharedPose?:RigPose):MeleeFrame{
 const w=WEAPON_CATALOG[weapon],flipped=facing.endsWith('west'),p=clamp(progress);
 const pose=sharedPose??evaluateRig({motion:'attack',time:0,view:facing.startsWith('north')?'rear':'front',flipped,phase:'active',progress:p,weapon,aim,weaponMotion:w.motion,weaponHands:w.hands,weaponReach:w.range});
 const scale=pose.weaponLength/LENGTHS[weapon],c=Math.cos(pose.weaponAngle),s=Math.sin(pose.weaponAngle);
 const point=(x:number,y:number):Point=>{x*=scale;y*=scale*(flipped?-1:1);return {x:pose.hand.x+x*c-y*s,y:pose.hand.y+x*s+y*c};};
 return {progress:p,pose,capsules:PROXIES[weapon].map(([ax,ay,bx,by,radius])=>({a:point(ax,ay),b:point(bx,by),radius:radius*scale}))};
}
/** At most .04radians between samples (~4.4px at the longest weapon).
 * The outer simulation also caps and subdivides delayed ticks; include both endpoints.
 */
export function sampleMeleeSweep(input:MeleeSweep):readonly MeleeFrame[]{
 const from=clamp(input.from),to=Math.max(from,clamp(input.to)),w=WEAPON_CATALOG[input.weapon];
 const angle=w.motion.kind==='cut'?Math.abs(w.motion.endAngle-w.motion.startAngle):Math.abs(w.motion.endAngle);
 const steps=Math.min(80,Math.max(1,Math.ceil((to-from)*Math.max(angle,.1)/.04)));
 return Array.from({length:from===to?1:steps+1},(_,i)=>{const p=from+(to-from)*i/steps;return meleeFrame(input.weapon,input.aim,input.facing,p,input.poseAt?.(p));});
}
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function pointSegmentSquared(p:Point,a:Point,b:Point):number{const x=b.x-a.x,y=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return (p.x-a.x-x*t)**2+(p.y-a.y-y*t)**2;}
export function segmentDistanceSquared(a:Point,b:Point,c:Point,d:Point):number{
 // Non-collinear crossing. Collinear/disjoint segments are covered by endpoint distances.
 const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
 if(abC*abD<0&&cdA*cdB<0)return 0;
 return Math.min(pointSegmentSquared(a,c,d),pointSegmentSquared(b,c,d),pointSegmentSquared(c,a,b),pointSegmentSquared(d,a,b));
}
export function weaponTouchesBody(frame:MeleeFrame,targetFoot:Point,receivingBody:readonly Capsule[]=HUMAN_BODY):boolean{
 return frame.capsules.some(weapon=>receivingBody.some(body=>{
  const a={x:targetFoot.x+body.a.x,y:targetFoot.y+body.a.y},b={x:targetFoot.x+body.b.x,y:targetFoot.y+body.b.y};
  return segmentDistanceSquared(weapon.a,weapon.b,a,b)<=(weapon.radius+body.radius)**2;
 }));
}

