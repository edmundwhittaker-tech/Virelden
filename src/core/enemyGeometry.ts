import {enemyEquipmentPoint,finitePoint,type EnemyPoint,type EnemyPose} from './enemyPose.js';
export interface EnemyCapsule {readonly a:EnemyPoint;readonly b:EnemyPoint;readonly radius:number}
export interface EnemyAlphaGeometry {readonly alphaThreshold:number;readonly equipment:Readonly<Record<string,{readonly rects:readonly (readonly number[])[]}>>}
export interface EnemyPolygon {readonly equipment:string;readonly layer:number;readonly points:readonly EnemyPoint[]}
/** Inject current target body in projected pixels; no fixed player height/capsule here. */
export type EnemyTargetBody=readonly EnemyCapsule[];
const cross=(a:EnemyPoint,b:EnemyPoint,c:EnemyPoint)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function pointSegment(p:EnemyPoint,a:EnemyPoint,b:EnemyPoint):number{const x=b.x-a.x,y=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*t,p.y-a.y-y*t);}
function segmentDistance(a:EnemyPoint,b:EnemyPoint,c:EnemyPoint,d:EnemyPoint):number{if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));}
function inside(p:EnemyPoint,points:readonly EnemyPoint[]):boolean{let positive=false,negative=false;for(let i=0;i<points.length;i++){const c=cross(points[i],points[(i+1)%points.length],p);positive ||= c>1e-9;negative ||= c< -1e-9;}return !(positive&&negative);}
export function polygonTouchesCapsule(points:readonly EnemyPoint[],body:EnemyCapsule):boolean{
 if(points.length<3||points.some(p=>!finitePoint(p))||Math.abs(points.reduce((n,p,i)=>n+p.x*points[(i+1)%points.length].y-p.y*points[(i+1)%points.length].x,0))<1e-12||!finitePoint(body.a)||!finitePoint(body.b)||!Number.isFinite(body.radius)||body.radius<0)throw new Error('Invalid target-body geometry');
 return inside(body.a,points)||inside(body.b,points)||points.some((p,i)=>segmentDistance(p,points[(i+1)%points.length],body.a,body.b)<=body.radius);
}
/** Immutable canonical per-frame geometry cache. Sources must remain immutable.
 * Foot translation does not rebuild/refit source rectangles for every stance. */
interface CachedPolygon extends EnemyPolygon {readonly bounds:readonly [number,number,number,number]}
const geometryCache=new WeakMap<object,WeakMap<object,Map<string,readonly CachedPolygon[]>>>();
function localGeometry(pose:EnemyPose,alpha:EnemyAlphaGeometry):readonly CachedPolygon[]{
 let byAlpha=geometryCache.get(pose.frame);if(!byAlpha){byAlpha=new WeakMap();geometryCache.set(pose.frame,byAlpha);}
 let byTransform=byAlpha.get(alpha);if(!byTransform){byTransform=new Map();byAlpha.set(alpha,byTransform);}
 const key=`${pose.scale}:${pose.mirror}`,cached=byTransform.get(key);if(cached)return cached;
 const local={...pose,foot:{x:0,y:0}},polygons:CachedPolygon[]=[];
 for(const item of pose.frame.equipment){
  const source=alpha.equipment[item.equipment];if(!source)throw new Error(`Missing alpha geometry: ${item.equipment}`);
  for(const rect of source.rects){if(rect.length!==4||rect.some(n=>!Number.isFinite(n))||rect[2]<=rect[0]||rect[3]<=rect[1])throw new Error('Invalid alpha rectangle');
   const [l,t,r,b]=rect,points=[{x:l,y:t},{x:r,y:t},{x:r,y:b},{x:l,y:b}].map(p=>Object.freeze(enemyEquipmentPoint(local,item,p)));
   const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
   polygons.push(Object.freeze({equipment:item.equipment,layer:item.layer,points:Object.freeze(points),bounds:Object.freeze([Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]) as readonly [number,number,number,number]}));
  }
 }
 const result=Object.freeze(polygons);byTransform.set(key,result);return result;
}
/** Opaque source-pixel rectangles, not weapon bounding boxes or enlarged reach. */
export function enemyEquipmentGeometry(pose:EnemyPose,alpha:EnemyAlphaGeometry):readonly EnemyPolygon[]{
 const local=localGeometry(pose,alpha);if(!pose.foot.x&&!pose.foot.y)return local;
 return local.map(p=>({equipment:p.equipment,layer:p.layer,points:p.points.map(q=>({x:q.x+pose.foot.x,y:q.y+pose.foot.y}))}));
}
export function enemyTouchesBody(pose:EnemyPose,alpha:EnemyAlphaGeometry,body:EnemyTargetBody,kind:'weapon'|'shield'='weapon'):boolean{
 if(!body.length)return false;
 const localBody=body.map(b=>({a:{x:b.a.x-pose.foot.x,y:b.a.y-pose.foot.y},b:{x:b.b.x-pose.foot.x,y:b.b.y-pose.foot.y},radius:b.radius}));
 return localGeometry(pose,alpha).some(p=>(p.equipment.startsWith('shield')===(kind==='shield'))&&localBody.some(b=>{
  const [l,t,r,bt]=p.bounds;
  if(Math.max(b.a.x,b.b.x)+b.radius<l||Math.min(b.a.x,b.b.x)-b.radius>r||Math.max(b.a.y,b.b.y)+b.radius<t||Math.min(b.a.y,b.b.y)-b.radius>bt)return false;
  return polygonTouchesCapsule(p.points,b);
 }));
}
export function translateEnemyBody(body:EnemyTargetBody,foot:EnemyPoint):EnemyTargetBody{return body.map(b=>({a:{x:b.a.x+foot.x,y:b.a.y+foot.y},b:{x:b.b.x+foot.x,y:b.b.y+foot.y},radius:b.radius}));}
