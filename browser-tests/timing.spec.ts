import {test,expect} from '@playwright/test';
test.use({trace:'off',video:'off',screenshot:'off'});
test('foreground simulation keeps pace independently of compositor frames',async({page})=>{
 await page.goto('/?debug=1');await page.waitForFunction(()=>typeof window.vireldenDebug==='function');await page.getByRole('button',{name:'Choose Vanguard',exact:true}).click();const before=await page.evaluate(()=>window.vireldenDebug!()),start=Date.now();await page.waitForTimeout(1500);const after=await page.evaluate(()=>window.vireldenDebug!());const elapsed=(Date.now()-start)/1000;console.log(JSON.stringify({before:before.timing,after:after.timing}));console.log(`Simulation pace: ${(after.time-before.time).toFixed(2)}s / ${elapsed.toFixed(2)}s wall clock`);expect(after.paused).toBe(false);expect(after.time-before.time).toBeGreaterThan(elapsed*.7);expect(after.time-before.time).toBeLessThan(elapsed*1.2);
});
