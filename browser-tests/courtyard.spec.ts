import { test, expect, type Page } from '@playwright/test';
const state=(page:Page)=>page.evaluate(()=>window.__VIRELDEN__!.snapshot());
async function boot(page:Page){
  await page.goto('/?debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-ready','true');
  await expect(page.locator('canvas')).toBeVisible();
}
test('boots without runtime errors and responds to real movement, sword, roll and restart input',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
  const start=await state(page);
  await page.keyboard.down('d');await expect.poll(async()=>(await state(page)).player.x).toBeGreaterThan(start.player.x+12);await page.keyboard.up('d');
  await page.locator('canvas').click({position:{x:600,y:350}});
  await expect.poll(async()=>(await state(page)).stats.attacks).toBe(1);
  await expect.poll(async()=>(await state(page)).player.attack).toBe(0);
  await page.keyboard.press('Space');await expect.poll(async()=>(await state(page)).stats.rolls).toBe(1);
  expect((await state(page)).player.stamina).toBeLessThan(100);
  await page.keyboard.press('r');await expect.poll(async()=>(await state(page)).stats.rolls).toBe(0);
  expect((await state(page)).player.x).toBe(start.player.x);expect(errors).toEqual([]);
});
test('pause freezes movement and resume returns control',async({page})=>{
  await boot(page);await page.keyboard.press('Escape');await expect(page.locator('#pause-overlay')).toBeVisible();
  const before=await state(page);await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');
  expect((await state(page)).player.x).toBe(before.player.x);
  await page.getByRole('button',{name:'Return to the courtyard',exact:true}).click();await expect(page.locator('#pause-overlay')).toBeHidden();
});
test('saved discovery survives reload and encounter restart',async({page})=>{
  await boot(page);await page.evaluate(()=>localStorage.setItem('virelden:prototype:v1',JSON.stringify({version:1,relic:true})));
  await page.reload();await expect(page.locator('body')).toHaveAttribute('data-ready','true');expect((await state(page)).relic).toBe(true);
  await page.keyboard.press('r');expect((await state(page)).relic).toBe(true);
  await page.reload();await expect(page.locator('body')).toHaveAttribute('data-ready','true');expect((await state(page)).relic).toBe(true);
});
test('bad saved data does not prevent boot; capture the actual rendered courtyard',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('virelden:prototype:v1','broken-json'));
  await boot(page);expect((await state(page)).relic).toBe(false);
  await page.screenshot({path:'test-results/courtyard.png',fullPage:true});
});
