# Four NPC/enemy characters — whole-character sprites

The four approved designs now use generated **whole-character animation poses**. Armour, clothing, hands and equipment are drawn together in each source image. There are no modular body parts, armour items, bones, IK, or rig-baking inputs in this pack. The previous cutout/rig-derived art pack and its authoring tools have been removed from this branch; Git history preserves that version.

## Winston: start here

`src/assets/npc-enemy-sprites/manifest.json` lists the four characters. Load each character's `sprite-front.webp` and `sprite-rear.webp` as spritesheets. PNG versions are also supplied, plus `stand-front.png` / `stand-rear.png` for a static NPC. Draw exactly one character sprite. Equipment is already included.

| Character ID | Equipment in the frames | Suggested windup / active / recovery | Walk cycle |
| --- | --- | --- | --- |
| `valdren_warplate_bearer` | Sword; fitted pale Warplate with blank eyeless faceplate | 480 / 180 / 440 ms | 650 ms |
| `harbinger_road_knight` | Mace, stitched split shield; battered plate and crimson waist cloth | 650 / 180 / 540 ms | 760 ms |
| `eryndor_magister` | Staff, closed folio; charcoal scholar's coat | 850 / 200 / 600 ms | 740 ms |
| `pale_shepherd_keeper` | Crook, candle lantern; veiled ash-gray funeral robes | 950 / 240 / 700 ms | 850 ms |

Each authored view has **24 frame cells**, arranged 4 columns × 6 rows. Source cells are **384 × 384**, displayed at **0.5 scale** for approximately **88 screen pixels head to ground**. All frames have the fixed source foot anchor `(176,304)`, with transparent margins. Staffs/crooks may extend above head height. The PNG/WebP sheets have real alpha; previews add their own background and foot marker.

## Playback

| Animation | Frame indices | Timing | Loop |
| --- | --- | --- | --- |
| idle | 0–3 | 250 ms each | Yes |
| walk | 4–11 | Walk cycle / 8 | Yes |
| attack | 12–17 | 3 windup poses, 1 active/contact pose, 2 recovery poses | No |
| hurt | 18–19 | 120 / 180 ms | No |
| death | 20–23 | 160 / 180 / 180 / 200 ms | No; hold corpse |
| dead | 23 | Held final pose | No |

The magister and keeper also expose `cast` as an alias for `attack`. NPCs can simply use idle/walk. No talk, interact or guard animation is claimed. Selected complete poses are reused during hurt recovery and one invocation anticipation; manifests preserve their source mapping. Death uses distinct falling/collapsed body drawings, without rotating or squashing the standing sprite.

`tools/art/lore-sprite-player.mjs` is an optional **sprite-only Phaser adapter**. `preloadCharacter(scene, manifest, baseUrl)` loads the two sheets. `createCharacter(scene,manifest,x,y)` returns the sprite and an `update({direction,animation,elapsedMs})` method. The adapter also accepts simulation-owned `phase`/`progress`; active progress zero selects contact frame **15**, with no extra visual windup. It handles variable timing, mirrored foot origin and held non-looping final frames.

There are two authored camera views: southeast front and northeast rear, plus mirrored southwest/northwest. Exact east/west use front three-quarter artwork. North/south can retain the last horizontal side. Mirroring reverses visible handedness; eight independently painted directions are not supplied.

Manifests contain frame rectangles, source mapping, playback/phase timings, fixed ground anchors, scale and a single `complete-character` draw layer. They explicitly disable modular armour and runtime rigs. Hand sockets and equipment attachment transforms are unsupported because those pixels are baked into the artwork. No separate equipment pass is needed.

## Preview

Run `npm ci`, `npm run dev`, then open **`/docs/lore-character-preview.html`**. This standalone Phaser Canvas page previews all four at actual game size and provides animation/facing controls. It loads complete sprite sheets only. It is a development handoff, not a production game entrypoint.

`src/assets/npc-enemy-sprites/previews/` includes game-size walk, attack and death GIFs and actual Phaser captures. Checks:

```sh
python tools/art/inspect-lore-sprites.py
node tools/art/check-lore-preview.mjs
```

The Python check (Pillow/numpy) validates all 192 frame cells, alpha, edge bounds, positive durations and fixed foot metadata, then exports GIFs. The browser check validates all 24 animation/facing combinations for all four characters, selected frames, mirrored origins, first-active contact, walk wrapping and held death, and rejects body-part/equipment/rig requests.

## Art source and reproduction

`tools/art/sources/whole-character-sprites-v2/` preserves lossless WebP versions of the eight generated whole-character sheets and one complete contact-pose correction. These are whole figures, not component atlases. Built-in imagegen prompts/provenance are in `tools/art/whole-sprite-provenance.json`; reviewed source selection and registration are in `tools/art/whole-sprite-sources.json`.

```sh
python tools/art/pack-whole-sprites.py
python tools/art/inspect-lore-sprites.py
node tools/art/check-lore-preview.mjs
```

Packing requires Pillow/numpy/scipy. It isolates complete figures, crops transparent padding, applies one uniform scale per view, registers the ground point and encodes sheets. It never synthesizes poses or assembles/animates body parts. Minor generated detail drift remains between poses; gameplay-scale review is still appropriate during encounter integration.

This art-only PR does not register enemies/NPCs, change the main character's equipment system, or alter combat, collision, saves, navigation, cast effects or published entrypoints. The Warplate is not starter gear or a forge upgrade; the road-knight is not Alaric/the Red Knight; the keeper is living. These approved design candidates add no official lore or private GM material.
