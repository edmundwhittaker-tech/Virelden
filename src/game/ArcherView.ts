import Phaser from 'phaser';
import posesUrl from '../assets/station-kit/archer-poses.webp';
import {project} from '../core/game.js';
import {archerNockOffset,ARROW_HEIGHT} from '../core/archerRig.js';
import type {Enemy,Projectile} from '../core/adventure.js';
export const ARCHER_RIG={key:'station-archer',cell:256,ground:241,scale:.405,hand:{x:221,y:75},nock:{x:104,y:63},arrowHeight:ARROW_HEIGHT};
/** Separate, aim-oriented shaft, broadhead and split feather fletching, never a tracer. */
export function drawArrow(g:Phaser.GameObjects.Graphics,p:Projectile){
 const s=project(p.position),a=Math.atan2(p.velocity.y,p.velocity.x),u={x:Math.cos(a),y:Math.sin(a)},n={x:-u.y,y:u.x};
 const pt=(l:number,w=0)=>({x:s.x+u.x*l+n.x*w,y:s.y-ARCHER_RIG.arrowHeight+u.y*l+n.y*w});
 const line=(l:number,r:number,w:number,c:number)=>{const a=pt(l),b=pt(r);g.lineStyle(w,c).lineBetween(a.x,a.y,b.x,b.y);};
 line(0,27,4,0x172126);line(0,27,2,0xb5a482);
 const a1=pt(32),b=pt(24,3),c=pt(24,-3);g.fillStyle(0xdbe4e0).fillTriangle(a1.x,a1.y,b.x,b.y,c.x,c.y);
 for(const sign of [-1,1]){const a=pt(1),b=pt(-3,sign*4),c=pt(7);g.fillStyle(0xd2d0bd).fillTriangle(a.x,a.y,b.x,b.y,c.x,c.y);}
}
export class ArcherView{
 private body:Phaser.GameObjects.Sprite;private bow:Phaser.GameObjects.Graphics;private shadow:Phaser.GameObjects.Ellipse;
 private state={pose:0,phase:'idle',hand:{x:0,y:0},nock:{x:0,y:0},bowVisible:true};
 static preload(scene:Phaser.Scene){scene.load.spritesheet(ARCHER_RIG.key,posesUrl,{frameWidth:256,frameHeight:256});}
 constructor(scene:Phaser.Scene){this.shadow=scene.add.ellipse(0,0,34,13,0x02070a,.5);this.body=scene.add.sprite(0,0,ARCHER_RIG.key).setOrigin(.5,241/256).setScale(.405);this.bow=scene.add.graphics();}
 draw(e:Enemy,walking:boolean){
 const p=project(e.position),flip=e.aim.x<0?-1:1,pose=e.phase==='windup'?1:e.phase==='recovery'?2:0;
 const bob=walking?Math.sin(Date.now()/100)*1.2:0;
 this.body.setFrame(pose).setFlipX(flip<0).setPosition(p.x,p.y+bob).setDepth(p.y).setVisible(e.hp>0).setTint(e.phase==='stagger'?0xffbda8:0xffffff);
 this.shadow.setPosition(p.x,p.y).setDepth(p.y-.1).setVisible(e.hp>0);
 const hand={x:p.x+(221-128)*.405*flip,y:p.y+(75-241)*.405+bob};
 const draw=e.phase==='windup'?Math.min(1,(.9-e.timer)/.35):0;
 const length=Math.hypot(e.aim.x,e.aim.y)||1,u={x:e.aim.x/length,y:e.aim.y/length},n={x:-u.y,y:u.x};
 const off=archerNockOffset(e.aim,draw),nock={x:p.x+off.x,y:p.y-ARROW_HEIGHT+off.y+bob};
 const g=this.bow;g.clear().setDepth(p.y+.03).setVisible(e.hp>0);
 const bp=(along:number,across:number)=>({x:hand.x+u.x*along+n.x*across,y:hand.y+u.y*along+n.y*across});
 const pts=[bp(-5,-30),bp(5,-21),bp(8,0),bp(5,21),bp(-5,30)];
 g.lineStyle(5,0x152025).strokePoints(pts);g.lineStyle(3,0x99866b).strokePoints(pts);g.lineStyle(1,0xc7c6b5).beginPath().moveTo(pts[0].x,pts[0].y).lineTo(nock.x,nock.y).lineTo(pts[4].x,pts[4].y).strokePath();
 if(e.phase!=='recovery'){
 const tip=bp(23,0),base=bp(15,0),left=bp(15,-3),right=bp(15,3);
 g.lineStyle(2,0xc0ae85).lineBetween(nock.x,nock.y,base.x,base.y);g.fillStyle(0xd8e0d9).fillTriangle(tip.x,tip.y,left.x,left.y,right.x,right.y);
 g.lineStyle(3,0xd4d4c5).lineBetween(nock.x,nock.y,nock.x+u.x*6+n.x*3,nock.y+u.y*6+n.y*3);
 }
 g.fillStyle(0x9ba5a3).fillCircle(hand.x,hand.y,2.5);
 this.state={pose,phase:e.phase,hand,nock,bowVisible:e.hp>0};
 }
 effects(tint=0xffffff,angle=0,alpha=1,size=1){this.body.setTint(tint).setAngle(angle).setAlpha(alpha).setScale(.405*size);this.bow.setAlpha(alpha);}
 snapshot(){return {...this.state,texture:ARCHER_RIG.key};}
}
