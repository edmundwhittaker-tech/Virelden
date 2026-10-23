import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyAppearance,ENEMY_APPEARANCES} from '../.test-build/core/enemyAppearance.js';
import {enemyReceivingBody,GIANT_BODY,HEADLESS_BODY} from '../.test-build/core/enemyReceivingBody.js';
import {HUMAN_BODY,weaponTouchesBody,meleeFrame} from '../.test-build/core/meleeContact.js';
import {createAdventure,areaEnemies} from '../.test-build/core/adventure.js';
import {EXPEDITIONS} from '../.test-build/core/expeditionCatalog.js';

test('all24existing encounters preserve identities and roles; only the upper captain is giant',()=>{
 const entries=[];
 for(const area of ['station',...Object.keys(EXPEDITIONS)])for(const e of area==='station'?createAdventure().enemies:areaEnemies(area)){
  const before=structuredClone(e),appearance=enemyAppearance(area,e);assert.deepEqual(e,before);
  if(e.kind==='watcher')assert.equal(appearance,null,'bow role keeps real bow and arrows');
  else{assert.equal(appearance,ENEMY_APPEARANCES[`${area}:${e.id}`]);entries.push([`${area}:${e.id}`,appearance]);}
 }
 assert.equal(entries.length,18);assert.equal(Object.keys(ENEMY_APPEARANCES).length,18);
 assert.deepEqual(entries.filter(([,appearance])=>appearance==='iron_giant'),[['station:upper-captain','iron_giant']]);
 assert.ok(entries.some(([,appearance])=>appearance==='maw_skeleton'));
 assert.ok(entries.some(([,appearance])=>appearance==='headless_skeleton'));
 assert.ok(entries.some(([,appearance])=>appearance==='pale_shepherd_keeper'));
});

test('only upper-captain scales and headless targets omit the skull; other targets retain exact human capsules',()=>{
 assert.equal(enemyReceivingBody('station','upper-captain'),GIANT_BODY);
 for(const area of ['station',...Object.keys(EXPEDITIONS)])for(const e of areaEnemies(area))if(area!=='station'||e.id!=='upper-captain')assert.equal(enemyReceivingBody(area,e.id),ENEMY_APPEARANCES[`${area}:${e.id}`]==='headless_skeleton'?HEADLESS_BODY:HUMAN_BODY);
 assert.equal(enemyReceivingBody('record-annex','upper-captain'),HUMAN_BODY);
 assert.deepEqual(GIANT_BODY,HUMAN_BODY.map(body=>({a:{x:body.a.x*2,y:body.a.y*2},b:{x:body.b.x*2,y:body.b.y*2},radius:body.radius*2})));
});

test('all6weapons and8directions retain byte-identical ordinary human contact decisions',()=>{
 let observations=0;
 for(const weapon of ['sword','spear','hammer','axe','falchion','poleaxe'])for(let direction=0;direction<8;direction++)for(const progress of [0,.25,.5,.75,1]){
  const aim={x:Math.cos(direction*Math.PI/4),y:Math.sin(direction*Math.PI/4)},facing=direction>=3&&direction<=5?'west':'east',frame=meleeFrame(weapon,aim,facing,progress);
  for(let x=-120;x<=120;x+=30)for(let y=-90;y<=90;y+=30){
   const foot={x,y};assert.equal(weaponTouchesBody(frame,foot),weaponTouchesBody(frame,foot,enemyReceivingBody('station','raider')));observations++;
  }
 }
 assert.equal(observations,15120);
});

test('giant receiving hull accepts painted body height but excludes empty corners and outlying space',()=>{
 const point=(x,y)=>({capsules:[{a:{x,y},b:{x,y},radius:.1}]});
 for(const [x,y]of [[0,-150],[0,-100],[0,-40]])assert.equal(weaponTouchesBody(point(x,y),{x:0,y:0},GIANT_BODY),true);
 for(const [x,y]of [[70,-100],[55,-150],[120,-50],[0,10]])assert.equal(weaponTouchesBody(point(x,y),{x:0,y:0},GIANT_BODY),false);
 assert.equal(weaponTouchesBody(point(0,-100),{x:0,y:0}),false,'ordinary target is not accidentally taller');
 assert.equal(weaponTouchesBody(point(0,-100),{x:0,y:0},GIANT_BODY),true);
});


test('headless targets reject phantom skull-only contacts and preserve the exact torso and leg capsules',()=>{
 const point=(x,y)=>({capsules:[{a:{x,y},b:{x,y},radius:.1}]});
 assert.equal(HEADLESS_BODY[0],HUMAN_BODY[0]);assert.equal(HEADLESS_BODY[1],HUMAN_BODY[2]);
 assert.equal(weaponTouchesBody(point(0,-83),{x:0,y:0}),true,'ordinary skull remains hittable');
 assert.equal(weaponTouchesBody(point(0,-83),{x:0,y:0},HEADLESS_BODY),false,'empty headless skull space is not body');
 for(const position of [[0,-60],[0,-40],[0,-20]])assert.equal(weaponTouchesBody(point(...position),{x:0,y:0},HEADLESS_BODY),true);
 let headless=0;
 for(const area of ['station',...Object.keys(EXPEDITIONS)])for(const e of areaEnemies(area)){
  const appearance=ENEMY_APPEARANCES[`${area}:${e.id}`],body=enemyReceivingBody(area,e.id);
  if(appearance==='headless_skeleton'){headless++;assert.equal(body,HEADLESS_BODY);}
  else if(appearance!=='iron_giant')assert.equal(body,HUMAN_BODY);
 }
 assert.equal(headless,6);
});
