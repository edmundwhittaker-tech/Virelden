# Pure equipment and progression integration contract

## Status

Authored in an isolated feature worktree from `ccbc593`. These modules are **not connected to the playable scene**, save keys, combat or renderer. Local checks: `npm test` **69/69**, strict TypeScript and production build pass. No browser run is claimed for this isolated data change; application/browser integration remains outstanding. No publication or deployment is implied.

## Ownership and call sites

- `src/core/equipment.ts`: four mandatory armor slots, twelve ordinary armor descriptors, armor inventory, candidate preflight, comparison, derived stats and no-heal pool clamping.
- `src/core/weaponCatalog.ts`: six weapon profiles, aim-local contact shapes, six-item armory, immutable weapon equip/upgrade candidates.
- `src/core/progression.ts`: finite levels 1–10, once-only reward ledger, checkpoint point allocation and extension validation.
- `src/core/rewardCatalog.ts`: stable XP IDs and values. New expedition records are data only, not proof those levels are playable.
- `src/core/progressionSave.ts`: versioned extension/envelope preparation and read-only fallback selection. The integrator supplies the complete world validator and cross-field agreement check. There are **no localStorage writes or resets** in these modules.

Scene, Adventure, combat, renderer, save storage and UI are intentionally unchanged. Integrate these modules into the release owner's final stable gameplay revision, not by replacing its ongoing fixes with this worktree's baseline.

## Armor

Required slots: `helmet`, `chest`, `gauntlets`, `legs`. Stable item IDs: `ward-{slot}`, `delver-{slot}`, `marcher-{slot}`. Visual keys: `{set}/{slot}`. Chest owns torso and upper arms; gauntlets own forearms and hands; legs own pelvis, thighs, greaves and feet. Closed ordinary metal plate, no empty slots, cloth or true Warplate. Item names are original local adaptations.

| Full set | Defense | Weight | HP modifier | Stamina modifier |
| --- | ---: | ---: | ---: | ---: |
| Ward | 16 | 14 | 0 | 0 |
| Delver | 11 | 9 | −8 | +8 |
| Marcher | 22 | 20 | +12 | −8 |

All 81 combinations validate independently; no hidden set bonus. Base pools stay Vanguard 140/90 and Wayfarer 100/130. The formula `100/(100+2*defense)` **changes incoming damage even for starter Ward** (multiplier ~0.758); it is not a claim of unchanged combat balance. The integrator must explicitly accept/tune that change after combat QA, or deliberately normalize around Ward and update tests. Weight modifies roll cost (`24+weight*.4`) and stamina regeneration (`max(20,34-weight*.5)`), not movement speed. All three values and health/stamina changes should be visible in comparison UI.

`prepareEquip(equipment,slot,id,context,basePools,attributes,visualReady)` checks alive/idle/not rolling/not interacting, known item, matching slot, ownership and **all four** candidate visual descriptors synchronously. Missing/throwing readiness rejects the whole candidate. It never starts an asset load or mutates its input. Valid noops return the identical state with `changed:false`. A successful candidate and stats are committed together only after renderer preflight succeeds. Do not commit stats before renderer state.

`compareArmor` may preview unowned items; it cannot grant or equip them. `clampPools` only clamps current HP/stamina down to new maxima; increasing a maximum does not heal/refill, and HP=0 stays dead. Training/recovery at a checkpoint is a separate explicit rest operation.

## Weapons

Approved IDs: `sword`, `spear`, `hammer`, `axe`, `falchion`, `poleaxe`. Original three damage, range, sector half-angle, windup, active duration, recovery, cost and stagger are retained exactly in data. The existing hammer's PI half-angle includes rear targets and is deliberately marked `legacyRearReach:true`; do **not** claim its overhead artwork already matches that old geometry. A later intentional frontal correction must change collision/trail together and have explicit regression tests.

The three additions differ in shape/range, windup/contact/recovery, stamina and stagger, not merely damage. `weaponShapeContains` takes projected aim-local pixels (x forward/y lateral); world projection, wall blocking, frozen aim/weapon at attack start and once-per-swing hit IDs remain the combat integrator's responsibility. Capsule contact is bounded at its forward tip, unlike an unbounded ray. Renderer trails must use the same contact descriptor and normalized phase supplied by the simulation; no independent animation clock or repeated hardcoded `.12`.

Poleaxe has `hands:2` and remains unequippable unless `supportHand:true` means the full windup/contact/recovery grip has been visually verified. One support socket alone does not prove that capability. Data reserves a hand count without implementing player dual wield, shields or an offhand taxonomy. Existing spear is one-handed for compatibility, not a claim about canonical polearm technique.

Armory upgrades retain +0..+2 with 30/60 iron marks and +25% base damage per tier. All weapon inventory/equip/upgrade actions return candidates or explicit errors; caller commits armory and remaining marks together. Legacy bounded upgrades on an unowned weapon are retained rather than discarded by migration.

## XP

Total thresholds: `0,60,150,270,420,600,810,1050,1320,1620`. One point per earned level (nine maximum): Vigor +8 HP, Endurance +5 stamina or Resolve +5 defense. Points spend only at checkpoint; level unlock itself is immediate. `xpRequirement` returns current level, next total and remaining amount, with null next total at cap.

`awardDefeat` requires an alive→defeated edge; `awardReward` looks up the amount in the trusted catalog, never accepts a numeric amount from an event payload, and deduplicates stable IDs. Capped rewards still enter the ledger. Ledger IDs survive travel, death and reload. The parser checks XP equals the capped sum of the ledger, rejects unknown/duplicate IDs, and prevents overspending. Published reward amounts are persistence data: changing one requires an explicit migration rather than silently invalidating old XP.

Finite authored budgets: station 740, cistern-viaduct 440, record-annex 440, total 1620. Existing station alone reaches level 6, not cap. Optional exploration is needed for that exact full-completion level-10 budget, **not** to finish an expedition. Additional expeditions' IDs/amounts are coordinated with the level designer and remain unwired data here.

## Save integration and safety

The new outer envelope is `{version:3,world,extension}`; the extension is `{schema:1,progression,equipment,armory}`. `WorldSaveCodec` requires:

1. `readWorld`: full world validation, including known encounter/cache/checkpoint IDs, finite bounded currency/upgrades and coherent checkpoint/gate/completion flags.
2. `writeWorld`: durable progression only, never an arbitrary live position or combat state.
3. `legacyProgress`: fields from an already validated v1/v2 world for reward/gear migration.
4. `extensionAgrees`: cross-field consistency, including world progress versus earned reward IDs and any transitional duplicate legacy weapon fields.

The tests use the existing Adventure validator/serializer as the legacy codec and demonstrate v1/v2→v3 roundtrips preserving marks, inventory, all upgrades, loot, defeated enemies, shortcut, gate, checkpoint and proper completion. v1's old captain completion is not reinterpreted as the larger route's final exit. `legacyWeaponStateAgrees` is a helper for the transitional three-weapon world; a six-weapon world integration must adopt one authoritative armory and update that agreement check rather than rejecting new weapons or maintaining contradictory copies.

`prepareVersionedProgressionSave` serializes and roundtrips the complete candidate **in memory**. Only a successful result may be written by the storage integrator. Keep the old legacy key untouched until the new save has been written and read back successfully; never clear it first. Normal writes may keep at most one last-known-good fallback if useful; do not create unbounded backup storage/history or extra art/build archives. Report write failures honestly while preserving playable in-memory state and the previous durable save.

`selectProgressionSave` tries caller-ordered current/last-known-good/legacy candidates without writing or deleting anything. A valid fallback returns a visible notice. No valid candidate returns `corrupt`, **not a fresh character**; starting over requires the application's existing explicit reset confirmation. Unknown future versions are not reinterpreted as legacy. The envelope is bounded to 100,000 characters. This module cannot itself prove that storage succeeded or that the final application parser is correct—those require integrator/storage tests and browser QA.

## Remaining release gates

Wire actual inventory/rewards/combat/save keys, synchronous asset preflight and four-slot UI; support-hand verification; real save-write failure handling; explicit defense/hammer balance decisions; collision/trail and wall/single-hit tests in the integrated combat implementation; full rule/build/browser suite against the integration commit; real input equipment/training/reload/reset/death flows; runtime art/screenshots and exact deployed-commit checks. Do not call isolated passing data tests a playable feature release.

## Local gameplay integration stage (not published)

The separate integration worktree now wires Adventure to the catalog, real once-only XP edges, checkpoint training, armor preflight/clamping and the active `campaignSave.ts` codec/storage adapter. `serialize`/`restore` remain legacy adapters for v1/v2; live storage integration must use the new adapter and new v3 key, retaining the legacy key untouched. A single last-known-good v3 backup is bounded; every successful write requires an exact validated readback. Unreadable storage must block autosaving until explicit reset rather than silently replacing progress.

Two deliberate combat changes replace the isolated prototype assumptions: incoming damage multiplier is normalized around starter Ward defense16 (`132/(100+2*defense)`), so its damage remains unchanged instead of receiving a free24% reduction; hammer contact is now a narrow forward overhead sector (`halfAngle=.48`) with no rear reach. Weight still sets actual roll cost and regeneration via the established formulas. All active durations and stagger come from the catalog. Collision and contact-floor effects must consume the same shape; modular weapon motion receives the same normalized simulation phase.

Legacy migration additionally reconstructs new ordinary-plate cache contents from already-earned loot; transfer cache also grants the axe. New v3 worlds do not duplicate armory fields, do not permit nested legacy worlds, and require cache grants to agree with extension ownership. Version-one old completion continues to migrate to an unfinished extended station expedition.

This stage does not establish Scene/UI/render integration, browser execution, deployment or six finished visuals. Those are separate release gates.

Resolve deliberately grants **+5 defense per point** in the integrated version, rather than the isolated prototype's +1. At starter Ward this is approximately7.6% effective health per point, comparable to +8HP (5.7% Vanguard / 8% Wayfarer) without being the same resource; UI descriptions and derived comparisons read this core effect.
