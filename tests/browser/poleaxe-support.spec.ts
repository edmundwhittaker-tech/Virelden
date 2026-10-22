import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

test('actual rendered poleaxe primary and support grips stay registered through every facing and phase',async({page})=>{
 test.setTimeout(90_000);const observations:any[]=[],errors:string[]=[];const directory='test-results/poleaxe-support';await mkdir(directory,{recursive:true});page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/tests/fixtures/poleaxe-support.html');await page.waitForFunction(()=>(window as any).poleaxeFixtureSnapshot?.().ready,undefined,{timeout:15_000});
 const initial=await page.evaluate(()=>(window as any).poleaxeFixtureSnapshot());expect(initial.total).toBe(160);const captured=new Set<string>();
 try{for(let index=0;index<initial.total;index++){
  await page.getByLabel('Rendered poleaxe pose',{exact:true}).selectOption(String(index));
  await page.waitForFunction(index=>{const s=(window as any).poleaxeFixtureSnapshot();return s.index===index&&s.renderedIndex===index;},index,{timeout:5_000});
  const s=await page.evaluate(()=>(window as any).poleaxeFixtureSnapshot());observations.push(s);expect(errors).toEqual([]);expect(s.weaponTexture).toBe('ordinary-weapon-poleaxe');expect(s.weaponVisible).toBe(true);expect(s.visibleParts).toBe(15);
  const r=s.registration;expect(r).toBeTruthy();for(const key of ['primaryHand','supportHand','primaryGrip','supportGrip']){expect(r[key],`${s.facing} ${s.label} ${key}`).toBeTruthy();expect(Number.isFinite(r[key].x)&&Number.isFinite(r[key].y)).toBe(true);}
  const distance=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y);
  expect(distance(r.primaryHand,r.primaryGrip),`${s.facing} ${s.label} primary`).toBeLessThan(.05);
  expect(distance(r.supportHand,r.supportGrip),`${s.facing} ${s.label} support`).toBeLessThan(.05);
  expect(Math.abs(distance(r.primaryGrip,r.supportGrip)-11),`${s.facing} ${s.label} actual grip spacing`).toBeLessThan(.05);
  expect(s.gripAlpha.primary).toBeGreaterThanOrEqual(16);expect(s.gripAlpha.support).toBeGreaterThanOrEqual(16);
  expect(s.handLayers).toHaveLength(2);expect(s.handLayers.every((hand:any)=>hand.visible&&hand.texture===`ward-${s.view}`)).toBe(true);
  if(s.phase==='active'&&s.progress===0&&!captured.has(s.facing)||s.direction===6&&s.label==='carry'){
   await page.locator('canvas').screenshot({path:`${directory}/${s.facing}-${s.label}-previous-${s.previous}.png`});if(s.phase==='active')captured.add(s.facing);
  }
 }}finally{await writeFile(`${directory}/actual-rendered-grips.json`,JSON.stringify(observations,null,2));}
 expect(observations).toHaveLength(160);expect(new Set(observations.map(s=>s.facing)).size).toBe(6);
 expect(new Set(observations.map(s=>s.view))).toEqual(new Set(['front','rear']));expect(new Set(observations.map(s=>s.flipped))).toEqual(new Set([false,true]));
});
