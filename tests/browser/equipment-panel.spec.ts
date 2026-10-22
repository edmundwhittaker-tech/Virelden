import {test, expect} from '@playwright/test';
// Isolated DOM fixture, not a gameplay bypass. Integration tests still need earned inventory.
test.beforeEach(async ({page}) => {
 await page.goto('/tests/fixtures/equipment-panel.html');
 await page.getByRole('button', {name:'Open equipment fixture'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
});

test('single-slot equip, pointer/keyboard actions and real callbacks retain the other three pieces', async ({page}) => {
 await page.getByRole('button', {name:'Delver plate helmet Owned',exact:true}).click();
 await expect(page.getByRole('table')).toContainText('Stamina recovery');
 await page.getByRole('button', {name:'Equip this piece',exact:true}).focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('status')).toHaveText('Armor changed.');
 await expect(page.getByRole('button', {name:'Equip this piece',exact:true})).toBeDisabled();
 const record = await page.evaluate(()=>(window as any).fixtureRecord);
 expect(record.armor).toEqual([['helmet','delver-helmet']]);
 await expect(page.getByRole('button', {name:'Chest Ward plate chest',exact:true})).toBeVisible();
});

test('Escape, tab/shift-tab focus trap, external focus recovery and destroyed listener cleanup', async ({page}) => {
 const close = page.getByRole('button', {name:'Close · Esc'});
 await expect(close).toBeFocused();
 await page.keyboard.press('Shift+Tab');
 await expect(close).not.toBeFocused();
 await page.keyboard.press('Tab');
 await expect(close).toBeFocused();
 await page.evaluate(()=>document.querySelector<HTMLCanvasElement>('#game')!.focus());
 await expect(close).toBeFocused();
 await page.keyboard.press('f');
 expect(await page.evaluate(()=>(window as any).fixtureRecord.gameKeys)).toBe(0);
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.locator('#game')).toBeFocused();
 expect(await page.evaluate(()=>(window as any).fixtureRecord.visible)).toEqual([true,false]);
 await page.evaluate(()=>(window as any).fixtureOpen());
 await page.evaluate(()=>(window as any).fixtureDestroy());
 await page.keyboard.press('f');
 expect(await page.evaluate(()=>(window as any).fixtureRecord.gameKeys)).toBe(1);
});

test('training away explains checkpoint gate, training at checkpoint spends once and rest stays explicit', async ({page}) => {
 await page.getByRole('button', {name:'Training',exact:true}).click();
 await expect(page.getByRole('button', {name:'Train Vigor',exact:true})).toBeDisabled();
 await expect(page.getByText('Return to a checkpoint to train or rest.',{exact:true})).toHaveCount(4);
 await page.evaluate(()=>(window as any).fixtureUpdate({atCheckpoint:true}));
 await page.getByRole('button', {name:'Train Vigor',exact:true}).click();
 await expect(page.getByText('1 available training point',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).fixtureRecord.rests)).toBe(0);
 await page.getByRole('button', {name:'Rest at checkpoint',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).fixtureRecord.rests)).toBe(1);
});

test('update to busy state disables armor and weapon actions; thumbnail gaps do not crash', async ({page}) => {
 await page.getByRole('button', {name:'Delver plate helmet Owned',exact:true}).click();
 await page.evaluate(()=>(window as any).fixtureUpdate({context:{alive:true,idle:false,rolling:false,interacting:false}}));
 await expect(page.getByRole('button', {name:'Equip this piece',exact:true})).toBeDisabled();
 await expect(page.locator('.equipment-thumbnail-empty').first()).toBeVisible();
 await page.getByRole('button', {name:'Weapons',exact:true}).click();
 await page.getByRole('button', {name:'Ward axe Owned',exact:true}).click();
 await expect(page.getByRole('button', {name:'Equip weapon',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>(window as any).fixtureRecord.armor)).toEqual([]);
});

for(const viewport of [{width:1440,height:1000},{width:900,height:700}]) {
 test(`panel fits ${viewport.width}×${viewport.height} without page blowout`,async({page})=>{
  await page.setViewportSize(viewport);
  const dialog = page.getByRole('dialog');
  const bounds = await dialog.boundingBox(); expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/equipment-panel-${viewport.width}.png`});
  if(viewport.width===900){
   await page.getByRole('button',{name:'Delver plate helmet Owned',exact:true}).click();const action=page.getByRole('button',{name:'Equip this piece',exact:true});await action.focus();await expect(action).toBeFocused();
   expect(await action.evaluate(el=>{const r=el.getBoundingClientRect(),body=document.querySelector('.equipment-body')!.getBoundingClientRect(),footer=document.querySelector('.equipment-footer')!.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=body.top&&r.bottom<=footer.top&&(hit===el||el.contains(hit));})).toBe(true);
   await page.screenshot({path:'test-results/equipment-panel-900-scrolled-control.png'});await page.keyboard.press('Enter');expect(await page.evaluate(()=>(window as any).fixtureRecord.armor)).toEqual([['helmet','delver-helmet']]);
  }
 });
}
