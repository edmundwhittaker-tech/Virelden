import Phaser from 'phaser';
import frontUrl from '../assets/ward/front.webp';
import rearUrl from '../assets/ward/rear.webp';
import delverFrontUrl from '../assets/delver/front.webp';
import delverRearUrl from '../assets/delver/rear.webp';
import {evaluateRig,actorPoint,type RigInput,type RigPoint,type RigPose,type RigPartId,type RigWeapon} from '../core/modularRig.js';
import {WARD_MANIFEST,DELVER_MANIFEST,type ArmorSlot,type ArmorManifest} from './paintRig.js';
import {preloadWeaponArt,weaponArtReady,weaponTexture,WEAPON_ART} from './WeaponArt.js';
import {placeWeaponArt} from '../core/weaponPlacement.js';
export type ArmorSetId='ward'|'delver'|'marcher';
export type ArmorLoadout=Record<ArmorSlot,ArmorSetId>;
const STARTER:ArmorLoadout={helmet:'ward',chest:'ward',gauntlets:'ward',legs:'ward'};
const SETS:Partial<Record<ArmorSetId,ArmorManifest>>={ward:WARD_MANIFEST,delver:DELVER_MANIFEST};
const URLS={'ward-front':frontUrl,'ward-rear':rearUrl,'delver-front':delverFrontUrl,'delver-rear':delverRearUrl};
export interface DrawFrame extends RigInput{position:RigPoint;weaponPhase?:'idle'|'windup'|'active'|'recovery';weaponProgress?:number}
/** Art-only renderer. Core supplies phase/progress; no independent attack timing or stats. */
export class ModularKnightSprite {
 private root:Phaser.GameObjects.Container;
 private shadow:Phaser.GameObjects.Ellipse;
 private joints:Phaser.GameObjects.Graphics;
 private weapon:Phaser.GameObjects.Image;
 private images=new Map<RigPartId,Phaser.GameObjects.Image>();
 private equipment:ArmorLoadout={...STARTER};
 private last?:{pose:RigPose;input:DrawFrame};
 private alpha=1;
 static preload(scene:Phaser.Scene){preloadWeaponArt(scene);for(const[key,url]of Object.entries(URLS))scene.load.spritesheet(key,url,{frameWidth:256,frameHeight:256});}
 constructor(private scene:Phaser.Scene){
  this.root=scene.add.container(0,0);this.shadow=scene.add.ellipse(0,0,32,12,0x02070a,.5);
  this.joints=scene.add.graphics().setDepth(0);this.weapon=scene.add.image(0,0,weaponTexture('sword')).setDepth(14).setVisible(false);this.root.add([this.joints,this.weapon]);
  for(const id of Object.keys(WARD_MANIFEST.parts).filter(k=>k.startsWith('front/')).map(k=>k.slice(6)as RigPartId)){
   const image=scene.add.image(0,0,'ward-front',0);this.images.set(id,image);this.root.add(image);
  }
 }
 /** Synchronous ready check used by atomic equipment core preflight; no async loading here. */
 hasArmorVisual(item:{set:string;slot:string}):boolean{
  const manifest=SETS[item.set as ArmorSetId];if(!manifest||!['helmet','chest','gauntlets','legs'].includes(item.slot))return false;
  const expected=Object.values(WARD_MANIFEST.parts).filter(p=>p.slot===item.slot).length;
  const parts=Object.values(manifest.parts).filter(p=>p.slot===item.slot);
  return parts.length===expected&&parts.every(p=>this.scene.textures.exists(p.texture)&&this.scene.textures.get(p.texture).has(String(p.frame))&&p.pivot.every(Number.isFinite)&&p.distal.every(Number.isFinite)&&p.nominalLength>0);
 }
 setEquipment(next:ArmorLoadout):boolean{
  const slots:ArmorSlot[]=['helmet','chest','gauntlets','legs'];
  if(!next||Object.keys(next).length!==4||!slots.every(slot=>this.hasArmorVisual({slot,set:next[slot]})))return false;
  this.equipment={...next};return true;
 }
 draw(input:DrawFrame){
  const pose=evaluateRig(input),{position}=input;this.last={pose,input};this.alpha=1;
  // Reset every pooled transform first, including one-frame roll/death state.
  this.root.setPosition(position.x,position.y).setDepth(position.y).setRotation(pose.actor.angle).setScale(pose.actor.scaleX,pose.actor.scaleY).setAlpha(1).setVisible(true);
  this.shadow.setPosition(position.x,position.y+1).setDepth(position.y-.1).setAlpha(.5).setVisible(true);
  const g=this.joints;g.clear().setPosition(0,0).setRotation(0).setScale(1).setAlpha(1);
  for(const [id,part]of Object.entries(pose.parts))if(!['helmet','torso','pelvis'].includes(id)){
   const radius=id.startsWith('upperarm')?5:id.startsWith('thigh')?3.5:2.5;
   g.fillStyle(0x1b2629).fillCircle(part.start.x,part.start.y,radius);g.lineStyle(.7,0x606b68).strokeCircle(part.start.x,part.start.y,radius);
  }
  for(const[id,image]of this.images){
   image.setVisible(false).setAlpha(1).setTint(0xffffff).setRotation(0).setScale(1).setFlip(false,false);
   const slot=WARD_MANIFEST.parts[`${input.view}/${id}`].slot,manifest=SETS[this.equipment[slot]],asset=manifest?.parts[`${input.view}/${id}`];if(!asset)continue;
   const part=pose.parts[id],[px,py]=asset.pivot,[dx,dy]=asset.distal,mir=input.flipped?-1:1;
   const scale=part.length/Math.hypot(dx-px,dy-py),angle=part.angle-Math.atan2(dy-py,(dx-px)*mir);
   image.setTexture(asset.texture,asset.frame).setOrigin(px/256,py/256).setPosition(part.start.x,part.start.y).setRotation(angle).setScale(scale*mir,scale).setDepth(part.depth).setVisible(true);
  }
  this.drawWeapon(input,pose);this.root.sort('depth');
 }
 hasWeaponVisual(item:{id:string}):boolean{return weaponArtReady(this.scene,item.id);}
 private drawWeapon(input:DrawFrame,pose:RigPose){
  const image=this.weapon;image.setVisible(false).setPosition(0,0).setRotation(0).setScale(1).setAlpha(1).setTint(0xffffff).setFlip(false,false);
  if(!input.weapon||!pose.weaponVisible||!weaponArtReady(this.scene,input.weapon))return;
  const placement=placeWeaponArt(WEAPON_ART[input.weapon],pose.hand,pose.weaponAngle,pose.weaponLength,input.flipped);if(!placement)return;
  image.setTexture(weaponTexture(input.weapon)).setOrigin(placement.originX,placement.originY).setPosition(placement.x,placement.y).setRotation(placement.rotation).setScale(placement.scaleX,placement.scaleY).setDepth(14).setVisible(true);
 }
 effects(tint=0xffffff,angle=0,alpha=1,size=1){
  // External hurt/death style layers over the freshly reset current frame, never accumulates.
  for(const imageof of this.images.values())imageof.setTint(tint);
  this.alpha=alpha;this.root.setAlpha(alpha);this.shadow.setAlpha(alpha*.5);
  if(this.last){const a=this.last.pose.actor;this.root.setRotation(a.angle+angle*Math.PI/180).setScale(a.scaleX*size,a.scaleY*size);}
 }
 snapshot(){const r=this.last;if(!r)return{visible:false};const actor={angle:this.root.rotation,scaleX:this.root.scaleX,scaleY:this.root.scaleY},hand=actorPoint(r.pose.hand,actor),support=actorPoint(r.pose.supportHand,actor);return{texture:'modular-plate',frame:0,walking:r.input.motion==='walk',rig:{phase:r.input.phase??'idle',pose:r.input.motion==='attack'?r.input.phase:r.input.motion,weapon:r.input.weapon??'sword',visible:this.weapon.visible,texture:this.weapon.texture.key,hand:{x:r.input.position.x+hand.x,y:r.input.position.y+hand.y},grip:{x:r.input.position.x+hand.x,y:r.input.position.y+hand.y},angle:r.pose.weaponAngle+this.root.rotation,depth:r.input.position.y+.02,length:r.pose.weaponLength},visible:true,kind:'modular-15-part',equipment:{...this.equipment},view:r.input.view,flipped:r.input.flipped,motion:r.input.motion,phase:r.input.phase,alpha:this.alpha,parts:[...this.images.keys()],layers:[...this.images].map(([id,image])=>({id,texture:image.texture.key,frame:Number(image.frame.name),x:image.x,y:image.y,rotation:image.rotation,scaleX:image.scaleX,scaleY:image.scaleY,visible:image.visible})),interaction:r.pose.interaction?{...r.pose.interaction,requested:{...r.pose.interaction.requested},actual:{...r.pose.interaction.actual}}:undefined,hand:{x:r.input.position.x+hand.x,y:r.input.position.y+hand.y},supportHand:{x:r.input.position.x+support.x,y:r.input.position.y+support.y},foot:{...r.input.position}};}
 destroy(){this.root.destroy(true);this.shadow.destroy();}
}
