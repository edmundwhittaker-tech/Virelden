import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {captureAttack} from './attack-capture';
const state=(page:Page)=>page.evaluate(()=>window.vireldenDebug!());

/** Real production game, native keys and read-only snapshots. No scene/state
 * replacement, timestep override or debug mutation is used by this proof. */
for(const loadout of ['Vanguard','Wayfarer'])test(`whole-character ${loadout} idle/walk → existing attack/roll → idle transitions`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/?qa=1&debug=1');await page.getByRole('button',{name:`Choose ${loadout}`,exact:true}).click();await expect.poll(async()=>(await state(page)).paused).toBe(false);
 const initial=await state(page);expect(initial.character.kind).toBe('whole-character-sprite');expect(initial.character.fixedPrototypeAppearance).toBe(true);
 await page.evaluate(()=>{
  const target=window as any;target.wholeSpriteProof={frames:{},done:false};const deadline=performance.now()+8000;
  function sample(){
   const proof=target.wholeSpriteProof,s=window.vireldenDebug!(),c=s.character;
   const key=`${c.kind}-${c.motion}-${s.attack.phase}-${c.frame}-${c.flipped?'left':'right'}`;
   if(!proof.frames[key]&&Object.keys(proof.frames).length<40){
    const source=document.querySelector('canvas')!,bounds={x:Math.max(0,Math.min(source.width-320,Math.round(s.screen.x-160))),y:Math.max(0,Math.min(source.height-320,Math.round(s.screen.y-180))),width:320,height:320};
    const crop=document.createElement('canvas');crop.width=320;crop.height=320;crop.getContext('2d')!.drawImage(source,bounds.x,bounds.y,320,320,0,0,320,320);
    proof.frames[key]={png:crop.toDataURL(),bounds,state:s};
   }
   if(proof.done||performance.now()>deadline){proof.done=true;return;}requestAnimationFrame(sample);
  }requestAnimationFrame(sample);
 });
 await page.locator('canvas').focus();await page.keyboard.down('KeyS');await page.keyboard.down('KeyD');await page.waitForTimeout(380);await page.keyboard.up('KeyD');await page.keyboard.up('KeyS');
 await expect.poll(async()=>(await state(page)).character.walking).toBe(false);
 await page.keyboard.down('KeyA');await page.waitForTimeout(100);await page.keyboard.up('KeyA');await expect.poll(async()=>(await state(page)).character.walking).toBe(false);
 await page.waitForFunction(()=>Object.values((window as any).wholeSpriteProof.frames).some((frame:any)=>frame.state.character.kind==='whole-character-sprite'&&frame.state.character.motion==='idle'&&frame.state.character.flipped));
 const attacks=await captureAttack(page,`whole-character-transition-${loadout.toLowerCase()}`);
 for(const phase of ['windup','active','recovery']){
  const c=attacks[phase].state.character;expect(c.kind).toBe('modular-15-part');expect(c.coverage).toEqual({kind:'legacy-action-fallback',reason:'missing-action-art'});
  expect(c.rig.texture).toBe(`ordinary-weapon-${loadout==='Vanguard'?'sword':'spear'}`);
 }
 await expect.poll(async()=>(await state(page)).stamina).toBe((await state(page)).maxStamina);
 const rolling=page.waitForFunction(()=>{const s=window.vireldenDebug!();return s.rollTimer>0&&s.character.motion==='roll'?s:null;},undefined,{polling:'raf'});
 await page.keyboard.press('Space');const roll=await (await rolling).jsonValue();expect(roll.character.coverage).toEqual({kind:'legacy-action-fallback',reason:'missing-action-art'});
 await expect.poll(async()=>(await state(page)).rollTimer).toBe(0);await expect.poll(async()=>(await state(page)).character.kind).toBe('whole-character-sprite');
 const end=await state(page);expect(end.equipped).toBe(initial.equipped);expect(end.equipment).toEqual(initial.equipment);expect(end.levels).toEqual(initial.levels);
 const frames=await page.evaluate(()=>{(window as any).wholeSpriteProof.done=true;return (window as any).wholeSpriteProof.frames;}) as Record<string,{png:string;bounds:any;state:any}>;
 const observations=Object.values(frames);expect(observations.some(frame=>frame.state.character.kind==='whole-character-sprite'&&frame.state.character.motion==='walk')).toBe(true);expect(observations.some(frame=>frame.state.character.motion==='roll')).toBe(true);
 const directory=`test-results/whole-character-${loadout.toLowerCase()}`;await mkdir(directory,{recursive:true});
 for(const [key,frame]of Object.entries(frames)){
  const c=frame.state.character;if(c.kind==='whole-character-sprite'){
   expect(c.parts).toEqual(['whole-character']);expect(c.view).toBe('front');expect(c.layers[0].scaleX).toBe(c.layers[0].scaleY);
   expect(c.renderedBodyRoot.x).toBeCloseTo(c.foot.x,5);expect(c.renderedBodyRoot.y).toBeCloseTo(c.foot.y,5);
   expect(Math.hypot(c.registration.primaryHand.x-c.registration.primaryGrip.x,c.registration.primaryHand.y-c.registration.primaryGrip.y)).toBeLessThan(.001);
   expect(c.rig.supportGripHeld).toBe(false);expect(c.supportHand).toBeNull();
  }
  await writeFile(`${directory}/${key}.png`,Buffer.from(frame.png.split(',')[1],'base64'));
  await writeFile(`${directory}/${key}.json`,JSON.stringify({fixture:'Actual production game with native input. Transitional local proof; action art and appearance variants missing.',captureBounds:frame.bounds,...frame.state},null,2));
 }
 await page.screenshot({path:`${directory}/actual-game-final.png`,fullPage:true});expect(errors).toEqual([]);
});

test('seeded all-equipment visual proof retains item stats while exposing fixed Ward to mixed legacy-action appearance changes',async({page})=>{
 test.setTimeout(180_000);
 const c={...(await import('../.test-build/core/adventure.js')),...(await import('../.test-build/core/campaignSave.js')),...(await import('../.test-build/core/expeditionCatalog.js')),...(await import('../.test-build/core/progression.js')),...(await import('../.test-build/core/rewardCatalog.js'))};
 const legacy=JSON.stringify({version:2,archetype:'vanguard',currency:500,owned:['sword','spear','hammer'],levels:{sword:0,spear:0,hammer:0},equipped:'sword',looted:['west-cache','north-cache','south-cache','transfer-cache'],shortcut:true,defeated:['raider','watcher','captain','ascent-raider','ascent-watcher','ascent-guard','transfer-raider','transfer-watcher','transfer-guard','upper-captain','watch-raider','watch-watcher'],gateOpen:true,checkpoint:0,completed:true});
 const seeded=c.readCampaignSave(legacy);expect(seeded).not.toBeNull();
 // Explicit, validator-roundtripped prior progress fixture, NOT an earned route.
 for(const area of ['cistern-viaduct','record-annex']){
  c.captureArea(seeded);c.activateArea(seeded,area);
  for(const enemy of seeded.enemies){enemy.hp=0;seeded.progression=c.awardReward(seeded.progression,`${area}:${enemy.id}`,c.CAMPAIGN_REWARDS);seeded.currency+=enemy.reward;}
  for(const loot of c.EXPEDITIONS[area].loot){seeded.position={...loot.stance};expect(c.interact(seeded)).toBe(true);}
 }
 c.captureArea(seeded);c.activateArea(seeded,'station');const raw=c.prepareCampaignSave(seeded);expect(raw).not.toBeNull();const restored=c.readCampaignSave(raw);expect(restored.equipment.owned).toHaveLength(12);expect(restored.owned).toHaveLength(6);
 await page.addInitScript(raw=>{localStorage.setItem('virelden-underworks-qa-v4',raw);},raw);await page.goto('/?qa=1&debug=1');await page.waitForFunction(()=>typeof window.vireldenDebug==='function');await expect.poll(async()=>(await state(page)).paused).toBe(false);
 const directory='test-results/whole-character-equipment';await mkdir(directory,{recursive:true});
 async function evidence(label:string){const s=await state(page);expect(s.character.fixedPrototypeAppearance).toBe(true);expect(s.character.appearance).toBe('approved-starter-ward');await page.screenshot({path:`${directory}/${label}-idle.png`,fullPage:true});await writeFile(`${directory}/${label}-idle.json`,JSON.stringify({fixture:'Seeded valid-v4 isolated all-equipment visual proof, not earned gameplay',...s},null,2));await expect.poll(async()=>(await state(page)).stamina).toBe((await state(page)).maxStamina);const frames=await captureAttack(page,`whole-equipment-${label}`);expect(frames.active.state.character.kind).toBe('modular-15-part');expect(frames.active.state.character.coverage.reason).toBe('missing-action-art');}
 for(const set of ['delver','marcher','ward'])for(const slot of ['helmet','chest','gauntlets','legs']){
  await page.keyboard.press('KeyI');await page.getByRole('button',{name:'Armor',exact:true}).click();await page.locator(`[data-focus="slot-${slot}"]`).click();await page.locator(`[data-focus="armor-${set}-${slot}"]`).click();await page.getByRole('button',{name:'Equip this piece',exact:true}).click();expect((await state(page)).equipment.equipped[slot]).toBe(`${set}-${slot}`);await page.keyboard.press('Escape');await evidence(`${set}-${slot}`);
 }
 for(const id of ['sword','spear','hammer','axe','falchion','poleaxe']){
  await page.keyboard.press('KeyI');await page.getByRole('button',{name:'Weapons',exact:true}).click();await page.locator(`[data-focus="weapon-${id}"]`).click();if((await state(page)).equipped!==id)await page.getByRole('button',{name:'Equip weapon',exact:true}).click();await page.keyboard.press('Escape');expect((await state(page)).equipped).toBe(id);await evidence(`weapon-${id}`);
  const s=await state(page);expect(s.character.rig.attachment).toBe('one-handed-carry-only');expect(s.character.rig.supportGripHeld).toBe(false);
 }
});
