import type {Page} from '@playwright/test';
/** Native keyboard events queue Scene actions. Observe a full subsequent game frame
 * before asserting their effects; this never advances time or mutates game state. */
export async function pressAction(page:Page,key:string):Promise<void>{
 await page.keyboard.press(key);
 const deliveredFrame=await page.evaluate(()=>(window as any).vireldenDebug().timing.frames);
 await page.waitForFunction(frame=>(window as any).vireldenDebug().timing.frames>frame,deliveredFrame,{polling:'raf',timeout:5_000});
}
/** Short active windows cannot be sampled reliably with exponential polling. Return
 * the actual copied game/render snapshot observed on the requested animation frame. */
export async function observeAttackPhase(page:Page,phase:'windup'|'active'|'recovery'|'idle'):Promise<any>{
 const frame=await page.waitForFunction(expected=>{const s=(window as any).vireldenDebug();return s.attack.phase===expected?s:null;},phase,{polling:'raf',timeout:5_000});
 return frame.jsonValue();
}
