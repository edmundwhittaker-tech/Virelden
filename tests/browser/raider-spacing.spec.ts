import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

test('observed close overlap misses painted sword sweep; real-key retreat reaches registered contact',async({page})=>{
 test.setTimeout(45_000);const directory='test-results/raider-spacing',errors:string[]=[];await mkdir(directory,{recursive:true});page.on('pageerror',error=>errors.push(error.message));
 for(const spaced of [false,true]){
  const label=spaced?'reachable-spaced-hit':'observed-close-overlap-miss';await page.goto('/tests/fixtures/raider-spacing.html');
  await page.waitForFunction(()=>(window as any).raiderSpacingSnapshot?.().ready,undefined,{timeout:15_000,polling:'raf'});await page.locator('canvas').focus();
  const initial=await page.evaluate(()=>(window as any).raiderSpacingSnapshot());
  expect(initial.position).toEqual({x:226.19842407970074,y:215.37196753574068});expect(initial.foePosition).toEqual({x:227.42508023961346,y:198.7818175746037});expect(initial.distance).toBeCloseTo(15.521810529448175,8);expect(initial.damage).toBe(0);
  if(spaced){
   try{await page.keyboard.down('KeyA');await page.keyboard.down('KeyS');await page.waitForFunction(()=>(window as any).raiderSpacingSnapshot().distance>=45,undefined,{timeout:5_000,polling:'raf'});}finally{await page.keyboard.up('KeyA');await page.keyboard.up('KeyS');}
   const moved=await page.evaluate(()=>(window as any).raiderSpacingSnapshot());expect(moved.movementFrames).toBeGreaterThan(0);expect(moved.position).not.toEqual(initial.position);expect(moved.walkable).toBe(true);expect(moved.distance).toBeGreaterThanOrEqual(45);expect(moved.distance).toBeLessThan(70);expect(moved.damage).toBe(0);
   const box=await page.locator('canvas').boundingBox();expect(box).not.toBeNull();const dx=moved.enemyFoot.x-moved.heroFoot.x,dy=moved.enemyFoot.y-moved.heroFoot.y,length=Math.hypot(dx,dy),x=moved.heroFoot.x-moved.camera.x+dx/length*120,y=moved.heroFoot.y-moved.camera.y+dy/length*120;
   await page.mouse.move(box!.x+x/640*box!.width,box!.y+y/400*box!.height);const aimed=await page.evaluate(()=>(window as any).raiderSpacingSnapshot());expect(aimed.pointerEvent.logicalGame).toEqual({width:640,height:400});expect(aimed.aim.x*dx/length+aimed.aim.y*dy/length).toBeGreaterThan(.999);

  }
  await page.keyboard.press('KeyF');await page.waitForFunction(()=>{const s=(window as any).raiderSpacingSnapshot();return s.done&&s.captureNames.includes('result');},undefined,{timeout:10_000,polling:'raf'});
  const observed=await page.evaluate(()=>(window as any).raiderSpacingSnapshot(true));
  expect(errors).toEqual([]);expect(observed.walkable).toBe(true);expect(observed.character.texture).toBe('modular-plate');expect(observed.character.parts).toHaveLength(15);expect(observed.character.rig.texture).toBe('ordinary-weapon-sword');expect(observed.enemy.texture).toBe('plate-knight-se-v1');
  expect(observed.result).toBe(spaced?'hit':'miss');expect(observed.damage).toBe(spaced?30:0);expect(observed.foeHp).toBe(spaced?970:1000);expect(observed.attack.hit).toEqual(spaced?['audit']:[]);
  if(spaced){expect(observed.attack.contacts.audit).toBeGreaterThanOrEqual(0);expect(observed.attack.contacts.audit).toBeLessThanOrEqual(1);}else{expect(observed.attack.contacts).toEqual({});expect(observed.movementFrames).toBe(0);expect(observed.attack.phase).toBe('recovery');}
  expect(Object.keys(observed.captures).sort()).toEqual(['first-active','result']);
  for(const [phase,capture]of Object.entries(observed.captures) as [string,any][]){
   const r=capture.state.character.registration;expect(Math.hypot(r.primaryHand.x-r.primaryGrip.x,r.primaryHand.y-r.primaryGrip.y)).toBeLessThan(.001);
   await writeFile(`${directory}/${label}-${phase}.png`,Buffer.from(capture.png.split(',')[1],'base64'));await writeFile(`${directory}/${label}-${phase}.json`,JSON.stringify({fixture:'Isolated fixed-target production-renderer spacing test; not an earned expedition route',captureBounds:capture.bounds,...capture.state},null,2));
  }
  await page.locator('canvas').screenshot({path:`${directory}/${label}-final.png`});
  // The bounded first-contact/end observation stays stable across subsequent painted frames.
  await page.evaluate(()=>new Promise<void>(resolve=>{let n=0;const next=()=>{if(++n===3)resolve();else requestAnimationFrame(next);};requestAnimationFrame(next);}));
  const stable=await page.evaluate(()=>(window as any).raiderSpacingSnapshot());expect(stable.foeHp).toBe(observed.foeHp);expect(stable.attack.hit).toEqual(observed.attack.hit);
  console.log('RAIDER_SPACING_ACTUAL_CONTACT',JSON.stringify({label,distance:observed.distance,movementFrames:observed.movementFrames,result:observed.result,damage:observed.damage,contact:observed.attack.contacts.audit??null,captures:Object.keys(observed.captures)}));
 }
});
