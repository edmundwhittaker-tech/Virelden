import Phaser from 'phaser';
import {move,project,SPAWN,STEP,type Point} from '../core/game.js';
import {WorldView} from './WorldView.js';
import {KnightSprite} from './KnightSprite.js';
declare global{
  interface Window{vireldenDebug?:()=>{position:Point;screen:Point;moving:boolean;character:ReturnType<KnightSprite['snapshot']>}}
}
export class CourtyardScene extends Phaser.Scene{
  private position={...SPAWN};
  private held=new Set<string>();
  private accumulator=0;
  private view!:WorldView;
  private moving=false;
  private facing=1;
  preload(){KnightSprite.preload(this);}
  create(){
    this.view=new WorldView(this);
    const keys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
    const down=(event:KeyboardEvent)=>{
      if(keys.has(event.code)){event.preventDefault();this.held.add(event.code);}
    };
    const up=(event:KeyboardEvent)=>{this.held.delete(event.code);};
    const clear=()=>{this.held.clear();this.accumulator=0;};
    const visibility=()=>{if(document.hidden)clear();};
    const reset=()=>{this.position={...SPAWN};this.moving=false;this.facing=1;clear();this.view.draw(this.position,false,this.facing);};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility);
    document.getElementById('reset')?.addEventListener('click',reset);
    if(new URLSearchParams(location.search).get('debug')==='1')
      window.vireldenDebug=()=>({position:{...this.position},screen:project(this.position),moving:this.moving,character:this.view.characterSnapshot()});
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);
      window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility);
      document.getElementById('reset')?.removeEventListener('click',reset);delete window.vireldenDebug;
    });
    this.game.canvas.setAttribute('aria-label','Isometric stone courtyard with a movable knight. Use WASD or arrow keys.');
    this.game.canvas.setAttribute('role','img');
    document.getElementById('loading')?.setAttribute('hidden','');
    this.view.draw(this.position,false,this.facing);
  }
  update(_time:number,delta:number){
    const has=(...keys:string[])=>keys.some(key=>this.held.has(key));
    const input={
      x:Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')),
      y:Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp')),
    };
    const before={...this.position};
    this.accumulator+=Math.min(delta/1000,.1);
    let stepped=false;
    while(this.accumulator>=STEP){this.position=move(this.position,input,STEP);this.accumulator-=STEP;stepped=true;}
    // Render frames between fixed simulation steps keep the current walk state.
    if(!input.x && !input.y)this.moving=false;
    else if(stepped)this.moving=Math.hypot(this.position.x-before.x,this.position.y-before.y)>.001;
    if(input.x)this.facing=Math.sign(input.x);
    this.view.draw(this.position,this.moving,this.facing);
  }
}

