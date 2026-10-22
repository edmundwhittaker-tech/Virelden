import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENERY,VAULT_FOOTPRINT,groundDepth} from '../.test-build/core/scenery.js';
import {canStand,PILLARS,project,RADIUS,SIZE,SPAWN} from '../.test-build/core/game.js';
import {adventureCanStand,createAdventure,LOOT,LOCATIONS} from '../.test-build/core/adventure.js';
test('all solid artwork has an on-floor world footprint and blocks its centre',()=>{
 for(const prop of SCENERY){assert.ok(prop.x-prop.radius>=0&&prop.y-prop.radius>=-1920&&prop.x+prop.radius<=SIZE&&prop.y+prop.radius<=SIZE,prop.id);assert.equal(canStand(prop),false,prop.id);}
 assert.ok(canStand(SPAWN));assert.equal(new Set(PILLARS.map(p=>p.height)).size,1);
 assert.ok(VAULT_FOOTPRINT.y+VAULT_FOOTPRINT.height<=0,'vault is on inaccessible rear footing, not traversable court');
});
test('depth is ground-foot Y with deterministic bounded tie slots, never sprite top',()=>{
 const p=project({x:120,y:120});assert.ok(groundDepth(p.y,20)>groundDepth(p.y,0));assert.ok(groundDepth(p.y+.1,0)>groundDepth(p.y,80));
});
test('solid prop footprints leave all interaction approaches connected to spawn',()=>{
 const state=createAdventure();state.gatePhase='open';const grid=8,key=p=>`${p.x},${p.y}`;
 const start={x:320,y:320},seen=new Set([key(start)]),queue=[start];
 for(let i=0;i<queue.length;i++)for(const [dx,dy]of [[grid,0],[-grid,0],[0,grid],[0,-grid]]){const p={x:queue[i].x+dx,y:queue[i].y+dy};if(!seen.has(key(p))&&adventureCanStand(state,p)){seen.add(key(p));queue.push(p);}}
 for(const target of [...LOOT.map(l=>l.position),LOCATIONS.smith,LOCATIONS.lever,LOCATIONS.checkpoint]){const q=project(target);assert.ok(queue.some(p=>{const r=project(p);return Math.hypot(q.x-r.x,q.y-r.y)<32;}),JSON.stringify(target));}
});
