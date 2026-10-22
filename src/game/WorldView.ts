import Phaser from 'phaser';
import {SIZE,PILLARS,project,type Point} from '../core/game.js';
import {KnightSprite} from './KnightSprite.js';
import {WALLS,LOOT,LOCATIONS,WEAPONS,invulnerable,type Adventure} from '../core/adventure.js';
import {facingForInput} from '../core/facing.js';
import type {Facing} from '../core/facing.js';
import courtUrl from '../assets/environment-v1/slate-court.webp';
import pillarUrl from '../assets/environment-v1/gothic-pillar.webp';
import vaultUrl from '../assets/environment-v1/sealed-vault.webp';
import rubbleUrl from '../assets/environment-v1/fallen-masonry.webp';
import wallUrl from '../assets/environment-v1/low-wall.webp';
import mudUrl from '../assets/environment-v1/mud-track.webp';
type Graphics=Phaser.GameObjects.Graphics;
function poly(g:Graphics,points:Point[],color:number,stroke=0x465052){
  g.fillStyle(color).fillPoints(points,true);
  g.lineStyle(1,stroke,.65).strokePoints(points,true);
}
function corners(x:number,y:number,r:number):Point[]{
  return [{x:x-r,y:y-r},{x:x+r,y:y-r},{x:x+r,y:y+r},{x:x-r,y:y+r}].map(project);
}
function column(scene:Phaser.Scene,x:number,y:number,radius:number,height:number){
  const g=scene.add.graphics().setDepth(project({x,y}).y+radius*.4);
  const [a,b,c,d]=corners(x,y,radius), p=project({x,y});
  const top=(q:Point)=>({x:q.x,y:q.y-height});
  g.fillStyle(0x05080b,.3).fillEllipse(p.x+32,p.y+7,105,25);
  poly(g,corners(x,y,radius+6),0x41494a);
  poly(g,[b,c,top(c),top(b)],0x263035);
  poly(g,[c,d,top(d),top(c)],0x3d484b);
  poly(g,[a,b,c,d].map(top),0x56605e);
  poly(g,corners(x,y,radius+4).map(q=>({x:q.x,y:q.y-height+14})),0x58615e);
  g.lineStyle(2,0x89918a,.25).lineBetween(c.x-6,c.y-20,c.x-6,c.y-height+30);
  g.lineStyle(1,0xb3a078,.4).lineBetween(d.x+6,d.y-height+28,c.x-6,c.y-height+28);
}
/** Courtyard geometry and a replaceable animated character renderer. */
export class WorldView{
  private actor:KnightSprite;
  private enemies:KnightSprite[]=[];
  private effects:Graphics;
  private gates:Graphics[]=[];
  private labels:Phaser.GameObjects.Text[]=[];
  private enemyPositions:Point[]=[];
  private wallViews:{g:Graphics|Phaser.GameObjects.Image;left:number;right:number;top:number;bottom:number}[]=[];
  private occluders:{image:Phaser.GameObjects.Image;position:Point}[]=[];
  static preload(scene:Phaser.Scene){for(const [key,url] of Object.entries({'ward-floor':courtUrl,'ward-pillar':pillarUrl,'ward-vault':vaultUrl,'ward-rubble':rubbleUrl,'ward-wall':wallUrl,'ward-mud':mudUrl}))scene.load.image(key,url);}
  constructor(scene:Phaser.Scene){
    const floor=scene.add.graphics().setDepth(-1000);
    const edges=[{x:0,y:0},{x:SIZE,y:0},{x:SIZE,y:SIZE},{x:0,y:SIZE}].map(project);
    floor.fillStyle(0x000000,.3).fillEllipse(640,480,1120,510);
    poly(floor,[edges[1],edges[2],{x:edges[2].x,y:edges[2].y+22},{x:edges[1].x,y:edges[1].y+22}],0x1b252a);
    poly(floor,[edges[2],edges[3],{x:edges[3].x,y:edges[3].y+22},{x:edges[2].x,y:edges[2].y+22}],0x293439);
    for(let x=0;x<SIZE;x+=80)for(let y=0;y<SIZE;y+=80){
      const colors=[0x343e42,0x374145,0x303b40,0x394246,0x323c40];
      poly(floor,[{x:x+1,y:y+1},{x:x+79,y:y+1},{x:x+79,y:y+79},{x:x+1,y:y+79}].map(project),colors[(x/80*7+y/80*13)%5]);
      if((x+y)%240===0){
        const a=project({x:x+12,y:y+5}),b=project({x:x+28,y:y+32}),c=project({x:x+55,y:y+44});
        floor.lineStyle(1,0x151f24,.6).beginPath().moveTo(a.x,a.y).lineTo(b.x,b.y).lineTo(c.x,c.y).strokePath();
      }
    }
    floor.lineStyle(2,0xb39c6c,.4).strokePoints(edges,true);
    floor.lineStyle(1,0xb39c6c,.3).strokePoints(corners(320,320,295),true);
    for(const end of [edges[1],edges[3]]){
      poly(floor,[edges[0],end,{x:end.x,y:end.y-30},{x:edges[0].x,y:edges[0].y-30}],0x454e50);
      floor.lineStyle(3,0x6c7269,.65).lineBetween(edges[0].x,edges[0].y-30,end.x,end.y-30);
    }
    scene.add.image(920,325,'ward-vault').setOrigin(.5,1).setDisplaySize(520,510).setDepth(-1100).setTint(0x8c989c);
    scene.add.image(640,436,'ward-floor').setDisplaySize(1024,512).setDepth(-999).setTint(0xadb8b7);
    for(const position of [{x:235,y:450},{x:465,y:260}]){const p=project(position);scene.add.image(p.x,p.y,'ward-mud').setDisplaySize(230,111).setAlpha(.48).setDepth(-998.5);}
    const shadows=scene.add.graphics().setDepth(-998);
    for(const q of PILLARS){const p=project(q);shadows.fillStyle(0x070e16,.32).fillPoints([{x:p.x-22,y:p.y},{x:p.x+22,y:p.y},{x:p.x+120,y:p.y+55},{x:p.x+82,y:p.y+61}],true);}
    const pier=(position:Point,width:number,height:number)=>{const p=project(position);const image=scene.add.image(p.x,p.y,'ward-pillar').setOrigin(.5,.94).setDisplaySize(width,height).setDepth(p.y+9).setTint(0x9ca9aa);this.occluders.push({image,position});};
    for(const p of PILLARS)pier(p,60,p.height+95);
    for(const pos of [{x:30,y:570},{x:610,y:550},{x:80,y:30}]){const p=project(pos);scene.add.image(p.x,p.y+5,'ward-rubble').setOrigin(.5,1).setDisplaySize(78,49).setDepth(p.y).setTint(0x8e9b99);}
    // Massive piers extend beyond the playable ward; lamps are the only warm light.
    pier({x:-35,y:-35},90,335); pier({x:675,y:-35},85,315);
    for(const wall of WALLS){
      const g=scene.add.graphics().setDepth(project({x:wall.x+wall.width,y:wall.y+wall.height}).y);
      const pts=[{x:wall.x,y:wall.y},{x:wall.x+wall.width,y:wall.y},{x:wall.x+wall.width,y:wall.y+wall.height},{x:wall.x,y:wall.y+wall.height}].map(project);
      const height=wall.gate?58:42;
      this.wallViews.push({g,left:Math.min(...pts.map(p=>p.x)),right:Math.max(...pts.map(p=>p.x)),top:Math.min(...pts.map(p=>p.y))-height,bottom:Math.max(...pts.map(p=>p.y))});
      poly(g,[pts[1],pts[2],{x:pts[2].x,y:pts[2].y-height},{x:pts[1].x,y:pts[1].y-height}],0x202c31);
      poly(g,[pts[2],pts[3],{x:pts[3].x,y:pts[3].y-height},{x:pts[2].x,y:pts[2].y-height}],0x3b4649);
      poly(g,pts.map(p=>({x:p.x,y:p.y-height})),0x59615d);
      if(!wall.gate){g.setVisible(false);const bounds=this.wallViews[this.wallViews.length-1];const image=scene.add.image((bounds.left+bounds.right)/2,bounds.bottom+4,'ward-wall').setOrigin(.5,1).setDisplaySize(bounds.right-bounds.left+12,bounds.bottom-bounds.top+4).setFlipX(wall.height>wall.width).setDepth(bounds.bottom);bounds.g=image;}
      if(wall.gate){this.gates.push(g);for(let y=wall.y;y<wall.y+wall.height;y+=12){const p=project({x:wall.x+10,y});g.lineStyle(3,0x99866a).lineBetween(p.x,p.y,p.x,p.y-height);}}
    }
    for(const pos of [{x:70,y:230},{x:590,y:190},{x:190,y:580}]){
      const p=project(pos);floor.fillStyle(0xb78c46,.08).fillEllipse(p.x,p.y,110,55);
      const g=scene.add.graphics().setDepth(p.y);g.fillStyle(0x1d2428).fillRect(p.x-4,p.y-45,8,45);g.fillStyle(0xc4a367).fillRect(p.x-6,p.y-49,12,11);g.fillStyle(0xffd696).fillRect(p.x-2,p.y-47,4,7);
    }
    const caption=(p:Point,text:string)=>{const q=project(p);return scene.add.text(q.x,q.y+18,text,{fontFamily:'Georgia',fontSize:'12px',color:'#c5b58e',align:'center'}).setOrigin(.5,0).setDepth(1500).setAlpha(.8);};
    caption(LOCATIONS.checkpoint,'CHECKPOINT');caption(LOCATIONS.smith,'FORGE');caption(LOCATIONS.lever,'GATE LEVER');
    this.effects=scene.add.graphics().setDepth(1400);
    this.actor=new KnightSprite(scene);
    this.enemies=[new KnightSprite(scene),new KnightSprite(scene),new KnightSprite(scene)];
    for(let i=0;i<3;i++)this.labels.push(scene.add.text(0,0,'',{fontFamily:'Georgia',fontSize:'12px',color:'#c1b3a1'}).setOrigin(.5,1).setDepth(1500));
  }
  draw(position:Point,moving:boolean,facing:Facing){
    this.actor.draw(position,moving,facing);
  }
  drawAdventure(s:Adventure,moving:boolean,facing:Facing){
    this.actor.draw(s.position,moving,facing);
    const rolling=s.rollTimer>0;
    this.actor.effects(s.hurtTimer>0?0xf2aaa0:invulnerable(s)?0xb9d9df:0xffffff,rolling?(1-s.rollTimer/.38)*360:0,invulnerable(s)?.6:1,rolling?.72:1);
    const actors=[s.position,...s.enemies.filter(e=>e.hp>0).map(e=>e.position)].map(project);
    for(const o of this.occluders){const p=project(o.position);o.image.setAlpha(actors.some(a=>a.y<p.y+20&&a.y>p.y-o.image.displayHeight&&Math.abs(a.x-p.x)<55)?.32:1);}
    for(const w of this.wallViews)w.g.setAlpha(actors.some(a=>a.x>w.left-15&&a.x<w.right+15&&a.y<w.bottom+12&&a.y>w.top)?.4:1);
    const g=this.effects;g.clear();if(s.hurtTimer>0){const p=project(s.position);g.lineStyle(3,0xd48976,s.hurtTimer/.45).strokeEllipse(p.x,p.y,42,21);}this.gates.forEach(gate=>gate.setVisible(!s.shortcut));
    const beacon=project(LOCATIONS.checkpoint),smith=project(LOCATIONS.smith),lever=project(LOCATIONS.lever);
    // A low iron brazier and a dressed stone anvil; no magic portal or Warplate forge.
    g.fillStyle(0xad8b4a,.1).fillEllipse(beacon.x,beacon.y,95,42);g.lineStyle(1,0xb39963,.65).strokeEllipse(beacon.x,beacon.y,60,27);
    g.fillStyle(0x4d5351).fillRect(beacon.x-10,beacon.y-17,20,17);g.fillStyle(0xd5a35e).fillTriangle(beacon.x-7,beacon.y-17,beacon.x,beacon.y-38,beacon.x+6,beacon.y-17);
    g.fillStyle(0x65716e).fillRect(smith.x-16,smith.y-24,32,10);g.fillStyle(0x3d474a).fillRect(smith.x-6,smith.y-14,12,14);g.lineStyle(3,0xb6aa8c).lineBetween(smith.x-13,smith.y-29,smith.x+12,smith.y-35);
    g.fillStyle(0x62605a).fillRect(lever.x-7,lever.y-17,14,17);g.lineStyle(4,s.shortcut?0x9ba37e:0xb89c6a).lineBetween(lever.x,lever.y-15,lever.x+(s.shortcut?12:-12),lever.y-38);
    for(const loot of LOOT){const p=project(loot.position),opened=s.looted.includes(loot.id);g.fillStyle(opened?0x303a3b:0x705c41).fillRect(p.x-14,p.y-17,28,17);g.lineStyle(2,opened?0x5d655d:0xc1a36a).strokeRect(p.x-14,p.y-17,28,17);if(!opened){g.lineStyle(1,0xf0d496,.55+.25*Math.sin(s.time*3)).lineBetween(p.x,p.y-23,p.x,p.y-36);g.fillStyle(0xdbc08a).fillRect(p.x-2,p.y-11,4,5);}}
    s.enemies.forEach((e,i)=>{const p=project(e.position),v=this.enemies[i],dir=facingForInput(e.aim,'west');const previous=this.enemyPositions[i];const walking=!!previous&&Math.hypot(e.position.x-previous.x,e.position.y-previous.y)>.01;this.enemyPositions[i]={...e.position};v.draw(e.position,walking&&e.hp>0,dir);v.effects(e.phase==='stagger'?0xf0c5a0:e.kind==='captain'?0xb49a7d:e.kind==='watcher'?0x849f98:0xa18b84,e.hp<=0?85:0,e.hp<=0?.2:1,e.kind==='captain'?1.15:1);this.labels[i].setPosition(p.x,p.y+28).setText(e.hp>0?(e.kind==='captain'?'ARMOURED CAPTAIN':e.kind==='watcher'?'CROSSBOW LOOKOUT':'RELIC RAIDER'):'');if(e.hp<=0)return;
      g.fillStyle(0x182024).fillRect(p.x-25,p.y-91,50,4);g.fillStyle(0xa46958).fillRect(p.x-25,p.y-91,50*e.hp/e.maxHp,4);
      if(e.phase==='windup'){const angle=Math.atan2(e.aim.y,e.aim.x),range=e.kind==='watcher'?200:e.kind==='captain'?78:60;g.lineStyle(2,0xcf765a,.75);if(e.kind==='watcher')g.lineBetween(p.x,p.y,p.x+e.aim.x*range,p.y+e.aim.y*range);else{g.beginPath().arc(p.x,p.y,range,angle-Math.acos(.1),angle+Math.acos(.1)).strokePath();g.lineBetween(p.x,p.y,p.x+Math.cos(angle)*range,p.y+Math.sin(angle)*range);}}
    });
    for(const bolt of s.projectiles){const p=project(bolt.position),angle=Math.atan2(bolt.velocity.y,bolt.velocity.x);g.lineStyle(3,0xe0ba7a).lineBetween(p.x,p.y-12,p.x-Math.cos(angle)*15,p.y-12-Math.sin(angle)*15);}
    const p=project(s.position),a=s.attack,aim=a.phase==='idle'?s.aim:a.aim,weapon=a.phase==='idle'?s.equipped:a.weapon,w=WEAPONS[weapon],angle=Math.atan2(aim.y,aim.x);
    // Weapon silhouettes follow the authored character. Only effects are procedural.
    const active=a.phase==='active',windup=a.phase==='windup';const reach=active?w.range:windup?34:25;
    const sweep=weapon==='sword'&&active?(a.timer/.12-.5)*1.7:0;
    const wx=p.x+Math.cos(angle+sweep)*reach,wy=p.y-36+Math.sin(angle+sweep)*reach;
    g.lineStyle(weapon==='spear'?3:4,windup?0xc4a46a:0xb4c1bf,.9).lineBetween(p.x+aim.x*9,p.y-35,wx,wy);
    if(weapon==='hammer'){g.lineStyle(9,0x8c9691).lineBetween(wx-6*Math.sin(angle),wy+6*Math.cos(angle),wx+6*Math.sin(angle),wy-6*Math.cos(angle));}
    if(active){g.lineStyle(3,0xe7d6a5,.85);if(weapon==='spear')g.lineBetween(p.x,p.y,p.x+aim.x*w.range,p.y+aim.y*w.range);else if(weapon==='hammer')g.strokeEllipse(p.x,p.y,w.range*2,w.range*2);else g.beginPath().arc(p.x,p.y,w.range,angle-w.arc,angle+w.arc).strokePath();}
    if(windup){g.lineStyle(1,0xc4a46a,.45).beginPath().arc(p.x,p.y,w.range,angle-w.arc,angle+w.arc).strokePath();}
  }
  characterSnapshot(){return this.actor.snapshot();}
}

