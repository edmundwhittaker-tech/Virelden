import Phaser from 'phaser';
import { STEP, SPAWN, RELIC, SAVE_KEY, createState, tick, decodeSave, unproject, project, screenDirection, distance, type GameState, type Point } from '../core/game.js';
import { WorldView } from './WorldView.js';
export interface DebugAPI { snapshot(): GameState; project(p: Point): Point; paused(): boolean }
declare global { interface Window { __VIRELDEN__?: DebugAPI } }
const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const node = document.getElementById(id); if (!node) throw new Error(`Missing interface element: ${id}`); return node as T;
};
export class CourtyardScene extends Phaser.Scene {
  private state!: GameState;
  private view!: WorldView;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private accumulator=0;
  private attack=false;
  private roll=false;
  private interact=false;
  private paused=false;
  private debug=false;
  private storageAvailable=true;
  private savedRelic=false;
  constructor(){super('Courtyard');}
  create(){
    try { this.savedRelic=decodeSave(localStorage.getItem(SAVE_KEY)); } catch {this.storageAvailable=false;}
    this.state=createState(this.savedRelic); this.view=new WorldView(this);
    if(!this.input.keyboard) throw new Error('A keyboard is required for this prototype.');
    this.keys=this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,SHIFT,E,R,ESC,F2') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown',(pointer: Phaser.Input.Pointer)=>{ if(pointer.leftButtonDown()&&!this.paused)this.attack=true; });
    // Buffer actions from events, not JustDown polling: a down/up pair can arrive
    // between frames. Movement remains held-state based; repeats do not retrigger actions.
    const actionKey=(event: KeyboardEvent)=>{
      if(event.repeat)return;
      switch(event.code){
        case 'Escape': this.setPaused(!this.paused); break;
        case 'KeyR': this.restart(); break;
        case 'F2': this.debug=!this.debug; break;
        case 'Space': case 'ShiftLeft': case 'ShiftRight':
          if(!this.paused)this.roll=true;
          break;
        case 'KeyE': if(!this.paused)this.interact=true; break;
      }
    };
    this.input.keyboard.on('keydown',actionKey);
    const restart=()=>this.restart(),help=()=>this.setPaused(!this.paused),resume=()=>this.setPaused(false),blur=()=>this.setPaused(true);
    el('restart').addEventListener('click',restart);el('help').addEventListener('click',help);el('resume').addEventListener('click',resume);
    el('death-restart').addEventListener('click',restart);this.game.events.on(Phaser.Core.Events.BLUR,blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      el('restart').removeEventListener('click',restart);el('help').removeEventListener('click',help);el('resume').removeEventListener('click',resume);
      el('death-restart').removeEventListener('click',restart);this.game.events.off(Phaser.Core.Events.BLUR,blur);
      this.input.keyboard?.off('keydown',actionKey);delete window.__VIRELDEN__;
    });
    if(new URLSearchParams(location.search).has('debug'))window.__VIRELDEN__={snapshot:()=>structuredClone(this.state),project,paused:()=>this.paused};
    this.view.draw(this.state,false);this.updateHud();document.body.dataset.ready='true';el('loading').hidden=true;
  }
  private setPaused(value: boolean){
    this.paused=value;this.accumulator=0;this.attack=false;this.roll=false;this.interact=false;
    this.input.keyboard?.resetKeys();el('pause-overlay').hidden=!value;
  }
  private restart(){this.state=createState(this.state.relic);this.setPaused(false);this.view.draw(this.state,this.debug);this.updateHud();}
  update(_time: number, delta: number){
    if(!this.state||this.paused)return;
    const down=(...names:string[])=>names.some(n=>this.keys[n].isDown)?1:0;
    const dir=screenDirection(down('D','RIGHT')-down('A','LEFT'),down('S','DOWN')-down('W','UP'));
    const pointer=this.input.activePointer,aim=unproject({x:pointer.x,y:pointer.y+24});
    this.accumulator+=Math.min(delta/1000,.1);
    while(this.accumulator>=STEP){
      this.state=tick(this.state,{x:dir.x,y:dir.y,aim,attack:this.attack,roll:this.roll,interact:this.interact});
      this.attack=false;this.roll=false;this.interact=false;this.accumulator-=STEP;
    }
    if(this.state.relic!==this.savedRelic){
      this.savedRelic=this.state.relic;
      try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,relic:this.state.relic}));}catch{this.storageAvailable=false;}
    }
    this.view.draw(this.state,this.debug);this.updateHud();
  }
  private updateHud(){
    const s=this.state,p=s.player,alive=s.enemies.filter(e=>e.hp>0).length;
    el('hp-value').textContent=`${p.hp} / 100`;el<HTMLMeterElement>('hp').value=p.hp;
    el('stamina-value').textContent=`${Math.ceil(p.stamina)} / 100`;el<HTMLMeterElement>('stamina').value=p.stamina;
    el('enemy-count').textContent=`${2-alive} / 2 sentries defeated`;
    el('relic-status').textContent=s.relic?'Relic discovered · sword strengthened':'Find the gilded relic';
    el('save-state').textContent=this.storageAvailable?'Progress saved in this browser':'Storage unavailable · progress lasts this session';
    el('death-overlay').hidden=p.hp>0;
    let prompt='Read the red attack warning. Roll away, then strike.';
    if(p.hp<=0)prompt='Your discovery survives. Return to the checkpoint.';
    else if(!s.relic&&distance(p,RELIC)<65)prompt='E — Claim the relic. Your sword will deal more damage.';
    else if(distance(p,SPAWN)<65)prompt='E — Rest at the checkpoint. Resting also resets enemies.';
    else if(!alive)prompt=s.relic?'Courtyard secured. This is the end of the first prototype.':'Courtyard secured. Explore the far corner for the relic.';
    if(el('prompt').textContent!==prompt)el('prompt').textContent=prompt;
  }
}
