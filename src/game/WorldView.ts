import Phaser from 'phaser';
import {SIZE,PILLARS,project,type Point} from '../core/game.js';
import {KnightSprite} from './KnightSprite.js';
import {WALLS,LOOT,LOCATIONS,WEAPONS,invulnerable,type Adventure} from '../core/adventure.js';
import {SCENERY,VAULT_FOOTPRINT,groundDepth} from '../core/scenery.js';
import {facingForInput} from '../core/facing.js';
import type {Facing} from '../core/facing.js';
import courtUrl from '../assets/environment-v1/slate-court.webp';
import pillarUrl from '../assets/environment-v1/gothic-pillar.webp';
import vaultUrl from '../assets/environment-v1/sealed-vault.webp';
import rubbleUrl from '../assets/environment-v1/fallen-masonry.webp';
import masonryUrl from '../assets/environment-v1/slate-masonry-diffuse.webp';
import mudUrl from '../assets/environment-v1/mud-track.webp';
import cofferUrl from '../assets/environment-v1/iron-coffer.webp';
import forgeUrl from '../assets/environment-v1/ember-forge.webp';
import lanternUrl from '../assets/environment-v1/stone-lantern.webp';
type Graphics=Phaser.GameObjects.Graphics;
function poly(g:Graphics,points:Point[],color:number,stroke=0x465052){
  g.fillStyle(color).fillPoints(points,true);
  g.lineStyle(1,stroke,.65).strokePoints(points,true);
}
/** Textured, depth-sorted ward and the preserved directional character renderer. */
export class WorldView{
  private actor:KnightSprite;
  private mist:Phaser.GameObjects.Image;
  private coffers:Phaser.GameObjects.Image[]=[];
  private enemies:KnightSprite[]=[];
  private effects:Graphics;
  private attackEffects:Graphics;
  private healthBars:Graphics;
  private leverView:Graphics;
  private bolts:Graphics[]=[];
  private scene:Phaser.Scene;
  private gates:Graphics[]=[];
  private labels:Phaser.GameObjects.Text[]=[];
  private enemyPositions:Point[]=[];
  private wallViews:{g:Graphics|Phaser.GameObjects.Image;left:number;right:number;top:number;bottom:number}[]=[];
  private occluders:{id:string;image:Phaser.GameObjects.Image;position:Point;radius:number|null}[]=[];
  static preload(scene:Phaser.Scene){for(const [key,url] of Object.entries({'ward-floor':courtUrl,'ward-masonry':masonryUrl,'ward-pillar':pillarUrl,'ward-vault':vaultUrl,'ward-rubble':rubbleUrl,'ward-mud':mudUrl,'ward-coffer':cofferUrl,'ward-forge':forgeUrl,'ward-lantern':lanternUrl}))scene.load.image(key,url);}
  constructor(scene:Phaser.Scene){
    this.scene=scene;
    const floor=scene.add.graphics().setDepth(-1000);
    // A continuous masonry foundation backs every silhouette, including the sealed rear vault.
    // This apron is outside collision bounds, not another room or walkable expansion.
    const foundation=(x:number,y:number,width:number,height:number)=>{
      const pts=[{x,y},{x:x+width,y},{x:x+width,y:y+height},{x,y:y+height}].map(project);
      for(const [a,b] of [[1,2],[2,3]])poly(floor,[pts[a],pts[b],{x:pts[b].x,y:pts[b].y+22},{x:pts[a].x,y:pts[a].y+22}],a===1?0x1a2023:0x252c2d,0x323939);
      poly(floor,pts,0x323b3d,0x555b57);
      for(let tx=x;tx<x+width;tx+=40)for(let ty=y;ty<y+height;ty+=40){
        const q=[{x:tx,y:ty},{x:Math.min(tx+40,x+width),y:ty},{x:Math.min(tx+40,x+width),y:Math.min(ty+40,y+height)},{x:tx,y:Math.min(ty+40,y+height)}].map(project);
        poly(floor,q,((tx+ty)/40)%3<1?0x353e3e:0x30393b,0x444b49);
      }
    };
    foundation(325,-125,315,145);foundation(-12,-12,SIZE+24,SIZE+24);
    scene.add.image(640,436,'ward-floor').setDisplaySize(1024,512).setDepth(-999).setTint(0xadb8b7);
    // One continuous cropped stone patch, not a repeated diamond tile, follows the
    // annex footprint. Canvas clipping is baked once; no per-frame mask overhead.
    const apron=[{x:325,y:-125},{x:640,y:-125},{x:640,y:20},{x:325,y:20}].map(project);
    const left=Math.min(...apron.map(p=>p.x)),top=Math.min(...apron.map(p=>p.y));
    const apronTexture=scene.textures.createCanvas('ward-apron',Math.ceil(Math.max(...apron.map(p=>p.x))-left),Math.ceil(Math.max(...apron.map(p=>p.y))-top))!;
    const apronCtx=apronTexture.context;apronCtx.beginPath();apron.forEach((p,i)=>i?apronCtx.lineTo(p.x-left,p.y-top):apronCtx.moveTo(p.x-left,p.y-top));apronCtx.closePath();apronCtx.clip();
    apronCtx.drawImage(scene.textures.get('ward-floor').getSourceImage() as HTMLImageElement,556-left,96-top,1024,512);
    apronCtx.fillStyle='rgba(7,13,16,0.18)';apronCtx.fillRect(0,0,apronTexture.width,apronTexture.height);apronTexture.refresh();
    scene.add.image(left,top,'ward-apron').setOrigin(0,0).setDepth(-999.5);

    for(const position of [{x:235,y:450},{x:465,y:260}]){const p=project(position);scene.add.image(p.x,p.y,'ward-mud').setDisplaySize(230,111).setAlpha(.38).setDepth(-998.5);}
    const shadows=scene.add.graphics().setDepth(-998);
    const addProp=(position:Point,key:string,width:number,originY:number,slot:number,id:string,radius:number|null)=>{
      const p=project(position),source=scene.textures.get(key).getSourceImage();
      const height=width*source.height/source.width;
      shadows.fillStyle(0x020406,.48).fillEllipse(p.x,p.y+1,width*.88,Math.min(22,width*.32));
      const image=scene.add.image(p.x,p.y,key).setOrigin(.5,originY).setDisplaySize(width,height).setDepth(groundDepth(p.y,slot));
      this.occluders.push({id,image,position,radius});return image;
    };
    PILLARS.forEach((position,i)=>addProp(position,'ward-pillar',60,.94,20+i,`pillar-${i}`,position.radius).setTint(0x9ca9aa));
    const vault={x:VAULT_FOOTPRINT.x+VAULT_FOOTPRINT.width/2,y:VAULT_FOOTPRINT.y+VAULT_FOOTPRINT.height/2};
    addProp(vault,'ward-vault',244,.87,10,'vault',null).setTint(0x8c989c);
    for(const [i,prop] of SCENERY.entries()){
      if(prop.art==='lever')continue;
      const image=addProp(prop,prop.art,prop.width,prop.originY,30+i,prop.id,prop.radius);
      const loot=LOOT.findIndex(l=>l.id===prop.id);if(loot>=0)this.coffers[loot]=image;
    }
    // Short masonry blocks share the exact collision footprint; no stretched sprite can
    // imply a different wall orientation. Segmenting also sorts each piece at its own foot.
    for(const [index,wall] of WALLS.entries()){
      const count=Math.ceil(Math.max(wall.width,wall.height)/25);
      for(let segment=0;segment<count;segment++){
        const dx=wall.width>wall.height?wall.width/count:wall.width,dy=wall.height>=wall.width?wall.height/count:wall.height;
        const x=wall.x+(wall.width>wall.height?segment*dx:0),y=wall.y+(wall.height>=wall.width?segment*dy:0);
        const p=project({x:x+dx/2,y:y+dy/2}),height=wall.gate?58:38;
        const g=scene.add.graphics().setDepth(groundDepth(p.y,60+index));
        const pts=[{x,y},{x:x+dx,y},{x:x+dx,y:y+dy},{x,y:y+dy}].map(project);
        this.wallViews.push({g,left:Math.min(...pts.map(p=>p.x)),right:Math.max(...pts.map(p=>p.x)),top:Math.min(...pts.map(p=>p.y))-height,bottom:Math.max(...pts.map(p=>p.y))});
        if(wall.gate){
          this.gates.push(g);g.lineStyle(4,0x655d4b).lineBetween(pts[0].x,pts[0].y-height,pts[2].x,pts[2].y-height);
          for(const q of [pts[0],p,pts[2]])g.lineStyle(3,0x99866a).lineBetween(q.x,q.y,q.x,q.y-height);
        }else{
          poly(g,[pts[1],pts[2],{x:pts[2].x,y:pts[2].y-height},{x:pts[1].x,y:pts[1].y-height}],0x303a3c);
          poly(g,[pts[2],pts[3],{x:pts[3].x,y:pts[3].y-height},{x:pts[2].x,y:pts[2].y-height}],0x454e4d);
          poly(g,pts.map(p=>({x:p.x,y:p.y-height})),segment%2?0x626a63:0x5a635e);
          for(const h of [13,26]){g.lineStyle(1,0x202a2b,.8);g.lineBetween(pts[1].x,pts[1].y-h,pts[2].x,pts[2].y-h);g.lineBetween(pts[2].x,pts[2].y-h,pts[3].x,pts[3].y-h);}
          // Bake textured faces into the same exact projected block; material cannot
          // move its feet, widen collision or change depth. No runtime shader/mask.
          const bx=Math.floor(Math.min(...pts.map(p=>p.x)))-1,by=Math.floor(Math.min(...pts.map(p=>p.y))-height)-1;
          const textureKey=`ward-block-${index}-${segment}`;
          const texture=scene.textures.createCanvas(textureKey,Math.ceil(Math.max(...pts.map(p=>p.x))-bx)+2,Math.ceil(Math.max(...pts.map(p=>p.y))-by)+2)!;
          const context=texture.context;
          const material=scene.textures.get('ward-masonry').getSourceImage() as HTMLImageElement;
          const face=(vertices:Point[],sx:number,sy:number,sw:number,sh:number,shade:number)=>{
            const q=vertices.map(p=>({x:p.x-bx,y:p.y-by}));context.save();context.beginPath();q.forEach((p,i)=>i?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y));context.closePath();context.clip();
            context.transform((q[1].x-q[0].x)/sw,(q[1].y-q[0].y)/sw,(q[3].x-q[0].x)/sh,(q[3].y-q[0].y)/sh,q[0].x,q[0].y);
            context.drawImage(material,sx,sy,sw,sh,0,0,sw,sh);context.restore();
            context.beginPath();q.forEach((p,i)=>i?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y));context.closePath();context.fillStyle=`rgba(3,10,14,${shade})`;context.fill();context.strokeStyle='rgba(22,28,28,.7)';context.lineWidth=.65;context.stroke();
          };
          const sx=(segment*128)%512,sy=64;
          face([{x:pts[1].x,y:pts[1].y-height},{x:pts[2].x,y:pts[2].y-height},pts[2],pts[1]],sx,sy,128,192,.32);
          face([{x:pts[2].x,y:pts[2].y-height},{x:pts[3].x,y:pts[3].y-height},pts[3],pts[2]],sx,sy,128,192,.08);
          face(pts.map(p=>({x:p.x,y:p.y-height})),sx,sy,128,64,.02);
          texture.refresh();g.setVisible(false);
          const image=scene.add.image(bx,by,textureKey).setOrigin(0,0).setDepth(g.depth);
          this.wallViews[this.wallViews.length-1].g=image;

        }
      }
    }
    const caption=(p:Point,text:string)=>{const q=project(p);return scene.add.text(q.x,q.y+18,text,{fontFamily:'Georgia',fontSize:'12px',color:'#c5b58e',align:'center'}).setOrigin(.5,0).setDepth(1500).setAlpha(.8);};
    caption(LOCATIONS.checkpoint,'CHECKPOINT');caption(LOCATIONS.smith,'FORGE');caption(LOCATIONS.lever,'GATE LEVER');
    const mist=scene.textures.createCanvas('ward-mist',1280,800)!;const ctx=mist.context;
    for(const [x,y,r] of [[110,230,460],[1050,160,420]]){const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,'rgba(143,164,175,0.14)');gradient.addColorStop(1,'rgba(143,164,175,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,800);}mist.refresh();
    this.mist=scene.add.image(640,400,'ward-mist').setDepth(-1001).setAlpha(.2);
    this.effects=scene.add.graphics().setDepth(-997);
    this.attackEffects=scene.add.graphics();
    this.healthBars=scene.add.graphics().setDepth(1500);
    this.leverView=scene.add.graphics().setDepth(groundDepth(project(LOCATIONS.lever).y,50));
    this.actor=new KnightSprite(scene);
    this.enemies=[new KnightSprite(scene),new KnightSprite(scene),new KnightSprite(scene)];
    for(let i=0;i<3;i++)this.labels.push(scene.add.text(0,0,'',{fontFamily:'Georgia',fontSize:'12px',color:'#c1b3a1'}).setOrigin(.5,1).setDepth(1500));
  }
  draw(position:Point,moving:boolean,facing:Facing){
    this.actor.draw(position,moving,facing);
  }
  drawAdventure(s:Adventure,moving:boolean,facing:Facing){
    this.mist.setX(640+Math.sin(s.time*.06)*18);
    this.actor.draw(s.position,moving,facing,{...s.attack,weapon:s.attack.phase==='idle'?s.equipped:s.attack.weapon});
    const rolling=s.rollTimer>0;
    this.actor.effects(s.hurtTimer>0?0xf2aaa0:invulnerable(s)?0xb9d9df:0xffffff,rolling?(1-s.rollTimer/.38)*360:0,invulnerable(s)?.6:1,rolling?.72:1);
    const actors=[s.position,...s.enemies.filter(e=>e.hp>0).map(e=>e.position)].map(project);
    for(const o of this.occluders){const p=project(o.position);o.image.setAlpha(actors.some(a=>a.y<p.y-1&&a.y>p.y-o.image.displayHeight*o.image.originY-12&&Math.abs(a.x-p.x)<o.image.displayWidth*.48+12)?.32:1);}
    for(const w of this.wallViews)w.g.setAlpha(actors.some(a=>a.x>w.left-15&&a.x<w.right+15&&a.y<w.g.depth-1&&a.y>w.top-12)?.4:1);
    const g=this.effects;g.clear();const playerFoot=project(s.position);g.lineStyle(2,0xc9c3a0,.75).strokeEllipse(playerFoot.x,playerFoot.y+1,39,17);g.fillStyle(0xc9c3a0,.9).fillTriangle(playerFoot.x-3,playerFoot.y+15,playerFoot.x+3,playerFoot.y+15,playerFoot.x,playerFoot.y+10);if(s.hurtTimer>0){const p=project(s.position);g.lineStyle(3,0xd48976,s.hurtTimer/.45).strokeEllipse(p.x,p.y,42,21);}this.gates.forEach(gate=>gate.setVisible(!s.shortcut));
    const beacon=project(LOCATIONS.checkpoint),lever=project(LOCATIONS.lever);
    // A mundane lantern marks the safe checkpoint; no magic portal or Warplate forge.
    g.fillStyle(0xad8b4a,.1).fillEllipse(beacon.x,beacon.y,95,42);g.lineStyle(1,0xb39963,.65).strokeEllipse(beacon.x,beacon.y,60,27);
    this.leverView.clear().fillStyle(0x62605a).fillRect(lever.x-7,lever.y-17,14,17);this.leverView.lineStyle(4,s.shortcut?0x9ba37e:0xb89c6a).lineBetween(lever.x,lever.y-15,lever.x+(s.shortcut?12:-12),lever.y-38);
    LOOT.forEach((loot,i)=>{const p=project(loot.position),opened=s.looted.includes(loot.id);this.coffers[i].setAlpha(opened?.35:1);if(!opened){g.lineStyle(1,0xf0d496,.55+.25*Math.sin(s.time*3)).lineBetween(p.x,p.y-29,p.x,p.y-42);g.lineStyle(1,0xc6a56c,.55).strokeEllipse(p.x,p.y+1,48,20);}});
    this.healthBars.clear();
    s.enemies.forEach((e,i)=>{const p=project(e.position),v=this.enemies[i],dir=facingForInput(e.aim,'west');const previous=this.enemyPositions[i];const walking=!!previous&&Math.hypot(e.position.x-previous.x,e.position.y-previous.y)>.01;this.enemyPositions[i]={...e.position};v.draw(e.position,walking&&e.hp>0,dir);v.effects(e.phase==='stagger'?0xf0c5a0:e.kind==='captain'?0xb49a7d:e.kind==='watcher'?0x849f98:0xa18b84,e.hp<=0?85:0,e.hp<=0?.2:1,e.kind==='captain'?1.15:1);this.labels[i].setPosition(p.x,p.y+28).setText(e.hp>0?(e.kind==='captain'?'ARMOURED CAPTAIN':e.kind==='watcher'?'CROSSBOW LOOKOUT':'RELIC RAIDER'):'');if(e.hp<=0)return;
      g.lineStyle(1,e.kind==='captain'?0xba795a:e.kind==='watcher'?0x91a6a0:0x9e6c61,.65).strokeEllipse(p.x,p.y+1,e.kind==='captain'?46:36,16);
      this.healthBars.fillStyle(0x182024).fillRect(p.x-25,p.y-91,50,4);this.healthBars.fillStyle(0xa46958).fillRect(p.x-25,p.y-91,50*e.hp/e.maxHp,4);
      if(e.phase==='windup'){const angle=Math.atan2(e.aim.y,e.aim.x),range=e.kind==='watcher'?200:e.kind==='captain'?78:60;g.lineStyle(2,0xcf765a,.75);if(e.kind==='watcher')g.lineBetween(p.x,p.y,p.x+e.aim.x*range,p.y+e.aim.y*range);else{g.beginPath().arc(p.x,p.y,range,angle-Math.acos(.1),angle+Math.acos(.1)).strokePath();g.lineBetween(p.x,p.y,p.x+Math.cos(angle)*range,p.y+Math.sin(angle)*range);}}
    });
    this.bolts.forEach(b=>b.clear());
    s.projectiles.forEach((bolt,i)=>{const p=project(bolt.position),angle=Math.atan2(bolt.velocity.y,bolt.velocity.x);const b=this.bolts[i]??(this.bolts[i]=this.scene.add.graphics());b.setDepth(groundDepth(p.y,80)).lineStyle(3,0xe0ba7a).lineBetween(p.x,p.y-12,p.x-Math.cos(angle)*15,p.y-12-Math.sin(angle)*15);});
    const p=project(s.position),a=s.attack,aim=a.phase==='idle'?s.aim:a.aim,weapon=a.phase==='idle'?s.equipped:a.weapon,w=WEAPONS[weapon],angle=Math.atan2(aim.y,aim.x);
    // Physical weapon/body rendering lives in the hand-attached KnightSprite rig.
    // These are only floor telegraphs, deliberately beneath solid geometry.
    const active=a.phase==='active',windup=a.phase==='windup';
    this.attackEffects.clear().setDepth(-996);
    if(active){this.attackEffects.lineStyle(3,0xe7d6a5,.85);if(weapon==='spear')this.attackEffects.lineBetween(p.x,p.y,p.x+aim.x*w.range,p.y+aim.y*w.range);else if(weapon==='hammer')this.attackEffects.strokeEllipse(p.x,p.y,w.range*2,w.range*2);else this.attackEffects.beginPath().arc(p.x,p.y,w.range,angle-w.arc,angle+w.arc).strokePath();}
    if(windup){this.attackEffects.lineStyle(1,0xc4a46a,.45).beginPath().arc(p.x,p.y,w.range,angle-w.arc,angle+w.arc).strokePath();}
  }
  scenerySnapshot(){return this.occluders.map(o=>({id:o.id,world:{x:o.position.x,y:o.position.y},foot:project(o.position),depth:o.image.depth,width:o.image.displayWidth,height:o.image.displayHeight,originY:o.image.originY,alpha:o.image.alpha,radius:o.radius}));}
  characterSnapshot(){return this.actor.snapshot();}
}

