import Phaser from 'phaser';
import { SIZE, PILLARS, SPAWN, RELIC, project, type Point, type GameState, type Pillar } from '../core/game.js';
type Graphics = Phaser.GameObjects.Graphics;
const C = { edge: 0x53605e, gold: 0xb7a06a, pale: 0xd9d7c5, red: 0xb46455 };
function polygon(g: Graphics, points: Point[], fill: number, alpha = 1, stroke?: number) {
  g.fillStyle(fill, alpha).fillPoints(points, true);
  if (stroke !== undefined) g.lineStyle(1, stroke, .65).strokePoints(points, true);
}
function diamond(g: Graphics, p: Point, r: number, height: number, color: number) {
  const corners = [{x:p.x-r,y:p.y-r},{x:p.x+r,y:p.y-r},{x:p.x+r,y:p.y+r},{x:p.x-r,y:p.y+r}].map(project);
  polygon(g, corners.map(q=>({x:q.x,y:q.y-height})), color, 1, C.edge);
}
function groundRing(g: Graphics, p: Point, radius: number, color: number, alpha = 1) {
  const points = Array.from({length:41},(_,n)=>project({x:p.x+Math.cos(n/40*Math.PI*2)*radius,y:p.y+Math.sin(n/40*Math.PI*2)*radius}));
  g.lineStyle(2,color,alpha).strokePoints(points,true);
}
function pillar(scene: Phaser.Scene, p: Pillar) {
  const g=scene.add.graphics().setDepth(project(p).y+12);
  const a=project({x:p.x-p.radius,y:p.y-p.radius});
  const b=project({x:p.x+p.radius,y:p.y-p.radius});
  const c=project({x:p.x+p.radius,y:p.y+p.radius});
  const d=project({x:p.x-p.radius,y:p.y+p.radius});
  const h=p.height;
  g.fillStyle(0x05090d,.30).fillEllipse(c.x+30,c.y+8,95,32);
  diamond(g,p,p.radius+7,0,0x394346);
  polygon(g,[b,c,{x:c.x,y:c.y-h},{x:b.x,y:b.y-h}],0x202b31,1,C.edge);
  polygon(g,[c,d,{x:d.x,y:d.y-h},{x:c.x,y:c.y-h}],0x394347,1,C.edge);
  diamond(g,p,p.radius,h,0x4b5554);
  diamond(g,p,p.radius+4,h-13,0x47524e);
  g.lineStyle(2,0x829080,.25).lineBetween(c.x-7,c.y-20,c.x-7,c.y-h+25);
  g.lineStyle(1,C.gold,.35).lineBetween(d.x+5,d.y-h+32,c.x-5,c.y-h+32);
  g.lineStyle(2,0x141e24,.8).beginPath().moveTo(a.x+8,a.y-h+8).lineTo(c.x-10,c.y-h+20).lineTo(c.x+2,c.y-h+45).strokePath();
}
/** Procedural placeholder artwork, independently replaceable from gameplay. */
export class WorldView {
  private player: Graphics;
  private enemies: Graphics[];
  private effects: Graphics;
  private debug: Graphics;
  private relic: Graphics;
  constructor(scene: Phaser.Scene) {
    const floor=scene.add.graphics().setDepth(-1000);
    const vertices=[{x:0,y:0},{x:SIZE,y:0},{x:SIZE,y:SIZE},{x:0,y:SIZE}].map(project);
    floor.fillStyle(0x000000,.25).fillEllipse(640,490,1120,490);
    polygon(floor,[vertices[1],vertices[2],{x:vertices[2].x,y:vertices[2].y+24},{x:vertices[1].x,y:vertices[1].y+24}],0x182127);
    polygon(floor,[vertices[2],vertices[3],{x:vertices[3].x,y:vertices[3].y+24},{x:vertices[2].x,y:vertices[2].y+24}],0x222d32);
    for(let x=0;x<SIZE;x+=80) for(let y=0;y<SIZE;y+=80) {
      const color=((x/80+y/80)%2===0)?0x2a3439:0x2d373b;
      polygon(floor,[{x:x+2,y:y+2},{x:x+78,y:y+2},{x:x+78,y:y+78},{x:x+2,y:y+78}].map(project),color,1,0x43504f);
      if((x+y)%240===0){const a=project({x:x+20,y:y+8}),b=project({x:x+35,y:y+38}); floor.lineStyle(1,0x151f25,.5).lineBetween(a.x,a.y,b.x,b.y);}
    }
    floor.lineStyle(2,C.gold,.30).strokePoints(vertices,true);
    floor.lineStyle(1,C.gold,.15).strokePoints([{x:20,y:20},{x:620,y:20},{x:620,y:620},{x:20,y:620}].map(project),true);
    groundRing(floor,SPAWN,34,C.gold,.9); groundRing(floor,SPAWN,44,C.gold,.3);
    const cp=project(SPAWN);
    scene.add.text(cp.x,cp.y+37,'CHECKPOINT',{fontFamily:'Georgia, serif',fontSize:'12px',color:'#aaa385'}).setOrigin(.5).setDepth(-500);
    const label=project({x:320,y:40});
    scene.add.text(label.x,label.y,'THE RUINED COURTYARD',{fontFamily:'Georgia, serif',fontSize:'14px',color:'#7a837d'}).setOrigin(.5).setDepth(-500);
    for(const p of PILLARS) pillar(scene,p);
    this.relic=scene.add.graphics().setDepth(project(RELIC).y);
    this.player=scene.add.graphics();
    this.enemies=[scene.add.graphics(),scene.add.graphics()];
    this.effects=scene.add.graphics().setDepth(2000);
    this.debug=scene.add.graphics().setDepth(3000);
  }
  private actor(g: Graphics, pos: Point, angle: number, enemy: boolean, hurt: number, rolling = false) {
    const p=project(pos); g.clear().setDepth(p.y);
    g.fillStyle(0x05090e,.55).fillEllipse(p.x,p.y+2,34,15);
    const body=enemy?C.red:0x667d83, cloak=enemy?0x513333:0x233b46, bob=rolling?8:0;
    polygon(g,[{x:p.x,y:p.y-40+bob},{x:p.x+15,y:p.y-6},{x:p.x,y:p.y-1},{x:p.x-16,y:p.y-6}],cloak);
    g.fillStyle(hurt>0?0xe5d4b1:body).fillRoundedRect(p.x-9,p.y-34+bob,18,24-bob,4);
    polygon(g,[{x:p.x,y:p.y-51+bob},{x:p.x+8,y:p.y-43+bob},{x:p.x+6,y:p.y-33+bob},{x:p.x-7,y:p.y-33+bob},{x:p.x-9,y:p.y-43+bob}],hurt>0?C.pale:0xa5afa8);
    g.lineStyle(2,0x18232b).lineBetween(p.x-6,p.y-40+bob,p.x+6,p.y-40+bob);
    g.lineStyle(3,0x111c23).lineBetween(p.x-5,p.y-12,p.x-7,p.y).lineBetween(p.x+5,p.y-12,p.x+7,p.y);
    const sword=project({x:pos.x+Math.cos(angle)*35,y:pos.y+Math.sin(angle)*35});
    g.lineStyle(3,C.pale).lineBetween(p.x+7,p.y-23+bob,sword.x+7,sword.y-27+bob);
    g.lineStyle(4,C.gold).lineBetween(p.x+3,p.y-22+bob,p.x+11,p.y-26+bob);
    if(rolling) groundRing(g,pos,22,C.pale,.6);
  }
  draw(s: GameState, showDebug: boolean) {
    const p=s.player;
    this.actor(this.player,p,p.angle,false,p.hurt,p.roll>0); this.player.setAlpha(p.hp>0?1:.3);
    this.effects.clear();
    if(p.attack>0) {
      const arc=[project(p)];
      for(let i=0;i<=16;i++){const a=p.attackAngle-.95+i/16*1.9; arc.push(project({x:p.x+Math.cos(a)*88,y:p.y+Math.sin(a)*88}));}
      polygon(this.effects,arc.map(q=>({x:q.x,y:q.y-18})),C.pale,.13);
      this.effects.lineStyle(2,C.gold,.85).strokePoints(arc.slice(1).map(q=>({x:q.x,y:q.y-18})),false);
    }
    s.enemies.forEach((e,i)=>{
      const g=this.enemies[i]; if(!g)return;
      if(e.hp<=0){const q=project(e);g.clear().setDepth(q.y-1).fillStyle(0x191e24,.7).fillEllipse(q.x,q.y,34,14);return;}
      this.actor(g,e,e.angle,true,e.hurt);
      const q=project(e);
      g.fillStyle(0x111920).fillRect(q.x-18,q.y-65,36,4).fillStyle(C.red).fillRect(q.x-18,q.y-65,36*e.hp/90,4);
      if(e.mode==='windup') {
        groundRing(this.effects,e,84,C.red,.7);
        const aim=project({x:e.x+Math.cos(e.angle)*84,y:e.y+Math.sin(e.angle)*84});
        this.effects.lineStyle(3,C.red,.8).lineBetween(q.x,q.y,aim.x,aim.y);
        this.effects.fillStyle(C.red).fillCircle(q.x,q.y-74,3+3*(1-e.timer/.72));
      }
    });
    this.relic.clear();
    if(!s.relic){const r=project(RELIC),float=Math.sin(s.time*2)*3;groundRing(this.relic,RELIC,22,C.gold,.5);
      polygon(this.relic,[{x:r.x,y:r.y-29+float},{x:r.x+9,y:r.y-15+float},{x:r.x,y:r.y-1+float},{x:r.x-9,y:r.y-15+float}],C.gold,1,C.pale);}
    this.debug.clear();
    if(showDebug){for(const o of PILLARS)groundRing(this.debug,o,o.radius,0x85cfb0);groundRing(this.debug,p,13,0xd7e4be);}
  }
}
