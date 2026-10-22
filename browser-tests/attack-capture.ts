import {expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
// Only observes the rendered canvas and read-only debug snapshot; never injects game state.
export async function captureAttack(page:Page,label:string,pointer=false){
 const capture=page.evaluate(()=>new Promise<Record<string,{png:string;state:ReturnType<NonNullable<Window['vireldenDebug']>>}>>((resolve,reject)=>{
  const frames:Record<string,{png:string;state:ReturnType<NonNullable<Window['vireldenDebug']>>}>={};
  const deadline=performance.now()+7000;let started=false;
  function sample(){
   const state=window.vireldenDebug!(),phase=state.attack.phase;
   if(phase!=='idle')started=true;
   if((started||phase==='idle')&&!frames[phase])frames[phase]={png:document.querySelector('canvas')!.toDataURL('image/png'),state};
   if(started&&phase==='idle'){resolve(frames);return;}
   if(performance.now()>deadline){reject(new Error('Attack did not complete while collecting rendered phases'));return;}
   requestAnimationFrame(sample);
  }requestAnimationFrame(sample);
 }));
 if(pointer){await page.mouse.down();await page.mouse.up();}else await page.keyboard.press('KeyF');const frames=await capture;
 await mkdir('test-results/spatial-combat',{recursive:true});
 for(const [phase,frame]of Object.entries(frames)){
  await writeFile(`test-results/spatial-combat/${label}-${phase}.png`,Buffer.from(frame.png.split(',')[1],'base64'));
  await writeFile(`test-results/spatial-combat/${label}-${phase}.json`,JSON.stringify(frame.state,null,2));
 }
 expect(Object.keys(frames).sort()).toEqual(['active','idle','recovery','windup']);
 for(const phase of ['windup','active','recovery']){
  const rig=frames[phase].state.character.rig;
  expect(rig.visible,`${label} ${phase} has a held weapon`).toBe(true);
  expect(rig.phase).toBe(phase);expect(rig.weapon).toBe(frames[phase].state.attack.weapon);
  expect(rig.grip).toEqual(rig.hand);
  expect(rig.pose).not.toBe('idle');
 }
 expect(frames.windup.state.character.rig.pose).not.toBe(frames.active.state.character.rig.pose);
 expect(frames.active.state.character.rig.pose).not.toBe(frames.recovery.state.character.rig.pose);
 return frames;
}
