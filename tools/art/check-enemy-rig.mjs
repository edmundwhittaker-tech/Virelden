import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sample} from './enemy-rig.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../../src/assets/enemies-v1/manifest.json',import.meta.url),'utf8'));
let sockets=0,grips=0;
for(const [id,enemy]of Object.entries(manifest.enemies)){
 assert.equal(enemy.frames.length,18);
 assert.equal(enemy.idleBodyHeightScreen,id==='iron_giant'?176:id==='headless_skeleton'?79:88);
 for(const frame of enemy.frames){
   assert.deepEqual(frame.foot,{x:128,y:300});
   for(const p of Object.values(frame.hands)){assert.ok(p.x>=0&&p.x<256&&p.y>=0&&p.y<320);sockets++;}
   for(const e of frame.equipment){
     const p=frame.hands[e.hand];assert.deepEqual(e.position,{x:p.x,y:p.y});
     assert.ok(fs.existsSync(new URL('../../src/assets/enemies-v1/'+e.image,import.meta.url)));
     // Equipment-local grip lands at the fist exactly (no body-baked copy).
     assert.equal(e.scale.x,1);assert.equal(e.scale.y,1);grips++;
     if(e.secondaryHand){
       const q=frame.hands[e.secondaryHand],dx=e.secondaryGrip.x-e.grip.x,dy=e.secondaryGrip.y-e.grip.y;
       const x=p.x+Math.cos(e.rotation)*dx-Math.sin(e.rotation)*dy;
       const y=p.y+Math.sin(e.rotation)*dx+Math.cos(e.rotation)*dy;
       assert.ok(Math.hypot(x-q.x,y-q.y)<1e-8,'two-handed axe grip mismatch');
       const rail=manifest.equipment.axe.secondaryGripRail;
       assert.ok(e.secondaryGrip.x>=rail.start.x&&e.secondaryGrip.x<=rail.end.x,'secondary hand outside axe grip rail');
     }
   }
 }
 for(const direction of ['east','west','south-east','south-west','north-east','north-west']){
   const start=sample(manifest,id,direction,'attack',0,'active');assert.equal(start.frame.pose,'contact');
   assert.equal(start.flipped,direction.endsWith('west'));
   assert.equal(sample(manifest,id,direction,'attack',1e8).frame.pose,'recovery');
 }
}
console.log(`Validated 54 body frames, ${sockets} bounded hand targets, ${grips} equipment grips, 18 exact two-hand constraints and all mirrored/contact-onset selections.`);
