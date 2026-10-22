# Three-enemy art handoff — v1

Art-only assets for Winston. No game source, enemy spawns, combat rules, saves,
gate, bow archer, main branch or deployment are changed by this pack. The giant
is explicitly a **mini-boss**. These designs establish no new campaign lore.

Read alongside `KNIGHT_ATTACK_RIG.md` on main and `STATION_ART_KIT.md` on the
`feat/station-gate-full-level` branch. The station document is not on main at
this pack's base commit, so it is not copied or changed here.

## Assets and scale

All files are self-contained in `src/assets/enemies-v1/`.

| ID | Unarmed body | Separate equipment | Approximate body height in game |
| --- | --- | --- | --- |
| `maw_skeleton` | Mouth-shaped iron mask, bare bones, ragged waist cloth | Two-handed axe | 88 px |
| `headless_skeleton` | No skull; normal human torso and limb proportions | Two independent knives | 79 px; missing head is not compensated by stretching |
| `iron_giant` | Box-shaped closed greathelm, broad heavy slab plate, no cloth | Extra-long trident; large rectangular ground-reaching tower shield | 176 px; mini-boss |

Three body PNG atlases contain 18 frames each: six columns and three rows.
Cell size is **256×320**. Rows are east, southeast and northeast. Columns are
idle, step A, step B, windup, contact and recovery. Three matching hand-overlay
atlases contain only the finger/fist patches needed to occlude held grips.

Six equipment PNGs are independent: axe, knife, trident and shield front/back/side.
Knife artwork is instantiated twice. Human bodies use runtime scale 0.5; giant
uses 1. Source idle visible body targets are 176/158/176 px respectively. Do not
scale a whole sheet or a weapon bounding box to the requested body height.
The giant's trident is 272 source/game pixels long; the front/back shield is
96×152 game pixels. Its flat lower edge is approximately on the idle foot line.

The fixed elevated camera, upper-left lighting and restrained painted finish
match the existing knight. The preview includes the **unchanged existing
knight** at 88 pixels as a direct scale comparison.

## Manifest contract

`manifest.json` is the complete handoff. Coordinates are exported source image
pixels, origin top-left, X right and Y down. Clockwise screen rotations use radians.

Every body frame records its atlas rectangle, **foot anchor**, both anatomical
**right/left hand targets**, visibility/annotation status, per-equipment **grip
points**, placement, rotation, unit equipment scale, and **local layer order**.
Visible fist centres were manually annotated and checked against the body's
alpha. Hands hidden by the torso are explicitly marked as occluded anatomical
targets rather than falsely described as visible measurements.

For a source point `p`, placement is:

```js
worldPoint = worldFoot + (p - frame.foot) * enemy.runtimeScale;
```

The shared foot is `(128,300)`. The body/equipment rig is reflected about this
foot for west, southwest and northwest. Reflect **the entire local transform**,
including sockets, grips and equipment; do not swap anatomical hand names and
then reflect them again. Exact north/south choose rear/front with the previous
horizontal side, as the existing knight does. Mirrored views also mirror
lighting and visually swap equipment sides; independent west art is not supplied.

The axe's primary grip attaches to the right fist. Its shaft aligns with both
fists, and its second grip slides along the long handle to meet the left hand.
Each frame records the exact resulting secondary grip. Eighteen two-hand
constraints were numerically checked. Each knife uses its own hand. The trident
uses the right hand and shield the left. Front/side shield faces the camera;
rear view shows the inner shield and straps.

## Timing and layers

These are **suggested art playback timings**, not changes to gameplay balance.
Every duration is also stored per frame in the manifest.

| Enemy | Walk loop (A / passing / B / passing) | Windup / contact / recovery |
| --- | --- | --- |
| Maw skeleton | 160 / 104 / 160 / 104 ms | 650 / 140 / 500 ms |
| Headless skeleton | 110 / 71.5 / 110 / 71.5 ms | 300 / 100 / 250 ms |
| Iron giant | 240 / 156 / 240 / 156 ms | 950 / 220 / 850 ms |

Idle loops; walk loops; attack clamps on recovery until the caller returns to
idle. In the game, let existing **simulation phases** select windup/contact/
recovery: the **first active tick** must show contact. Do not add another visual
attack clock that can delay the hit relative to damage.

All local layers share one world-foot depth. Rear equipment and the far knife
draw behind the body; body is layer 0; foreground weapon/shield layers are 2/3;
hand patches are layer 5. Use a depth-sorted container or small local offsets.
No weapons/shield are baked into the body PNGs. **Do not also draw the old
KnightSprite weapon** when using this equipment set.

## Previews and adapter

- [Walk at game size](qa/enemies-v1/walk-game-size.gif)
- [Attack at game size](qa/enemies-v1/attack-game-size.gif)
- [Combined animation at game size](qa/enemies-v1/animation-game-size.gif)
- [Idle scale comparison](qa/enemies-v1/south-east-idle.png)
- [Rear scale comparison](qa/enemies-v1/north-east-idle.png)
- [Interactive standalone art preview](enemy-art-preview.html)

The GIFs are captured from the actual layered Canvas adapter, one image pixel
per game pixel, at 100 ms intervals. They are art/attachment QA, **not in-game
screenshots**. The interactive page adds six directions, animation selection,
pause and socket markers. Serve the repository locally to open the HTML; GitHub
does not execute HTML preview pages. GIF/PNG files can be viewed directly on GitHub.

`tools/art/enemy-rig.mjs` is an engine-independent reference adapter. `sample()`
selects frames, including direct simulation phase overrides. `drawFrame()`
demonstrates root-foot placement, mirroring and equipment/finger layers. Nothing
in the game imports it. Winston can translate its commands to Phaser sprites
without rewriting movement, collision or enemy AI.

## Reproduce and validate

The built-in image-generation tool created the artwork. Exact prompts, design
references, chosen original filenames and refinements are in `prompts.json`.
Original generated PNGs remain in the generation workspace; final PNG exports
and previews are fully self-contained in this repository. The export pipeline
isolates connected alpha components, uniformly resizes each direction, packs
PNG cells, crops equipment, and clears hidden RGB under zero alpha. It does not
paint replacement imagery or bake equipment into bodies.

```sh
# Only to re-export from the original generated PNGs; Pillow/numpy/scipy required:
python tools/art/export_enemy_pack.py --source-dir /path/to/generated_images
node tools/art/prepare-enemy-rig.mjs

# Re-check and re-capture from committed art (no generation API required):
node tools/art/check-enemy-rig.mjs
node tools/art/capture-enemy-preview.mjs
python tools/art/finish-enemy-previews.py
```

## Limits

This is a small frame-based rig, not a mesh/Spine rig or 3D model. Walk uses two
step extremes and idle passing poses; leg crossing is imperfect in some generated
views and is a visible limitation of this first test pack. Attack has three
discrete authored poses. Minor bone/armour detail changes remain between frames.
There are no authored hurt, fall/death, roll, shield-bash or additional mini-boss
attack cycles. The existing game's procedural hit/death effects may be reused
at integration. Hand/gear alignment and scale are prepared, but enemy behaviour,
collision footprints, weapon reach, health, encounter placement and integration
are deliberately left to Winston. The giant's large shield occludes much of its
front torso by design.
