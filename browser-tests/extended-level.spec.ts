import {movementKeys,spearSpacing,retreatBlocked} from './native-steering';
import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const state=(page:Page)=>page.evaluate(()=>window.vireldenDebug!());
// Explicit phase images and compact state are sufficient; per-input tracing bloats full-route evidence.
test.use({trace:'off'});
test.afterEach(async({page},info)=>{if(info.status===info.expectedStatus)return;try{const s=await state(page),failure={test:info.title,position:s.position,hp:s.hp,gatePhase:s.gatePhase,gateProgress:s.gateProgress,paused:s.paused,attack:s.attack,checkpoint:s.checkpoint,time:s.time,enemies:s.enemies.map(e=>({id:e.id,hp:e.hp,position:e.position,phase:e.phase}))};console.log('EXTENDED_FAILURE_STATE '+JSON.stringify(failure));await info.attach('failure-state',{body:Buffer.from(JSON.stringify(failure,null,2)),contentType:'application/json'});await page.screenshot({path:info.outputPath('failure-state.png'),fullPage:true});}catch(error){console.log('Failure state unavailable',String(error));}});
async function open(page:Page){await page.goto('/?debug=1&qa=1');await page.getByRole('button',{name:'Choose Wayfarer',exact:true}).click();await expect(page.locator('#save-status')).toContainText('QA save');}
async function hold(page:Page,keys:string[],ms:number){for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);}

test('F and J use keyboard heading while moving and after release, never a stale cursor',async({page})=>{
 await open(page);const before=await state(page),box=await page.locator('canvas').boundingBox();expect(box).not.toBeNull();
 // Put the pointer on the right, then move/attack left without another pointer event.
 await page.mouse.move(box!.x+(before.screen.x+150)/1280*box!.width,box!.y+before.screen.y/800*box!.height);
 await page.keyboard.down('KeyA');await page.waitForTimeout(80);await page.keyboard.press('KeyF');
 await expect.poll(async()=>(await state(page)).attack.phase).not.toBe('idle');
 expect((await state(page)).attack.aim).toMatchObject({x:-1,y:0});
 await page.keyboard.up('KeyA');await expect.poll(async()=>(await state(page)).attack.phase).toBe('idle');
 await page.keyboard.press('KeyJ');await expect.poll(async()=>(await state(page)).attack.phase).not.toBe('idle');
 expect((await state(page)).attack.aim).toMatchObject({x:-1,y:0});
 await expect.poll(async()=>(await state(page)).attack.phase).toBe('idle');
 // Mouse click remains a deliberately separate aimed attack.
 const s=await state(page);await page.mouse.click(box!.x+(s.screen.x+150)/1280*box!.width,box!.y+s.screen.y/800*box!.height);
 await expect.poll(async()=>(await state(page)).attack.phase).not.toBe('idle');expect((await state(page)).attack.aim.x).toBeCloseTo(1,2);
 await expect.poll(async()=>(await state(page)).attack.phase).toBe('idle');
 await page.keyboard.press('KeyF');await expect.poll(async()=>(await state(page)).attack.phase).not.toBe('idle');expect((await state(page)).attack.aim.x).toBe(-1);
 await page.screenshot({path:'test-results/extended-keyboard-attack.png',fullPage:true});
});

// Read-only path planning; movement and interactions exclusively use native browser keys.
async function walkTo(page:Page,target:{x:number;y:number},combat=false){
 const {adventureCanStand}=await import('../src/core/adventure');const initial=await state(page),grid=16;
 const safe=(p:{x:number;y:number})=>[[0,0],[3,0],[-3,0],[0,3],[0,-3]].every(([x,y])=>adventureCanStand(initial,{x:p.x+x,y:p.y+y}));
 const blocked=!adventureCanStand(initial,target),atTarget=(p:{x:number;y:number})=>blocked?Math.hypot((p.x-target.x-p.y+target.y)*.8,(p.x-target.x+p.y-target.y)*.4)<29:Math.hypot(p.x-target.x,p.y-target.y)<18;
 const rounded={x:Math.round(initial.position.x/grid)*grid,y:Math.round(initial.position.y/grid)*grid};
 const starts=Array.from({length:25},(_,i)=>({x:rounded.x+(i%5-2)*grid,y:rounded.y+(Math.floor(i/5)-2)*grid})).filter(p=>safe(p)&&Array.from({length:20},(_,i)=>{const f=(i+1)/20;return adventureCanStand(initial,{x:initial.position.x+(p.x-initial.position.x)*f,y:initial.position.y+(p.y-initial.position.y)*f});}).every(Boolean)).sort((a,b)=>Math.hypot(a.x-initial.position.x,a.y-initial.position.y)-Math.hypot(b.x-initial.position.x,b.y-initial.position.y));
 expect(starts.length,'collision-safe grid entry near current position').toBeGreaterThan(0);const roundedHasExit=adventureCanStand(initial,rounded)&&[[grid,0],[-grid,0],[0,grid],[0,-grid]].some(([x,y])=>safe({x:rounded.x+x,y:rounded.y+y}));const start=roundedHasExit?rounded:starts[0];const key=(p:{x:number;y:number})=>`${p.x},${p.y}`;
 const queue=[start],parents=new Map<string,string|null>([[key(start),null]]);let end=start;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(atTarget(p)){end=p;break;}for(const [dx,dy]of [[grid,0],[-grid,0],[0,grid],[0,-grid]]){const q={x:p.x+dx,y:p.y+dy};if(!parents.has(key(q))&&safe(q)){parents.set(key(q),key(p));queue.push(q);}}}
 expect(atTarget(end),'native route has connected collision-safe approach').toBe(true);const route:{x:number;y:number}[]=[];let k:string|null=key(end);while(k){const [x,y]=k.split(',').map(Number);route.unshift({x,y});k=parents.get(k)??null;}
 const corners=route; // Retain grid waypoints: diagonal keys must not cut long obstacle corners.

 for(const p of corners){let reached=false;for(let step=0;step<150;step++){if(combat){const before=(await state(page)).position;await clearThreats(page);const after=(await state(page)).position;if(Math.hypot(after.x-before.x,after.y-before.y)>10)return walkTo(page,target,combat);}const s=await state(page);expect(s.hp,'alive traversing native route').toBeGreaterThan(0);const dx=(p.x-s.position.x-p.y+s.position.y)*.8,dy=(p.x-s.position.x+p.y-s.position.y)*.4;if(Math.hypot(dx,dy)<7){reached=true;break;}const keys=movementKeys(dx,dy);await hold(page,keys,Math.max(20,Math.min(70,Math.hypot(dx,dy)/150*1000)));}expect(reached,'native movement reaches route corner').toBe(true);}
}

/** Reach the legal operating side through actual keys, not the solid lever prop. */
async function approachGate(page:Page){
 const {adventureCanStand}=await import('../src/core/adventure');const {STATION_GATE}=await import('../src/core/level');
 const approach={x:560,y:115},initial=await state(page);
 expect(adventureCanStand(initial,approach),'operating-side route target is collision-valid').toBe(true);
 await walkTo(page,approach,true);
 await expect.poll(async()=>{const s=await state(page);return s.attack.phase==='idle'&&s.rollTimer===0;}).toBe(true);
 const arrived=await state(page),from=arrived.position,to=STATION_GATE.stance;
 const points=Array.from({length:65},(_,i)=>({x:from.x+(to.x-from.x)*i/64,y:from.y+(to.y-from.y)*i/64}));
 expect(points.every(p=>adventureCanStand(arrived,p)),'actual native arrival has a clear visible alignment to the operating stance').toBe(true);
}

test('monumental gate blocks native movement, animates once, pauses and reloads safely',async({page})=>{
 test.setTimeout(240_000);await open(page);
 await walkTo(page,{x:485,y:55},true);
 // World north is screen north-east: this held combination pushes into the gate.
 await hold(page,['KeyW','KeyD'],450);expect((await state(page)).position.y).toBeGreaterThanOrEqual(28);
 await page.screenshot({path:'test-results/extended-gate-closed.png',fullPage:true});
 await approachGate(page);const before=await state(page);
 const approachPNG=await page.locator('canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).toDataURL());
 await writeFile('test-results/extended-gate-operating-approach.png',Buffer.from(approachPNG.split(',')[1],'base64'));
 const pullingFrame=page.evaluate(()=>new Promise<{png:string;state:ReturnType<NonNullable<Window['vireldenDebug']>>;samples:{time:number;phase:string;position:{x:number;y:number}}[]}>((resolve,reject)=>{const deadline=performance.now()+4000,samples:{time:number;phase:string;position:{x:number;y:number}}[]=[];const sample=()=>{const state=window.vireldenDebug!();samples.push({time:state.time,phase:state.gatePhase,position:{...state.position}});if(state.gatePhase==='pulling'&&state.interactionTimer<.5)return resolve({png:document.querySelector('canvas')!.toDataURL(),state,samples});if(performance.now()>deadline)return reject(new Error('Rendered lever-pulling phase missing'));requestAnimationFrame(sample);};requestAnimationFrame(sample);}));
 await page.keyboard.press('KeyE');
 await expect.poll(async()=>(await state(page)).gatePhase).toBe('pulling');
 const pull=await state(page);expect(pull.gate.width).toBe(520);expect(pull.gate.architectureScale).toBe(before.gate.architectureScale);await hold(page,['KeyS'],100);expect((await state(page)).position).toEqual(pull.position);
 const pulledFrame=await pullingFrame;await writeFile('test-results/extended-gate-pull-phase.png',Buffer.from(pulledFrame.png.split(',')[1],'base64'));await writeFile('test-results/extended-gate-pull-phase.json',JSON.stringify(pulledFrame.state,null,2));
 const planted=pulledFrame.samples.filter(s=>s.phase==='pulling');expect(planted.length).toBeGreaterThan(1);
 for(const s of planted)expect(Math.hypot(s.position.x-planted[0].position.x,s.position.y-planted[0].position.y),'actual pull root remains fixed').toBeLessThan(1e-6);
 for(let i=1;i<pulledFrame.samples.length;i++){const a=pulledFrame.samples[i-1],b=pulledFrame.samples[i],x=b.position.x-a.position.x,y=b.position.y-a.position.y;expect(Math.hypot((x-y)*.8,(x+y)*.4),'visible approach never teleports beyond normal root speed').toBeLessThanOrEqual(150*(b.time-a.time)+1e-5);}
 await writeFile('test-results/extended-gate-operating-trajectory.json',JSON.stringify({before:before.position,samples:pulledFrame.samples},null,2));
 await page.screenshot({path:'test-results/extended-gate-pull.png',fullPage:true});
 await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).gatePhase).toBe('opening');
 await page.keyboard.press('Escape');const frozen=await state(page);expect(frozen.gateProgress).toBeLessThan(1);await page.waitForTimeout(250);
 expect((await state(page)).gateProgress).toBe(frozen.gateProgress);expect((await state(page)).gate.architectureScale).toBe(before.gate.architectureScale);expect((await state(page)).currency).toBe(before.currency);
 await page.screenshot({path:'test-results/extended-gate-opening-paused.png',fullPage:true});
 await page.reload();await page.waitForFunction(()=>typeof window.vireldenDebug==='function');
 expect(await state(page)).toMatchObject({gatePhase:'closed',gateProgress:0,position:{x:320,y:320}});
 await approachGate(page);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).gatePhase).toBe('open');
 const endPNG=await page.locator('canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).toDataURL());await writeFile('test-results/extended-gate-operating-end.png',Buffer.from(endPNG.split(',')[1],'base64'));
 await page.keyboard.press('KeyE');await walkTo(page,{x:485,y:-110},true);expect((await state(page)).position.y).toBeLessThan(-70);
 await page.screenshot({path:'test-results/extended-gate-walkthrough.png',fullPage:true});
 await page.keyboard.press('Escape');await page.reload();await page.waitForFunction(()=>typeof window.vireldenDebug==='function');expect((await state(page)).gatePhase).toBe('open');
});

const combatMetrics=new WeakMap<Page,{attackInputs:number;damagingSamples:number;observedDamage:number;hp:Map<string,number>}>();
async function clearThreats(page:Page){
 const {adventureCanStand}=await import('../src/core/adventure');let stuckRetreat=false;
 for(let turn=0;turn<650;turn++){
  const s=await state(page);expect(s.hp,'survive native spear combat').toBeGreaterThan(0);
  let metrics=combatMetrics.get(page);if(!metrics){metrics={attackInputs:0,damagingSamples:0,observedDamage:0,hp:new Map()};combatMetrics.set(page,metrics);}for(const e of s.enemies){const prior=metrics.hp.get(e.id);if(prior!==undefined&&e.hp<prior){metrics.damagingSamples++;metrics.observedDamage+=prior-e.hp;}metrics.hp.set(e.id,e.hp);}
  const visible=s.enemies.filter(e=>e.hp>0).map(e=>({e,dx:(e.position.x-s.position.x-e.position.y+s.position.y)*.8,dy:(e.position.x-s.position.x+e.position.y-s.position.y)*.4})).filter(t=>Math.hypot(t.dx,t.dy)<220&&Array.from({length:19},(_,i)=>{const f=(i+1)/20;return adventureCanStand(s,{x:s.position.x+(t.e.position.x-s.position.x)*f,y:s.position.y+(t.e.position.y-s.position.y)*f});}).every(Boolean)).sort((a,b)=>Math.hypot(a.dx,a.dy)-Math.hypot(b.dx,b.dy));
  if(!visible.length)return;const t=visible[0],distance=Math.hypot(t.dx,t.dy);
  if(s.attack.phase!=='idle'){await page.waitForTimeout(65);continue;}
  // Close through a fired arrow with the real roll iframe; far-away circling never reaches spear range.
  const imminent=t.e.kind!=='watcher'&&t.e.phase==='windup'&&t.e.timer<.3&&distance<(t.e.kind==='captain'?88:68);
  const incoming=s.projectiles.some(p=>Math.hypot((p.position.x-s.position.x-p.position.y+s.position.y)*.8,(p.position.x-s.position.x+p.position.y-s.position.y)*.4)<55);
  if((imminent||incoming)&&s.stamina>=28&&s.rollCooldown===0&&s.rollTimer===0){const keys=t.e.kind==='watcher'?movementKeys(t.dx,t.dy):[Math.abs(t.dx)>Math.abs(t.dy)?(t.dy>=0?'KeyW':'KeyS'):(t.dx>=0?'KeyA':'KeyD')];for(const k of keys)await page.keyboard.down(k);await page.keyboard.press('Space');await page.waitForTimeout(100);for(const k of keys)await page.keyboard.up(k);continue;}
  const spacing=spearSpacing(distance,stuckRetreat);
  if(spacing){const before={...s.position},keys=movementKeys(t.dx,t.dy,spacing);await hold(page,keys,65);const after=(await state(page)).position;stuckRetreat=retreatBlocked(distance,before,after);}
  else if(s.stamina>=20){metrics.attackInputs++;const box=await page.locator('canvas').boundingBox();expect(box).not.toBeNull();await page.mouse.click(box!.x+(s.screen.x+t.dx)/1280*box!.width,box!.y+(s.screen.y+t.dy)/800*box!.height);await page.waitForTimeout(65);}else await page.waitForTimeout(65);
 }
 throw new Error('Native combat failed to clear visible threats within bounded encounter window');
}

test('native expedition traverses four populated sections, rests and earns upper-watch completion',async({page})=>{
 test.setTimeout(900_000);await open(page);const wallStarted=Date.now();let priorSimulationSeconds=0;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const {CHECKPOINTS,FINISH}=await import('../src/core/level');
 // Acquire marks and temper the actual starting spear before the extended route.
 await walkTo(page,{x:150,y:420});await page.keyboard.press('KeyE');await walkTo(page,{x:260,y:330});await page.keyboard.press('KeyE');
 // Exercise the real controlled panel; a missing control must fail promptly, not consume the route budget.
 const beforeForge=await state(page);expect(beforeForge.equipped).toBe('spear');expect(beforeForge.currency).toBeGreaterThanOrEqual(30);
 await page.getByRole('button',{name:'Weapons',exact:true}).click({timeout:5_000});
 await page.getByRole('button',{name:'Improve for 30 marks',exact:true}).click({timeout:5_000});
 await expect.poll(async()=>(await state(page)).levels.spear).toBe(1);expect((await state(page)).currency).toBe(beforeForge.currency-30);
 await page.keyboard.press('Escape');await expect.poll(async()=>(await state(page)).paused).toBe(false);
 await walkTo(page,{x:320,y:320});await page.keyboard.press('KeyE');
 let deaths=0,lastDeathCleared=0;
 while(!(await state(page)).completed){
  try{
   let current=await state(page);
   if(current.gatePhase==='closed'){await approachGate(page);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).gatePhase).toBe('open');}
   if((await state(page)).checkpoint.y>=0){
    // Backtracking is real movement; surviving enemies may pursue, so retain defensive combat.
    await walkTo(page,{x:320,y:320},true);await page.keyboard.press('KeyE');await walkTo(page,{x:485,y:-110},true);
    for(const [label,target]of [['ascent',{x:485,y:-400}],['transfer',{x:130,y:-770}],['transfer-bow-turn',{x:470,y:-850}],['checkpoint',CHECKPOINTS[1]]] as const){await walkTo(page,target,true);await page.screenshot({path:`test-results/extended-route-${label}.png`,fullPage:true});console.log('ROUTE_SECTION '+JSON.stringify({label,hp:(await state(page)).hp,deaths,wallSeconds:(Date.now()-wallStarted)/1000,simulationSeconds:priorSimulationSeconds+(await state(page)).time,attackInputs:combatMetrics.get(page)?.attackInputs}));}
    await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).checkpoint).toEqual(CHECKPOINTS[1]);expect((await state(page)).hp).toBe(100);
    priorSimulationSeconds+=(await state(page)).time;await page.reload();await page.waitForFunction(()=>typeof window.vireldenDebug==='function');expect((await state(page)).position).toEqual(CHECKPOINTS[1]);expect((await state(page)).gatePhase).toBe('open');
   }
   for(const target of [{x:500,y:-1380},{x:125,y:-1670},FINISH])await walkTo(page,target,true);
   await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).completed).toBe(true);expect((await state(page)).enemies.find(e=>e.id==='upper-captain')!.hp).toBe(0);
  }catch(error){
   const fallen=await state(page);if(fallen.hp>0)throw error;
   const cleared=fallen.enemies.filter(e=>e.hp===0).map(e=>e.id);deaths++;
   console.log('ROUTE_DEATH '+JSON.stringify({deaths,position:fallen.position,cleared,currency:fallen.currency,wallSeconds:(Date.now()-wallStarted)/1000,simulationSeconds:priorSimulationSeconds+fallen.time,attackInputs:combatMetrics.get(page)?.attackInputs}));
   expect(deaths,'bounded real expedition retries').toBeLessThanOrEqual(4);expect(cleared.length,'each death must still advance durable encounter progress').toBeGreaterThan(lastDeathCleared);lastDeathCleared=cleared.length;
   await page.getByRole('button',{name:'Rise at checkpoint',exact:true}).click();const risen=await state(page);
   expect(risen.hp).toBe(risen.maxHp);expect(risen.position).toEqual(fallen.checkpoint);expect(risen.currency).toBe(fallen.currency);expect(risen.owned).toEqual(fallen.owned);expect(risen.levels).toEqual(fallen.levels);expect(risen.equipped).toBe(fallen.equipped);expect(risen.enemies.filter(e=>e.hp===0).map(e=>e.id)).toEqual(cleared);
  }
 }
 console.log('ROUTE_COMPLETE '+JSON.stringify({deaths,wallSeconds:(Date.now()-wallStarted)/1000,simulationSeconds:priorSimulationSeconds+(await state(page)).time,cleared:(await state(page)).enemies.filter(e=>e.hp===0).length,attackInputs:combatMetrics.get(page)?.attackInputs,damagingSamples:combatMetrics.get(page)?.damagingSamples,observedDamage:combatMetrics.get(page)?.observedDamage}));
 expect((await state(page)).enemies.filter(e=>e.hp===0).length).toBeGreaterThanOrEqual(8);await page.screenshot({path:'test-results/extended-route-complete.png',fullPage:true});
 await page.keyboard.press('Escape');await page.reload();await page.waitForFunction(()=>typeof window.vireldenDebug==='function');expect((await state(page)).completed).toBe(true);expect(errors).toEqual([]);
});

test('bow lookout visibly readies, draws, releases a shaped arrow and deals projectile damage',async({page})=>{
 test.setTimeout(35_000);await open(page);
 const capture=page.evaluate(()=>new Promise<Record<string,{png:string;state:ReturnType<NonNullable<Window['vireldenDebug']>>}>>((resolve,reject)=>{
  const frames:Record<string,{png:string;state:ReturnType<NonNullable<Window['vireldenDebug']>>}>={},deadline=performance.now()+25_000;let releaseTime=0;
  const save=(label:string,s:ReturnType<NonNullable<Window['vireldenDebug']>>)=>{if(!frames[label])frames[label]={png:document.querySelector('canvas')!.toDataURL(),state:s};};
  const sample=()=>{const s=window.vireldenDebug!(),a=s.archers.find(a=>a.index===1);if(a?.bowVisible){if(a.pose===0)save('ready',s);if(a.pose===1)save('draw',s);if(a.pose===2&&s.projectiles.length){save('release',s);if(!releaseTime)releaseTime=performance.now();}if(releaseTime&&performance.now()-releaseTime>90&&s.projectiles.length)save('flight',s);}
   if(['ready','draw','release','flight'].every(k=>frames[k]))return resolve(frames);if(performance.now()>deadline)return reject(new Error('Bow or arrow rendered phases missing'));requestAnimationFrame(sample);};requestAnimationFrame(sample);
 }));
 await walkTo(page,{x:420,y:300});const frames=await capture;
 await mkdir('test-results/archer',{recursive:true});for(const [phase,f]of Object.entries(frames)){await writeFile(`test-results/archer/${phase}.png`,Buffer.from(f.png.split(',')[1],'base64'));await writeFile(`test-results/archer/${phase}.json`,JSON.stringify(f.state,null,2));}
 expect(frames.draw.state.archers.find(a=>a.index===1)!.texture).toBe('station-archer');
 expect(frames.draw.png).not.toBe(frames.ready.png);expect(frames.release.png).not.toBe(frames.draw.png);
 const {archerProjectileOrigin}=await import('../src/core/archerRig');const source=frames.release.state.enemies[1],origin=archerProjectileOrigin(source.position,source.aim),arrow=frames.release.state.projectiles[0];expect(Math.hypot((arrow.position.x-origin.x-arrow.position.y+origin.y)*.8,(arrow.position.x-origin.x+arrow.position.y-origin.y)*.4),'arrow emerges at the drawn bow socket').toBeLessThan(12);
 expect(frames.release.state.projectiles.length).toBeGreaterThan(0);expect(frames.flight.state.projectiles[0].position).not.toEqual(frames.release.state.projectiles[0].position);
 await expect.poll(async()=>(await state(page)).hp,{timeout:8_000}).toBeLessThan(100);
});
