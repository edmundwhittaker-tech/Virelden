import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const snapshot=(page:Page)=>page.evaluate(()=>(window as any).wholeEnemyFixtureSnapshot());
for(const appearance of ['maw_skeleton','headless_skeleton','iron_giant','pale_shepherd_keeper'])test(`${appearance}: native complete-frame phase/orientation/foot matrix`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('test-results/whole-enemies',{recursive:true});
 await page.goto(`/tests/fixtures/whole-enemies.html?appearance=${appearance}`);await page.waitForFunction(()=>(window as any).wholeEnemyFixtureSnapshot?.().ready);await page.locator('canvas').focus();
 const observations:any[]=[];
 for(let heading=0;heading<8;heading++){
  const s=await snapshot(page);expect(s.heading).toBe(heading);expect(s.samples).toHaveLength(8);
  for(const e of s.samples){
   const keeper=appearance==='pale_shepherd_keeper',row=heading===0||heading===4?0:heading<4?1:2,base=row*6;
   expect(e.appearance).toBe(appearance);expect(e.completeFrame).toBe(true);expect(e.equipmentBaked).toBe(appearance!=='iron_giant');expect(e.basicBodyOnly).toBe(appearance==='iron_giant');expect(e.frame).toBeGreaterThanOrEqual(0);expect(e.frame).toBeLessThan(keeper?24:18);
   expect(e.depth).toBeCloseTo(e.foot.y,6);expect(e.shadow.x).toBeCloseTo(e.foot.x,6);expect(e.shadow.y).toBeCloseTo(e.foot.y+1,6);expect(e.shadow.depth).toBeCloseTo(e.foot.y-.1,6);
   expect(e.origin.y*e.frameSize.height).toBeCloseTo(e.sourceFoot.y,6);expect((e.flipped?1-e.origin.x:e.origin.x)*e.frameSize.width).toBeCloseTo(e.sourceFoot.x,6);
   expect(e.humanHeight).toBe(appearance==='iron_giant'?176:appearance==='headless_skeleton'?79:88);
   if(e.requestedPhase==='active'){expect(e.motion).toBe('attack');expect(e.phase).toBe('active');expect(e.frame).toBe(keeper?15:base+4);}
   if(e.requestedPhase==='recovery'){expect(e.motion).toBe('attack');expect(e.frame).toBe(keeper?17:base+5);}
   if(e.requestedPhase==='windup')expect(e.frame).toBe(keeper?13:base+3);
   if(e.requestedPhase==='hurt')expect(e.motion).toBe('hurt');
   if(e.requestedPhase==='death')expect(e.motion).toBe('death');
   if(e.requestedPhase==='dead'){expect(e.motion).toBe('dead');expect(e.frame).toBe(keeper?23:base);}
  }
  observations.push(s);await page.locator('canvas').screenshot({path:`test-results/whole-enemies/${appearance}-heading-${heading}.png`});
  await page.keyboard.press('ArrowRight');await expect.poll(async()=>(await snapshot(page)).heading).toBe((heading+1)%8);
 }
 expect(errors).toEqual([]);await writeFile(`test-results/whole-enemies/${appearance}-matrix.json`,JSON.stringify(observations,null,2));
});

async function walkTo(page:Page,goal:{x:number;y:number}){
 const deadline=Date.now()+12_000;let held:string[]=[];
 try{while(Date.now()<deadline){
  const s=await snapshot(page),p=s.state.position,dx=(goal.x-goal.y-p.x+p.y)*.8,dy=(goal.x+goal.y-p.x-p.y)*.4;
  if(Math.hypot(dx,dy)<9)return;
  const keys:string[]=[];if(Math.abs(dx)>Math.abs(dy)*.42)keys.push(dx>0?'KeyD':'KeyA');if(Math.abs(dy)>Math.abs(dx)*.42)keys.push(dy>0?'KeyS':'KeyW');
  for(const key of held.filter(key=>!keys.includes(key)))await page.keyboard.up(key);for(const key of keys.filter(key=>!held.includes(key)))await page.keyboard.down(key);held=keys;await page.waitForTimeout(65);
 }}finally{for(const key of held)await page.keyboard.up(key);}
 throw Error(`Native arena waypoint not reached: ${JSON.stringify(goal)}`);
}
test('basic-body giant follows actual upper-watch passage, preserves foot depth and resolves unchanged outgoing damage edge',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('test-results/whole-enemies',{recursive:true});
 await page.goto('/tests/fixtures/whole-enemies.html?mode=arena');await page.waitForFunction(()=>(window as any).wholeEnemyFixtureSnapshot?.().ready);await page.locator('canvas').focus();
 const initial=await snapshot(page),boss=initial.state.enemies.find((e:any)=>e.id==='upper-captain');expect(boss.position).toEqual({x:320,y:-1760});expect(boss.maxHp).toBe(260);
 await page.locator('canvas').screenshot({path:'test-results/whole-enemies/actual-upper-watch-initial.png'});
 for(const goal of [{x:125,y:-1780},{x:125,y:-1670},{x:125,y:-1480}])await walkTo(page,goal);
 await page.waitForFunction(()=>{const s=(window as any).wholeEnemyFixtureSnapshot();return s.state.enemies.find((e:any)=>e.id==='upper-captain').position.y>-1570;},undefined,{timeout:8_000,polling:'raf'});
 await page.waitForFunction(()=>(window as any).wholeEnemyFixtureSnapshot().history.some((h:any,i:number,a:any[])=>i>0&&h.heroHp<a[i-1].heroHp),undefined,{timeout:4_000,polling:'raf'});
 await page.keyboard.press('KeyP');const observed=await snapshot(page);expect(observed.paused).toBe(true);expect(observed.state.hp).toBeGreaterThan(0);expect(errors).toEqual([]);
 const history=observed.history,body=observed.enemyViews.find((e:any)=>e.id==='upper-captain').body;
 expect(body.appearance).toBe('iron_giant');expect(body.humanHeight).toBe(176);expect(body.shadow.width).toBe(72);expect(body.basicBodyOnly).toBe(true);expect(body.equipmentBaked).toBe(false);
 expect(history.every((h:any)=>h.walkable)).toBe(true);expect(history.some((h:any)=>h.foe.y<-1600)).toBe(true);expect(history.some((h:any)=>h.foe.y>-1570)).toBe(true);
 for(const h of history){expect(h.body.depth).toBeCloseTo(h.body.foot.y,5);if(h.foe.y>=-1582&&h.foe.y<=-1534)expect(h.foe.x).toBeLessThan(198);}
 const damageEdge=history.find((h:any,i:number,a:any[])=>i>0&&h.heroHp<a[i-1].heroHp);expect(damageEdge.phase).toBe('recovery');expect(damageEdge.body.phase).toBe('active');expect(damageEdge.body.frame%6).toBe(4);
 await page.waitForTimeout(200);const frozen=await snapshot(page);expect(frozen.state.time).toBe(observed.state.time);expect(frozen.enemyViews.find((e:any)=>e.id==='upper-captain').body).toEqual(body);
 await page.locator('canvas').screenshot({path:'test-results/whole-enemies/actual-upper-watch-passage-and-contact.png'});
 await writeFile('test-results/whole-enemies/actual-upper-watch-passage.json',JSON.stringify({limit:'Seeded native encounter, not earned campaign. Basic giant body only, with no equipment overlays. Its bounded receiving body and original captain outgoing range remain separate contracts.',...observed},null,2));
});

test('actual basic-body giant receives player weapon contacts at its enlarged body',async({page})=>{
 const observations:any[]=[];await mkdir('test-results/whole-enemies',{recursive:true});
 for(const weapon of ['sword','spear'])for(const direction of [0,2,4,6]){
  await page.goto(`/tests/fixtures/melee-contact.html?enemy=giant&weapon=${weapon}&direction=${direction}&side=center`);await page.waitForFunction(()=>(window as any).contactFixtureSnapshot?.().ready);await page.locator('canvas').focus();await page.keyboard.press('KeyF');await page.waitForFunction(()=>(window as any).contactFixtureSnapshot().done);
  const s=await page.evaluate(()=>(window as any).contactFixtureSnapshot());expect(s.enemy.appearance).toBe('iron_giant');expect(s.enemy.humanHeight).toBe(176);expect(s.enemy.foot).toEqual(s.enemyFoot);expect(s.result).toBe('hit');expect(s.attack.hit).toEqual(['upper-captain']);expect(s.damage).toBe(weapon==='sword'?30:25);observations.push(s);
  await page.locator('canvas').screenshot({path:`test-results/whole-enemies/giant-receiving-${weapon}-${direction}.png`});
 }
 await writeFile('test-results/whole-enemies/giant-receiving-contacts.json',JSON.stringify({limit:'Actual player weapon contacts against the bounded basic-giant receiving body; this does not change giant outgoing attack reach. Separate deterministic receiving-hull tests exclude empty corners.',observations},null,2));
});


test('fresh station snapshot counts all whole-frame melee and unchanged bow encounter views',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/tests/fixtures/whole-enemies.html?mode=arena&fresh=1');await page.waitForFunction(()=>(window as any).wholeEnemyFixtureSnapshot?.().ready);
 const s=await snapshot(page);expect(s.paused).toBe(true);expect(s.world).toMatchObject({areaId:'station',enemySlots:12,activeEnemyViews:12});
 const watchers=s.enemyViews.filter((enemy:any)=>s.state.enemies[enemy.index].kind==='watcher'),melee=s.enemyViews.filter((enemy:any)=>s.state.enemies[enemy.index].kind!=='watcher');
 expect(watchers).toHaveLength(4);expect(melee).toHaveLength(8);
 for(const enemy of watchers){expect(enemy.archerVisible).toBe(true);expect(enemy.knightVisible).toBe(false);}
 for(const enemy of melee){expect(enemy.knightVisible).toBe(true);expect(enemy.archerVisible).toBe(false);}
 expect(errors).toEqual([]);
});


test('each missing required enemy sheet fails clearly instead of silently drawing a missing texture',async({page})=>{
 const sheets=[
  ['enemies-whole-v1/maw_skeleton.webp','whole-enemy-maw_skeleton'],
  ['enemies-whole-v1/headless_skeleton.webp','whole-enemy-headless_skeleton'],
  ['enemies-whole-v1/iron_giant.webp','whole-enemy-iron_giant'],
  ['npc-enemy-sprites/pale_shepherd_keeper/sprite-front.webp','whole-enemy-pale_shepherd_keeper-front'],
  ['npc-enemy-sprites/pale_shepherd_keeper/sprite-rear.webp','whole-enemy-pale_shepherd_keeper-rear'],
 ];
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [asset,key] of sheets){
  errors.length=0;const pattern=`**/src/assets/${asset}*`;let blocked=0;
  await page.route(pattern,route=>{if(route.request().resourceType()==='image'){blocked++;return route.abort('failed');}return route.continue();});
  await page.goto('/tests/fixtures/whole-enemies.html?appearance=maw_skeleton');
  await expect.poll(()=>blocked).toBeGreaterThan(0);
  await expect.poll(()=>errors).toContain(`Required enemy artwork could not load (${key}). Please reload.`);
  expect(await page.evaluate(()=>(window as any).wholeEnemyFixtureSnapshot?.().ready??false)).toBe(false);
  await page.unroute(pattern);
 }
});
