import Phaser from 'phaser';
import {project,type Point} from '../core/game.js';
import {EXPEDITIONS,SERVICE_STAIR_GROUND,type ExpeditionId,type ExpeditionDefinition,type Region,type AreaWall} from '../core/expeditionCatalog.js';
import {activeFloors,activeWalls,regionVertices} from '../core/expeditionGeometry.js';
import {openedShortcuts,type Adventure} from '../core/adventure.js';
import {groundDepth} from '../core/scenery.js';
import waterUrl from '../assets/expedition-v1/reservoir-water-v1.webp';
import shelfUrl from '../assets/expedition-v1/record-shelf-v1.webp';
import leverBaseUrl from '../assets/expedition-v1/lever-base-v1.webp';

type Display=Phaser.GameObjects.Image|Phaser.GameObjects.Graphics|Phaser.GameObjects.Text;
type PropView={id:string;image:Phaser.GameObjects.Image;position:Point;radius:number|null;decorative:boolean;footprint?:{readonly width:number;readonly height:number}};
type WallView={id:string;image:Phaser.GameObjects.Image;foot:Point;top:number;left:number;right:number;ground:Region;baseY:number;disabledWhen?:string};
let serial=0;
const vertices=(r:{x:number;y:number;width:number;height:number}):Point[]=>[{x:r.x,y:r.y},{x:r.x+r.width,y:r.y},{x:r.x+r.width,y:r.y+r.height},{x:r.x,y:r.y+r.height}];
const polygon=(g:Phaser.GameObjects.Graphics,points:Point[],fill:number,stroke=0x35403f)=>{g.fillStyle(fill).fillPoints(points,true);g.lineStyle(1,stroke,.7).strokePoints(points,true);};
const trace=(ctx:CanvasRenderingContext2D,points:Point[])=>{points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();};

/** State-driven environments only. Actors, weapon rigs, combat tells and camera stay with WorldView.
 * Every floor/wall/solid prop comes from the same catalog consumed by collision. Black is void.
 */
export class ExpeditionWorldView {
 readonly area:ExpeditionDefinition;
 private readonly namespace:string;
 private readonly objects=new Map<Display,boolean>();
 private readonly textureKeys:string[]=[];
 private readonly props:PropView[]=[];
 private readonly walls:WallView[]=[];
 private readonly bridgeFloors=new Map<string,Phaser.GameObjects.Image>();
 private readonly waterViews:{image:Phaser.GameObjects.Image;closed:string;open:string;excludeIds:readonly string[]}[]=[];
 private readonly levers:{id:string;base:Phaser.GameObjects.Image;handle:Phaser.GameObjects.Graphics;ground:Point}[]=[];
 private readonly glints:Phaser.GameObjects.Graphics;
 private visible=true;
 private destroyed=false;
 private lastState:{flags:string[];bridgeProgress:number;lever:{id:string;pull:number;hand:Point;phase:string}[]}|null=null;
 /** Non-solid, inset masonry treads within the existing walkable landing. The dark
  * recessed back and shallow risers explain an ordinary descending service stair,
  * not a portal or an extra collision/hazard region. Ground extent: x±28,y[-29,+18]. */
 static drawServiceStair(scene:Phaser.Scene,position:Point):Phaser.GameObjects.Graphics{
  const g=scene.add.graphics().setDepth(-998.6),world=(x:number,y:number)=>project({x:position.x+x,y:position.y+y});
  const {left,right,back,front}=SERVICE_STAIR_GROUND;
  polygon(g,[world(left,back),world(right,back),world(right,front),world(left,front)],0x323b3a,0x778075);
  polygon(g,[world(-23,-25),world(23,-25),world(23,14),world(-23,14)],0x080f13,0x10181b);
  // Back-to-front strips retain projected ground scale; their carved lips and
  // increasingly dim stone make the shallow descent legible without a false void.
  for(let i=0;i<5;i++){
   const y=-23+i*7.2,shade=[0x182225,0x283133,0x36403f,0x48504a,0x5e6256][i];
   polygon(g,[world(-21,y),world(21,y),world(21,y+6.6),world(-21,y+6.6)],shade,0x172124);
   const a=world(-21,y+6.6),b=world(21,y+6.6);g.lineStyle(1.5,0x929381,.55).lineBetween(a.x,a.y,b.x,b.y);
  }
  return g;
 }
 static preload(scene:Phaser.Scene){
  for(const [key,url] of Object.entries({'expedition-water':waterUrl,'expedition-shelf':shelfUrl,'expedition-lever-base':leverBaseUrl}))if(!scene.textures.exists(key))scene.load.image(key,url);
 }
 constructor(private readonly scene:Phaser.Scene,readonly areaId:ExpeditionId){
  this.area=EXPEDITIONS[areaId];this.namespace=`expedition-${areaId}-${serial++}`;
  const b=this.area.camera.projectedWorldBounds;
  // Deliberate black architectural void, not an accidental transparent canvas edge or extra floor.
  this.add(scene.add.graphics().setDepth(-1020)).fillStyle(0x030609).fillRect(b.x-1280,b.y-800,b.width+2560,b.height+1600);
  for(const hazard of this.area.hazardRegions){
   const closed=this.groundTexture(`water-${hazard.id}-closed`,[hazard],'expedition-water',512,.32);
   const excluded=this.area.floors.filter(f=>hazard.excludeActiveFloorIds.includes(f.id));
   const open=this.groundTexture(`water-${hazard.id}-open`,[hazard],'expedition-water',512,.32,excluded);
   const image=this.add(scene.add.image(closed.x,closed.y,closed.key).setOrigin(0).setDepth(-1010));
   this.waterViews.push({image,closed:closed.key,open:open.key,excludeIds:hazard.excludeActiveFloorIds});
  }
  const base=this.area.floors.filter(f=>!f.requires);
  this.floorSides(base,-1004);
  const floor=this.groundTexture('floor',base,this.unprojectFloor(),640,areaId==='cistern-viaduct'?.2:.27);
  this.add(scene.add.image(floor.x,floor.y,floor.key).setOrigin(0).setDepth(-1000));
  for(const region of this.area.floors.filter(f=>f.requires)){
   const tex=this.groundTexture(`floor-${region.id}`,[region],this.unprojectFloor(),640,.12);
   const image=this.add(scene.add.image(tex.x,tex.y,tex.key).setOrigin(0).setDepth(-999.8));
   this.bridgeFloors.set(region.id,image);this.enabled(image,false);
  }
  const shadows=this.add(scene.add.graphics().setDepth(-998.9));
  for(const [i,prop] of this.area.props.entries()){
   const p=project(prop),source=scene.textures.get(prop.art).getSourceImage();
   const image=this.add(scene.add.image(p.x,p.y,prop.art).setOrigin(.5,prop.originY).setDisplaySize(prop.width,prop.width*source.height/source.width).setDepth(groundDepth(p.y,30+i)));
   this.props.push({id:prop.id,image,position:{x:prop.x,y:prop.y},radius:prop.radius,footprint:prop.footprint,decorative:false});
   shadows.fillStyle(0x000205,.48).fillEllipse(p.x,p.y+1,prop.width*.84,Math.min(22,prop.width*.3));
  }
  for(const [index,wall] of this.area.walls.entries())this.buildWall(wall,index);
  for(const [i,shortcut] of this.area.shortcuts.entries()){
   const p=project(shortcut.lever);
   const base=this.add(scene.add.image(p.x,p.y,'expedition-lever-base').setOrigin(.514981,.804922).setDisplaySize(24.6967,37.0451).setDepth(groundDepth(p.y,120+i)));
   const handle=this.add(scene.add.graphics().setDepth(groundDepth(p.y,130+i)));
   this.levers.push({id:shortcut.id,base,handle,ground:p});
   this.caption({x:shortcut.lever.x,y:shortcut.lever.y+18},shortcut.kind==='add-floor'?'BRIDGE LEVER':'RETURN SHUTTER',11);
  }
  for(const checkpoint of this.area.checkpoints)this.caption(checkpoint.position,'ENTRY CHECKPOINT',11);
  const markers=this.add(scene.add.graphics().setDepth(-998.6));
  for(const exit of this.area.exits){
   const p=project(exit.position);
   if(exit.target)this.add(ExpeditionWorldView.drawServiceStair(scene,exit.position));
   else markers.lineStyle(2,0x9e8b61,.8).strokeEllipse(p.x,p.y,33,15);
   const target=exit.target==='station'?'STATION':exit.target==='cistern-viaduct'?'CISTERN':exit.target==='record-annex'?'ANNEX':null;
   this.caption(exit.position,target?`SERVICE STAIR · ${target}`:'SECURE RECORD ANNEX',11);
  }
  this.glints=this.add(scene.add.graphics().setDepth(-998.5));
  // No independent tweens or wall clock: pause/reload/retry behavior is solely simulation state.
  this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
 }
 private add<T extends Display>(object:T):T{this.objects.set(object,true);return object;}
 private enabled(object:Display,enabled:boolean){this.objects.set(object,enabled);object.setVisible(this.visible&&enabled);}
 setVisible(visible:boolean){this.visible=visible;for(const [object,enabled] of this.objects)object.setVisible(visible&&enabled);}
 private caption(position:Point,text:string,size:number){const p=project(position);return this.add(this.scene.add.text(p.x,p.y+17,text,{fontFamily:'Georgia',fontSize:`${size}px`,color:'#b9ad8f',align:'center',stroke:'#071016',strokeThickness:3}).setOrigin(.5,0).setDepth(1490).setAlpha(.8));}
 private key(suffix:string){const key=`${this.namespace}-${suffix}`;this.textureKeys.push(key);return key;}
 /** Recover the existing isometric court's original square UV plane once. Its source diamond
  * is exactly a 640×640 ground square, so projection is never applied twice or stretched.
  */
 private unprojectFloor():string{
  const key=`${this.namespace}-floor-material`;if(this.scene.textures.exists(key))return key;
  this.textureKeys.push(key);const texture=this.scene.textures.createCanvas(key,640,640)!;
  const ctx=texture.context;ctx.setTransform(.625,-.625,1.25,1.25,-320,320);ctx.drawImage(this.scene.textures.get('ward-floor').getSourceImage() as HTMLImageElement,0,0);ctx.setTransform(1,0,0,1,0,0);texture.refresh();return key;
 }
 /** Ground-space clipping and UV coordinates are shared by each floor/hazard layer. */
 private groundTexture(suffix:string,regions:readonly Region[],material:string,repeat:number,shade:number,exclude:readonly Region[]=[]){
  const points=regions.flatMap(region=>vertices(region).map(project)),x=Math.floor(Math.min(...points.map(p=>p.x)))-1,y=Math.floor(Math.min(...points.map(p=>p.y)))-1;
  const width=Math.ceil(Math.max(...points.map(p=>p.x))-x)+2,height=Math.ceil(Math.max(...points.map(p=>p.y))-y)+2,key=this.key(suffix);
  const texture=this.scene.textures.createCanvas(key,width,height)!,ctx=texture.context;
  ctx.setTransform(.8,.4,-.8,.4,640-x,180-y);ctx.beginPath();for(const r of regions)ctx.rect(r.x,r.y,r.width,r.height);ctx.clip();
  const source=this.scene.textures.get(material).getSourceImage() as HTMLImageElement|HTMLCanvasElement;
  const left=Math.floor(Math.min(...regions.map(r=>r.x))/repeat)*repeat,top=Math.floor(Math.min(...regions.map(r=>r.y))/repeat)*repeat;
  const right=Math.max(...regions.map(r=>r.x+r.width)),bottom=Math.max(...regions.map(r=>r.y+r.height));
  for(let tx=left;tx<right;tx+=repeat)for(let ty=top;ty<bottom;ty+=repeat)ctx.drawImage(source,tx,ty,repeat,repeat);
  ctx.fillStyle=`rgba(3,11,16,${shade})`;ctx.fillRect(left,top,right-left,bottom-top);
  // Subtraction is explicit, not merely water painted underneath a transparent bridge.
  ctx.globalCompositeOperation='destination-out';for(const region of exclude)ctx.fillRect(region.x,region.y,region.width,region.height);
  ctx.globalCompositeOperation='source-over';ctx.setTransform(1,0,0,1,0,0);texture.refresh();return {key,x,y};
 }
 private floorSides(regions:readonly Region[],depth:number){
  const g=this.add(this.scene.add.graphics().setDepth(depth));
  // Suppress internal overlapping-region seams. Exposed 22px masonry edges stay outside floor tops.
  const covered=(x:number,y:number)=>regions.some(r=>x>r.x+.01&&x<r.x+r.width-.01&&y>r.y+.01&&y<r.y+r.height-.01);
  for(const region of regions){
   for(const [a,b] of [[{x:region.x+region.width,y:region.y},{x:region.x+region.width,y:region.y+region.height}],[{x:region.x+region.width,y:region.y+region.height},{x:region.x,y:region.y+region.height}]]){
    const length=Math.hypot(b.x-a.x,b.y-a.y),count=Math.max(1,Math.ceil(length/20));
    for(let i=0;i<count;i++){
     const from={x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count},to={x:a.x+(b.x-a.x)*(i+1)/count,y:a.y+(b.y-a.y)*(i+1)/count},mid={x:(from.x+to.x)/2+.2,y:(from.y+to.y)/2+.2};
     if(covered(mid.x,mid.y))continue;const p=project(from),q=project(to);polygon(g,[p,q,{x:q.x,y:q.y+22},{x:p.x,y:p.y+22}],i%2?0x1a2428:0x202b2d,0x2e3838);
    }
   }
  }
 }
 private buildWall(wall:AreaWall,index:number){
  const count=Math.ceil(Math.max(wall.width,wall.height)/25);
  for(let segment=0;segment<count;segment++){
   const dx=wall.width>wall.height?wall.width/count:wall.width,dy=wall.height>=wall.width?wall.height/count:wall.height;
   const x=wall.x+(wall.width>wall.height?segment*dx:0),y=wall.y+(wall.height>=wall.width?segment*dy:0),ground={id:wall.id,x,y,width:dx,height:dy};
   const pts=vertices(ground).map(project),foot=project({x:x+dx/2,y:y+dy/2}),rise=wall.disabledWhen?50:38;
   const bx=Math.floor(Math.min(...pts.map(p=>p.x)))-1,by=Math.floor(Math.min(...pts.map(p=>p.y))-rise)-1;
   const key=this.key(`wall-${index}-${segment}`),texture=this.scene.textures.createCanvas(key,Math.ceil(Math.max(...pts.map(p=>p.x))-bx)+2,Math.ceil(Math.max(...pts.map(p=>p.y))-by)+2)!,ctx=texture.context;
   const material=this.scene.textures.get('ward-masonry').getSourceImage() as HTMLImageElement;
   const face=(points:Point[],sw:number,sh:number,shade:number)=>{
    const q=points.map(p=>({x:p.x-bx,y:p.y-by}));ctx.save();ctx.beginPath();trace(ctx,q);ctx.clip();ctx.transform((q[1].x-q[0].x)/sw,(q[1].y-q[0].y)/sw,(q[3].x-q[0].x)/sh,(q[3].y-q[0].y)/sh,q[0].x,q[0].y);
    ctx.drawImage(material,(segment*128)%384,64,128,192,0,0,sw,sh);ctx.restore();ctx.beginPath();trace(ctx,q);ctx.fillStyle=`rgba(2,10,16,${shade})`;ctx.fill();ctx.strokeStyle='rgba(18,26,29,.8)';ctx.lineWidth=.7;ctx.stroke();
   };
   face([{x:pts[1].x,y:pts[1].y-rise},{x:pts[2].x,y:pts[2].y-rise},pts[2],pts[1]],128,192,wall.disabledWhen?.52:.34);
   face([{x:pts[2].x,y:pts[2].y-rise},{x:pts[3].x,y:pts[3].y-rise},pts[3],pts[2]],128,192,wall.disabledWhen?.43:.13);
   face(pts.map(p=>({x:p.x,y:p.y-rise})),128,64,.1);
   if(wall.disabledWhen){
    // Mundane iron-banded shutter, retaining the exact data-defined stone/steel AABB.
    ctx.strokeStyle='#767b72';ctx.lineWidth=2;for(const point of [pts[1],pts[2]]){ctx.beginPath();ctx.moveTo(point.x-bx,point.y-rise-by+4);ctx.lineTo(point.x-bx,point.y-by-2);ctx.stroke();}
   }
   texture.refresh();const image=this.add(this.scene.add.image(bx,by,key).setOrigin(0).setDepth(groundDepth(foot.y,60+index)));
   this.walls.push({id:wall.id,image,foot,top:by,left:Math.min(...pts.map(p=>p.x)),right:Math.max(...pts.map(p=>p.x)),ground,baseY:by,disabledWhen:wall.disabledWhen});
  }
 }
 draw(s:Adventure){
  if(this.destroyed||s.areaId!==this.areaId)return;
  const flags=openedShortcuts(s),floors=activeFloors(this.area,flags),walls=activeWalls(this.area,flags),actors=[s.position,...s.enemies.filter(e=>e.hp>0).map(e=>e.position)].map(project);
  const animation=s.shortcutAnimation,progress=animation?.phase==='opening'?animation.progress:0;
  for(const water of this.waterViews){const excluded=water.excludeIds.some(id=>floors.some(f=>f.id===id));water.image.setTexture(excluded?water.open:water.closed);}
  for(const [id,image] of this.bridgeFloors){
   const region=this.area.floors.find(f=>f.id===id)!,open=floors.some(f=>f.id===id),animating=!!animation&&this.area.shortcuts.some(l=>l.id===animation.id&&l.floorId===id)&&animation.phase==='opening';
   this.enabled(image,open||animating);const points=regionVertices(region).map(project),baseY=Math.floor(Math.min(...points.map(p=>p.y)))-1;
   image.setY(baseY-(open?0:(1-progress)*48)).setAlpha(open?1:.3+progress*.5);
  }
  for(const prop of this.props){
   const p=project(prop.position),behind=actors.some(a=>a.y<p.y-1&&a.y>p.y-prop.image.displayHeight*prop.image.originY-12&&Math.abs(a.x-p.x)<prop.image.displayWidth*.48+12);
   prop.image.setAlpha((behind?.32:1)*(s.looted.includes(prop.id)?.35:1));
  }
  for(const wall of this.walls){
   const open=!walls.some(w=>w.id===wall.id);this.enabled(wall.image,!open);
   const behind=actors.some(a=>a.x>wall.left-15&&a.x<wall.right+15&&a.y<wall.foot.y-1&&a.y>wall.top-12);
   wall.image.setAlpha(behind?.4:1).setY(wall.baseY-(wall.disabledWhen&&animation?.phase==='opening'?progress*36:0));
  }
  const leverState=[];
  for(const lever of this.levers){
   const pulling=animation?.id===lever.id&&animation.phase==='pulling',open=flags.includes(lever.id),pull=pulling?Math.max(0,Math.min(1,1-animation.timer/.8)):open||animation?.id===lever.id?1:0;
   const lp=lever.ground,hand={x:lp.x-13+pull*23,y:lp.y-43+pull*13},handle=lever.handle;
   handle.clear().lineStyle(7,0x142025).lineBetween(lp.x,lp.y-20,hand.x,hand.y).lineStyle(4,0xabb5ac).lineBetween(lp.x,lp.y-20,hand.x,hand.y).lineStyle(6,open?0x9b9e76:0xb19c66).lineBetween(hand.x-5,hand.y,hand.x+5,hand.y);
   leverState.push({id:lever.id,pull,hand,phase:pulling?'pulling':open?'open':animation?.id===lever.id?'opening':'closed'});
  }
  const g=this.glints;g.clear();
  for(const loot of this.area.loot)if(!s.looted.includes(loot.id)){const p=project(loot.position);g.lineStyle(1,0xcbb982,.5+.16*Math.sin(s.time*3)).lineBetween(p.x,p.y-29,p.x,p.y-40);g.lineStyle(1,0xb19b6c,.4).strokeEllipse(p.x,p.y+1,48,20);}
  for(const checkpoint of this.area.checkpoints){const p=project(checkpoint.position);g.fillStyle(0xaa8647,.08).fillEllipse(p.x,p.y,95,42).lineStyle(1,0xb09964,.6).strokeEllipse(p.x,p.y,60,27);}
  this.lastState={flags:[...flags],bridgeProgress:s.shortcut?1:progress,lever:leverState};
 }
 snapshot(){
  const flags=this.lastState?.flags??[];
  return {areaId:this.areaId,visible:this.visible,bounds:{...this.area.camera.projectedWorldBounds},floors:this.area.floors.map(f=>({id:f.id,x:f.x,y:f.y,width:f.width,height:f.height,active:!f.requires||flags.includes(f.requires)})),hazards:this.waterViews.map(w=>({excludeActiveFloorIds:[...w.excludeIds],texture:w.image.texture.key})),walls:this.area.walls.map(w=>({id:w.id,x:w.x,y:w.y,width:w.width,height:w.height,active:!w.disabledWhen||!flags.includes(w.disabledWhen)})),props:this.props.map(p=>({id:p.id,world:{...p.position},foot:project(p.position),radius:p.radius,footprint:p.footprint?{...p.footprint}:null,decorative:p.decorative,width:p.image.displayWidth,height:p.image.displayHeight,originX:p.image.originX,originY:p.image.originY,depth:p.image.depth,alpha:p.image.alpha})),lever:this.levers.map(view=>({...this.lastState?.lever.find(l=>l.id===view.id),id:view.id,ground:{...view.ground},base:{originX:view.base.originX,originY:view.base.originY,width:view.base.displayWidth,height:view.base.displayHeight,depth:view.base.depth,socketOffset:{x:0,y:-20}}})),blackOffboard:true,bridgeProgress:this.lastState?.bridgeProgress??0};
 }
 destroy(){
  if(this.destroyed)return;this.destroyed=true;this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
  for(const object of this.objects.keys())object.destroy();this.objects.clear();for(const key of this.textureKeys)if(this.scene.textures.exists(key))this.scene.textures.remove(key);
 }
}
