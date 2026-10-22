import {test,expect,type Page} from '@playwright/test';
const state=(page:Page)=>page.evaluate(()=>window.vireldenDebug!());
async function open(page:Page,loadout='Vanguard'){
 await page.goto('/?debug=1');await expect(page.locator('canvas')).toBeVisible();
 await page.waitForFunction(()=>typeof window.vireldenDebug==='function');
 await page.getByRole('button',{name:`Choose ${loadout}`,exact:true}).click();
 await expect.poll(async()=>(await state(page)).paused).toBe(false);
}
async function hold(page:Page,keys:string[],ms=160){for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(ms);for(const k of keys)await page.keyboard.up(k);}
test('boots with loadout choice, full-plate knight and no runtime errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 await expect(page.getByRole('heading',{name:'Beneath the Station',exact:true})).toBeVisible();
 await expect(page.locator('#loading')).toBeHidden();expect((await state(page)).character.texture).toBe('plate-knight-v1');
 await page.screenshot({path:'test-results/expedition-desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('screen-relative controls animate and opposite keys cancel',async({page})=>{
 await open(page);let before=await state(page);await hold(page,['KeyA']);expect((await state(page)).screen.x).toBeLessThan(before.screen.x-10);
 before=await state(page);await hold(page,['ArrowRight']);expect((await state(page)).screen.x).toBeGreaterThan(before.screen.x+10);
 await page.keyboard.down('KeyA');await page.keyboard.down('KeyD');await page.waitForTimeout(60);before=await state(page);await page.waitForTimeout(120);expect((await state(page)).position).toEqual(before.position);await page.keyboard.up('KeyA');await page.keyboard.up('KeyD');
});
for(const [keys,direction,texture,flipped] of [
 [['KeyW','KeyD'],'north-east','plate-knight-ne-v1',false],
 [['KeyW','KeyA'],'north-west','plate-knight-ne-v1',true],
 [['KeyS','KeyD'],'south-east','plate-knight-se-v1',false],
 [['KeyS','KeyA'],'south-west','plate-knight-se-v1',true],
] as const){test(`full-plate walking and idle ${direction}`,async({page})=>{
 await open(page);for(const k of keys)await page.keyboard.down(k);
 await expect.poll(async()=>(await state(page)).character.direction).toBe(direction);
 await expect.poll(async()=>(await state(page)).character.walking).toBe(true);
 expect((await state(page)).character).toMatchObject({texture,flipped});
 for(const k of keys)await page.keyboard.up(k);
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
 for(let i=0;i<6;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('#panel'))).toBe(true);}
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
});
test('small viewport fits and debug API is opt-in',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByRole('button',{name:'Choose Vanguard',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.vireldenDebug)).toBeUndefined();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/expedition-small.png',fullPage:true});
});
