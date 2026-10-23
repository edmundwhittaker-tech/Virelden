import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
test('actual Phaser idle/walk source roots and carry grips stay registered across mirroring, rotation and uniform scale',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await mkdir('test-results/whole-character-effects',{recursive:true});
 for(const view of ['front','rear'])for(const motion of ['idle','walk'])for(const flipped of [false,true])for(const [angle,size]of [[0,1],[27,1.2],[-19,.85]]){
  await page.goto(`/tests/fixtures/whole-character-effects.html?view=${view}&motion=${motion}&flipped=${flipped?1:0}&angle=${angle}&size=${size}`);await page.waitForFunction(()=>(window as any).wholeCharacterEffectsSnapshot?.().ready);
  const snapshot=await page.evaluate(()=>(window as any).wholeCharacterEffectsSnapshot()),c=snapshot.character;
  expect(errors).toEqual([]);expect(c.kind).toBe('whole-character-sprite');expect(c.renderedBodyRoot.x).toBeCloseTo(320,5);expect(c.renderedBodyRoot.y).toBeCloseTo(250,5);
  expect(c.layers[0].scaleX).toBeCloseTo(c.layers[0].scaleY,7);expect(c.layers[0].rotation).toBeCloseTo(angle*Math.PI/180,7);
  expect(Math.hypot(c.registration.primaryHand.x-c.registration.primaryGrip.x,c.registration.primaryHand.y-c.registration.primaryGrip.y)).toBeLessThan(.001);
  expect(c.registration.supportHand).toBeNull();expect(c.rig.supportGripHeld).toBe(false);
  expect(c.view).toBe(view);
  const label=`${view}-${motion}-${flipped?'left':'right'}-${angle}-${size}`;await page.locator('canvas').screenshot({path:`test-results/whole-character-effects/${label}.png`});await writeFile(`test-results/whole-character-effects/${label}.json`,JSON.stringify(snapshot,null,2));
 }
});
