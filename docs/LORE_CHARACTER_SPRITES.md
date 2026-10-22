# Lore character sprite pack v1

Art-only candidates based on the four approved concepts. Nothing is registered in gameplay, the armour inventory, enemy AI or the published build. Enemy rendering uses **one complete sprite per frame**. The main character can retain modular armour and rigs independently.

## Start here, Winston

`src/assets/lore-characters-v1/manifest.json` lists stable character IDs. Each character's manifest points to `sprite-front.webp` and `sprite-rear.webp`. Those sheets already include clothing, armour, hands and equipment. Load only these two sheets for normal enemy use; do not also draw a weapon or shield.

| ID | Design | Suggested attack phases, milliseconds | Walk cycle |
| --- | --- | --- | --- |
| `valdren_warplate_bearer` | Pale fitted Warplate, smooth blank face, sword | 480 / 180 / 440 | 650 ms |
| `harbinger_road_knight` | Battered plate, crimson waist cloth, mace, stitched split shield | 650 / 180 / 540 | 760 ms |
| `eryndor_magister` | Mature female scholar, charcoal coat, staff, closed folio | 850 / 200 / 600 | 740 ms |
| `pale_shepherd_keeper` | Living veiled funeral keeper, crook and candle lantern | 950 / 240 / 700 | 850 ms |

Attack phases are windup / active / recovery. These are playback suggestions, not combat stats or an AI implementation. The Warplate is an art candidate, not starter equipment or a new forge upgrade. The road-knight is not Alaric or the Red Knight. The magister/keeper loadouts are design interpretations, not new canon. No private campaign material is included.

## Sheet contract

Each view has 63 frames in an 8 × 8 sheet, with the final cell transparent. Cells are **384 × 384 source pixels**, displayed at **0.5 scale**. The head-to-ground reference is 88 screen pixels, with a few pixels of antialiasing/boot extent. The fixed foot anchor is `(176, 304)` in every source cell. Equipment may extend above the body. The atlas has genuine alpha and no baked floor/shadow.

| Animation | Frames | Loop | Timing |
| --- | --- | --- | --- |
| idle | 4 | Yes | 250 ms each |
| walk | 16 | Yes | Character walk cycle / 16 |
| attack | 18 | No | 6 windup, 4 active, 8 recovery |
| hurt | 6 | No | 50 ms each |
| death | 8 | No | 90 ms each, then hold final frame |
| dead | 1 | No | Permanent corpse pose |
| guard | 4 | Yes | Held pose, 200 ms each |
| interact | 6 | No | 100 ms each; primary equipment hidden for reaching |

Casters also expose `cast` as an alias of `attack`. Guard is a held pose, not a separate block mechanic. The hurt/death animation and cloth movement are derived offline from articulated source art; they are not independently painted frames or cloth simulation.

There are **two authored isometric views**, front southeast and rear northeast, plus west mirroring. Exact east/west use front three-quarter artwork, matching the current player fallback. North/south can keep the previous horizontal side. Mirroring swaps the visible handedness; these are not eight independently authored directions.

Use `tools/art/lore-sprite-player.mjs` as a small sprite-only Phaser adapter. It loads complete sheets, sets the correct mirrored foot origin, samples variable frame durations and holds non-looping final frames. Call `update({direction, animation, elapsedMs})` or supply `phase` and `progress` from the simulation. **Active phase progress zero selects the first contact frame**; do not add a second visual windup after simulation contact. Hitboxes, navigation, damage and cast effects remain gameplay work.

## Optional exports and metadata

`body-front/rear.webp`, `hands-front/rear.webp` and `equipment/*.png` support custom attachments if later required. They are not runtime dependencies of the complete sprites. Each manifest contains per-frame foot/right-hand/left-hand coordinates, equipment grip points, transform/rotation/scale, visibility and draw order. Coordinates use source pixels and radians. Right hand is primary/near; left hand is support/far before mirroring. Equipment grips map to the recorded hand point. Apply the same origin/scale/flip to attachments as to the character.

For optional composition draw back equipment, body, foreground equipment sorted by layer, then the hand overlay. Far equipment behind the body can be occluded in the rear view. The complete sheet is the authoritative appearance. No enemy rig, armour item system or source body-part loading is needed.

## Preview and verification

Run `npm ci`, then `npm run dev` and open `/docs/lore-character-preview.html`. This standalone Phaser Canvas page displays all four at game size with animation/facing controls. It does not enter or alter a save. Source paths are deliberate: this preview is a development handoff and is not added to the production build.

`src/assets/lore-characters-v1/previews/` contains game-size animated GIFs for walk, attack and death, plus Phaser captures. Local checks:

```sh
python tools/art/inspect-lore-sprites.py
node tools/art/check-lore-preview.mjs
```

The first needs Pillow/numpy. It checks all 504 full frames and optional sheets for alpha, nonempty frames, transparent spare cells, fixed anchors, edge clipping and equipment/hand registration, then exports GIFs. The second checks the adapter's phase/loop/death sampling, all 32 animation/facing combinations in Phaser and that no rig/body/equipment images are fetched. These are artifact checks, not enemy combat acceptance.

## Offline art sources

`tools/art/sources/lore-character-sources-v1.zip` preserves the twelve generated source atlases in lossless WebP. These are **authoring inputs only**, never loaded by the game or sprite preview. Exact generation prompts are in `tools/art/lore-art-provenance.json`. The baked body proportions and timing are derived from the repository's existing 2D pose evaluator; no gameplay source was changed.

To rebake with Python Pillow/numpy/scipy, Node dependencies and Playwright Chromium installed:

```sh
python -m zipfile -e tools/art/sources/lore-character-sources-v1.zip ../lore-source-inputs
python tools/art/prepare-lore-sources.py --source-dir ../lore-source-inputs
node tools/art/export-lore-sprites.mjs
python tools/art/inspect-lore-sprites.py
node tools/art/check-lore-preview.mjs
```

The preparation step writes only intermediate parts to `../lore-art-work`; the exporter writes the ready-to-play sheets. Browser/WebP encoder versions can affect compressed bytes. Integration into encounters, additional poses/directions, attack collision tuning and art approval in actual levels remain separate work.
