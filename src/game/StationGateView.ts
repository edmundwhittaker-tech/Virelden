import Phaser from 'phaser';
import frameUrl from '../assets/station-kit/open-frame.webp';
import {project,type Point} from '../core/game.js';
import {STATION_GATE} from '../core/level.js';
import type {Adventure} from '../core/adventure.js';
const SCALE=520/960,ANCHOR={x:472,y:776};
const APERTURE=new Phaser.Geom.Polygon([{x:374,y:716},{x:374,y:247},{x:454,y:190},{x:568,y:332},{x:568,y:845}]);
/** Station doors slide into masonry pockets; the entire building is never scaled to open. */
export class StationGateView {
 private frame:Phaser.GameObjects.Image;private leaves:Phaser.GameObjects.Graphics;private threshold:Phaser.GameObjects.Graphics;private lever:Phaser.GameObjects.Graphics;
 private state={progress:0,phase:'closed',ground:{x:0,y:0},width:520,leverHand:{x:0,y:0},leaves:[0,0],alpha:1,depth:0};
 static preload(scene:Phaser.Scene){scene.load.image('station-open-frame',frameUrl);}
 constructor(scene:Phaser.Scene){
 this.threshold=scene.add.graphics();this.leaves=scene.add.graphics();this.frame=scene.add.image(0,0,'station-open-frame').setOrigin(ANCHOR.x/960,ANCHOR.y/960).setScale(SCALE);this.lever=scene.add.graphics();
 const p=project(STATION_GATE);const mask=scene.make.graphics({x:p.x-ANCHOR.x*SCALE,y:p.y-ANCHOR.y*SCALE},false);mask.setScale(SCALE).fillStyle(0xffffff).fillPoints([{x:374,y:716},{x:374,y:247},{x:454,y:190},{x:568,y:332},{x:568,y:845}],true);this.leaves.setMask(mask.createGeometryMask());
 }
 draw(s:Adventure){
 const p=project(STATION_GATE),g=this.leaves,t=this.threshold,progress=Phaser.Math.Clamp(s.gateProgress,0,1),eased=progress*progress*(3-2*progress);
 const actor=project(s.position),left=p.x-ANCHOR.x*SCALE,top=p.y-ANCHOR.y*SCALE;
 const raw={x:(actor.x-left)/SCALE,y:(actor.y-top)/SCALE};
 const insideOpenPassage=progress>=1&&Phaser.Geom.Polygon.Contains(APERTURE,raw.x,raw.y)&&Phaser.Geom.Polygon.Contains(APERTURE,raw.x,raw.y-78/SCALE);
 const obscured=actor.y<p.y&&actor.x>left-12&&actor.x<left+520+12&&actor.y>top&&actor.y-88<top+520;
 const alpha=obscured&&!insideOpenPassage?.32:1;
 // Fade only genuinely foreground architecture; retain its registered feet and constant scale.
 this.frame.setPosition(p.x,p.y).setDepth(p.y).setAlpha(alpha);this.leaves.setAlpha(alpha);
 // The passage itself remains floor, not an opaque black wall. Ground is under the actor.
 t.clear().setDepth(p.y-120);t.fillStyle(0x111b20,.65).fillPoints([{x:p.x-66,y:p.y-41},{x:p.x+52,y:p.y+22},{x:p.x+80,y:p.y+2},{x:p.x-40,y:p.y-62}],true);
 g.clear().setPosition(p.x-ANCHOR.x*SCALE,p.y-ANCHOR.y*SCALE).setScale(SCALE).setDepth(p.y-.02);
 const polygon=(points:Point[],color:number)=>{g.fillStyle(color).fillPoints(points,true);g.lineStyle(3,0x728080).strokePoints(points,true);};
 for(let i=0;i<2;i++){
 const sign=i===0?-1:1,dx=sign*eased*115,dy=sign*eased*58;
 const points=i===0?[{x:370,y:720},{x:370,y:240},{x:470,y:183},{x:470,y:784}]:[{x:470,y:183},{x:575,y:325},{x:575,y:849},{x:470,y:784}];
 polygon(points.map(a=>({x:a.x+dx,y:a.y+dy})),i===0?0x323c40:0x283237);
 for(let j=0;j<8;j++){const x=i===0?381:481,y=270+j*63;g.lineStyle(3,0x131e24).lineBetween(x+dx,y+dy,x+76+dx,y+50+dy);g.lineStyle(1,0x82908e).lineBetween(x+dx,y+dy+2,x+76+dx,y+52+dy+2);}
 g.lineStyle(7,0x16252b).lineBetween((i===0?466:475)+dx,240+dy,(i===0?466:475)+dx,785+dy);
 }
 const lp=project(STATION_GATE.lever),pull=s.gatePhase==='pulling'?1-s.interactionTimer/.8:s.gatePhase==='closed'?0:1;
 const hand={x:lp.x-13+pull*23,y:lp.y-43+pull*13};
 const l=this.lever;l.clear().setDepth(lp.y+2);l.fillStyle(0x17242b).fillEllipse(lp.x,lp.y,23,12);l.fillStyle(0x67716e).fillRect(lp.x-7,lp.y-23,14,22);l.lineStyle(7,0x142025).lineBetween(lp.x,lp.y-20,hand.x,hand.y);l.lineStyle(4,0xabb5ac).lineBetween(lp.x,lp.y-20,hand.x,hand.y);l.lineStyle(6,0xb19c66).lineBetween(hand.x-5,hand.y,hand.x+5,hand.y);
 this.state={progress,phase:s.gatePhase,ground:p,width:520,leverHand:hand,leaves:[-eased*115,eased*115],alpha,depth:p.y};
 }
 snapshot(){return {...this.state,architectureScale:SCALE,transparentPassage:true};}
}
