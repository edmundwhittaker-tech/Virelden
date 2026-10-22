import {ExpeditionWorldView} from './ExpeditionWorldView.js';
import {EXPEDITIONS,STATION_EXPEDITION_PORT,type ExpeditionId,type AreaId} from '../core/expeditionCatalog.js';
import Phaser from 'phaser';
import {SIZE,PILLARS,project,type Point} from '../core/game.js';
import {StationGateView} from './StationGateView.js';
import {ArcherView,drawArrow} from './ArcherView.js';
import {KnightSprite} from './KnightSprite.js';
import {ModularKnightSprite} from './ModularKnightSprite.js';
import {WARD_MANIFEST,DELVER_MANIFEST,MARCHER_MANIFEST} from './paintRig.js';
import {createWeaponThumbnail} from './WeaponArt.js';
import {ARMOR,ARMOR_SLOTS,type Equipment,type ArmorItem} from '../core/equipment.js';
import {WEAPON_CATALOG,type WeaponProfile} from '../core/weaponCatalog.js';
import {WALLS,LOOT,LOCATIONS,WEAPONS,invulnerable,leverInteraction,type Adventure} from '../core/adventure.js';
import {SCENERY,groundDepth} from '../core/scenery.js';
import {LEVEL_SECTIONS,CHECKPOINTS,FINISH,STATION_GATE} from '../core/level.js';
import {facingForInput} from '../core/facing.js';
import {playerPoseFrame} from '../core/playerPose.js';
import type {Facing} from '../core/facing.js';
import courtUrl from '../assets/environment-v1/slate-court.webp';
import pillarUrl from '../assets/environment-v1/gothic-pillar.webp';
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
  private actor:ModularKnightSprite;
  private activeArea:AreaId='station';
  private stationObjects:Phaser.GameObjects.GameObject[]=[];
  private stationVisibility=new Map<Phaser.GameObjects.GameObject,boolean>();
  private enemyState:{id:string;hp:number;kind:string}[]=[];
  private expeditionViews=new Map<ExpeditionId,ExpeditionWorldView>();
  private enemyObjects:Phaser.GameObjects.GameObject[][]=[];
  private archerObjects=new Map<number,Phaser.GameObjects.GameObject[]>();
  private actorFacing:Facing='east';
  readonly supportHandVerified=true;
  private thumbnails=new Map<string,string>();
  private stationGate:StationGateView;
  private archers=new Map<number,ArcherView>();
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
  static preload(scene:Phaser.Scene){ExpeditionWorldView.preload(scene);ModularKnightSprite.preload(scene);StationGateView.preload(scene);ArcherView.preload(scene);for(const [key,url] of Object.entries({'ward-floor':courtUrl,'ward-masonry':masonryUrl,'ward-pillar':pillarUrl,'ward-rubble':rubbleUrl,'ward-mud':mudUrl,'ward-coffer':cofferUrl,'ward-forge':forgeUrl,'ward-lantern':lanternUrl}))scene.load.image(key,url);}
  constructor(scene:Phaser.Scene){
    this.scene=scene;const staticStart=scene.children.list.length;this.stationGate=new StationGateView(scene);
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
    for(const section of LEVEL_SECTIONS)foundation(section.x-12,section.y-12,section.width+24,section.height+24);
    scene.add.image(640,436,'ward-floor').setDisplaySize(1024,512).setDepth(-999).setTint(0xadb8b7);
    for(const [i,section] of LEVEL_SECTIONS.entries()){
      if(!i)continue;
      const centre=project({x:section.x+320,y:section.y+320});
      scene.add.image(centre.x,centre.y,'ward-floor').setDisplaySize(1024,512).setDepth(-999).setTint([0xadb8b7,0x8c9c9d,0x9a9690,0x83949e][i]);
      // Cold paved ascent, cargo scars and the final watch have distinct readable landmarks.
      for(const offset of [130,420]){const p=project({x:offset,y:section.y+350});scene.add.image(p.x,p.y,'ward-mud').setDisplaySize(i===2?270:150,i===2?130:73).setAlpha(i===2?.45:.22).setDepth(-998.5);}
      const title=project({x:320,y:section.y+530});
      scene.add.text(title.x,title.y,section.name.toUpperCase(),{fontFamily:'Georgia',fontSize:'16px',color:'#c5b58e',letterSpacing:3}).setOrigin(.5).setAlpha(.65).setDepth(-997.5);
    }

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
    ExpeditionWorldView.drawServiceStair(scene,STATION_EXPEDITION_PORT.position);
    const caption=(p:Point,text:string)=>{const q=project(p);return scene.add.text(q.x,q.y+18,text,{fontFamily:'Georgia',fontSize:'12px',color:'#c5b58e',align:'center'}).setOrigin(.5,0).setDepth(1500).setAlpha(.8);};
    caption(LOCATIONS.checkpoint,'CHECKPOINT');caption(LOCATIONS.smith,'FORGE');caption(LOCATIONS.lever,'SHORTCUT LEVER');caption(CHECKPOINTS[1],'TRANSFER CHECKPOINT');caption(FINISH,'UPPER WATCH · SECURE');caption(STATION_EXPEDITION_PORT.position,'SERVICE STAIR · CISTERN');
    const mist=scene.textures.createCanvas('ward-mist',1280,800)!;const ctx=mist.context;
    for(const [x,y,r] of [[110,230,460],[1050,160,420]]){const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,'rgba(143,164,175,0.14)');gradient.addColorStop(1,'rgba(143,164,175,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,800);}mist.refresh();
    this.mist=scene.add.image(640,400,'ward-mist').setDepth(-1001).setAlpha(.2);
    this.stationObjects=scene.children.list.slice(staticStart);this.stationObjects.forEach(object=>this.stationVisibility.set(object,(object as Phaser.GameObjects.Image).visible));
    this.effects=scene.add.graphics().setDepth(-997);
    this.attackEffects=scene.add.graphics();
    this.healthBars=scene.add.graphics().setDepth(1500);
    this.leverView=scene.add.graphics().setDepth(groundDepth(project(LOCATIONS.lever).y,50));
    this.actor=new ModularKnightSprite(scene);
    // Enemy pools grow to the active catalog, not a station-only fixed actor count.
  }
  draw(position:Point,moving:boolean,facing:Facing){
    this.actor.draw({position:project(position),view:facing.startsWith('north')?'rear':'front',flipped:facing.endsWith('west'),motion:moving?'walk':'idle',time:0});
  }
  drawAdventure(s:Adventure,moving:boolean,facing:Facing){
    this.ensureEnemyPool(s.enemies.length);this.enemyState=s.enemies.map(e=>({id:e.id,hp:e.hp,kind:e.kind}));this.selectArea(s);this.expeditionViews.get(s.areaId as ExpeditionId)?.draw(s);
    this.mist.setX(640+Math.sin(s.time*.06)*18);
    this.enemyObjects.forEach((objects,i)=>objects.forEach(object=>(object as Phaser.GameObjects.Image).setVisible(i<s.enemies.length)));
    this.labels.forEach((label,i)=>label.setVisible(i<s.enemies.length));
    this.archerObjects.forEach(objects=>objects.forEach(object=>(object as Phaser.GameObjects.Image).setVisible(false)));
    const frame=playerPoseFrame(s,leverInteraction(s),moving);this.actorFacing=s.attack.phase==='idle'?facing:s.attack.facing;
    this.actor.draw({...frame.input,position:project(s.position)},frame.pose);
    if(s.areaId==='station')this.stationGate.draw(s);
    const rolling=s.rollTimer>0;
    this.actor.effects(s.hurtTimer>0?0xf2aaa0:invulnerable(s)?0xb9d9df:0xffffff,0,invulnerable(s)?.6:1);
    const actors=[s.position,...s.enemies.filter(e=>e.hp>0).map(e=>e.position)].map(project);
    for(const o of this.occluders){const p=project(o.position);o.image.setAlpha(actors.some(a=>a.y<p.y-1&&a.y>p.y-o.image.displayHeight*o.image.originY-12&&Math.abs(a.x-p.x)<o.image.displayWidth*.48+12)?.32:1);}
    for(const w of this.wallViews)w.g.setAlpha(actors.some(a=>a.x>w.left-15&&a.x<w.right+15&&a.y<w.g.depth-1&&a.y>w.top-12)?.4:1);
    const g=this.effects;g.clear();const playerFoot=project(s.position);g.lineStyle(2,0xc9c3a0,.75).strokeEllipse(playerFoot.x,playerFoot.y+1,39,17);g.fillStyle(0xc9c3a0,.9).fillTriangle(playerFoot.x-3,playerFoot.y+15,playerFoot.x+3,playerFoot.y+15,playerFoot.x,playerFoot.y+10);if(s.hurtTimer>0){const p=project(s.position);g.lineStyle(3,0xd48976,s.hurtTimer/.45).strokeEllipse(p.x,p.y,42,21);}this.gates.forEach(gate=>gate.setVisible(s.areaId==='station'&&!s.shortcut));
    const beacon=project(s.checkpoint),lever=project(LOCATIONS.lever);
    // A mundane lantern marks the safe checkpoint; no magic portal or Warplate forge.
    g.fillStyle(0xad8b4a,.1).fillEllipse(beacon.x,beacon.y,95,42);g.lineStyle(1,0xb39963,.65).strokeEllipse(beacon.x,beacon.y,60,27);
    this.leverView.setVisible(s.areaId==='station');this.leverView.clear().fillStyle(0x62605a).fillRect(lever.x-7,lever.y-17,14,17);this.leverView.lineStyle(4,s.shortcut?0x9ba37e:0xb89c6a).lineBetween(lever.x,lever.y-15,lever.x+(s.shortcut?12:-12),lever.y-38);
    if(s.areaId==='station')LOOT.forEach((loot,i)=>{const p=project(loot.position),opened=s.looted.includes(loot.id);this.coffers[i]?.setAlpha(opened?.35:1);if(!opened){g.lineStyle(1,0xf0d496,.55+.25*Math.sin(s.time*3)).lineBetween(p.x,p.y-29,p.x,p.y-42);g.lineStyle(1,0xc6a56c,.55).strokeEllipse(p.x,p.y+1,48,20);}});
    this.healthBars.clear();
    s.enemies.forEach((e,i)=>{const p=project(e.position),v=this.enemies[i],dir=facingForInput(e.aim,'west');const previous=this.enemyPositions[i];const walking=!!previous&&Math.hypot(e.position.x-previous.x,e.position.y-previous.y)>.01;this.enemyPositions[i]={...e.position};if(e.kind==='watcher'){let archer=this.archers.get(i);if(!archer){const start=this.scene.children.list.length;archer=new ArcherView(this.scene);this.archers.set(i,archer);this.archerObjects.set(i,this.scene.children.list.slice(start));}archer.draw(e,walking);v.draw(e.position,false,dir);v.effects(0xffffff,0,0);}else v.draw(e.position,walking&&e.hp>0,dir);if(e.kind!=='watcher')v.effects(e.phase==='stagger'?0xf0c5a0:e.kind==='captain'?0xb49a7d:0xa18b84,e.hp<=0?85:0,e.hp<=0?.2:1,e.kind==='captain'?1.15:1);this.labels[i].setPosition(p.x,p.y+28).setText(e.hp>0?(e.kind==='captain'?'ARMOURED CAPTAIN':e.kind==='watcher'?'BOW LOOKOUT':'RELIC RAIDER'):'');if(e.hp<=0)return;
      g.lineStyle(1,e.kind==='captain'?0xba795a:e.kind==='watcher'?0x91a6a0:0x9e6c61,.65).strokeEllipse(p.x,p.y+1,e.kind==='captain'?46:36,16);
      this.healthBars.fillStyle(0x182024).fillRect(p.x-25,p.y-91,50,4);this.healthBars.fillStyle(0xa46958).fillRect(p.x-25,p.y-91,50*e.hp/e.maxHp,4);
      if(e.phase==='windup'){const angle=Math.atan2(e.aim.y,e.aim.x),range=e.kind==='watcher'?(s.areaId==='station'?200:180):e.kind==='captain'?78:60;g.lineStyle(2,0xcf765a,.75);if(e.kind==='watcher')g.lineBetween(p.x,p.y,p.x+e.aim.x*range,p.y+e.aim.y*range);else{g.beginPath().arc(p.x,p.y,range,angle-Math.acos(.1),angle+Math.acos(.1)).strokePath();g.lineBetween(p.x,p.y,p.x+Math.cos(angle)*range,p.y+Math.sin(angle)*range);}}
    });
    this.bolts.forEach(b=>b.clear());
    s.projectiles.forEach((bolt,i)=>{const p=project(bolt.position);const b=this.bolts[i]??(this.bolts[i]=this.scene.add.graphics());b.setDepth(groundDepth(p.y,80));drawArrow(b,bolt);});
    const p=project(s.position),a=s.attack,aim=a.phase==='idle'?s.aim:a.aim,weapon=a.phase==='idle'?s.equipped:a.weapon,w=WEAPONS[weapon],angle=Math.atan2(aim.y,aim.x);
    // Physical weapon/body rendering uses the same catalog phase in the articulated modular rig.
    // These are only floor telegraphs, deliberately beneath solid geometry.
    const active=a.phase==='active',windup=a.phase==='windup';
    this.attackEffects.clear().setDepth(-996);
    if(active||windup){
      this.attackEffects.lineStyle(active?3:1,active?0xe7d6a5:0xc4a46a,active?.85:.45);
      if(w.shape.kind==='sector'){this.attackEffects.beginPath().arc(p.x,p.y,w.range,angle-w.shape.halfAngle,angle+w.shape.halfAngle).strokePath();for(const edge of [-w.shape.halfAngle,w.shape.halfAngle])this.attackEffects.lineBetween(p.x,p.y,p.x+Math.cos(angle+edge)*w.range,p.y+Math.sin(angle+edge)*w.range);}
      else{const n={x:-aim.y,y:aim.x},start=w.shape.start,end=w.range-w.shape.radius,r=w.shape.radius;const point=(along:number,across:number)=>({x:p.x+aim.x*along+n.x*across,y:p.y+aim.y*along+n.y*across});const x=point(start,-r),y=point(end,-r),z=point(start,r),q=point(end,r);this.attackEffects.lineBetween(x.x,x.y,y.x,y.y).lineBetween(z.x,z.y,q.x,q.y);const t=point(end,0);this.attackEffects.beginPath().arc(t.x,t.y,r,angle-Math.PI/2,angle+Math.PI/2).strokePath();const tail=point(start,0);this.attackEffects.beginPath().arc(tail.x,tail.y,r,angle+Math.PI/2,angle+Math.PI*1.5).strokePath();}
    }

  }
  private ensureEnemyPool(count:number){
    while(this.enemies.length<count){const start=this.scene.children.list.length;this.enemies.push(new KnightSprite(this.scene));this.enemyObjects.push(this.scene.children.list.slice(start));this.labels.push(this.scene.add.text(0,0,'',{fontFamily:'Georgia',fontSize:'12px',color:'#c1b3a1'}).setOrigin(.5,1).setDepth(1500));}
  }
  private selectArea(s:Adventure){
    if(s.areaId===this.activeArea)return;this.activeArea=s.areaId;this.enemyPositions=[];
    this.stationObjects.forEach(object=>(object as Phaser.GameObjects.Image).setVisible(s.areaId==='station'&&this.stationVisibility.get(object)!));
    for(const [id,view] of this.expeditionViews)view.setVisible(id===s.areaId);
    if(s.areaId!=='station'&&!this.expeditionViews.has(s.areaId))this.expeditionViews.set(s.areaId,new ExpeditionWorldView(this.scene,s.areaId));
  }
  enemyViewSnapshot(){return this.enemies.map((_,index)=>({index,id:this.enemyState[index]?.id??null,hp:this.enemyState[index]?.hp??null,knightVisible:this.enemyObjects[index].some(object=>(object as Phaser.GameObjects.Image).visible&&(object as Phaser.GameObjects.Image).alpha>0),archerVisible:this.archerObjects.get(index)?.some(object=>(object as Phaser.GameObjects.Image).visible)??false,labelVisible:this.labels[index].visible}));}
  expeditionSnapshot(){return this.activeArea==='station'?{areaId:'station',enemySlots:this.enemies.length,activeEnemyViews:this.enemyObjects.filter(objects=>(objects[0] as Phaser.GameObjects.Image)?.visible).length}:this.expeditionViews.get(this.activeArea)?.snapshot();}
  armorReady(item:ArmorItem){return this.actor.hasArmorVisual(item);}
  commitEquipment(equipment:Equipment){return this.actor.setEquipment(Object.fromEntries(ARMOR_SLOTS.map(slot=>[slot,ARMOR[equipment.equipped[slot]].set])) as Parameters<ModularKnightSprite['setEquipment']>[0]);}
  weaponReady(item:WeaponProfile){return this.actor.hasWeaponVisual(item)&&(item.hands===1||this.supportHandVerified);}
  armorThumbnail(item:ArmorItem){
    const cached=this.thumbnails.get(item.id);if(cached)return {src:cached};
    const manifest=item.set==='ward'?WARD_MANIFEST:item.set==='delver'?DELVER_MANIFEST:item.set==='marcher'?MARCHER_MANIFEST:null;
    const part={helmet:'helmet',chest:'torso',gauntlets:'forearm_near',legs:'greave_near'}[item.slot],asset=manifest?.parts[`front/${part}`];
    if(!asset||!this.armorReady(item))return null;
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=72;const context=canvas.getContext('2d');if(!context)return null;
    const source=this.scene.textures.get(asset.texture).getSourceImage() as HTMLImageElement,[x,y,right,bottom]=asset.alphaBounds,width=right-x,height=bottom-y,scale=Math.min(58/width,66/height);
    context.drawImage(source,asset.frame%4*256+x,Math.floor(asset.frame/4)*256+y,width,height,(64-width*scale)/2,(72-height*scale)/2,width*scale,height*scale);
    const src=canvas.toDataURL();this.thumbnails.set(item.id,src);return {src};
  }
  weaponThumbnail(item:WeaponProfile){const key=`weapon-preview:${item.id}`,cached=this.thumbnails.get(key);if(cached)return {src:cached};const src=createWeaponThumbnail(this.scene,item.id);if(!src)return null;this.thumbnails.set(key,src);return {src};}
  gateSnapshot(){return this.stationGate.snapshot();}
  archerSnapshot(){return [...this.archers].filter(([index])=>this.archerObjects.get(index)?.some(object=>(object as Phaser.GameObjects.Image).visible)).map(([index,archer])=>({index,...archer.snapshot()}));}
  scenerySnapshot(){if(this.activeArea!=='station')return this.expeditionViews.get(this.activeArea)?.snapshot().props??[];return this.occluders.map(o=>({id:o.id,world:{x:o.position.x,y:o.position.y},foot:project(o.position),depth:o.image.depth,width:o.image.displayWidth,height:o.image.displayHeight,originY:o.image.originY,alpha:o.image.alpha,radius:o.radius}));}
  characterSnapshot(){const snapshot=this.actor.snapshot();return {...snapshot,direction:this.actorFacing,rig:snapshot.rig&&snapshot.motion==='interact'?{...snapshot.rig,phase:'pull',pose:'lever-reach'}:snapshot.rig};}
}


