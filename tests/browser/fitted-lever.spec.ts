import {test,expect} from '@playwright/test';import {mkdir,writeFile} from 'node:fs/promises';
test('fitted player actual gauntlet image follows unchanged grip with fixed feet across all three mechanisms',async({page})=>{
 const dir='test-results/fitted-lever',observations:any[]=[],errors:string[]=[];await mkdir(dir,{recursive:true});page.on('pageerror',e=>errors.push(e.message));await page.goto('/tests/fixtures/fitted-lever.html');await page.waitForFunction(()=>(window as any).fittedLeverSnapshot?.().ready);
 for(let index=0;index<3;index++){await page.locator('#mechanism').selectOption(String(index));let foot:any;
  for(let sample=0;sample<=100;sample++){
   await page.locator('#sample').fill(String(sample));await page.locator('#sample').dispatchEvent('input');await page.waitForFunction(()=>{const s=(window as any).fittedLeverSnapshot();return s.drawId===s.renderedId;});
   const s=await page.evaluate(()=>(window as any).fittedLeverSnapshot());observations.push(s);expect(errors).toEqual([]);expect(s.index).toBe(index);expect(s.sample).toBe(sample);expect(s.actor.interaction.reached).toBe(true);expect(s.actor.rig.visible).toBe(false);if(!foot)foot=s.actor.foot;expect(s.actor.foot).toEqual(foot);
   const hand=s.actor.renderedHands.primaryHand;expect(hand).toBeTruthy();expect(Math.hypot(hand.x-s.target.x,hand.y-s.target.y)).toBeLessThan(.05);
   if(sample%25===0)await page.locator('canvas').screenshot({path:`${dir}/${s.mechanism.id}-${sample}.png`});
  }
 }
 await writeFile(`${dir}/actual-gauntlet-grip.json`,JSON.stringify(observations,null,2));expect(observations).toHaveLength(303);
});
