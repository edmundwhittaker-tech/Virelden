import {test,expect,type Page} from '@playwright/test';
import {captureAttack} from './attack-capture';
const state=(page:Page)=>page.evaluate(()=>window.vireldenDebug!());
for(const [loadout,weapon] of [['Vanguard','sword'],['Wayfarer','spear']] as const){
 test(`${weapon} shows four-direction body attack phases and resumes paused attacks`,async({page})=>{
  test.setTimeout(60_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug=1&qa=1');await page.waitForFunction(()=>typeof window.vireldenDebug==='function');
  await page.getByRole('button',{name:`Choose ${loadout}`,exact:true}).click();
  await expect(page.locator('#save-status')).toContainText('QA save');
  for(const [direction,dx,dy] of [['east',1,0],['west',-1,0],['north',0,-1],['south',0,1]] as const){
   await expect.poll(async()=>(await state(page)).stamina).toBe((await state(page)).maxStamina);
   const before=await state(page),box=await page.locator('canvas').boundingBox();expect(box).not.toBeNull();
   await page.mouse.move(box!.x+(before.screen.x+dx*140)/1280*box!.width,box!.y+(before.screen.y+dy*140)/800*box!.height);
   const frames=await captureAttack(page,`${weapon}-${direction}`);
   for(const phase of ['windup','active','recovery']){
    expect(frames[phase].state.attack.weapon).toBe(weapon);
    expect(frames[phase].state.attack.aim.x).toBeCloseTo(dx,2);expect(frames[phase].state.attack.aim.y).toBeCloseTo(dy,2);
    expect(frames[phase].state.position).toEqual(before.position);
   }
   expect(frames.active.png,'active body/weapon frame differs from idle').not.toBe(frames.idle.png);
   expect((await state(page)).attack.phase).toBe('idle');
  }
  await expect.poll(async()=>(await state(page)).stamina).toBe((await state(page)).maxStamina);
  await page.keyboard.press('KeyJ');await page.waitForFunction(()=>window.vireldenDebug!().attack.phase==='windup');await page.keyboard.press('Escape');
  await expect.poll(async()=>(await state(page)).paused).toBe(true);
  const frozen=await state(page);expect(frozen.attack.phase).not.toBe('idle');await page.waitForTimeout(200);
  expect((await state(page)).attack).toEqual(frozen.attack);
  await page.getByRole('button',{name:'Continue expedition',exact:true}).click();
  await expect.poll(async()=>(await state(page)).attack.phase).toBe('idle');expect(errors).toEqual([]);
 });
}

test('registered scenery has uniform pillars and correct front/back depth transitions',async({page})=>{
 await page.goto('/?debug=1&qa=1');await page.getByRole('button',{name:'Choose Vanguard',exact:true}).click();
 const initial=await state(page),pillars=initial.scenery.filter(o=>o.id.startsWith('pillar-'));
 expect(pillars).toHaveLength(4);
 expect(new Set(pillars.map(o=>`${o.width}/${o.height}`)).size).toBe(1);
 for(const prop of initial.scenery){
  expect(prop.foot.x).toBeCloseTo(640+(prop.world.x-prop.world.y)*.8,4);
  expect(prop.foot.y).toBeCloseTo(180+(prop.world.x+prop.world.y)*.4,4);
  expect(Math.abs(prop.depth-prop.foot.y)).toBeLessThan(.1);
 }
 const forge=initial.scenery.find(o=>o.id==='forge')!;
 expect(initial.screen.y).toBeGreaterThan(forge.depth);
 // Go around the solid checkpoint lantern rather than attempting to walk through it.
 await page.keyboard.down('KeyD');await page.waitForTimeout(240);await page.keyboard.up('KeyD');
 await page.keyboard.down('KeyW');await page.waitForTimeout(400);await page.keyboard.up('KeyW');
 await page.keyboard.down('KeyA');await page.waitForTimeout(400);await page.keyboard.up('KeyA');
 const behind=await state(page),backForge=behind.scenery.find(o=>o.id==='forge')!;
 expect(behind.screen.y).toBeLessThan(backForge.depth);expect(backForge.alpha).toBeLessThan(1);
 expect(Math.hypot(behind.position.x-forge.world.x,behind.position.y-forge.world.y)).toBeGreaterThanOrEqual(forge.radius!+12-.01);
 await page.screenshot({path:'test-results/spatial-combat/forge-foreground.png',fullPage:true});
 await page.keyboard.down('KeyD');await page.waitForTimeout(400);await page.keyboard.up('KeyD');
 await page.keyboard.down('KeyS');await page.waitForTimeout(500);await page.keyboard.up('KeyS');
 const front=await state(page);expect(front.screen.y).toBeGreaterThan(forge.depth);
 await page.screenshot({path:'test-results/spatial-combat/forge-background.png',fullPage:true});
 expect(front.hp).toBeGreaterThan(0);
});
