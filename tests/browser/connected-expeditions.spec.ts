import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import type {Adventure} from '../../src/core/adventure';
import type {ExpeditionId} from '../../src/core/expeditionCatalog';

/** ISOLATED FEATURE FIXTURES: prior progress is explicitly seeded in QA-v4 only.
 * Every seed roundtrips the real v4 validator; all gameplay after load uses native inputs.
 * These tests do NOT establish an unseeded station-to-annex combat walkthrough.
 */
const QA='virelden-underworks-qa-v4',QA_GOOD=`${QA}-good`,QA_PENDING=`${QA}-pending`;
type Point={x:number;y:number};
const state=(page:Page):Promise<any>=>page.evaluate(()=>(window as any).vireldenDebug!());
const approach=(stance:Point,landmark:Point)=>({x:stance.x+(landmark.x-stance.x)*.15,y:stance.y+(landmark.y-stance.y)*.15});
const projection=(p:Point)=>({x:640+(p.x-p.y)*.8,y:180+(p.x+p.y)*.4});
const projectedDistance=(a:Point,b:Point)=>{const p=projection(a),q=projection(b);return Math.hypot(p.x-q.x,p.y-q.y);};
const core=async()=>{
 // Dynamic loading occurs after Playwright's web server is ready. `npm test` must build these first.
 const [adventure,catalog,geometry,progression,rewards,saves]=await Promise.all([
  import('../../.test-build/core/adventure.js'),import('../../.test-build/core/expeditionCatalog.js'),
  import('../../.test-build/core/expeditionGeometry.js'),import('../../.test-build/core/progression.js'),
  import('../../.test-build/core/rewardCatalog.js'),import('../../.test-build/core/campaignSave.js'),
 ]);
 return {...adventure,...catalog,...geometry,...progression,...rewards,...saves};
};
async function seed(options:{area:ExpeditionId;living?:boolean;opened?:boolean;loot?:boolean;bossAlive?:boolean}){
 const c=await core(),s:Adventure=c.createAdventure('wayfarer');
 const defeat=(id:string)=>{const e=s.enemies.find(e=>e.id===id)!;e.hp=0;s.progression=c.awardReward(s.progression,`${s.areaId}:${id}`,c.CAMPAIGN_REWARDS);s.currency+=e.reward;};
 for(const enemy of s.enemies)defeat(enemy.id);
 s.gatePhase='open';s.gateProgress=1;s.progression=c.awardReward(s.progression,'station:gate-open',c.CAMPAIGN_REWARDS);
 s.checkpoint={x:480,y:-1000};c.captureArea(s);c.activateArea(s,'cistern-viaduct');
 const clearCurrent=(keepFinale=false)=>{for(const enemy of s.enemies)if(enemy.hp>0&&!(keepFinale&&enemy.kind==='captain'))defeat(enemy.id);};
 if(options.area==='record-annex'){clearCurrent();c.captureArea(s);c.activateArea(s,'record-annex');}
 if(!options.living)clearCurrent(options.bossAlive);
 if(options.loot){for(const loot of c.EXPEDITIONS[s.areaId].loot){s.position={...loot.stance};expect(c.interact(s),'seed uses real guarded loot transaction').toBe(true);}}
 if(options.opened){const lever=c.EXPEDITIONS[s.areaId].shortcuts[0];s.position={...lever.stance};expect(c.interact(s),'seed uses real lever transaction').toBe(true);for(let i=0;i<Math.ceil((lever.animationSeconds+.9)*60);i++)c.tick(s,{x:0,y:0},1/60);expect(s.shortcut).toBe(true);}
 c.captureArea(s);c.activateArea(s,options.area);const raw=c.prepareCampaignSave(s);expect(raw,'complete seeded v4 validates').not.toBeNull();
 const restored=c.readCampaignSave(raw!);expect(restored?.areaId).toBe(options.area);expect(restored?.progression).toEqual(s.progression);return {raw:raw!,initial:restored!,catalog:c.EXPEDITIONS[options.area]};
}
let sequence=0;
async function openSeeded(page:Page,options:Parameters<typeof seed>[0]){
 const fixture=await seed(options),token=`connected-v4-feature-${++sequence}`;
 await page.addInitScript(({raw,token,current,good,pending})=>{
  if(sessionStorage.getItem(token))return;
  localStorage.removeItem(good);localStorage.removeItem(pending);localStorage.setItem(current,raw);sessionStorage.setItem(token,'1');
 },{raw:fixture.raw,token,current:QA,good:QA_GOOD,pending:QA_PENDING});
 await page.goto('/?debug=1&qa=1');await page.waitForFunction(()=>typeof (window as any).vireldenDebug==='function');
 await expect.poll(async()=>(await state(page)).areaId).toBe(options.area);await expect.poll(async()=>(await state(page)).paused).toBe(false);
 await expect.poll(async()=>(await state(page)).character.texture).toBe('modular-plate');await page.locator('canvas').focus();
 await expect(page.locator('#save-status')).toContainText('QA save');return fixture;
}
async function hold(page:Page,keys:string[],ms:number){try{for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(ms);}finally{for(const key of keys)await page.keyboard.up(key);}}
function keysFor(dx:number,dy:number){const keys:string[]=[];if(Math.abs(dx)>Math.abs(dy)*.42)keys.push(dx>0?'KeyD':'KeyA');if(Math.abs(dy)>Math.abs(dx)*.42)keys.push(dy>0?'KeyS':'KeyW');return keys;}
/** Read-only planning consumes the same collision adapter; every motion is an actual browser key. */
async function walkTo(page:Page,target:Point){
 const c=await core(),initial=await state(page),grid=16;
 const clear=(a:Point,b:Point)=>{const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/3));for(let i=0;i<=n;i++)if(!c.adventureCanStand(initial,{x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;return true;};
 const safe=(p:Point)=>[[0,0],[5,0],[-5,0],[0,5],[0,-5]].every(([x,y])=>c.adventureCanStand(initial,{x:p.x+x,y:p.y+y}));
 const rounded={x:Math.round(initial.position.x/grid)*grid,y:Math.round(initial.position.y/grid)*grid};
 const starts=Array.from({length:25},(_,i)=>({x:rounded.x+(i%5-2)*grid,y:rounded.y+(Math.floor(i/5)-2)*grid})).filter(p=>safe(p)&&clear(initial.position,p)).sort((a,b)=>projectedDistance(initial.position,a)-projectedDistance(initial.position,b));
 expect(starts.length,'collision-safe native route entry').toBeGreaterThan(0);
 const start=starts[0],key=(p:Point)=>`${p.x},${p.y}`,queue=[start],parents=new Map<string,Point|null>([[key(start),null]]);let end:Point|null=null;
 for(let i=0;i<queue.length;i++){
  const a=queue[i];if(projectedDistance(a,target)<9&&clear(a,target)){end=a;break;}
  for(const [dx,dy] of [[grid,0],[-grid,0],[0,grid],[0,-grid]]){const b={x:a.x+dx,y:a.y+dy};if(!parents.has(key(b))&&safe(b)&&clear(a,b)){parents.set(key(b),a);queue.push(b);}}
 }
 expect(end,`native route to ${JSON.stringify(target)} in ${initial.areaId}`).not.toBeNull();
 const path:Point[]=[end!];while(parents.get(key(path[0])))path.unshift(parents.get(key(path[0]))!);path.push(target);
 // Retain the collision-safe grid corners. Quantized keyboard directions need not follow
 // a long mathematical sight line exactly and can otherwise graze circular rubble.
 const route=path;
 for(const waypoint of route){let reached=false;for(let n=0;n<200;n++){
  const s=await state(page);expect(s.hp,'seeded geometry fixture remains alive').toBeGreaterThan(0);expect(s.areaId).toBe(initial.areaId);
  const p=projection(s.position),q=projection(waypoint),dx=q.x-p.x,dy=q.y-p.y,distance=Math.hypot(dx,dy);if(distance<5){reached=true;break;}
  await hold(page,keysFor(dx,dy),Math.max(18,Math.min(65,distance/150*1000)));
 }expect(reached,`native approach ${JSON.stringify(waypoint)}`).toBe(true);}
 expect(c.adventureCanStand(await state(page),(await state(page)).position),'actual actor remains on active floor').toBe(true);
}
async function evidence(page:Page,name:string){
 const s=await state(page);await mkdir('test-results/connected-expeditions',{recursive:true});
 await page.screenshot({path:`test-results/connected-expeditions/${name}.png`,fullPage:true});
 const compact={fixture:'seeded valid-v4 isolated feature test; not an earned full walkthrough',areaId:s.areaId,position:s.position,checkpoint:s.checkpoint,hp:s.hp,arrivalGrace:s.arrivalGrace,paused:s.paused,camera:s.camera,screen:s.screen,shortcut:s.shortcut,shortcutAnimation:s.shortcutAnimation,completed:s.completed,owned:s.owned,levels:s.levels,currency:s.currency,progression:s.progression,areas:s.areas,expedition:s.expedition,enemyViews:s.enemyViews,character:{texture:s.character.texture,foot:s.character.foot,hand:s.character.hand,supportHand:s.character.supportHand,registration:s.character.registration,interaction:s.character.interaction,parts:s.character.parts?.length},enemies:s.enemies.map((e:any)=>({id:e.id,hp:e.hp,phase:e.phase,position:e.position})),projectiles:s.projectiles.length,timing:s.timing};
 await writeFile(`test-results/connected-expeditions/${name}.json`,JSON.stringify(compact,null,2));
}
async function normalKeys(page:Page){return page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('virelden-underworks-')&&!k.startsWith('virelden-underworks-qa-')).map(k=>[k,localStorage.getItem(k)]).sort());}
async function pixelAt(page:Page,world:Point){const s=await state(page),p=projection(world);return page.locator('canvas').evaluate((canvas,point)=>{const ctx=(canvas as HTMLCanvasElement).getContext('2d')!;const bytes=ctx.getImageData(Math.round(point.x),Math.round(point.y),5,5).data;const out=[0,0,0];for(let i=0;i<bytes.length;i+=4){out[0]+=bytes[i]/25;out[1]+=bytes[i+1]/25;out[2]+=bytes[i+2]/25;}return out;},{x:p.x-s.camera.x-2,y:p.y-s.camera.y-2});}
function assertEnemyPool(s:any,count:number){expect(s.enemyViews.length).toBeGreaterThanOrEqual(count);expect(s.enemyViews.length).toBeLessThanOrEqual(12);expect(s.enemyViews.filter((v:any)=>v.id!==null).map((v:any)=>v.id)).toEqual(s.enemies.map((e:any)=>e.id));expect(s.enemyViews.filter((v:any)=>v.id!==null)).toHaveLength(count);for(const v of s.enemyViews.slice(count)){expect(v.knightVisible).toBe(false);expect(v.archerVisible).toBe(false);expect(v.labelVisible).toBe(false);}}
function assertCamera(s:any){
 expect(s.screen.x).toBeGreaterThan(55);expect(s.screen.x).toBeLessThan(1225);expect(s.screen.y).toBeGreaterThan(110);expect(s.screen.y).toBeLessThan(740);
 const b=s.expedition.bounds;expect(s.camera.x).toBeGreaterThanOrEqual(b.x-1);expect(s.camera.y).toBeGreaterThanOrEqual(b.y-1);expect(s.camera.x+1280).toBeLessThanOrEqual(b.x+b.width+1);expect(s.camera.y+800).toBeLessThanOrEqual(b.y+b.height+1);
 expect(s.character.texture).toBe('modular-plate');expect(s.character.parts).toHaveLength(15);expect(s.character.foot.x).toBeCloseTo(projection(s.position).x,5);expect(s.character.foot.y).toBeCloseTo(projection(s.position).y,5);
}
test.use({trace:'off'});
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus){try{await evidence(page,`failed-${info.title.replace(/[^a-z0-9]+/gi,'-').slice(0,80)}`);}catch{/* startup errors retain Playwright failure evidence */}}});

for(const viewport of [{width:1280,height:900},{width:900,height:700}])for(const area of ['cistern-viaduct','record-annex'] as const){
 test(`seeded v4 ${area} exact geometry and camera at ${viewport.width}×${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);const fixture=await openSeeded(page,{area});const before=await normalKeys(page),s=await state(page);
  expect(s.enemies).toHaveLength(6);expect(s.expedition.areaId).toBe(area);expect(s.expedition.blackOffboard).toBe(true);
  for(const f of s.expedition.floors){const expected=fixture.catalog.floors.find((r:any)=>r.id===f.id);expect(f).toMatchObject({x:expected.x,y:expected.y,width:expected.width,height:expected.height,active:!expected.requires});}
  for(const w of s.expedition.walls){const expected=fixture.catalog.walls.find((r:any)=>r.id===w.id);expect(w).toMatchObject({x:expected.x,y:expected.y,width:expected.width,height:expected.height,active:true});}
  const points=area==='cistern-viaduct'?[{x:130,y:140},{x:840,y:840},{x:540,y:800}]:[{x:200,y:160},{x:840,y:130},{x:840,y:840}];
  for(const [i,target] of points.entries()){await walkTo(page,target);await page.waitForTimeout(180);assertCamera(await state(page));if(i===1)await evidence(page,`${area}-${viewport.width}-far-corner`);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await normalKeys(page)).toEqual(before);
 });
}

for(const area of ['cistern-viaduct','record-annex'] as const)test(`seeded v4 ${area} lever hand, paused partial reload and durable completed mechanism`,async({page})=>{
 const fixture=await openSeeded(page,{area}),lever=fixture.catalog.shortcuts[0];await walkTo(page,approach(lever.stance,lever.lever));
 const before=await state(page),normalBefore=await normalKeys(page),waterBefore=area==='cistern-viaduct'?await pixelAt(page,{x:500,y:580}):null,stillWater=area==='cistern-viaduct'?await pixelAt(page,{x:500,y:500}):null;
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>(window as any).vireldenDebug().shortcutAnimation?.phase==='pulling',undefined,{polling:'raf'});
 await page.keyboard.press('Escape');const frozen=await state(page);expect(frozen.shortcut).toBe(false);expect(frozen.shortcutAnimation.phase).toBe('pulling');
 const grip=frozen.expedition.lever[0],lp=projection(lever.lever),hand=frozen.character.hand;
 expect(grip.ground).toEqual(lp);expect(grip.base.socketOffset).toEqual({x:0,y:-20});expect(grip.base.width).toBeCloseTo(24.6967,3);
 expect(grip.hand.x).toBeCloseTo(lp.x-13+grip.pull*23,5);expect(grip.hand.y).toBeCloseTo(lp.y-43+grip.pull*13,5);
 expect(Math.hypot(hand.x-grip.hand.x,hand.y-grip.hand.y),'rendered gauntlet reaches actual moving grip').toBeLessThan(2);
 await page.waitForTimeout(300);const paused=await state(page);expect(paused.shortcutAnimation).toEqual(frozen.shortcutAnimation);expect(paused.expedition.lever).toEqual(frozen.expedition.lever);expect(paused.character.hand).toEqual(hand);await evidence(page,`${area}-pull-paused`);
 await page.reload();await page.waitForFunction(()=>typeof (window as any).vireldenDebug==='function');expect((await state(page)).shortcut).toBe(false);expect((await state(page)).shortcutAnimation).toBeNull();expect((await state(page)).position).toEqual(fixture.initial.checkpoint);
 await walkTo(page,approach(lever.stance,lever.lever));
 const reachSamples=page.evaluate(()=>new Promise<{pull:number;error:number;hand:Point;grip:Point}[]>((resolve,reject)=>{
  const samples:{pull:number;error:number;hand:Point;grip:Point}[]=[],deadline=performance.now()+5000;
  const sample=()=>{const s=(window as any).vireldenDebug(),animation=s.shortcutAnimation;
   if(animation?.phase==='pulling'){const grip=s.expedition.lever[0],hand=s.character.hand;samples.push({pull:grip.pull,error:Math.hypot(hand.x-grip.hand.x,hand.y-grip.hand.y),hand,grip:grip.hand});}
   if(animation?.phase==='opening')return resolve(samples);
   if(performance.now()>deadline)return reject(Error('Full rendered service-lever pull was not observed'));
   requestAnimationFrame(sample);
  };requestAnimationFrame(sample);
 }));
 await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).shortcutAnimation?.phase).toBe('opening');
 const reached=await reachSamples;expect(reached.length).toBeGreaterThan(8);expect(Math.min(...reached.map(s=>s.pull))).toBeLessThan(.15);expect(Math.max(...reached.map(s=>s.pull))).toBeGreaterThan(.85);expect(Math.max(...reached.map(s=>s.error)),'actual hand/grip registration through entire pull').toBeLessThan(2);
 await mkdir('test-results/connected-expeditions',{recursive:true});await writeFile(`test-results/connected-expeditions/${area}-lever-reach-samples.json`,JSON.stringify(reached,null,2));await page.keyboard.press('Escape');const opening=await state(page);expect(opening.shortcutAnimation.progress).toBeLessThan(1);expect(opening.shortcut).toBe(false);
 await page.waitForTimeout(250);expect((await state(page)).shortcutAnimation).toEqual(opening.shortcutAnimation);await evidence(page,`${area}-opening-paused`);await page.keyboard.press('Escape');
 await expect.poll(async()=>(await state(page)).shortcut,{timeout:8_000}).toBe(true);expect((await state(page)).shortcutAnimation).toBeNull();
 if(area==='cistern-viaduct'){
  const open=await state(page);expect(open.expedition.floors.find((f:any)=>f.id==='return-bridge').active).toBe(true);expect(open.expedition.hazards[0].texture).toContain('-open');
  const bridgeAfter=await pixelAt(page,{x:500,y:580}),waterAfter=await pixelAt(page,{x:500,y:500});expect(Math.hypot(...bridgeAfter.map((n,i)=>n-waterBefore![i])),'bridge surface replaces dark water in rendered canvas').toBeGreaterThan(12);expect(Math.hypot(...waterAfter.map((n,i)=>n-stillWater![i])),'water outside bridge is unchanged').toBeLessThan(8);
  await walkTo(page,{x:500,y:580});expect((await state(page)).position.x).toBeGreaterThan(450);await evidence(page,'cistern-open-bridge-crossing');
 }else{expect((await state(page)).expedition.walls.find((w:any)=>w.id==='return-shutter').active).toBe(false);await walkTo(page,{x:840,y:560});await evidence(page,'annex-open-shutter-crossing');}
 await page.keyboard.press('Escape');await page.reload();await page.waitForFunction(()=>typeof (window as any).vireldenDebug==='function');const restored=await state(page);expect(restored.shortcut).toBe(true);expect(restored.shortcutAnimation).toBeNull();expect(restored.progression).toEqual(before.progression);expect(restored.currency).toBe(before.currency);expect(await normalKeys(page)).toEqual(normalBefore);await evidence(page,`${area}-durable-open-reload`);
});

test('seeded v4 native return ports retain inactive area facts and global gear, without station ghost views',async({page})=>{
 const fixture=await openSeeded(page,{area:'cistern-viaduct',opened:true,loot:true}),original=await state(page),returnPort=fixture.catalog.exits.find((e:any)=>e.target==='station');
 expect(original.enemies).toHaveLength(6);assertEnemyPool(original,6);
 await walkTo(page,approach(returnPort.stance,returnPort.position));await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).areaId).toBe('station');const station=await state(page);expect(station.enemies).toHaveLength(12);assertEnemyPool(station,12);expect(station.expedition.areaId).toBe('station');
 const c=await core();await walkTo(page,approach(c.STATION_EXPEDITION_PORT.stance,c.STATION_EXPEDITION_PORT.position));await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).areaId).toBe('cistern-viaduct');const back=await state(page);
 expect(back.enemies).toHaveLength(6);assertEnemyPool(back,6);expect(back.owned).toEqual(original.owned);expect(back.equipment).toEqual(original.equipment);expect(back.levels).toEqual(original.levels);expect(back.progression).toEqual(original.progression);expect(back.currency).toBe(original.currency);expect(back.shortcut).toBe(true);expect(back.looted).toEqual(original.looted);expect(back.projectiles).toHaveLength(0);await evidence(page,'native-return-port-state-and-views');
});

test('seeded v4 native annex backtrack and return secure once without teleporting or duplicating XP',async({page})=>{
 const fixture=await openSeeded(page,{area:'record-annex',loot:true}),initial=await state(page),c=await core();
 const annexReturn=fixture.catalog.exits.find((e:any)=>e.target==='cistern-viaduct');
 const visitCistern=async()=>{await walkTo(page,approach(annexReturn.stance,annexReturn.position));await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).areaId).toBe('cistern-viaduct');};
 const returnAnnex=async()=>{const port=c.EXPEDITIONS['cistern-viaduct'].exits.find((e:any)=>e.target==='record-annex');await walkTo(page,approach(port.stance,port.position));await page.keyboard.press('KeyE');};
 await visitCistern();assertEnemyPool(await state(page),6);expect((await state(page)).areas['record-annex'].looted).toEqual(initial.looted);
 await returnAnnex();const secured=await state(page);expect(secured.areaId,'secure action must not teleport').toBe('cistern-viaduct');expect(secured.completed).toBe(true);expect(secured.progression.xp).toBe(initial.progression.xp+40);expect(secured.currency).toBe(initial.currency+25);
 await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).areaId).toBe('record-annex');const back=await state(page);expect(back.owned).toEqual(initial.owned);expect(back.equipment).toEqual(initial.equipment);expect(back.looted).toEqual(initial.looted);expect(back.projectiles).toHaveLength(0);assertEnemyPool(back,6);
 await visitCistern();await returnAnnex();await expect.poll(async()=>(await state(page)).areaId).toBe('record-annex');const repeated=await state(page);expect(repeated.progression).toEqual(back.progression);expect(repeated.currency).toBe(back.currency);expect(repeated.areas['cistern-viaduct'].completed).toBe(true);await evidence(page,'native-annex-backtrack-once-only-secure');
});

for(const area of ['cistern-viaduct','record-annex'] as const)test(`seeded v4 ${area} living arrival has grace and no immediate hostile windup`,async({page})=>{
 await openSeeded(page,{area,living:true});const initial=await state(page);expect(initial.arrivalGrace).toBeGreaterThan(0);expect(initial.enemies.filter((e:any)=>e.hp>0)).toHaveLength(6);expect(initial.projectiles).toHaveLength(0);
 await hold(page,['KeyW','KeyD'],550);const protectedState=await state(page);expect(protectedState.arrivalGrace).toBeGreaterThan(0);expect(protectedState.hp).toBe(initial.hp);expect(protectedState.projectiles).toHaveLength(0);expect(protectedState.enemies.every((e:any)=>e.phase!=='windup')).toBe(true);
 await page.keyboard.press('Escape');const pausedGrace=(await state(page)).arrivalGrace;await page.waitForTimeout(200);expect((await state(page)).arrivalGrace).toBe(pausedGrace);await evidence(page,`${area}-safe-arrival-grace`);
});

test('seeded v4 guarded pre-finale poleaxe can be discovered, equipped, attacked and restored after verified two-hand acceptance',async({page})=>{
 const fixture=await openSeeded(page,{area:'record-annex',bossAlive:true}),loot=fixture.catalog.loot.find((l:any)=>l.reward.weapon==='poleaxe');
 expect((await state(page)).owned).not.toContain('poleaxe');await walkTo(page,loot.stance);expect((await state(page)).enemies.find((e:any)=>e.id==='annex-keeper').hp).toBeGreaterThan(0);await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).owned).toContain('poleaxe');expect((await state(page)).equipment.owned).toContain('marcher-chest');
 await page.keyboard.press('KeyI');await page.getByRole('button',{name:'Weapons',exact:true}).click({timeout:5_000});await page.locator('[data-focus="weapon-poleaxe"]').click({timeout:5_000});await expect(page.getByRole('button',{name:'Equip weapon',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Equip weapon',exact:true}).click({timeout:5_000});expect((await state(page)).equipped).toBe('poleaxe');await page.keyboard.press('Escape');
 await page.keyboard.press('KeyF');await expect.poll(async()=>(await state(page)).attack.phase).toBe('active');const attacking=await state(page);expect(attacking.attack.weapon).toBe('poleaxe');expect(attacking.character.rig.texture).toBe('ordinary-weapon-poleaxe');for(const [hand,grip] of [['primaryHand','primaryGrip'],['supportHand','supportGrip']]){const a=attacking.character.registration[hand],b=attacking.character.registration[grip];expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeLessThan(.05);}expect(attacking.enemies.find((e:any)=>e.id==='annex-keeper').hp).toBeGreaterThan(0);await evidence(page,'poleaxe-discovered-equipped-active-before-finale');await expect.poll(async()=>(await state(page)).attack.phase).toBe('idle');
 await page.keyboard.press('Escape');await page.reload();await page.waitForFunction(()=>typeof (window as any).vireldenDebug==='function');const restored=await state(page);expect(restored.equipped).toBe('poleaxe');expect(restored.looted).toContain(loot.id);expect(restored.position).toEqual(restored.checkpoint);expect(restored.enemies.find((e:any)=>e.id==='annex-keeper').hp).toBeGreaterThan(0);await evidence(page,'poleaxe-pre-finale-validated-save-restored');
});
