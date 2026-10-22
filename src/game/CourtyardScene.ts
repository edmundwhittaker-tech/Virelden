import Phaser from 'phaser';
import {project,STEP,type Point} from '../core/game.js';
import {createAdventure,tick,attack,roll,interact,equip,upgrade,retry,serialize,restore,WEAPONS,ARCHETYPES,interactionHint,weaponDamage,upgradeCost,type Adventure,type Archetype,type WeaponId} from '../core/adventure.js';
import {LEVEL_SECTIONS} from '../core/level.js';
import {WorldView} from './WorldView.js';
import {KnightSprite} from './KnightSprite.js';
import {facingForInput,type Facing} from '../core/facing.js';
const QA=new URLSearchParams(location.search).get('qa')==='1';
const SAVE=QA?'virelden-underworks-qa-v1':'virelden-underworks-v1';
declare global{interface Window{vireldenDebug?:()=>Adventure & {screen:Point;camera:Point;keyboardAim:Point;gate:ReturnType<WorldView['gateSnapshot']>;archers:ReturnType<WorldView['archerSnapshot']>;moving:boolean;character:ReturnType<KnightSprite['snapshot']>;scenery:ReturnType<WorldView['scenerySnapshot']>;paused:boolean;timing:{frames:number;rawDelta:number;fps:number;renderMs:number;updateMs:number}}}}
export class CourtyardScene extends Phaser.Scene{
  private state=createAdventure('vanguard'); private keyboardAim:Point={x:1,y:0}; private held=new Set<string>(); private pendingKeys=new Set<string>(); private actions:string[]=[]; private accumulator=0; private view!:WorldView; private moving=false; private facing:Facing='east'; private menu=''; private saveTimer=0;private renderCost=0;private updateCost=0; private lastHud='';
  preload(){KnightSprite.preload(this);WorldView.preload(this);}
  create(){
    this.saveNotice('Local progress');
    let loaded=false;try{const raw=localStorage.getItem(SAVE);if(raw){const restored=restore(raw);if(restored){this.state=restored;loaded=true;}}}catch{this.saveNotice('Saving unavailable in this browser');}
    this.view=new WorldView(this);
    let renderStart=0;const beforeRender=()=>{renderStart=performance.now();};const afterRender=()=>{this.renderCost=performance.now()-renderStart;};this.game.events.on(Phaser.Core.Events.PRE_RENDER,beforeRender);this.game.events.on(Phaser.Core.Events.POST_RENDER,afterRender);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.game.events.off(Phaser.Core.Events.PRE_RENDER,beforeRender);this.game.events.off(Phaser.Core.Events.POST_RENDER,afterRender);});
    const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
    const down=(event:KeyboardEvent)=>{
      if(this.menu&&event.code==='Tab'){const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('#panel button:not(:disabled)'));const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
      if((event.target as HTMLElement)?.tagName==='BUTTON' && ['Space','Enter'].includes(event.code))return;
      if([...movement,'Space','KeyF','KeyJ','KeyE','KeyI','KeyH','Escape'].includes(event.code))event.preventDefault();
      if(movement.includes(event.code)){this.held.add(event.code);this.pendingKeys.add(event.code);}
      if(!event.repeat&&!movement.includes(event.code))this.actions.push(event.code);
    };
    const up=(event:KeyboardEvent)=>this.held.delete(event.code);
    const clear=()=>{this.held.clear();this.pendingKeys.clear();this.actions=[];this.accumulator=0;};
    const blur=()=>{clear();if(!this.menu&&this.state.hp>0)this.showMenu('pause');this.game.loop.sleep();};
    const focus=()=>{if(!document.hidden){clear();this.game.loop.wake();}};
    const visibility=()=>{if(document.hidden)blur();else focus();};
    const click=(event:MouseEvent)=>{if(!this.menu&&event.target===this.game.canvas){this.aimAt(event);this.actions.push('MouseAttack');}};
    const pointer=(event:MouseEvent)=>{if(!this.menu&&event.target===this.game.canvas)this.aimAt(event);};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);this.game.canvas.addEventListener('click',click);this.game.canvas.addEventListener('mousemove',pointer);
    const handlers:Record<string,()=>void>={'inventory-button':()=>this.showMenu(this.menu==='inventory'?'':'inventory'),'pause-button':()=>this.showMenu(this.menu?'':'pause'),'help-button':()=>this.showMenu(this.menu==='help'?'':'help')};
    Object.entries(handlers).forEach(([id,fn])=>document.getElementById(id)?.addEventListener('click',fn));
    const panelClick=(event:MouseEvent)=>this.panelAction((event.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.action??'');
    document.getElementById('panel')!.addEventListener('click',panelClick);
    if(new URLSearchParams(location.search).get('debug')==='1')window.vireldenDebug=()=>({...structuredClone(this.state),screen:this.screenPosition(),camera:{x:this.cameras.main.scrollX,y:this.cameras.main.scrollY},keyboardAim:{...this.keyboardAim},gate:this.view.gateSnapshot(),archers:this.view.archerSnapshot(),moving:this.moving,character:this.view.characterSnapshot(),scenery:this.view.scenerySnapshot(),paused:!!this.menu,timing:{frames:this.game.loop.frame,rawDelta:this.game.loop.rawDelta,fps:this.game.loop.actualFps,renderMs:this.renderCost,updateMs:this.updateCost}});
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);this.game.canvas.removeEventListener('click',click);this.game.canvas.removeEventListener('mousemove',pointer);Object.entries(handlers).forEach(([id,fn])=>document.getElementById(id)?.removeEventListener('click',fn));document.getElementById('panel')!.removeEventListener('click',panelClick);delete window.vireldenDebug;});
    this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label','Virelden action RPG. Move with WASD, F or J to attack, Space to roll, E to interact.');this.game.canvas.setAttribute('role','img');document.getElementById('loading')!.hidden=true;
    this.showMenu(loaded?'':'start');this.render();
  }
  private aimAt(event:MouseEvent){const rect=this.game.canvas.getBoundingClientRect(),p=project(this.state.position);const x=(event.clientX-rect.left)*1280/rect.width+this.cameras.main.scrollX-p.x,y=(event.clientY-rect.top)*800/rect.height+this.cameras.main.scrollY-p.y;const length=Math.hypot(x,y);if(length>10)this.state.aim={x:x/length,y:y/length};}
  private saveNotice(text:string){document.getElementById('save-status')!.textContent=(QA?'QA save · ':'')+text;}
  private save(){try{localStorage.setItem(SAVE,serialize(this.state));this.saveNotice('Local progress · saved');}catch{this.saveNotice('Saving unavailable · keep this tab open');}}
  private panelAction(action:string){
    if(action.startsWith('start:')){this.state=createAdventure(action.slice(6) as Archetype);this.facing='east';this.keyboardAim={x:1,y:0};this.cameras.main.setScroll(0,0);this.save();this.menu='';this.showMenu('');}
    else if(action.startsWith('equip:')){equip(this.state,action.slice(6) as WeaponId);this.save();this.showMenu('inventory');}
    else if(action==='upgrade'){upgrade(this.state);this.save();this.showMenu('inventory');}
    else if(action==='retry'){retry(this.state);this.save();this.showMenu('');}
    else if(action==='reset')this.showMenu('reset');
    else if(action==='confirm-reset'){try{localStorage.removeItem(SAVE);this.saveNotice('No expedition saved');this.showMenu('start');}catch{this.saveNotice('Could not erase save · check browser storage permissions');}}
    else if(action==='resume')this.showMenu('');
    else if(action==='pause')this.showMenu('pause');
  }
  private showMenu(menu:string){
    if(this.menu==='start'&&menu!=='start')return;
    if(this.state.hp<=0&&menu!== 'start'&&menu!=='reset')menu='death';
    this.menu=menu;this.held.clear();this.pendingKeys.clear();this.actions=[];this.accumulator=0;
    const overlay=document.getElementById('overlay')!,panel=document.getElementById('panel')!;overlay.hidden=!menu;
    if(!menu){if(!document.hidden)this.game.loop.wake();this.game.canvas.focus();return;}
    const close='<div class="panel-actions"><button data-action="resume">Return to game</button></div>';
    if(menu==='start')panel.innerHTML=`<p class="sub">ONE CONTINUOUS EXPEDITION · CHOOSE YOUR LOADOUT</p><h2 id="panel-title">Beneath the Station</h2><p>Beyond the inspected cargo and the bells of passage, old foundations descend into the dark. Find a weapon, return to the forge, and open the monumental station gate, ascend through three further courts, and reach the upper watch.</p><div class="cards">${Object.entries(ARCHETYPES).map(([id,a])=>`<div class="card"><h3>${a.name}</h3><p>${id==='vanguard'?'A resilient close-range fighter. Broad sword cuts punish careless groups.':'A mobile fighter with greater endurance. A precise spear keeps threats at reach.'}</p><p>${a.maxHp} vitality · ${a.maxStamina} stamina<br>Starts with ${WEAPONS[a.weapon].name}</p><button data-action="start:${id}">Choose ${a.name}</button></div>`).join('')}</div><p class="sub">Both wear the same ordinary full-plate artwork. Neither wears true Warplate.</p><p>WASD move · F (or J) attacks in your last movement direction · click attacks toward the cursor · Space rolls · E interacts. Equipment and menus pause the expedition.</p>`;
    else if(menu==='inventory'){const s=this.state;panel.innerHTML=`<p class="sub">EQUIPMENT · ${s.currency} IRON MARKS</p><h2 id="panel-title">Choose your reach</h2><table class="equipment"><thead><tr><th>WEAPON</th><th>DAMAGE / CHANGE</th><th>STAMINA</th><th></th></tr></thead><tbody>${s.owned.map(id=>`<tr><td>${WEAPONS[id].name} +${s.levels[id]}<small>${WEAPONS[id].description}</small></td><td>${weaponDamage(s,id)} <small>${weaponDamage(s,id)-weaponDamage(s,s.equipped)>=0?'+':''}${weaponDamage(s,id)-weaponDamage(s,s.equipped)} vs equipped</small></td><td>${WEAPONS[id].cost}</td><td><button data-action="equip:${id}" ${s.equipped===id?'disabled':''}>${s.equipped===id?'Equipped':'Equip'}</button></td></tr>`).join('')}</tbody></table><p>Upgrades increase damage. The forge is beside your starting checkpoint. Maximum +2.</p><button data-action="upgrade" ${s.levels[s.equipped]>=2?'disabled':''}>Upgrade ${WEAPONS[s.equipped].name} · ${s.levels[s.equipped]>=2?'MAX':upgradeCost(s)+' marks'}</button><p>${s.message}</p>${close}`;}
    else if(menu==='death')panel.innerHTML='<p class="sub">THE UNDERWORKS ENDURE</p><h2 id="panel-title">Your watch is not over</h2><p>Return to the checkpoint with your equipment, upgrades and discoveries intact. Cleared foes stay defeated; your earned marks remain yours.</p><button data-action="retry">Rise at checkpoint</button>';
    else if(menu==='reset')panel.innerHTML='<h2 id="panel-title">Erase this expedition?</h2><p>This clears this browser’s saved equipment, upgrades, marks and discoveries. Your other games are unaffected.</p><div class="panel-actions"><button data-action="pause">Cancel</button><button class="danger" data-action="confirm-reset">Erase progress and choose again</button></div>';
    else if(menu==='help')panel.innerHTML='<p class="sub">READ THE WINDUP. LEAVE ROOM TO RECOVER.</p><h2 id="panel-title">Controls & survival</h2><div class="help-grid"><p><kbd>WASD / Arrows</kbd> Move & face</p><p><kbd>F / J</kbd> Attack in last movement direction</p><p><kbd>Left click</kbd> Aim & attack toward cursor</p><p><kbd>Space</kbd> Roll in movement direction</p><p><kbd>E</kbd> Use nearby landmark / loot</p><p><kbd>I</kbd> Equipment & upgrades</p><p><kbd>Esc</kbd> Pause / resume</p><p><kbd>H</kbd> This guide</p></div><p>Gold windups show an attack preparing; red enemy tells warn of danger. A roll costs stamina and briefly avoids damage, but cannot be chained without recovery. Rest at the checkpoint to heal; cleared foes stay defeated. Marks buy +1 and +2 upgrades at the forge. Find side caches and open the lower-ward shortcut. Pull the separate STATION GATE lever beside the northern arch; wait for the heavy leaves to fully withdraw. Follow the lamp-lit bends through the ascent and transfer court, rest at its checkpoint, then secure the upper watch exit.</p><p>Progress saves locally after actions and every two seconds. Reload returns to a safe checkpoint, not mid-combat. This prototype has no audio or touch controls.</p>'+close;
    else panel.innerHTML='<p class="sub">EXPEDITION PAUSED</p><h2 id="panel-title">A moment beneath the stone</h2><p>Your progress is stored in this browser. Equipment, upgrades and discoveries persist after death.</p><div class="panel-actions"><button data-action="resume">Continue expedition</button><button class="danger" data-action="reset">Reset saved progress</button></div>';
    if(menu!=='start')this.save();requestAnimationFrame(()=>panel.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
  }
  update(_time:number,delta:number){
    const updateStart=performance.now();
    const has=(...keys:string[])=>keys.some(key=>this.held.has(key)||this.pendingKeys.has(key));const input={x:Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')),y:Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp'))};
    if(!this.menu&&(input.x||input.y)){const length=Math.hypot(input.x,input.y);this.keyboardAim={x:input.x/length,y:input.y/length};}
    for(const action of this.actions.splice(0)){if(action==='Escape'&&this.menu!=='start')this.showMenu(this.menu?'':'pause');else if(action==='KeyI'&&this.menu!=='start')this.showMenu(this.menu==='inventory'?'':'inventory');else if(action==='KeyH'&&this.menu!=='start')this.showMenu(this.menu==='help'?'':'help');else if(!this.menu){if(action==='KeyF'||action==='KeyJ'){if(input.x||input.y){const length=Math.hypot(input.x,input.y);this.keyboardAim={x:input.x/length,y:input.y/length};}this.state.aim={...this.keyboardAim};attack(this.state);}if(action==='MouseAttack')attack(this.state);if(action==='Space')roll(this.state,input);if(action==='KeyE'){const smith=interactionHint(this.state).includes('Smith');interact(this.state);this.save();if(smith)this.showMenu('inventory');}}}
    input.x=Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft'));input.y=Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp'));
    if(!this.menu){const before={...this.state.position};this.accumulator+=Math.min(delta/1000,.1);while(this.accumulator>=STEP){tick(this.state,input,STEP);this.accumulator-=STEP;this.pendingKeys.clear();input.x=Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft'));input.y=Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp'));}this.moving=Math.hypot(this.state.position.x-before.x,this.state.position.y-before.y)>.001;this.facing=facingForInput(this.state.aim,this.facing);this.saveTimer+=delta/1000;if(this.saveTimer>2){this.save();this.saveTimer=0;}if(this.state.hp<=0)this.showMenu('death');}else this.moving=false;
    this.render();this.updateCost=performance.now()-updateStart;
  }
  private screenPosition():Point {const p=project(this.state.position);return {x:p.x-this.cameras.main.scrollX,y:p.y-this.cameras.main.scrollY};}
  private followPlayer(){
    const p=project(this.state.position),camera=this.cameras.main;
    // Keep the original courtyard framing; pan at a generous deadzone instead of shrinking actors.
    const x=p.x-camera.scrollX,y=p.y-camera.scrollY;
    camera.scrollX+=x<280?x-280:x>1000?x-1000:0;
    camera.scrollY+=y<240?y-240:y>630?y-630:0;
  }
  private render(){if(!this.view)return;this.followPlayer();this.view.drawAdventure(this.state,this.moving,this.facing);const s=this.state;const hint=interactionHint(s);const signature=[Math.ceil(s.hp),Math.ceil(s.stamina),s.equipped,s.currency,s.message,s.completed,s.gatePhase,Math.floor(s.position.y/640),hint].join('|');if(signature===this.lastHud)return;this.lastHud=signature;for(const [id,value,max] of [['health',s.hp,s.maxHp],['stamina',s.stamina,s.maxStamina]] as const){const meter=document.getElementById(id) as HTMLMeterElement;meter.max=max;meter.value=value;document.getElementById(id+'-label')!.textContent=`${Math.ceil(value)} / ${max}`;}document.getElementById('weapon-label')!.textContent=`${WEAPONS[s.equipped].name} +${s.levels[s.equipped]}`;document.getElementById('currency-label')!.textContent=`${s.currency} iron marks`;document.getElementById('message')!.textContent=s.message;document.getElementById('interaction')!.textContent=hint;const section=LEVEL_SECTIONS.find(section=>s.position.y>=section.y&&s.position.y<=section.y+section.height)??LEVEL_SECTIONS[0];document.getElementById('objective-text')!.textContent=s.completed?'Upper watch secured. Expedition complete. Explore remaining caches or replay using Reset.':s.gatePhase==='closed'?'Lower Ward · Find equipment and prepare at the forge. Pull the station gate lever beside the northern arch.':s.gatePhase!=='open'?'Station gate · The leaves are withdrawing. Wait for the passage to clear.':`${section.name} · ${section.id==='ward'?'Walk through the open station gate.':section.id==='ascent'?'Follow the lamp-lit bends into the transfer court.':section.id==='transfer'?'Find the checkpoint, then continue to the upper watch.':'Defeat the upper captain and secure the marked exit.'}`;}
}
