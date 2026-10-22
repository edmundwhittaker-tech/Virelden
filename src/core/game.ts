import {SCENERY} from './scenery.js';
/** 2D ground coordinates, projected only when drawing. */
export interface Point { x: number; y: number }
export const SIZE=640, RADIUS=12, SPEED=150, STEP=1/60;
export const SPAWN: Point={x:320,y:320};
export const PILLARS=[
  {x:120,y:120,radius:23,height:128},{x:520,y:120,radius:23,height:128},
  {x:120,y:520,radius:23,height:128},{x:520,y:520,radius:23,height:128},
];
export function project(p:Point):Point {
  return {x:640+(p.x-p.y)*.8,y:180+(p.x+p.y)*.4};
}
export function canStand(p:Point):boolean {
  return p.x>=RADIUS && p.y>=-1920+RADIUS && p.x<=SIZE-RADIUS && p.y<=SIZE-RADIUS
    && PILLARS.every(o=>Math.hypot(p.x-o.x,p.y-o.y)>=o.radius+RADIUS)
    && SCENERY.every(o=>Math.hypot(p.x-o.x,p.y-o.y)>=o.radius+RADIUS);
}
/** Screen-relative input; normalized speed; substeps prevent tunnelling. */
export function move(position:Point,input:Point,dt:number,canOccupy:(p:Point)=>boolean=canStand):Point {
  const length=Math.hypot(input.x,input.y);
  if(!length || dt<=0)return {...position};
  const sx=input.x/length*SPEED, sy=input.y/length*SPEED;
  const dx=sx/1.6+sy/.8, dy=sy/.8-sx/1.6, seconds=Math.min(dt,.1);
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)*seconds/4));
  const result={...position};
  for(let i=0;i<steps;i++){
    const x={x:result.x+dx*seconds/steps,y:result.y};
    if(canOccupy(x))result.x=x.x;
    const y={x:result.x,y:result.y+dy*seconds/steps};
    if(canOccupy(y))result.y=y.y;
  }
  return result;
}

