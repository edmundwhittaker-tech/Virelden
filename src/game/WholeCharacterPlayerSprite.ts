import Phaser from 'phaser';
import idleUrl from '../assets/player-whole/approved-front/idle.png';
import walk01 from '../assets/player-whole/approved-front/walk-01.png';
import walk02 from '../assets/player-whole/approved-front/walk-02.png';
import walk03 from '../assets/player-whole/approved-front/walk-03.png';
import walk04 from '../assets/player-whole/approved-front/walk-04.png';
import walk05 from '../assets/player-whole/approved-front/walk-05.png';
import walk06 from '../assets/player-whole/approved-front/walk-06.png';
import walk07 from '../assets/player-whole/approved-front/walk-07.png';
import walk08 from '../assets/player-whole/approved-front/walk-08.png';
import {ModularKnightSprite, type ArmorLoadout, type DrawFrame} from './ModularKnightSprite.js';
import {evaluateRig, type RigPose} from '../core/modularRig.js';
import {WHOLE_CHARACTER_WALK,FRONT_CARRY_HANDS,wholeCharacterCoverage,wholeCharacterWalkFrame,wholeCharacterHand,wholeCharacterOriginX,wholeCharacterEffectPoint} from '../core/wholeCharacterSprite.js';
import {WEAPON_ART, weaponTexture, weaponArtReady} from './WeaponArt.js';
import {placeWeaponArt} from '../core/weaponPlacement.js';

const IDLE_KEY='whole-character-approved-front-idle';
const WALK_URLS=[walk01,walk02,walk03,walk04,walk05,walk06,walk07,walk08];
const walkKey=(frame:number)=>`whole-character-approved-front-walk-${frame+1}`;
// A single provisional uniform idle fit, not per-frame alpha-bottom grounding.
// Its source is untouched; runtime/native transition QA must accept this fit.
const IDLE={width:1145,height:1374,root:[610,1260] as const,scale:.075,hand:[385,740] as const};

/** Staged player-only renderer. Approved front idle/walk are whole bitmaps.
 * Missing rear/actions explicitly retain the existing renderer. Equipment rules,
 * attack poses/hit geometry, gate reach and save schemas are never changed here.
 * The local proof deliberately uses one fixed starter appearance; it does NOT
 * claim visible mixed armour or complete-set variants have been supplied. */
export class WholeCharacterPlayerSprite {
 private fallback:ModularKnightSprite;
 private body:Phaser.GameObjects.Image;
 private shadow:Phaser.GameObjects.Ellipse;
 private weapon:Phaser.GameObjects.Image;
 private input?:DrawFrame;
 private pose?:RigPose;
 private activeFallback=true;
 private walkElapsed=0;
 private lastTime?:number;
 private lastMotion?:DrawFrame['motion'];
 private frame=0;
 private equipment:ArmorLoadout={helmet:'ward',chest:'ward',gauntlets:'ward',legs:'ward'};
 private hand={x:0,y:0};
 private alpha=1;
 private effectAngle=0;
 private effectSize=1;
 static preload(scene:Phaser.Scene){
  ModularKnightSprite.preload(scene);
  scene.load.image(IDLE_KEY,idleUrl);
  WALK_URLS.forEach((url,frame)=>scene.load.image(walkKey(frame),url));
 }
 constructor(private scene:Phaser.Scene){
  for(const key of [IDLE_KEY,...WALK_URLS.map((_,frame)=>walkKey(frame))])
   if(!scene.textures.exists(key))throw new Error('The approved whole-character player artwork could not load. Please reload.');
  this.fallback=new ModularKnightSprite(scene);
  this.shadow=scene.add.ellipse(0,0,32,12,0x02070a,.5).setVisible(false);
  this.body=scene.add.image(0,0,IDLE_KEY).setVisible(false);
  this.weapon=scene.add.image(0,0,weaponTexture('sword')).setVisible(false);
 }
 // Temporary legacy preflight keeps all twelve equipment items and six weapons
 // usable. It is NOT evidence that whole-character armour variants exist.
 hasArmorVisual(item:{set:string;slot:string}){return this.fallback.hasArmorVisual(item);}
 hasWeaponVisual(item:{id:string}){return this.fallback.hasWeaponVisual(item);}
 setEquipment(next:ArmorLoadout){if(!this.fallback.setEquipment(next))return false;this.equipment={...next};return true;}
 draw(input:DrawFrame,sharedPose?:RigPose){
  const dt=this.lastTime===undefined?0:Math.max(0,Math.min(.1,input.time-this.lastTime));
  if(input.motion==='walk'){
   if(this.lastMotion==='walk')this.walkElapsed+=dt;
   else this.walkElapsed=0;
  }
  this.lastTime=input.time;this.lastMotion=input.motion;this.input=input;this.pose=sharedPose??evaluateRig(input);this.alpha=1;this.effectAngle=0;this.effectSize=1;
  const coverage=wholeCharacterCoverage(input);this.activeFallback=coverage.kind!=='whole-character';
  this.body.setVisible(!this.activeFallback);this.shadow.setVisible(!this.activeFallback);this.weapon.setVisible(false);
  if(this.activeFallback){this.fallback.draw(input,this.pose);return;}
  this.fallback.setVisible(false);
  const walking=input.motion==='walk';this.frame=walking?wholeCharacterWalkFrame(this.walkElapsed):0;
  const root=walking?WHOLE_CHARACTER_WALK.root:IDLE.root,scale=walking?WHOLE_CHARACTER_WALK.scale:IDLE.scale;
  const width=walking?WHOLE_CHARACTER_WALK.sourceSize:IDLE.width,height=walking?WHOLE_CHARACTER_WALK.sourceSize:IDLE.height;
  this.body.setTexture(walking?walkKey(this.frame):IDLE_KEY).setOrigin(wholeCharacterOriginX(width,root[0],input.flipped),root[1]/height)
   .setPosition(input.position.x,input.position.y).setDepth(input.position.y).setScale(scale).setFlipX(input.flipped).setRotation(0).setAlpha(1).setTint(0xffffff);
  this.shadow.setPosition(input.position.x,input.position.y+1).setDepth(input.position.y-.1).setAlpha(.5);
  this.hand=walking?wholeCharacterHand(this.frame,input.flipped):{x:(IDLE.hand[0]-IDLE.root[0])*IDLE.scale*(input.flipped?-1:1),y:(IDLE.hand[1]-IDLE.root[1])*IDLE.scale};
  if(input.weapon&&weaponArtReady(this.scene,input.weapon)){
   const placement=placeWeaponArt(WEAPON_ART[input.weapon],this.hand,this.pose.weaponAngle,this.pose.weaponLength,input.flipped);
   if(placement)this.weapon.setTexture(weaponTexture(input.weapon)).setOrigin(placement.originX,placement.originY)
    .setPosition(input.position.x+placement.x,input.position.y+placement.y).setRotation(placement.rotation).setScale(placement.scaleX,placement.scaleY)
    .setDepth(input.position.y+.02).setVisible(true).setAlpha(1).setTint(0xffffff);
  }
 }
 effects(tint=0xffffff,angle=0,alpha=1,size=1){
  this.alpha=alpha;
  if(this.activeFallback){this.fallback.effects(tint,angle,alpha,size);return;}
  // The body is one unwarped bitmap. No independent limb or armour transforms.
  this.effectAngle=angle*Math.PI/180;this.effectSize=size;
  const baseScale=this.input?.motion==='walk'?WHOLE_CHARACTER_WALK.scale:IDLE.scale;
  this.body.setTint(tint).setAngle(angle).setAlpha(alpha).setScale(baseScale*size);
  this.shadow.setAlpha(alpha*.5);
  if(this.input?.weapon&&this.pose){
   const hand=wholeCharacterEffectPoint(this.hand,this.effectAngle,size),placement=placeWeaponArt(WEAPON_ART[this.input.weapon],hand,this.pose.weaponAngle+this.effectAngle,this.pose.weaponLength*size,this.input.flipped);
   if(placement)this.weapon.setPosition(this.input.position.x+placement.x,this.input.position.y+placement.y).setRotation(placement.rotation).setScale(placement.scaleX,placement.scaleY);
  }
  this.weapon.setTint(tint).setAlpha(alpha);
 }
 private renderedBodyPoint(source:readonly number[]){
  const x=this.body.flipX?this.body.frame.realWidth-source[0]:source[0],y=this.body.flipY?this.body.frame.realHeight-source[1]:source[1];
  const p=this.body.getWorldTransformMatrix().transformPoint(x-this.body.displayOriginX,y-this.body.displayOriginY);
  return {x:p.x,y:p.y};
 }
 snapshot(){
  const input=this.input,coverage=input?wholeCharacterCoverage(input):undefined;
  if(this.activeFallback)return {...this.fallback.snapshot(),rendererStage:'temporary-existing-action-or-rear',coverage,fixedPrototypeAppearance:false};
  const effectedHand=wholeCharacterEffectPoint(this.hand,this.effectAngle,this.effectSize),hand=input?{x:input.position.x+effectedHand.x,y:input.position.y+effectedHand.y}:{x:0,y:0};
  const bodyRoot=this.renderedBodyPoint(input?.motion==='walk'?WHOLE_CHARACTER_WALK.root:IDLE.root),bodyHand=this.renderedBodyPoint(input?.motion==='walk'?FRONT_CARRY_HANDS[this.frame]:IDLE.hand);
  const art=input?.weapon?WEAPON_ART[input.weapon]:undefined;
  const grip=art&&this.weapon.visible?this.weapon.getWorldTransformMatrix().transformPoint(art.grip[0]-this.weapon.displayOriginX,art.grip[1]-this.weapon.displayOriginY):null;
  return {visible:!!input,kind:'whole-character-sprite',rendererStage:'approved-front-idle-walk',coverage,fixedPrototypeAppearance:true,appearance:'approved-starter-ward',missingAppearanceVariants:['delver','marcher','mixed-pieces'],equipment:{...this.equipment},texture:this.body.texture.key,frame:this.frame,walking:input?.motion==='walk',view:input?.view,flipped:input?.flipped,motion:input?.motion,phase:input?.phase,alpha:this.alpha,
   foot:input?{...input.position}:{x:0,y:0},hand,supportHand:null,parts:['whole-character'],layers:[{id:'whole-character',texture:this.body.texture.key,rotation:this.body.rotation,scaleX:this.body.scaleX,scaleY:this.body.scaleY,visible:this.body.visible}],
   registration:{primaryHand:bodyHand,primaryGrip:grip?{x:grip.x,y:grip.y}:null,supportHand:null,supportGrip:null},renderedHands:{primaryHand:bodyHand,supportHand:null},renderedParts:{},renderedBodyRoot:bodyRoot,
   rig:{phase:'idle',pose:input?.motion??'idle',weapon:input?.weapon??'sword',visible:this.weapon.visible,texture:this.weapon.texture.key,hand,grip:grip?{x:grip.x,y:grip.y}:hand,angle:this.weapon.rotation,depth:this.weapon.depth,length:this.pose?.weaponLength??0,attachment:'one-handed-carry-only',supportGripHeld:false},interaction:undefined};
 }
 destroy(){this.fallback.destroy();this.body.destroy();this.shadow.destroy();this.weapon.destroy();}
}
