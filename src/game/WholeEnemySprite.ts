import Phaser from 'phaser';
import {project} from '../core/game.js';
import type {Enemy} from '../core/adventure.js';
import {EXPEDITIONS,type AreaId} from '../core/expeditionCatalog.js';
import {enemyAppearance,type EnemyAppearance} from '../core/enemyAppearance.js';
import {createEnemyVisualState,sampleEnemyVisual,enemyVisualFrame,validEnemyVisualClips,type EnemyVisualClips,type EnemyVisualSample} from '../core/enemyVisualPhase.js';
import mawUrl from '../assets/enemies-whole-v1/maw_skeleton.webp';
import headlessUrl from '../assets/enemies-whole-v1/headless_skeleton.webp';
import giantUrl from '../assets/enemies-whole-v1/iron_giant.webp';
import legacyManifest from '../assets/enemies-whole-v1/manifest.json';
import keeperFrontUrl from '../assets/npc-enemy-sprites/pale_shepherd_keeper/sprite-front.webp';
import keeperRearUrl from '../assets/npc-enemy-sprites/pale_shepherd_keeper/sprite-rear.webp';
import keeperManifest from '../assets/npc-enemy-sprites/pale_shepherd_keeper/manifest.json';

const LEGACY={maw_skeleton:{url:mawUrl,scale:.5,height:88,contact:.14},headless_skeleton:{url:headlessUrl,scale:.5,height:79,contact:.1},iron_giant:{url:giantUrl,scale:1,height:176,contact:.22}} as const;
const clip=(frames:readonly number[],durationsMs:readonly number[],loop=false)=>({frames,durationsMs,loop});
function legacyClips(id:keyof typeof LEGACY,row:number):EnemyVisualClips {
 const base=row*6,walk=legacyManifest.enemies[id].animations.walk;
 return {frameCount:18,idle:clip([base],[1000],true),walk:clip(walk.map(frame=>base+frame.pose),walk.map(frame=>frame.durationMs),true),hurt:clip([base],[300]),death:clip([base],[720]),dead:clip([base],[1000]),phaseFrames:{windup:[base+3],active:[base+4],recovery:[base+5]}};
}
const keeperClips=keeperManifest.views.front.animations;
const KEEPER_CLIPS:EnemyVisualClips={frameCount:24,idle:keeperClips.idle,walk:keeperClips.walk,hurt:keeperClips.hurt,death:keeperClips.death,dead:keeperClips.dead,phaseFrames:keeperManifest.views.front.phaseFrames};

/** One already-complete frame and one shadow. No body parts, gear or hand pass. */
export class WholeEnemySprite {
 private body:Phaser.GameObjects.Image;
 private shadow:Phaser.GameObjects.Ellipse;
 private visualState=createEnemyVisualState();
 private appearance:EnemyAppearance='maw_skeleton';
 private visual:EnemyVisualSample|null=null;
 private visible=true;
 private sourceFoot={x:160,y:352};
 private frameSize={width:448,height:384};
 private scale=.5;
 private foot={x:0,y:0};
 private identity='';
 static preload(scene:Phaser.Scene){
  for(const [id,asset]of Object.entries(LEGACY))scene.load.spritesheet(`whole-enemy-${id}`,asset.url,{frameWidth:448,frameHeight:384});
  for(const [view,url]of Object.entries({front:keeperFrontUrl,rear:keeperRearUrl}))scene.load.spritesheet(`whole-enemy-pale_shepherd_keeper-${view}`,url,{frameWidth:384,frameHeight:384});
 }
 constructor(scene:Phaser.Scene){
  for(const key of [...Object.keys(LEGACY).map(id=>`whole-enemy-${id}`),'whole-enemy-pale_shepherd_keeper-front','whole-enemy-pale_shepherd_keeper-rear'])
   if(!scene.textures.exists(key))throw Error(`Required enemy artwork could not load (${key}). Please reload.`);
  if(legacyManifest.frameSize[0]!==448||legacyManifest.frameSize[1]!==384||legacyManifest.foot.x!==160||legacyManifest.foot.y!==352||Object.entries(LEGACY).some(([id,asset])=>legacyManifest.enemies[id as keyof typeof LEGACY].runtimeScale!==asset.scale))throw Error('Enemy sheet registration does not match its renderer.');
  if(!validEnemyVisualClips(KEEPER_CLIPS)||![0,1,2].every(row=>Object.keys(LEGACY).every(id=>validEnemyVisualClips(legacyClips(id as keyof typeof LEGACY,row)))))throw Error('Invalid complete enemy sprite frame contract.');
  this.shadow=scene.add.ellipse(0,0,36,15,0x02070a,.5);
  this.body=scene.add.image(0,0,'whole-enemy-maw_skeleton',0);
 }
 get humanHeight(){return this.appearance==='pale_shepherd_keeper'?88:LEGACY[this.appearance].height;}
 draw(enemy:Enemy,walking:boolean,time:number,area:AreaId='station'){
  const appearance=enemyAppearance(area,enemy);if(!appearance){this.setVisible(false);return;}
  this.appearance=appearance;this.identity=`${area}:${enemy.id}`;
  const definition=area==='station'?undefined:EXPEDITIONS[area].enemies.find(candidate=>candidate.id===enemy.id);
  const visual=sampleEnemyVisual(this.visualState,{identity:this.identity,enemy,time,walking:walking&&enemy.hp>0,timing:{windupSeconds:definition?.minimumWindupSeconds??(enemy.kind==='captain'?.8:.65),recoverySeconds:enemy.kind==='captain'?.95:.85,contactSeconds:appearance==='pale_shepherd_keeper'?.24:LEGACY[appearance].contact,deathSeconds:.72}});
  const keeper=appearance==='pale_shepherd_keeper',row=visual.facing.startsWith('north')?2:visual.facing.startsWith('south')?1:0;
  const clips=keeper?KEEPER_CLIPS:legacyClips(appearance,row),frame=enemyVisualFrame(visual,clips),p=project(enemy.position);
  this.sourceFoot=keeper?{x:176,y:304}:{x:160,y:352};this.frameSize=keeper?{width:384,height:384}:{width:448,height:384};this.scale=keeper?.5:LEGACY[appearance].scale;
  const key=keeper?`whole-enemy-pale_shepherd_keeper-${visual.view}`:`whole-enemy-${appearance}`;
  // Mirroring reflects the entire complete drawing about the fixed world foot.
  const originX=this.sourceFoot.x/this.frameSize.width,originY=this.sourceFoot.y/this.frameSize.height;
  const fallbackDeath=!keeper&&(visual.motion==='death'||visual.motion==='dead'),fall=fallbackDeath?visual.progress:0;
  this.body.setTexture(key,frame).setPosition(p.x,p.y).setDepth(p.y).setOrigin(visual.flipped?1-originX:originX,originY).setFlipX(visual.flipped).setScale(this.scale).setAngle(fall*85).setAlpha(1-fall*.8).setTint(visual.motion==='hurt'?0xf0c5a0:0xffffff).setVisible(this.visible);
  this.shadow.setPosition(p.x,p.y+1).setScale(appearance==='iron_giant'?2:1).setDepth(p.y-.1).setAlpha(fallbackDeath?.5-fall*.4:.5).setVisible(this.visible);
  this.visual=visual;this.foot=p;
 }
 setVisible(visible:boolean){this.visible=visible;this.body.setVisible(visible);this.shadow.setVisible(visible);}
 snapshot(){return {appearance:this.appearance,identity:this.identity,texture:this.body.texture.key,frame:Number(this.body.frame.name),visible:this.body.visible,walking:this.visual?.motion==='walk',direction:this.visual?.facing,flipped:this.body.flipX,motion:this.visual?.motion,phase:this.visual?.phase??null,progress:this.visual?.progress??0,foot:{...this.foot},sourceFoot:{...this.sourceFoot},frameSize:{...this.frameSize},origin:{x:this.body.originX,y:this.body.originY},scale:this.scale,humanHeight:this.humanHeight,depth:this.body.depth,shadow:{x:this.shadow.x,y:this.shadow.y,depth:this.shadow.depth,width:this.shadow.displayWidth,height:this.shadow.displayHeight},completeFrame:true,equipmentBaked:this.appearance!=='iron_giant',basicBodyOnly:this.appearance==='iron_giant',authoredHurtDeath:this.appearance==='pale_shepherd_keeper',fallback:this.appearance==='pale_shepherd_keeper'?null:'static hurt tint; whole-sprite fall/fade on death'};}
}
