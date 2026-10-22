# Connected expedition runtime

The station's four sections form **one** expedition. The Cistern Viaduct and Record Annex add two local, physically connected areas: three expeditions total. Their names, layouts, adversaries and game mechanics are prototype adaptations, not official additions to the Virelden campaign.

Public setting references: [History](https://virelden-campaign.edmund-whittaker.chatgpt.site/history), [Glossary](https://virelden-campaign.edmund-whittaker.chatgpt.site/glossary). Human-built Imperial reservoirs and service galleries inspire the environments; these ordinary stairs do not alter the Thirty-Six Plates or implement fast travel. All findable armour is modern ordinary articulated plate, never true Warplate.

## Play and route

- Existing WASD/arrows, F/J/click, E and Space controls are unchanged. Keyboard attacks retain the last keyboard movement facing. Menus pause simulation, including gates and shortcuts.
- Defeat the Upper Watch captain, then use the labelled eastern service stair. The west-bank cistern beacon is safe; its return stair remains usable before the finale.
- Follow the reservoir ring. The guarded north coffer contains the falchion and Marcher gauntlets; the optional lower spur contains Marcher legs. The east-bank lever lowers a repair bridge after its guard is cleared.
- Secure the far landing, then interact again to descend into the annex. Securing a marker never teleports the player.
- Follow winding record galleries. The main-route coffer at ground600,400 is guarded by the earlier stair guard and holds the poleaxe and Marcher chest **before** the keeper. Its interaction stance is outside the keeper's activation range. The optional record store holds the Marcher helmet, marks and optional XP.
- Open the return shutter, secure the annex, explore further or walk annex→cistern→station to use the forge. Original long routes remain available after either shortcut opens.

Each new area has six foes and exactly440XP: five50XP encounters, one120XP finale,40XP secure objective and30XP optional cache. Together with the740XP station, the authored total is1,620XP, the level10 threshold. Reward IDs and values are durable save contracts, not farmable encounter resets. Mark awards saturate at the existing100,000-mark purse limit, so a full valid older purse remains saveable and forge-usable; the message reports actual credited marks and a full-purse notice.

## Runtime contracts

`src/core/expeditionCatalog.ts` is the typed authoritative geometry/content catalog. `src/core/expeditionGeometry.ts` supplies the radius12 floor/wall/prop and segment adapter. `src/core/adventure.ts` selects active-area movement, combat, checkpoints, guarded finds, ports and transient shortcut state; station geometry remains separate. `src/game/ExpeditionWorldView.ts` renders those same catalog regions and assets. Camera bounds come from the active area without changing actor scale. Water/void is solid, and open bridge floor is explicitly excluded from the water mask.

Cleared enemy IDs, looted IDs, checkpoint, completed shortcuts and objective completion are independent per area. Equipment, armour slots, marks, upgrades, allocated attributes, XP and its earned-ID ledger are common. Living foes reset home/health on re-entry; defeated foes and all rewards remain cleared. Rest/retry/transition clear projectiles. Arrivals receive1.5seconds grace and entry beacons are60projected-pixel sanctuaries. Bow range is capped at180projected pixels in the new areas, with at least1.05seconds windup and wall/floor sight checks.

New shortcut levers use the original registered horizontal grip and hand-reach animation. Collision releases only after completed animation; partial opening reloads or deaths restore closed. The new floors and props have provenance/registration in `docs/EXPEDITION_ENVIRONMENT.md` and `src/assets/expedition-v1/`. Marcher armour atlases retain the same source pivots and calibration as Ward/Delver; runtime WebPs, manifests and generation prompts are in `src/assets/marcher/`.

## Save v4 and rollback

Normal keys are `virelden-underworks-v4` and one `-v4-good` copy; QA has its own `virelden-underworks-qa-` prefix. A bounded `-v4-pending` staging write is read back and validated **before** replacing current. Current is verified again after replacement. Failed writes do not clear existing saves. Explicit reset is scoped to v4, using an exact validated `{version:4,reset:true}` tombstone in current and previous-good to prevent re-importing older progress, even after later fresh-save failure or corruption.

The complete strict v3 codec remains in `src/core/legacyCampaignSave.ts`. Migration preserves its actual equipment, full six-weapon upgrade/ownership state, marks, allocated attributes, XP ledger and station facts; it does not reconstruct a fresh Ward character. All v3-current/v3-good/v1 keys are read-only, even during explicit v4 reset. Corrupt existing v4 records cannot silently fall back across schemas and discard connected-area progress. Unknown future-version data protects load/write/reset. Guards recheck after staging and before authoritative writes, and rollback never overwrites a detected future or independently valid changed record. These bounded checks are not an atomic cross-tab storage transaction. Normal Git history retains the older playable source release.

## Verification status

`npm run check` runs rule tests, strict TypeScript and production build. New seeded unit fixtures are explicitly labelled feature fixtures, not physical browser completion evidence. They cover closed/open geometry, actual movement adapter, guarded loot, safe preboss poleaxe placement, ordinary ports/backtracks, per-area state, partial shortcuts, safe arrival/rest/retry, projectile walls/void, strict full-v3 migration, hostile v4 payloads, staged readback and bounded fallback.

Native browser walkthroughs, responsive screenshots, actual hand/grip inspection and complete station→cistern→annex→cistern→station combat acceptance remain required before publication. Existing human raider/bow/captain artwork is an honest prototype fallback. No unapproved skeleton/headless/giant assets are active; giant collision above radius12 is not validated. The poleaxe support-hand capability is enabled only after actual-renderer acceptance: native job119685845157 passed160 actual Phaser image-matrix poses, with support registration error below.00003px and11px grip spacing, alongside the project's separate reviewed production contact-frame evidence. Ownership, idle-state and matching artwork checks remain required. Pre-finale discovery/equip/attack/save acceptance is covered by the area browser fixtures.
