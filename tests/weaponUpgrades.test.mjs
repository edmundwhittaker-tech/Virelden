import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventure, attack, tick, equip, equipArmor, upgrade, weaponDamage, armory, equipmentContext, atForge, atCheckpoint, LOCATIONS, ARCHETYPES} from '../.test-build/core/adventure.js';
import {WEAPON_IDS, WEAPON_CATALOG, upgradedDamage} from '../.test-build/core/weaponCatalog.js';
import {grantArmor} from '../.test-build/core/equipment.js';
import {buildEquipmentPanelModel} from '../.test-build/core/equipmentPanelView.js';
import {prepareCampaignSave, readCampaignSave} from '../.test-build/core/campaignSave.js';
const assets = {armorReady: () => true, weaponReady: () => true, supportHand: true};
const capabilities = {supportHand: true, visualReady: () => true};
const panel = s => buildEquipmentPanelModel({equipment:s.equipment, armory:armory(s), progression:s.progression,
 base:ARCHETYPES[s.archetype], context:equipmentContext(s), atCheckpoint:atCheckpoint(s), atForge:atForge(s), currency:s.currency}, assets);
function reload(s) {
 const raw = prepareCampaignSave(s); assert.equal(typeof raw, 'string');
 const loaded = readCampaignSave(raw); assert.ok(loaded); return loaded;
}
/** Use a copy of the durable save, a stationary surviving target and the real attack/tick contact path. */
function actualHit(s, expected) {
 const duel = reload(s); duel.position = {x:200,y:200}; duel.aim = {x:1,y:0};
 const position = {x:240.625,y:159.375}; // 65 projected pixels, within every weapon's forward contact.
 duel.enemies = [{id:'raider',kind:'raider',position,home:{...position},hp:1000,maxHp:1000,phase:'stagger',timer:100,aim:{x:-1,y:0},reward:0}];
 assert.equal(attack(duel), true);
 for(let n=0;n<200&&duel.attack.phase!=='idle';n++) tick(duel,{x:0,y:0},1/60);
 assert.equal(duel.attack.phase, 'idle'); assert.equal(1000-duel.enemies[0].hp, expected);
 assert.deepEqual(duel.attack.hit, ['raider']);
}
for(const id of WEAPON_IDS) test(`${id}: forge spend, displayed effective damage, real hits, swaps and v4 reload retain +1/+2`, () => {
 let s = createAdventure(); s.owned = [...WEAPON_IDS]; s.currency = 200; s.position = {...LOCATIONS.smith};
 assert.equal(equip(s,id,capabilities), true);
 const base = WEAPON_CATALOG[id].damage;
 const unchanged = Object.fromEntries(['range','cost','windup','active','recovery','stagger'].map(key=>[key,WEAPON_CATALOG[id][key]]));
 actualHit(s,base);
 for(const level of [1,2]) {
  s.position = {...LOCATIONS.smith}; const before = s.currency, cost = level===1?30:60;
  assert.equal(upgrade(s), true); assert.equal(s.currency,before-cost); assert.equal(s.levels[id],level);
  const expected = base*(1+level*.25); const model = panel(s), candidate = model.weapons.find(c=>c.item.id===id);
  assert.equal(candidate.upgrade,level); assert.equal(candidate.damage,expected); assert.equal(candidate.upgradeDamage,base*level*.25);
  assert.equal(model.upgrade.damage,expected); assert.equal(model.upgrade.nextDamage,level===2?null:base*1.5);
  assert.equal(weaponDamage(s),expected); assert.equal(upgradedDamage(armory(s)),expected); assert.match(s.message,new RegExp(`Damage .* → ${expected}\\.`));
  const other = id==='sword'?'spear':'sword'; assert.equal(equip(s,other,capabilities),true);
  assert.equal(weaponDamage(s),WEAPON_CATALOG[other].damage); assert.equal(panel(s).weapons.find(c=>c.item.id===id).damage,expected);
  assert.equal(equip(s,id,capabilities),true); assert.equal(weaponDamage(s),expected);
  s.equipment=grantArmor(s.equipment,'delver-chest'); assert.equal(equipArmor(s,'chest','delver-chest',()=>true,()=>true),true);
  assert.equal(weaponDamage(s),expected); assert.equal(panel(s).weapons.find(c=>c.item.id===id).damage,expected);
  s=reload(s); assert.equal(s.equipped,id); assert.equal(s.levels[id],level); assert.equal(s.currency,before-cost);
  assert.equal(panel(s).weapons.find(c=>c.item.id===id).damage,expected); actualHit(s,expected);
 }
 const currency=s.currency; s.position={...LOCATIONS.smith}; assert.equal(upgrade(s),false); assert.equal(s.currency,currency); assert.equal(s.levels[id],2);
 assert.deepEqual(Object.fromEntries(Object.keys(unchanged).map(key=>[key,WEAPON_CATALOG[id][key]])),unchanged,'upgrading changes damage only');
});

test('forge damage preview remains truthful when away, poor or capped, and never mutates the armory', () => {
 const s=createAdventure(), snapshot=JSON.stringify(armory(s));
 let model=panel(s); assert.equal(model.upgrade.damage,30); assert.equal(model.upgrade.nextDamage,37.5); assert.equal(model.upgrade.action.enabled,false);
 s.position={...LOCATIONS.smith}; model=panel(s); assert.equal(model.upgrade.action.reason,'Not enough iron marks.'); assert.equal(model.upgrade.nextDamage,37.5);
 assert.equal(JSON.stringify(armory(s)),snapshot); assert.equal(s.currency,0);
});

test('inspecting another weapon never enables spending on the unseen equipped weapon', () => {
 const s=createAdventure(); s.owned.push('axe'); s.position={...LOCATIONS.smith}; s.currency=90;
 let model=panel(s); assert.equal(model.weapons.find(c=>c.item.id==='sword').upgradeAction.enabled,true);
 const source=JSON.stringify(s), selected=model.weapons.find(c=>c.item.id==='axe');
 assert.equal(selected.upgradeAction.enabled,false); assert.match(selected.upgradeAction.reason,/Equip Ward axe before improving it\. Arming sword \+0 is still equipped/);
 assert.equal(JSON.stringify(s),source,'previewing does not spend, equip or upgrade');
 assert.equal(equip(s,'axe',capabilities),true); model=panel(s);
 assert.equal(model.weapons.find(c=>c.item.id==='axe').upgradeAction.enabled,true); assert.equal(model.upgrade.damage,40); assert.equal(model.upgrade.nextDamage,50);
 assert.equal(model.weapons.find(c=>c.item.id==='sword').upgradeAction.enabled,false);
});
