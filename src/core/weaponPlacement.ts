/** Textured weapon geometry. The grip is authoritative; whole-actor transforms apply afterward. */
export interface WeaponArtGeometry {readonly sourceSize:readonly number[];readonly grip:readonly number[];readonly axisTip:readonly number[];readonly supportGrip?:readonly number[]}
export function placeWeaponArt(asset:WeaponArtGeometry,hand:{x:number;y:number},angle:number,length:number,flipped:boolean){
 const [width,height]=asset.sourceSize,[gx,gy]=asset.grip,sourceLength=asset.axisTip[0]-gx;
 if(![width,height,gx,gy,sourceLength,hand.x,hand.y,angle,length].every(Number.isFinite)||width<=0||height<=0||sourceLength<=0||length<=0||gx<0||gx>width||gy<0||gy>height)return null;
 const scale=length/sourceLength,scaleY=scale*(flipped?-1:1),cos=Math.cos(angle),sin=Math.sin(angle);
 const point=(source:readonly number[])=>{const x=(source[0]-gx)*scale,y=(source[1]-gy)*scaleY;return {x:hand.x+x*cos-y*sin,y:hand.y+x*sin+y*cos};};
 return {x:hand.x,y:hand.y,rotation:angle,scaleX:scale,scaleY,originX:gx/width,originY:gy/height,tip:point(asset.axisTip),support:asset.supportGrip?point(asset.supportGrip):null};
}
