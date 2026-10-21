import Phaser from 'phaser';
import {SIZE,PILLARS,project,type Point} from '../core/game.js';
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
/** Replaceable procedural placeholder art; no external assets. */
export class WorldView{
  private actor:Graphics;
  private walkTime=0;
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
    for(const p of PILLARS)column(scene,p.x,p.y,p.radius,p.height);
    this.actor=scene.add.graphics();
  }
  draw(position:Point,moving:boolean,facing:number,dt:number){
    this.walkTime=moving?this.walkTime+dt*11:0;
    const p=project(position),g=this.actor,stride=Math.sin(this.walkTime)*4,bob=moving?Math.abs(Math.sin(this.walkTime))*2:0;
    g.clear().setDepth(p.y);
    g.fillStyle(0x02070a,.6).fillEllipse(p.x,p.y+1,34,14);
    g.lineStyle(6,0x151e25).lineBetween(p.x-5,p.y-14,p.x-7+stride,p.y).lineBetween(p.x+5,p.y-14,p.x+7-stride,p.y);
    poly(g,[{x:p.x,y:p.y-40-bob},{x:p.x+16,y:p.y-7},{x:p.x,y:p.y-3},{x:p.x-16,y:p.y-7}],0x4f3435,0x61484a);
    g.fillStyle(0x74838a).fillRoundedRect(p.x-9,p.y-35-bob,18,22,3);
    g.fillStyle(0x9da8a6).fillCircle(p.x,p.y-43-bob,9);
    g.lineStyle(2,0x1e2a31).lineBetween(p.x-6,p.y-43-bob,p.x+6,p.y-43-bob);
    g.fillStyle(0xc0ae83).fillCircle(p.x+facing*3,p.y-42-bob,1.5);
    g.lineStyle(3,0x9ba6a5).lineBetween(p.x-13,p.y-31-bob,p.x-15-stride*.4,p.y-18-bob).lineBetween(p.x+13,p.y-31-bob,p.x+15+stride*.4,p.y-18-bob);
    g.lineStyle(2,0xb09a6d).lineBetween(p.x-7,p.y-15,p.x+7,p.y-15);
  }
}

