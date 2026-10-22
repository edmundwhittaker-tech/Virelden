# Project status — 22 October 2026

## Published game

The verified released reference is main [`a932dc5`](https://github.com/edmundwhittaker-tech/Virelden/commit/a932dc5e561fe21b54b7b1e49679e97e6eca11c5), playable at **https://edmundwhittaker-tech.github.io/Virelden/**. Earlier working releases, including `f080674`, remain in ordinary Git history for rollback.

Three connected expeditions are live: the station's four sections, Cistern Viaduct and Record Annex. Together they contain **24 foes and 1,620 XP**, reaching level 10. The monumental station gate remains; the eastern service stair opens onward after the Upper Watch captain. Guarded finds, checkpoints, operated shortcuts and ordinary reversible stairs support physical backtracking to the station forge; there is no fast travel.

Vanguard starts with 140 health, 90 stamina and a sword; Wayfarer starts with 100 health, 130 stamina and a spear. Ward, Delver and Marcher provide **twelve independently mixable armour pieces**. All **six weapons**—sword, spear, hammer, axe, falchion and poleaxe—have registered textured artwork. The guarded main-route annex coffer offers the poleaxe before the final keeper. Checkpoint training, rest, forge upgrades and equipment are shared across areas.

The player has a **15-part modular 2D full-plate body** with hand-attached weapons, not a 3D rig. The current walk is unchanged. Human raider/bow/captain artwork remains a prototype fallback; no skeleton, headless or giant assets are active. Grounded feet, actor scale, textured floors and black offboard space are retained. Geometry-only large-body checks do not establish full-map giant navigation, long-trident clearance or combat acceptance.

Save v4 stores per-area durable progress and shared equipment, upgrades, marks, training and XP, with staged validated writes and one previous-good fallback. Full valid v3 progress migrates without reconstructing a fresh character; older v3/v1 keys remain read-only. Future-version guards and a scoped reset tombstone protect saves within the documented bounded, non-atomic cross-tab contract. Saves are local to this browser, with no account sync. See [Connected expeditions](CONNECTED_EXPEDITIONS.md) and [Progression contract](PROGRESSION_CONTRACT.md).

## Verification and limits

- **Earned campaign:** [PR #9 native run](https://github.com/edmundwhittaker-tech/Virelden/actions/runs/39751917151) passed the unseeded station→cistern→annex→cistern→station route on `393ef53` (tree `a2c7ad1`) in 21m41s with zero deaths: all 24 foes, 1,620 XP, 32 unique reward IDs, twelve armour pieces, six weapons, pre-boss poleaxe use, nine earned attribute points, spear +2, 1,445 marks, physical return and durable reload. Separately labelled seeded area fixtures passed all 12 cases, and actual-renderer poleaxe support passed 160 poses.
- **Final regression:** [PR #10 verification](https://github.com/edmundwhittaker-tech/Virelden/actions/runs/39761382557) passed 184 rule tests, strict TypeScript/build, 34 native browser cases, six equipment DOM cases, 144 rendered contact cases and the close/spaced contact pair. Its inherited too-close duel setup correction was test-only, retained the assertions and added exact-vector and rendered-contact regression coverage; it did not change gameplay.
- **Publication:** [Main publish run](https://github.com/edmundwhittaker-tech/Virelden/actions/runs/39763095556) passed on `a932dc5`. All 34 live files returned HTTP 200 and matched the accepted CI output byte-for-byte (3,675,163 bytes). Public smoke verified authentic earned QA-save migration, UI, input and reload; it was **not** a complete campaign replay on the public URL. Native browser evidence was produced in GitHub Actions with Canvas and normal requestAnimationFrame, without SwiftShader.

All local places, gear and adversaries are prototype adaptations, not additions to official Virelden lore. No private campaign material or starter true Warplate is introduced. Single-player desktop keyboard/mouse; the published release has **no audio**, touch, multiplayer or account service.


## Four approved lore characters — art branch, 23 October follow-up

Authored on `art/lore-character-kit-v1`, based on main `18e7257`: Valdren Warplate Bearer, Harbinger Road-Knight, Eryndor Magister and Keeper of the Pale Shepherd. See [sprite handoff](LORE_CHARACTER_SPRITES.md) and the standalone [development preview](lore-character-preview.html). Each uses complete body-and-equipment sprite sheets: 63 frames × two authored views, plus mirroring, at approximately 88 screen pixels human height. All 504 frames have timings, fixed foot anchors, both hand attachments, equipment grips and layer metadata. Separate transparent body/hand sheets and equipment remain optional. No enemy runtime rig or modular armour is required; the player's rig is untouched.

Locally verified: all full/optional frames are nonempty with transparent backgrounds/spare cells, no edge clipping, fixed foot anchors and matching grip coordinates. Sprite-only Phaser Canvas preview passed all 32 animation/facing combinations, first-active-frame sampling, looping and held death; it fetches no body parts, equipment images or rig. Front/rear game-size GIFs and Phaser screenshots were inspected. Rule tests and strict TypeScript/production build passed. All 34 existing native browser regression cases passed locally in 9.1 minutes, including the station expedition (12 foes, zero deaths). This is a regression check of existing gameplay, not acceptance of the new enemies in encounters.

These are art candidates, not new official lore, starter Warplate, AI, collision or spell mechanics. No gameplay files, save formats, player armour or published entrypoints change. No CI/public deployment or in-level enemy acceptance is claimed by local artifact checks. Offline lossless source art and production scripts are preserved outside the game asset-loading path.
