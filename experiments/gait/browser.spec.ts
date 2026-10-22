import{test,expect}from'@playwright/test';import{writeFile}from'node:fs/promises';
for(const route of['east','northeast','southeast','turns'])test(`controlled Phaser gait ${route}`,async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/gait.html');await page.waitForFunction(()=>!!(window as any).gaitHarness?.ready);
 for(const time of[.15,.32,.48,.8,1.2,1.7,2.2,2.7,3.5]){
  const snapshot=await page.evaluate(({route,time})=>(window as any).gaitHarness.render({route,time,markers:true,follow:true}),{route,time});
  expect(snapshot.metrics.gameplayDefaultChanged).toBe(false);expect(snapshot.metrics.newMaxSupportSlidePxPerSecond).toBeLessThan(1e-6);expect(snapshot.metrics.maxReachError).toBeLessThan(1e-6);expect(snapshot.metrics.maxLegLengthError).toBeLessThan(1e-6);expect(snapshot.actors).toHaveLength(4);
  for(const actor of snapshot.actors){expect(actor.layers).toHaveLength(15);expect(actor.layers.every((p:any)=>p.visible)).toBe(true);expect(actor.rig.texture).toBe('ordinary-weapon-sword');expect(actor.rig.visible).toBe(true);}
  if([.48,1.2,2.7].includes(time)){const file=testInfo.outputPath(`${route}-${time.toFixed(2)}.png`);await page.screenshot({path:file,fullPage:true});await testInfo.attach(`${route}-${time}`,{path:file,contentType:'image/png'});}
 }
 await page.evaluate(({route})=>{(window as any).gaitHarness.render({route,time:0});(window as any).gaitHarness.startRecording();(window as any).gaitHarness.play();},{route});await page.waitForTimeout(4100);await page.evaluate(()=>(window as any).gaitHarness.pause());const recording=await page.evaluate(()=>(window as any).gaitHarness.stopRecording());expect(recording.metrics.samples).toBeGreaterThan(30);expect(recording.metrics.maxRenderedAnkleError).toBeLessThan(1e-4);expect(recording.metrics.maxRenderedSupportDriftPxPerSecond).toBeLessThan(1e-4);const metricsFile=testInfo.outputPath(`${route}-render-metrics.json`);await writeFile(metricsFile,JSON.stringify(recording,null,2));await testInfo.attach(`${route}-render-metrics`,{path:metricsFile,contentType:'application/json'});expect(errors).toEqual([]);
});
