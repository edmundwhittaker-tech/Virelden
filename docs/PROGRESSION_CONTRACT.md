# Connected runtime contract (v4)

The active three-area runtime uses the strict v4 envelope described in [Connected expeditions](CONNECTED_EXPEDITIONS.md). Its world schema 2 stores independent station, cistern and annex facts alongside the complete authoritative equipment/progression/armory extension. The total authored budget is 1,620 XP. All v3-current, v3-good and v1 keys remain read-only during migration and reset. `legacyCampaignSave.ts` retains the released full-v3 codec and older-client forward guards; the active migration calls only its pure `readCampaignSave`.

The v3 description below is the historical station-release contract, not the active storage version.

# Equipment, combat progression and persistence

These are prototype game mechanics and ordinary manufactured equipment, not changes to published campaign canon. The player renderer uses articulated metal parts; true Warplate is not starter gear or a forge upgrade.

## Source ownership

- `core/equipment.ts`: four required armor slots, twelve item descriptors, immutable candidates, comparisons, derived statistics and no-heal clamping.
- `core/weaponCatalog.ts`: six profiles, contact shapes, armory candidates and upgrades.
- `core/progression.ts` / `rewardCatalog.ts`: finite levels, trusted reward amounts, once-only ledger and checkpoint allocation.
- `core/progressionSave.ts`: generic envelope parsing/preparation; it performs no browser-storage writes.
- `core/campaignSave.ts`: complete active world/extension validation, legacy migration, safe storage/readback and bounded fallback.
- `core/adventure.ts`: authoritative live combat, rewards and equipment/training actions.
- `game/WorldView.ts`, `ModularKnightSprite.ts`: synchronous asset readiness, descriptor commit and simulation-driven rendering.
- `game/CourtyardScene.ts`: input/menu pause, authoritative UI callbacks and persistence feedback.

## Armor

Required slots are `helmet`, `chest`, `gauntlets`, `legs`. Paired hands/legs are one slot each. Stable item IDs are `{ward|delver|marcher}-{slot}`. Chest owns torso/upper arms; gauntlets own forearms/hands; legs own pelvis/thighs/greaves/feet. Every valid loadout has all four slots; no empty slot, cloth, exposed skin or set bonus. The data contract supports81 combinations.

| Full set | Defense | Weight | HP modifier | Stamina modifier |
| --- | ---: | ---: | ---: | ---: |
| Ward |16|14|0|0|
| Delver |11|9|−8|+8|
| Marcher |22|20|+12|−8|

Base pools remain Vanguard140HP/90stamina and Wayfarer100HP/130stamina. Incoming damage multiplier is **`132/(100+2*defense)`**, deliberately normalized around starter Ward defense16 so existing players do not receive a free damage reduction. Weight changes roll cost (`24+weight*.4`) and stamina recovery (`max(20,34-weight*.5)`), not movement speed. UI comparisons read these exact derived values.

`prepareEquip` rejects dead/busy/rolling/interacting state, unknown or wrong-slot items, missing ownership, and any missing candidate visual. Readiness checks both views and every part/frame synchronously; equip never starts a load. `WorldView.commitEquipment` preflights the entire candidate before replacing render descriptors. Only then commit equipment and statistics. Failure retains both old equipment and pools.

Equipping/training never heals. Current HP/stamina are clamped down to new maxima, never refilled when a maximum rises; zero HP remains dead. Rest is a separate explicit checkpoint action. Save failure retains playable in-memory changes while clearly reporting that they are not durable.

## Weapons and combat

Approved IDs are `sword`, `spear`, `hammer`, `axe`, `falchion`, `poleaxe`. The catalog owns damage, reach, contact geometry, windup/active/recovery durations, cost, stagger, hand count, silhouette and motion descriptor. Attack start freezes chosen weapon and aim; a hit-ID list prevents repeated damage during the same swing. Walls block contact. Renderer and floor effects use the same profile and normalized simulation phase, not an independent animation clock.

Sword has a quick broad cut, spear a long narrow thrust, hammer a slow forward overhead, axe a deliberate narrow cleave, falchion a wide low-stagger cut and poleaxe a bounded long forward hook. Hammer **deliberately replaces its previous rear-reaching full circle** with a `.48`-half-angle frontal sector; the change has explicit regression tests. Other original weapon damage/timing/cost values remain unchanged.

`weaponShapeContains` consumes aim-local projected pixels (x forward, y lateral). Capsule tips are bounded, not unbounded rays. The catalog shape is a hard maximum candidate envelope. `meleeContact.ts` additionally intersects calibrated blade/shaft/head capsules with upright body capsules using the exact registered rig/frozen facing. Cuts traverse start→end continuously; hit checks sweep previous→current active progress in bounded ≤.04radian samples, retain both endpoints and record the actual contact progress. Overhead/hook descent and thrust extension visibly approach their unchanged centered first-active impact during late windup. Carry/preparation/recovery endpoints are continuous, and two-hand polearm carry retains its shaft grip. No runtime texture-alpha collision is used. Coarse-frame contact is valid even if its intermediate pose was skipped in presentation; correlate the stored contact progress, not a later screenshot alone. Floor effects indicate the catalog envelope, not a pixel-perfect body contact boundary.

Poleaxe remains unequippable until the support hand visibly grips the same shaft throughout the attack. A manifest socket or passing geometry test alone is not visual acceptance. Textured assets use the shared hand/angle/length and true lateral reflection; see `WEAPON_ART.md`.

Armory is authoritative in the save extension. Upgrades retain +0..+2,30/60mark costs and25%base damage per tier. Preserve bounded legacy upgrades even when their weapon is not currently owned. Upgrade candidates commit levels and remaining marks together.

## XP and training

Total thresholds are `0,60,150,270,420,600,810,1050,1320,1620` (levels1–10). Each earned level grants one point, nine maximum. Checkpoint choices are Vigor **+8 maximum HP**, Endurance **+5 maximum stamina**, Resolve **+5 defense**. Resolve deliberately replaced the isolated prototype's weak +1 effect; exact descriptions and derived values come from the core.

Trusted rewards are keyed by stable `{expedition}:{encounter-or-objective}` IDs. Award defeat XP only on the alive→defeated edge, and objectives once. Award amounts are catalog lookups, never event-supplied numbers. The ledger survives death/reload/travel; capped rewards still enter it. Parsing requires XP to equal its capped ledger sum, rejects duplicate/unknown IDs and prevents point overspending. Published reward amounts are persistence data; retuning them requires migration.

Finite budgets are station740, cistern-viaduct440 and record-annex440 (total1620). Additional-area reward entries are not proof those areas are playable. Station alone reaches level6, not the cap. Every station cache grants its original weapon plus a Delver piece; transfer cache also grants the axe. `STATION_CACHE_ARMOR` is the shared grant/validation table, and already-earned legacy caches receive those new contents during migration.

## Active save safety

Envelope: `{version:3,world,extension}`. Extension: `{schema:1,progression,equipment,armory}`. New world records omit duplicate armory fields. `campaignCodec` validates known encounters/caches/checkpoints, bounded currency/upgrades, coherent gate/completion flags, ownership/grants and exact earned IDs. A v3 envelope may not hide a nested legacy world.

Legacy v1/v2 is read through its separate validator and completed into the new extension before cross-field validation. Preserve marks, owned weapons, all bounded upgrades, loot, defeated enemies, shortcut, fully opened gate and checkpoint. Version-one old captain completion does not falsely complete the larger station route. Resume at a valid safe checkpoint, never arbitrary coordinates or mid-animation; interrupted gate opening restores closed.

Normal keys are `virelden-underworks-v3`, `virelden-underworks-v3-good`, and read-only legacy `virelden-underworks-v1`. QA uses the separate `virelden-underworks-qa-*` namespace. Prepare and roundtrip the whole candidate in memory; reserve at most one previous-good copy before overwrite; write current and require exact validated readback. Never write/delete the legacy key during migration. Failed writes keep the previous durable save and report the failure honestly.

Fallback tries current, previous-good, then legacy, with a visible notice. If none is valid, protect the saved progress and require explicit reset; never silently save a fresh character over it. Unknown future-version current OR previous-good saves are protected from older-code load/write/reset. The older v3 client also recognizes matching `-v4` and `-v4-good` namespaces even when their payloads are malformed; these show a newer-version/reload-only screen, including data arriving from another tab. The future client migrates through the pure full-v3 decoder, not the guarded older storage loader. Reset removes only these expedition keys after confirmation. Missing render assets show a reload-only error rather than suggesting that deleting progress will fix artwork.

## Verification

Run `npm test`, `npm run build`, the normal browser suite and the isolated equipment DOM suite. Browser fixtures must use isolated QA storage; debug snapshots remain opt-in, copied and read-only. Cover real earning/equip/upgrade, all slots/mixed sets, busy denials, focus/Escape/Tab/blur, training/rest, legacy readback, corruption/quota/future-version protection, death/retry and final route completion. Inspect actual-game part-source/weapon-contact screenshots. Source geometry sheets and unit passes do not replace browser evidence. Exact verified/published revisions are recorded in `STATUS.md`.
