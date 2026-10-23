import type {RigPartId,RigPose,RigWeapon} from '../core/modularRig.js';
import wardManifest from '../assets/ward/manifest.json';
import delverManifest from '../assets/delver/manifest.json';
import marcherManifest from '../assets/marcher/manifest.json';
export type ArmorSlot='helmet'|'chest'|'gauntlets'|'legs';
export interface PartAsset {id:string;slot:ArmorSlot;view:string;texture:string;frame:number;sourceSize:number[];pivot:number[];distal:number[];nominalLength:number;layer:number;alphaBounds:number[]}
export interface ArmorManifest {set:string;sourcePixelScale:number;parts:Record<string,PartAsset>}
export const WARD_MANIFEST=wardManifest as ArmorManifest;
export const DELVER_MANIFEST=delverManifest as ArmorManifest;
export const MARCHER_MANIFEST=marcherManifest as ArmorManifest;
export interface DrawOptions{view:'front'|'rear';flipped:boolean;weapon?:RigWeapon;weaponAngle?:number;showBones?:boolean;alpha?:number;overrides?:Partial<Record<RigPartId,{asset:PartAsset;atlas:CanvasImageSource}>>}
export const WEAPON_LENGTH:Record<RigWeapon,number>={sword:39,spear:57,hammer:32,axe:36,falchion:39,poleaxe:56};
export function paintWeapon(ctx:CanvasRenderingContext2D,weapon:RigWeapon,hand:{x:number;y:number},angle:number,length=WEAPON_LENGTH[weapon]){
 ctx.save();ctx.translate(hand.x,hand.y);ctx.rotate(angle);
 const line=(a:number,b:number,width:number,color:string,y=0)=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.moveTo(a,y);ctx.lineTo(b,y);ctx.stroke();};
 line(-8,length,5,'#111b20');
 if(weapon==='spear'||weapon==='poleaxe'){
  line(-11,length-9,2.5,'#81745c');ctx.fillStyle='#aebbbb';ctx.beginPath();ctx.moveTo(length,0);ctx.lineTo(length-12,-3.5);ctx.lineTo(length-12,3.5);ctx.closePath();ctx.fill();
  if(weapon==='poleaxe'){ctx.beginPath();ctx.moveTo(length-13,0);ctx.lineTo(length-18,-10);ctx.lineTo(length-6,-8);ctx.lineTo(length-3,-3);ctx.closePath();ctx.fill();}
 }else if(weapon==='hammer'){
  line(-6,length-3,2.5,'#85745a');ctx.fillStyle='#9faaa6';ctx.fillRect(length-7,-8,8,16);ctx.fillStyle='#d0d1bc';ctx.fillRect(length-7,-8,2,16);
 }else if(weapon==='axe'){
  line(-6,length-3,2.5,'#85745a');ctx.fillStyle='#aab7b5';ctx.beginPath();ctx.moveTo(length-13,0);ctx.lineTo(length-16,-12);ctx.lineTo(length-2,-10);ctx.lineTo(length+1,-3);ctx.closePath();ctx.fill();
 }else{
  line(5,length-2,3.5,'#aab9ba');line(7,length,.7,'#e0e1d0',-1);line(-6,3,2.5,'#514739');line(4,4,2.5,'#a6976c');ctx.fillStyle='#a6976c';ctx.fillRect(3,-5,2,10);
  if(weapon==='falchion'){ctx.fillStyle='#b6c2bf';ctx.beginPath();ctx.moveTo(length-12,-2);ctx.lineTo(length-2,-7);ctx.lineTo(length+1,-4);ctx.lineTo(length-1,2);ctx.closePath();ctx.fill();}
 }
 ctx.restore();
}
/** The canvas and Phaser adapters consume exactly these same source pivots and bones. */
export function paintRig(ctx:CanvasRenderingContext2D,atlas:CanvasImageSource,pose:RigPose,options:DrawOptions,manifest:ArmorManifest=WARD_MANIFEST){
 ctx.save();ctx.rotate(pose.actor.angle);ctx.scale(pose.actor.scaleX,pose.actor.scaleY);ctx.globalAlpha=options.alpha??1;
 const order=Object.entries(pose.parts).sort((a,b)=>a[1].depth-b[1].depth);
 for(const [id,part] of order){
  if(part.depth===15&&options.weapon&&pose.weaponVisible)paintWeapon(ctx,options.weapon,pose.hand,options.weaponAngle??pose.weaponAngle,pose.weaponLength);
  // Neutral articulated steel disks hide the moving sockets, never cloth/flesh.
  if(id!=='helmet'&&id!=='torso'&&id!=='pelvis'){
   ctx.fillStyle='#182225';ctx.beginPath();ctx.arc(part.start.x,part.start.y,id.startsWith('upperarm')?5:id.startsWith('thigh')?3.5:2.5,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#596564';ctx.lineWidth=.7;ctx.stroke();
  }
  const override=options.overrides?.[id as RigPartId],asset=override?.asset??manifest.parts[`${options.view}/${id as RigPartId}`];if(!asset)continue;
  const [px,py]=asset.pivot,[dx,dy]=asset.distal,sourceAngle=Math.atan2(dy-py,dx-px),sourceLength=Math.hypot(dx-px,dy-py);
  // Mirror image pixels and its source vector, not only joint coordinates.
  const mir=options.flipped?-1:1,angle=part.angle-Math.atan2(dy-py,(dx-px)*mir),scale=part.length/sourceLength;
  ctx.save();ctx.translate(part.start.x,part.start.y);ctx.rotate(part.angle);ctx.scale(scale,(part.artSpan??part.length)/sourceLength);ctx.rotate(-Math.atan2(dy-py,(dx-px)*mir));ctx.scale(mir,1);
  const sx=asset.frame%4*256,sy=Math.floor(asset.frame/4)*256;
  ctx.drawImage(override?.atlas??atlas,sx,sy,256,256,-px,-py,256,256);ctx.restore();
 }
 if(options.showBones){ctx.lineWidth=.5;for(const p of Object.values(pose.parts)){ctx.strokeStyle='#f6b759';ctx.beginPath();ctx.moveTo(p.start.x,p.start.y);ctx.lineTo(p.end.x,p.end.y);ctx.stroke();ctx.fillStyle='#f6b759';ctx.fillRect(p.start.x-1,p.start.y-1,2,2);}}
 ctx.restore();
}

