// Test-side steering only: no gameplay state writes. Keep pursuit rules shared across native drivers.
export const SPEAR_BAND={near:70,far:90} as const;
export function movementKeys(dx:number,dy:number,sign=1):string[]{
 const keys:string[]=[];
 if(Math.abs(dx)>Math.abs(dy)*.42)keys.push(dx*sign>0?'KeyD':'KeyA');
 if(Math.abs(dy)>Math.abs(dx)*.42)keys.push(dy*sign>0?'KeyS':'KeyW');
 return keys;
}
export function spearSpacing(distance:number,stuckRetreat:boolean):number{
 return distance<SPEAR_BAND.near&&!stuckRetreat?-1:distance>SPEAR_BAND.far?1:0;
}
export function retreatBlocked(distance:number,before:{x:number;y:number},after:{x:number;y:number}):boolean{
 return distance<SPEAR_BAND.near&&Math.hypot(after.x-before.x,after.y-before.y)<2;
}
