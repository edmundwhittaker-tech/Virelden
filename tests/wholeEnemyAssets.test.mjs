import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
test('complete enemy atlases retain fixed feet, bounded frames and honest basic giant/source limits',()=>{
 const root='src/assets/enemies-whole-v1',manifest=read(`${root}/manifest.json`);
 assert.equal(manifest.runtimeRigRequired,false);assert.equal(manifest.frameCount,18);assert.deepEqual(manifest.frameSize,[448,384]);assert.deepEqual(manifest.foot,{x:160,y:352});
 for(const [id,enemy]of Object.entries(manifest.enemies)){
  assert.equal(enemy.frames.length,18);assert.equal(enemy.runtimeScale,id==='iron_giant'?1:.5);assert.equal(enemy.idleBodyHeightScreen,id==='iron_giant'?176:id==='headless_skeleton'?79:88);
  assert.ok(fs.statSync(new URL(`../${root}/${enemy.sprite}`,import.meta.url)).size>1000);
  for(const [index,frame]of enemy.frames.entries()){
   assert.equal(frame.index,index);assert.deepEqual(frame.rect,[index%6*448,Math.floor(index/6)*384,448,384]);assert.deepEqual(frame.foot,manifest.foot);
   const [left,top,right,bottom]=frame.alphaBounds;assert.ok(left>=2&&top>=2&&right<=446&&bottom<=382);
   if(id==='iron_giant'){assert.deepEqual(frame.layerOrder,['body']);assert.deepEqual(frame.equipment,[]);assert.equal(frame.equipmentIncluded,false);}
   else assert.ok(frame.equipment.length>0);
  }
 }
 assert.ok(manifest.limitations.some(limit=>limit.includes('No authored hurt')));
 const keeper=read('src/assets/npc-enemy-sprites/pale_shepherd_keeper/manifest.json');
 assert.deepEqual(keeper.frameSize,[384,384]);assert.deepEqual(keeper.foot,{x:176,y:304});assert.equal(keeper.runtimeScale,.5);assert.equal(keeper.attachments.supported,false);
 for(const view of Object.values(keeper.views)){assert.equal(view.frames.length,24);assert.deepEqual(view.phaseFrames.active,[15]);}
});
