/** Seeded geometry/registration fixtures, not a browser completion or art-acceptance claim. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {EXPEDITIONS,SERVICE_STAIR_GROUND} from '../.test-build/core/expeditionCatalog.js';
import {expeditionCanStand,expeditionClearSegment,contains} from '../.test-build/core/expeditionGeometry.js';
import {createAdventure,activateArea,tick,adventureCanStand} from '../.test-build/core/adventure.js';
const area=EXPEDITIONS['record-annex'],shelves=area.props.filter(p=>p.art==='expedition-shelf');
const bounds=p=>({x:p.x-p.footprint.width/2,y:p.y-p.footprint.height/2,...p.footprint});
const registration=JSON.parse(readFileSync(new URL('../src/assets/expedition-v1/registration.json',import.meta.url),'utf8')).assets['record-shelf'];
test('freestanding shelf art has measured ground-registered footprint on floor outside solid partitions',()=>{
 assert.equal(shelves.length,5);
 for(const shelf of shelves){assert.deepEqual(shelf.footprint,{width:46,height:20});assert.equal(shelf.width,registration.displaySize[0]);assert.equal(shelf.originY,registration.origin[1]);assert.equal(shelf.width*registration.size[1]/registration.size[0],123);
  const box=bounds(shelf);for(const [sx,sy] of registration.opaqueFootprintScreenRelativeToGround){const p={x:shelf.x+sx*.625+sy*1.25,y:shelf.y+sy*1.25-sx*.625};assert.ok(contains(p,box),'reserved physical rectangle encloses every measured opaque foot corner');assert.ok(area.floors.some(f=>contains(p,f)));assert.ok(area.walls.every(w=>!contains(p,w)),'shelf foot must not be buried inside a wall');}
  assert.ok(area.walls.some(w=>shelf.x>w.x&&shelf.x<w.x+w.width&&box.y>w.y+w.height&&box.y-(w.y+w.height)===18),'shelves stand on visible ground18units in front of the wall face');
 }
});
test('shelf rectangles block real bodies, preserve clear foreground approach, and actual movement cannot cross them',()=>{
 for(const shelf of shelves){const box=bounds(shelf);assert.equal(expeditionCanStand(area,shelf),false);assert.equal(expeditionCanStand(area,{x:box.x-12,y:shelf.y}),false);assert.equal(expeditionCanStand(area,{x:shelf.x,y:box.y+box.height+12}),false);assert.equal(expeditionCanStand(area,{x:shelf.x,y:box.y+box.height+12.01}),true);
  const s=createAdventure();activateArea(s,'record-annex');s.enemies=[];s.position={x:shelf.x,y:shelf.y+48};for(let i=0;i<60;i++)tick(s,{x:1,y:-.5},1/60);assert.ok(adventureCanStand(s,s.position));assert.ok(s.position.y>box.y+box.height+12);assert.ok(Math.abs(s.position.x-shelf.x)<.001);assert.equal(expeditionClearSegment(area,{x:shelf.x,y:shelf.y+48},{x:shelf.x,y:shelf.y-48}),false);
 }
});
test('new shelf collision retains the broad gallery routes and all original enemy-home retreat rings',()=>{
 for(const [a,b]of[[{x:750,y:600},{x:120,y:600}],[{x:120,y:400},{x:550,y:400}],[{x:550,y:400},{x:550,y:440}],[{x:550,y:440},{x:650,y:440}],[{x:650,y:440},{x:650,y:400}],[{x:240,y:400},{x:240,y:160}],[{x:650,y:400},{x:650,y:180}]])assert.ok(expeditionClearSegment(area,a,b));
 for(const enemy of area.enemies)for(let i=0;i<32;i++){const angle=i*Math.PI/16;assert.ok(expeditionCanStand(area,{x:enemy.home.x+20*Math.cos(angle),y:enemy.home.y+20*Math.sin(angle)}),`${enemy.id} retreat ring`);}
 for(const stance of [...area.loot.map(l=>l.stance),...area.shortcuts.map(l=>l.stance),...area.exits.map(l=>l.stance)])assert.ok(expeditionCanStand(area,stance));
});
test('ordinary service-stair art stays entirely within the existing walkable landing including y860 returns',()=>{
 const {left,right,back,front}=SERVICE_STAIR_GROUND;assert.equal(front,18);
 for(const a of Object.values(EXPEDITIONS))for(const exit of a.exits.filter(e=>e.target))for(const dx of [left,right])for(const dy of [back,front]){const p={x:exit.position.x+dx,y:exit.position.y+dy};assert.ok(a.floors.some(f=>!f.requires&&contains(p,f)),`${a.id}:${exit.id} masonry landing lies on original floor`);assert.ok(a.walls.every(w=>!contains(p,w)));}
});
test('station service-stair masonry also stays on the original walkable station landing',async()=>{const {STATION_EXPEDITION_PORT}=await import('../.test-build/core/expeditionCatalog.js');const s=createAdventure();s.gatePhase='open';const {left,right,back,front}=SERVICE_STAIR_GROUND;for(const dx of [left,right])for(const dy of [back,front])assert.ok(adventureCanStand(s,{x:STATION_EXPEDITION_PORT.position.x+dx,y:STATION_EXPEDITION_PORT.position.y+dy}));});
