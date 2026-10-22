import {movementKeys,spearSpacing,retreatBlocked} from './native-steering';
import {captureAttack} from './attack-capture';
import {test,expect,type Page} from '@playwright/test';
const state=(page:Page)=>page.evaluate(()=>window.vireldenDebug!());
async function open(page:Page,loadout='Vanguard'){
 await page.goto('/?debug=1');await expect(page.locator('canvas')).toBeVisible();
 await page.waitForFunction(()=>typeof window.vireldenDebug==='function');
 await page.getByRole('button',{name:`Choose ${loadout}`,exact:true}).click();
 await expect.poll(async()=>(await state(page)).paused).toBe(false);
}
async function chooseWeapon(page:Page,id:string){await page.getByRole('button',{name:'Weapons',exact:true}).click();await page.locator(`[data-focus="weapon-${id}"]`).click();await page.getByRole('button',{name:'Equip weapon',exact:true}).click();}
async function improve(page:Page,cost:number){await page.getByRole('button',{name:'Weapons',exact:true}).click();await page.getByRole('button',{name:`Improve for ${cost} marks`,exact:true}).click();}
async function hold(page:Page,keys:string[],ms=160){for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);}
test('boots with loadout choice, full-plate knight and no runtime errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 await expect(page.getByRole('heading',{name:'Beneath the Station',exact:true})).toBeVisible();
 await expect(page.locator('#loading')).toBeHidden();expect((await state(page)).character.texture).toBe('modular-plate');expect((await state(page)).character.kind).toBe('modular-15-part');expect((await state(page)).character.parts).toHaveLength(15);
 await page.screenshot({path:'test-results/expedition-desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('screen-relative controls animate and opposite keys cancel',async({page})=>{
 await open(page);let before=await state(page);await hold(page,['KeyA']);expect((await state(page)).screen.x).toBeLessThan(before.screen.x-10);
 before=await state(page);await hold(page,['ArrowRight']);expect((await state(page)).screen.x).toBeGreaterThan(before.screen.x+10);
 await page.keyboard.down('KeyA');await page.keyboard.down('KeyD');await page.waitForTimeout(60);before=await state(page);await page.waitForTimeout(120);expect((await state(page)).position).toEqual(before.position);await page.keyboard.up('KeyA');await page.keyboard.up('KeyD');
});
for(const [keys,direction,texture,flipped] of [
 [['KeyW','KeyD'],'north-east','modular-plate',false],
 [['KeyW','KeyA'],'north-west','modular-plate',true],
 [['KeyS','KeyD'],'south-east','modular-plate',false],
 [['KeyS','KeyA'],'south-west','modular-plate',true],
] as const){test(`full-plate walking and idle ${direction}`,async({page})=>{
 await open(page);
 // Observe the first matching rendered movement frame, before a nearby solid prop
 // correctly stops the knight. Sequential coarse polls could miss this short window.
 const walking=page.waitForFunction(direction=>{const c=window.vireldenDebug!().character;return c.direction===direction&&c.walking;},direction,{polling:'raf'});
 for(const k of keys)await page.keyboard.down(k);
 await walking;
 expect((await state(page)).character).toMatchObject({texture,flipped});
 for(const k of [...keys].reverse())await page.keyboard.up(k);
 await expect.poll(async()=>(await state(page)).character.walking).toBe(false);
 expect((await state(page)).character).toMatchObject({direction,texture,frame:0});
});}
test('attack and roll spend stamina, recover, and prevent chaining',async({page})=>{
 await open(page);await page.keyboard.press('KeyJ');await expect.poll(async()=>(await state(page)).stamina).toBeLessThan(90);
 await expect.poll(async()=>(await state(page)).attack.phase).toBe('idle');
 await expect.poll(async()=>(await state(page)).stamina).toBe(90);
 await page.keyboard.press('Space');await expect.poll(async()=>(await state(page)).rollTimer).toBeGreaterThan(0);
 const spent=(await state(page)).stamina;await page.keyboard.press('Space');expect((await state(page)).stamina).toBeLessThanOrEqual(spent+1);
 await expect.poll(async()=>(await state(page)).rollTimer).toBe(0);
});
test('equipment pauses, modal traps keyboard, blur clears movement',async({page})=>{
 await open(page);await page.keyboard.press('KeyI');await expect(page.getByRole('dialog')).toBeVisible();const before=await state(page);
 await hold(page,['KeyD'],250);expect((await state(page)).position).toEqual(before.position);
 for(let i=0;i<6;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('.equipment-panel'))).toBe(true);}
 await page.keyboard.press('Escape');await expect.poll(async()=>(await state(page)).paused).toBe(false);
 await page.keyboard.down('KeyA');await page.waitForTimeout(100);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('KeyA');
 await expect.poll(async()=>(await state(page)).paused).toBe(true);const stopped=(await state(page)).position;await page.waitForTimeout(200);expect((await state(page)).position).toEqual(stopped);
 await page.getByRole('button',{name:'Continue expedition',exact:true}).click();await page.waitForTimeout(120);expect((await state(page)).position).toEqual(stopped);
});
test('reset cancellation preserves character; confirmed reset survives reload before choice',async({page})=>{
 await open(page);await page.keyboard.press('Escape');await page.getByRole('button',{name:'Reset saved progress',exact:true}).click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();expect((await state(page)).archetype).toBe('vanguard');
 await page.getByRole('button',{name:'Reset saved progress',exact:true}).click();await page.getByRole('button',{name:'Erase progress and choose again',exact:true}).click();
 await page.reload();await expect(page.getByRole('button',{name:'Choose Wayfarer',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Choose Wayfarer',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Choose Wayfarer',exact:true}).click();expect(await state(page)).toMatchObject({archetype:'wayfarer',equipped:'spear',currency:0,owned:['spear']});
 await page.reload();await page.waitForFunction(()=>typeof window.vireldenDebug==='function');expect(await state(page)).toMatchObject({archetype:'wayfarer',equipped:'spear',paused:false});
 // QA namespace must neither read nor erase normal expedition progress.
 await page.goto('/?debug=1&qa=1');await expect(page.getByRole('button',{name:'Choose Vanguard',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Choose Vanguard',exact:true}).click();await expect(page.locator('#save-status')).toContainText('QA save');
 await page.goto('/?debug=1');await page.waitForFunction(()=>typeof window.vireldenDebug==='function');expect((await state(page)).archetype).toBe('wayfarer');
 await page.goto('/?debug=1&qa=1');await page.waitForFunction(()=>typeof window.vireldenDebug==='function');expect((await state(page)).archetype).toBe('vanguard');
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Reset saved progress',exact:true}).click();await page.getByRole('button',{name:'Erase progress and choose again',exact:true}).click();
 await page.reload();await expect(page.getByRole('button',{name:'Choose Vanguard',exact:true})).toBeVisible();
 await page.goto('/?debug=1');await page.waitForFunction(()=>typeof window.vireldenDebug==='function');expect((await state(page)).archetype).toBe('wayfarer');
});
test('small viewport fits and debug API is opt-in',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByRole('button',{name:'Choose Vanguard',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.vireldenDebug)).toBeUndefined();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/expedition-small.png',fullPage:true});
});

// Navigation uses real held keys. Snapshots observe positions only; no save/state injection.
async function walkTo(page:Page,target:{x:number;y:number}){
 const {adventureCanStand}=await import('../src/core/adventure');
 const initial=await state(page), grid=16;
 const safe=(p:{x:number;y:number})=>[[0,0],[3,0],[-3,0],[0,3],[0,-3]].every(([x,y])=>adventureCanStand(initial,{x:p.x+x,y:p.y+y}));
 const targetBlocked=!adventureCanStand(initial,target);
 const atTarget=(p:{x:number;y:number})=>targetBlocked?Math.hypot((p.x-target.x-p.y+target.y)*.8,(p.x-target.x+p.y-target.y)*.4)<30:Math.hypot(p.x-target.x,p.y-target.y)<18;
 const start={x:Math.round(initial.position.x/grid)*grid,y:Math.round(initial.position.y/grid)*grid};
 const key=(p:{x:number;y:number})=>`${p.x},${p.y}`;
 const queue=[start],parents=new Map<string,string|null>([[key(start),null]]);let end=start;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(atTarget(p)){end=p;break;}
  for(const [dx,dy]of [[grid,0],[-grid,0],[0,grid],[0,-grid]]){const q={x:p.x+dx,y:p.y+dy};if(!parents.has(key(q))&&safe(q)){parents.set(key(q),key(p));queue.push(q)}}
 }
 expect(atTarget(end),'route target or clear interaction approach reachable').toBe(true);
 const route:{x:number;y:number}[]=[];let k:string|null=key(end);while(k){const [x,y]=k.split(',').map(Number);route.unshift({x,y});k=parents.get(k)??null;}
 const corners=route.filter((p,i)=>i===route.length-1||i===0||((p.x-route[i-1].x)!==(route[i+1].x-p.x))||((p.y-route[i-1].y)!==(route[i+1].y-p.y)));
 for(const p of corners){let reached=false;for(let step=0;step<120;step++){
  const s=await state(page);expect(s.hp,'alive while traversing route').toBeGreaterThan(0);
  const dx=(p.x-s.position.x-p.y+s.position.y)*.8,dy=(p.x-s.position.x+p.y-s.position.y)*.4;
  if(Math.hypot(dx,dy)<7){reached=true;break;}
  const keys=movementKeys(dx,dy);
  await hold(page,keys,Math.max(20,Math.min(70,Math.hypot(dx,dy)/150*1000)));
 }expect(reached,'movement reaches route corner').toBe(true);}
}
test('real exploration opens cache once, equips hammer, upgrades at forge and saves',async({page})=>{
 test.setTimeout(90_000);await open(page);await walkTo(page,{x:150,y:420});await page.keyboard.press('KeyE');
 await expect.poll(async()=>(await state(page)).owned).toContain('hammer');const cash=(await state(page)).currency;
 await page.keyboard.press('KeyE');expect((await state(page)).currency).toBe(cash);
 await page.keyboard.press('KeyI');await chooseWeapon(page,'hammer');expect((await state(page)).equipped).toBe('hammer');await page.keyboard.press('Escape');
 await captureAttack(page,'earned-hammer');
 await walkTo(page,{x:260,y:330});await page.keyboard.press('KeyE');await expect(page.getByRole('dialog')).toBeVisible();
 await improve(page,30);expect((await state(page)).levels.hammer).toBe(1);expect((await state(page)).currency).toBe(cash-30);
 await page.screenshot({path:'test-results/expedition-earned-upgrade.png',fullPage:true});await page.reload();await page.waitForFunction(()=>typeof window.vireldenDebug==='function');
 expect(await state(page)).toMatchObject({equipped:'hammer',levels:{hammer:1},looted:['west-cache']});
});
test('real danger leads to death and retry returns healthy without stuck controls',async({page})=>{
 test.setTimeout(90_000);await open(page);await walkTo(page,{x:480,y:450});
 await expect(page.getByRole('button',{name:'Rise at checkpoint',exact:true})).toBeVisible({timeout:35_000});expect((await state(page)).hp).toBe(0);
 await page.screenshot({path:'test-results/expedition-death.png',fullPage:true});await page.getByRole('button',{name:'Rise at checkpoint',exact:true}).click();
 expect(await state(page)).toMatchObject({hp:140,position:{x:320,y:320},paused:false,rollTimer:0});const p=(await state(page)).screen;
 await hold(page,['KeyA']);expect((await state(page)).screen.x).toBeLessThan(p.x-10);await page.keyboard.press('KeyI');await expect(page.getByRole('dialog')).toBeVisible();
});

test('real aimed attacks defeat raider, award marks once and persist the victory',async({page})=>{
 test.setTimeout(90_000);await open(page);await walkTo(page,{x:220,y:200});
 for(let strike=0;strike<5;strike++){
  const s=await state(page),enemy=s.enemies.find(e=>e.id==='raider')!;if(enemy.hp<=0)break;
  expect(s.hp,'player survives raider duel').toBeGreaterThan(0);
  const canvas=await page.locator('canvas').boundingBox();expect(canvas).not.toBeNull();
  const ex=640+(enemy.position.x-enemy.position.y)*.8-s.camera.x,ey=180+(enemy.position.x+enemy.position.y)*.4-s.camera.y;
  const dx=ex-s.screen.x,dy=ey-s.screen.y,length=Math.hypot(dx,dy);
  // Aim along the target direction beyond the intentional 10px pointer deadzone.
  const x=s.screen.x+(length?dx/length:1)*120,y=s.screen.y+(length?dy/length:0)*120;
  await page.mouse.click(canvas!.x+x/1280*canvas!.width,canvas!.y+y/800*canvas!.height);
  await expect.poll(async()=>(await state(page)).attack.phase).not.toBe('idle');
  await expect.poll(async()=>(await state(page)).attack.phase,{timeout:15_000}).toBe('idle');
 }
 await expect.poll(async()=>(await state(page)).enemies.find(e=>e.id==='raider')!.hp).toBe(0);
 const earned=(await state(page)).currency;expect(earned).toBe(25);await page.keyboard.press('KeyJ');
 await expect.poll(async()=>(await state(page)).attack.phase).not.toBe('idle');await expect.poll(async()=>(await state(page)).attack.phase,{timeout:15_000}).toBe('idle');expect((await state(page)).currency).toBe(earned);
 await page.keyboard.press('KeyI');await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:'test-results/expedition-earned-victory.png',fullPage:true});
 await page.reload();await page.waitForFunction(()=>typeof window.vireldenDebug==='function');expect((await state(page)).enemies.find(e=>e.id==='raider')!.hp).toBe(0);expect((await state(page)).currency).toBe(earned);
});



test('full exploration earns all weapons, opens shortcut and buys capped +2 upgrade',async({page})=>{
 test.setTimeout(90_000);await open(page);
 for(const [target,loot]of [
  [{x:150,y:420},'west-cache'],[{x:320,y:320},null],
  [{x:300,y:540},'south-cache'],[{x:320,y:320},null],
  [{x:420,y:100},'north-cache'],
 ] as const){await walkTo(page,target);await page.keyboard.press('KeyE');if(loot)await expect.poll(async()=>(await state(page)).looted).toContain(loot);else await expect.poll(async()=>(await state(page)).hp).toBe(140);}
 expect((await state(page)).currency).toBe(95);expect((await state(page)).owned.sort()).toEqual(['hammer','spear','sword']);
 await walkTo(page,{x:560,y:400});await page.keyboard.press('KeyE');await expect.poll(async()=>(await state(page)).shortcut).toBe(true);
 await walkTo(page,{x:260,y:330});await page.keyboard.press('KeyE');await expect(page.getByRole('dialog')).toBeVisible();
 await chooseWeapon(page,'hammer');await improve(page,30);expect((await state(page)).currency).toBe(65);
 await improve(page,60);expect((await state(page)).currency).toBe(5);expect((await state(page)).levels.hammer).toBe(2);await expect(page.getByRole('button',{name:'Fully improved +2',exact:true})).toBeDisabled();
 await page.screenshot({path:'test-results/expedition-full-progression.png',fullPage:true});await page.reload();await page.waitForFunction(()=>typeof window.vireldenDebug==='function');
 expect(await state(page)).toMatchObject({shortcut:true,equipped:'hammer',levels:{hammer:2},currency:5});expect((await state(page)).looted.sort()).toEqual(['north-cache','south-cache','west-cache']);
});

test('very short movement taps are consumed once and do not stick',async({page})=>{
 await open(page);const before=(await state(page)).screen.x;await page.keyboard.press('KeyA',{delay:5});await expect.poll(async()=>(await state(page)).screen.x).toBeLessThan(before);await page.waitForTimeout(120);const stopped=(await state(page)).position;await page.waitForTimeout(180);expect((await state(page)).position).toEqual(stopped);
});

test('spear spacing defeats lower captain and persists victory without premature completion',async({page})=>{
 test.setTimeout(90_000);await open(page,'Wayfarer');await walkTo(page,{x:480,y:340});let stuckRetreat=false,attackInputs=0;
 for(let turn=0;turn<500;turn++){
  const s=await state(page),captain=s.enemies.find(e=>e.id==='captain')!;if(captain.hp<=0)break;
  expect(s.hp,'survive by keeping spear distance').toBeGreaterThan(0);
  if(s.attack.phase!=='idle'){await page.waitForTimeout(70);continue;}
  const x=640+(captain.position.x-captain.position.y)*.8-s.camera.x,y=180+(captain.position.x+captain.position.y)*.4-s.camera.y;
  const dx=x-s.screen.x,dy=y-s.screen.y,distance=Math.hypot(dx,dy);
  const spacing=spearSpacing(distance,stuckRetreat);
  if(spacing){
   const before={...s.position},keys=movementKeys(dx,dy,spacing);
   await hold(page,keys,70);const after=(await state(page)).position;stuckRetreat=retreatBlocked(distance,before,after);
  }else if(s.stamina>=20){
   attackInputs++;
   const canvas=await page.locator('canvas').boundingBox();expect(canvas).not.toBeNull();
   await page.mouse.click(canvas!.x+x/1280*canvas!.width,canvas!.y+y/800*canvas!.height);await page.waitForTimeout(70);
  }else await page.waitForTimeout(70);
 }
 const duel=await state(page);console.log('CAPTAIN_DUEL '+JSON.stringify({position:duel.position,hp:duel.hp,stamina:duel.stamina,captain:duel.enemies.find(e=>e.id==='captain'),attackInputs,time:duel.time}));
 expect((await state(page)).enemies.find(e=>e.id==='captain')!.hp).toBe(0);expect((await state(page)).completed).toBe(false);expect((await state(page)).currency).toBeGreaterThanOrEqual(80);
 await expect(page.locator('#objective-text')).not.toContainText('Expedition complete');await page.screenshot({path:'test-results/expedition-captain-victory.png',fullPage:true});
 await page.keyboard.press('KeyI');await expect(page.getByRole('dialog')).toBeVisible();await page.reload();await page.waitForFunction(()=>typeof window.vireldenDebug==='function');expect((await state(page)).completed).toBe(false);expect((await state(page)).enemies.find(e=>e.id==='captain')!.hp).toBe(0);
});
