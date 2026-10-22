import type {Point} from './game.js';
import type {ExpeditionDefinition,FloorRegion,AreaWall} from './expeditionCatalog.js';
export const activeFloors=(area:ExpeditionDefinition,flags:readonly string[]=[])=>area.floors.filter(f=>!f.requires||flags.includes(f.requires));
export const activeWalls=(area:ExpeditionDefinition,flags:readonly string[]=[])=>area.walls.filter(w=>!w.disabledWhen||!flags.includes(w.disabledWhen));
export const contains=(p:Point,r:{x:number;y:number;width:number;height:number},inset=0)=>p.x>=r.x+inset&&p.x<=r.x+r.width-inset&&p.y>=r.y+inset&&p.y<=r.y+r.height-inset;
/** Conservative inset rectangles overlap40 units, retaining clear radius12 seams. */
export function expeditionCanStand(area:ExpeditionDefinition,p:Point,flags:readonly string[]=[],radius=12):boolean{
 if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!activeFloors(area,flags).some(f=>contains(p,f,radius)))return false;
 if(activeWalls(area,flags).some(w=>contains(p,w,-radius)))return false;
 return area.props.every(o=>o.footprint?!contains(p,{x:o.x-o.footprint.width/2,y:o.y-o.footprint.height/2,...o.footprint},-radius):Math.hypot(p.x-o.x,p.y-o.y)>=o.radius+radius);
}
/** Segment samples include both endpoints; used for bodies and projectile fairness. */
export function expeditionClearSegment(area:ExpeditionDefinition,a:Point,b:Point,flags:readonly string[]=[],radius=12):boolean{
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));for(let i=0;i<=n;i++)if(!expeditionCanStand(area,{x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n},flags,radius))return false;return true;
}
export function regionVertices(region:FloorRegion|AreaWall):Point[]{return [{x:region.x,y:region.y},{x:region.x+region.width,y:region.y},{x:region.x+region.width,y:region.y+region.height},{x:region.x,y:region.y+region.height}];}
