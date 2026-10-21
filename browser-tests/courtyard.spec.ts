import {test,expect,type Page} from '@playwright/test';
const state=(page:Page)=>page.evaluate(()=>window.vireldenDebug!());
async function open(page:Page){
  await page.goto('/?debug=1');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(()=>typeof window.vireldenDebug==='function');
}
test('boots with one courtyard and no runtime errors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);
  await expect(page.getByRole('heading',{name:'The Courtyard'})).toBeVisible();
  await expect(page.locator('#loading')).toBeHidden();
  await page.screenshot({path:'test-results/courtyard-desktop.png',fullPage:true});
  expect(errors).toEqual([]);
});
test('WASD and arrows move in the screen directions and reset works',async({page})=>{
  await open(page);
  for(const [key,axis,sign] of [['KeyD','x',1],['ArrowLeft','x',-1],['KeyW','y',-1],['ArrowDown','y',1]] as const){
    await page.getByRole('button',{name:'Reset position'}).click();
    const a=await state(page);
    await page.keyboard.down(key);
    await expect.poll(async()=>((await state(page)).screen[axis]-a.screen[axis])*sign).toBeGreaterThan(25);
    await page.keyboard.up(key);
    const b=await state(page);
    expect((b.screen[axis]-a.screen[axis])*sign).toBeGreaterThan(15);
  }
  await page.getByRole('button',{name:'Reset position'}).click();
  expect((await state(page)).position).toEqual({x:320,y:320});
});
test('opposite inputs cancel and switching focus releases held keys',async({page})=>{
  await open(page);
  await page.keyboard.down('KeyA');await page.keyboard.down('KeyD');
  await page.waitForTimeout(60);const a=await state(page);
  await page.waitForTimeout(120);
  expect((await state(page)).position).toEqual(a.position);
  await page.keyboard.up('KeyA');await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyD');await page.waitForTimeout(120);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(60);const b=await state(page);
  await page.waitForTimeout(160);expect((await state(page)).position).toEqual(b.position);
  await page.keyboard.up('KeyD');
});
test('courtyard edges remain solid in the browser',async({page})=>{
  await open(page);await page.keyboard.down('KeyD');await page.keyboard.down('KeyS');
  // Collision substeps stop within four ground units of the legal edge (628).
  await expect.poll(async()=>(await state(page)).position.x,{timeout:15000}).toBeGreaterThan(624);
  await page.waitForTimeout(150);await page.keyboard.up('KeyD');await page.keyboard.up('KeyS');
  const p=(await state(page)).position;
  expect(p.x).toBeGreaterThanOrEqual(12);expect(p.x).toBeLessThanOrEqual(628);
  expect(p.y).toBeGreaterThanOrEqual(12);expect(p.y).toBeLessThanOrEqual(628);
});
test('fits a small viewport and debug data is opt-in',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(()=>window.vireldenDebug)).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/courtyard-small.png',fullPage:true});
});

test('full-plate art walks in both directions and returns to idle',async({page})=>{
  await open(page);
  expect((await state(page)).character).toEqual({texture:'plate-knight-v1',frame:0,walking:false,flipped:false});
  for(const [key,flipped,direction] of [['KeyD',false,'right'],['KeyA',true,'left']] as const){
    await page.getByRole('button',{name:'Reset position'}).click();
    await page.keyboard.down(key);
    await expect.poll(async()=>(await state(page)).character.walking).toBe(true);
    const first=(await state(page)).character.frame;
    await expect.poll(async()=>(await state(page)).character.frame).not.toBe(first);
    const actor=(await state(page)).character;
    expect(actor.flipped).toBe(flipped);
    expect(actor.frame).toBeGreaterThanOrEqual(1);expect(actor.frame).toBeLessThanOrEqual(6);
    await page.screenshot({path:'test-results/knight-'+direction+'.png',fullPage:true});
    await page.keyboard.up(key);
    await expect.poll(async()=>(await state(page)).character.walking).toBe(false);
    expect((await state(page)).character.frame).toBe(0);
  }
});

