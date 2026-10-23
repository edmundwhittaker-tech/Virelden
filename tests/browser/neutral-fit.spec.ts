import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
test('native 88px released/reference versus prototype neutral fit, all sets and representative mixes',async({page})=>{
 const dir='test-results/neutral-fit',observations:any[]=[],errors:string[]=[];await mkdir(dir,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/fixtures/neutral-fit.html');await page.waitForFunction(()=>(window as any).neutralFitSnapshot?.().ready);
 for(const view of ['front','rear','front-west','rear-west'])for(const weapon of ['sword','spear','unarmed']){
  await page.locator('#view').selectOption(view);await page.locator('#weapon').selectOption(weapon);await page.waitForFunction(()=>{const s=(window as any).neutralFitSnapshot();return s.renderedId===s.drawId;});
  const s=await page.evaluate(()=>(window as any).neutralFitSnapshot());observations.push(s);expect(errors).toEqual([]);expect(s.errors).toEqual([]);expect(s.actors).toHaveLength(12);
  for(const actor of s.actors){expect(actor.layers.filter((p:any)=>p.visible)).toHaveLength(15);expect(actor.motion).toBe('idle');expect(actor.flipped).toBe(view.endsWith('west'));expect(actor.view).toBe(view.startsWith('rear')?'rear':'front');
   if(weapon!=='unarmed'){const r=actor.registration;expect(r).toBeTruthy();expect(Math.hypot(r.primaryHand.x-r.primaryGrip.x,r.primaryHand.y-r.primaryGrip.y)).toBeLessThan(.05);}
  }
  await page.locator('canvas').screenshot({path:`${dir}/${view}-${weapon}-native.png`});
 }
 await writeFile(`${dir}/native-transforms.json`,JSON.stringify(observations,null,2));expect(observations).toHaveLength(12);
});
