import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventure,serialize,interact,LOCATIONS,LOOT,attack,tick,derivedStats,equipArmor,train,retry,roll} from '../.test-build/core/adventure.js';
import {prepareCampaignSave,readCampaignSave,loadCampaign,persistCampaign,saveKeys} from '../.test-build/core/legacyCampaignSave.js';
import {grantArmor,ARMOR} from '../.test-build/core/equipment.js';
const memory=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const advance=(s,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)tick(s,{x:0,y:0},1/60);};

test('legacy migration preserves raw key and earned progress, grants cache contents, safely resumes and validates readback',()=>{
 const keys=saveKeys(false),storage=memory(),old=createAdventure('wayfarer');old.currency=415;old.owned.push('hammer');old.levels.hammer=2;old.levels.sword=1;old.enemies[0].hp=0;old.looted=['west-cache','transfer-cache'];old.shortcut=true;old.gatePhase='open';old.checkpoint={x:480,y:-1000};
 const raw=serialize(old);storage.setItem(keys.legacy,raw);const loaded=loadCampaign(storage,keys);assert.equal(loaded.status,'loaded');assert.equal(loaded.migrated,true);assert.equal(loaded.state.currency,415);assert.equal(loaded.state.levels.hammer,2);assert.equal(loaded.state.levels.sword,1);assert.equal(loaded.state.progression.xp,125);assert.equal(loaded.state.equipment.owned.includes('delver-chest'),true);assert.equal(loaded.state.equipment.owned.includes('delver-legs'),true);assert.equal(loaded.state.owned.includes('axe'),true);assert.deepEqual(loaded.state.position,{x:480,y:-1000});
 assert.equal(persistCampaign(storage,keys,loaded.state).ok,true);assert.equal(storage.getItem(keys.legacy),raw);const again=loadCampaign(storage,keys);assert.equal(again.migrated,false);assert.equal(again.state.progression.xp,125);assert.deepEqual(again.state.owned,loaded.state.owned);assert.equal(storage.values.size,2);
});
test('v3 has one authoritative armory, exact reward/world agreement and safe checkpoint coordinates',()=>{
 const s=createAdventure();s.position={...LOCATIONS.lever};interact(s);s.position={...LOOT[0].position};interact(s);const raw=prepareCampaignSave(s);assert.ok(raw);const data=JSON.parse(raw);assert.equal(data.world.owned,undefined);assert.equal(data.world.equipped,undefined);assert.equal(data.world.levels,undefined);const restored=readCampaignSave(raw);assert.equal(restored.progression.xp,30);assert.deepEqual(restored.position,restored.checkpoint);
 for(const change of [d=>{d.world.defeated=['madeup'];},d=>{d.world.defeated=['raider','raider'];},d=>{d.world.checkpoint=1;},d=>{d.world.completed=true;},d=>{d.extension.progression.earned=[];d.extension.progression.xp=0;},d=>{d.extension.armory.equipped='axe';},d=>{d.version=4;},d=>{d.world.currency=.5;}]){const bad=structuredClone(data);change(bad);assert.equal(readCampaignSave(JSON.stringify(bad)),null);}
});
test('save writes keep at most one last-known-good, recover corruption visibly and never touch legacy on failure',()=>{
 const keys=saveKeys(true),storage=memory(),s=createAdventure(),legacy=serialize(s);storage.setItem(keys.legacy,legacy);assert.equal(persistCampaign(storage,keys,s).ok,true);const first=storage.getItem(keys.current);s.currency=10;assert.equal(persistCampaign(storage,keys,s).ok,true);assert.equal(storage.getItem(keys.good),first);s.currency=20;assert.equal(persistCampaign(storage,keys,s).ok,true);assert.equal(storage.values.size,3);storage.setItem(keys.current,'{');const fallback=loadCampaign(storage,keys);assert.equal(fallback.status,'loaded');assert.equal(fallback.source,'last-known-good');assert.match(fallback.notice,/newest save/);assert.equal(fallback.state.currency,10);assert.equal(storage.getItem(keys.legacy),legacy);
 const broken={...storage,setItem(){throw Error('quota');}};assert.equal(persistCampaign(broken,keys,s).ok,false);assert.equal(storage.getItem(keys.legacy),legacy);assert.equal(storage.getItem(keys.current),'{');
});
test('write/readback failure is honest and a valid previous save remains recoverable',()=>{
 const keys=saveKeys(false),storage=memory(),s=createAdventure();assert.equal(persistCampaign(storage,keys,s).ok,true);const previous=storage.getItem(keys.current);s.currency=22;let writes=0;const flaky={...storage,setItem(key,value){storage.setItem(key,value);if(key===keys.current&&++writes===1)storage.setItem(key,'corrupt');}};assert.equal(persistCampaign(flaky,keys,s).ok,false);assert.equal(storage.getItem(keys.current),previous);assert.ok(readCampaignSave(storage.getItem(keys.good)));
});
test('unreadable progress never silently becomes a fresh save; inaccessible storage reports unavailable',()=>{
 const keys=saveKeys(false),storage=memory();storage.setItem(keys.current,'{');const corrupt=loadCampaign(storage,keys);assert.equal(corrupt.status,'corrupt');assert.match(corrupt.notice,/not been erased/);assert.equal(storage.getItem(keys.current),'{');assert.equal(loadCampaign({...storage,getItem(){throw Error('denied');}},keys).status,'unavailable');
});
test('armor swaps atomically preflight renderer and never heal even on max increases or death',()=>{
 const s=createAdventure();s.equipment=grantArmor(s.equipment,'marcher-chest');s.hp=30;s.stamina=20;const before=JSON.stringify(s.equipment);assert.equal(equipArmor(s,'chest','marcher-chest',()=>true,()=>false),false);assert.equal(JSON.stringify(s.equipment),before);assert.equal(s.maxHp,140);assert.equal(equipArmor(s,'chest','marcher-chest',()=>true,()=>true),true);assert.equal(s.maxHp,145);assert.equal(s.hp,30);assert.equal(s.stamina,20);s.hp=0;assert.equal(equipArmor(s,'chest','ward-chest',()=>true,()=>true),false);assert.equal(s.hp,0);
});
test('Ward incoming damage is normalized, light/heavy armor tradeoffs and weight affect real stamina',()=>{
 const s=createAdventure();assert.equal(derivedStats(s).damageMultiplier,1);s.equipment=grantArmor(s.equipment,'delver-chest');equipArmor(s,'chest','delver-chest',()=>true,()=>true);assert.ok(derivedStats(s).damageMultiplier>1);const cost=derivedStats(s).rollCost;const before=s.stamina;roll(s);assert.equal(s.stamina,before-cost);
});
test('real defeat awards XP once across retry/save/load and training does not implicitly rest',()=>{
 const s=createAdventure();s.position={x:200,y:200};s.enemies=[s.enemies[2]];const e=s.enemies[0];e.hp=1;e.position={x:230,y:170};e.phase='stagger';e.timer=100;s.aim={x:1,y:0};attack(s);advance(s,.4);assert.equal(s.progression.xp,100);advance(s,1);assert.equal(s.progression.xp,100);s.hp=0;retry(s);assert.equal(s.progression.xp,100);s.hp=20;assert.equal(train(s,'vigor'),true);assert.equal(s.maxHp,148);assert.equal(s.hp,20);assert.equal(train(s,'vigor'),false);const loaded=readCampaignSave(prepareCampaignSave(s));assert.equal(loaded.progression.xp,100);assert.equal(loaded.progression.attributes.vigor,1);assert.equal(loaded.enemies.find(e=>e.id==='captain').hp,0);
});

test('v3 rejects nested legacy world, missing cache grants, and a completed exit behind a closed gate',()=>{
 const s=createAdventure(),fresh=JSON.parse(prepareCampaignSave(s));fresh.world=JSON.parse(serialize(s));assert.equal(readCampaignSave(JSON.stringify(fresh)),null);
 s.position={...LOOT[0].position};interact(s);const loot=JSON.parse(prepareCampaignSave(s));loot.extension.equipment.owned=loot.extension.equipment.owned.filter(id=>id!=='delver-chest');assert.equal(readCampaignSave(JSON.stringify(loot)),null);
 const closed=createAdventure();closed.enemies.find(e=>e.id==='upper-captain').hp=0;closed.completed=true;closed.progression={schema:1,xp:200,attributes:{vigor:0,endurance:0,resolve:0},earned:['station:upper-captain','station:secure-exit']};assert.equal(prepareCampaignSave(closed),null);
});
test('hammer overhead hits forward once, never behind, and cannot cross a closed wall',()=>{
 for(const rear of [false,true]){const s=createAdventure();s.position={x:200,y:200};s.owned.push('hammer');s.equipped='hammer';s.aim={x:1,y:0};s.enemies=[s.enemies[0]];const e=s.enemies[0];Object.assign(e,{position:rear?{x:180,y:220}:{x:220,y:180},phase:'stagger',timer:100});attack(s);advance(s,.8);assert.equal(e.hp,rear?75:23);advance(s,.2);assert.equal(e.hp,rear?75:23);}
});

test('Resolve is an explicit five-defense training choice, comparable to a health point',()=>{
 const s=createAdventure();s.progression={schema:1,xp:100,attributes:{vigor:0,endurance:0,resolve:0},earned:['station:captain']};s.hp=50;assert.equal(train(s,'resolve'),true);assert.equal(derivedStats(s).defense,21);assert.equal(s.hp,50);assert.equal(derivedStats(s).damageMultiplier,132/142);
});
test('missing current save with valid previous-good still shows a visible fallback notice',()=>{
 const keys=saveKeys(false),storage=memory();storage.setItem(keys.good,prepareCampaignSave(createAdventure()));const result=loadCampaign(storage,keys);assert.equal(result.status,'loaded');assert.equal(result.source,'last-known-good');assert.match(result.notice,/Earlier valid progress/);
});

test('an older game never overwrites an unknown future-version current save with its fallback',()=>{
 const keys=saveKeys(false),storage=memory(),s=createAdventure(),future=JSON.stringify({version:4,newerProgress:'retained'});storage.setItem(keys.current,future);storage.setItem(keys.good,prepareCampaignSave(s));assert.equal(loadCampaign(storage,keys).status,'corrupt');assert.equal(persistCampaign(storage,keys,s).ok,false);assert.equal(storage.getItem(keys.current),future);assert.equal(storage.values.size,2);
});

test('quota failure while reserving the previous-good copy cannot overwrite current progress',()=>{
 const keys=saveKeys(false),storage=memory(),s=createAdventure();assert.equal(persistCampaign(storage,keys,s).ok,true);const previous=storage.getItem(keys.current);s.currency=99;const failBackup={...storage,setItem(key,value){if(key===keys.good)throw Error('quota');storage.setItem(key,value);}};assert.equal(persistCampaign(failBackup,keys,s).ok,false);assert.equal(storage.getItem(keys.current),previous);
});
test('all original version-one cache discoveries migrate to usable inventory without reclearing encounters',()=>{
 const s=createAdventure('wayfarer');s.currency=87;s.owned=['spear','hammer','sword'];s.levels.hammer=2;s.looted=LOOT.map(l=>l.id);s.enemies.find(e=>e.id==='captain').hp=0;const legacy={...JSON.parse(serialize(s)),version:1,completed:true};delete legacy.gateOpen;delete legacy.checkpoint;
 const migrated=readCampaignSave(JSON.stringify(legacy));assert.ok(migrated);assert.equal(migrated.completed,false);assert.equal(migrated.currency,87);assert.equal(migrated.levels.hammer,2);assert.equal(migrated.enemies.find(e=>e.id==='captain').hp,0);assert.ok(migrated.owned.includes('axe'));for(const slot of ['helmet','chest','gauntlets','legs'])assert.ok(migrated.equipment.owned.includes(`delver-${slot}`));assert.ok(prepareCampaignSave(migrated));
});
