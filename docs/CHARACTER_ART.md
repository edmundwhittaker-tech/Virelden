# Plate knight — first animation proof

## Deliverable

- Runtime asset: `src/assets/plate-knight-v1.webp`.
- Produced with the built-in image-generation tool, then mechanically resized and encoded as WebP for the game.
- Generated source: 1536 × 1024 RGBA; runtime sheet: 768 × 512 RGBA, 95,000 bytes.
- Four columns, two rows; each runtime frame is 192 × 256.
- Frame 0 is standing idle. Frames 1–6 form the six-frame walking loop at 12 fps. Frame 7 is an unused spare standing pose.
- The source faces right. Phaser mirrors it for the left direction, preserving the same armour design.
- Feet are anchored at normalized (0.5, 0.93), at the existing 2D collision position.
- A small runtime ground shadow and depth sorting keep the knight attached to the courtyard.

## Art constraints

Fully enclosed medieval gothic plate: closed helmet, articulated arms and gauntlets, metal tassets, greaves and sabatons.
Blackened steel, restrained silver edges and tiny brass accents.
No cloak, cape, tabard, fabric, exposed skin, weapon or shield.
This is a first character-art proof, not a new named character or lore canon.

## Current limits

Two horizontal facings. Vertical movement uses the last horizontal facing; front/back sprites are not authored.
Leftward lighting mirrors with the source. AI frames have minor plate/pose variation and are suitable for this first playable proof, not a final production animation pack.

## Generation prompt

```text
Use case: stylized-concept.
Asset type: production transparent sprite sheet for a Phaser 2D isometric dark-fantasy game.
Primary request: the SAME fully armoured Virelden knight walking toward screen RIGHT, with a neutral idle pose. Adult human proportions, heavy complete medieval gothic full plate, closed helmet and narrow visor, articulated steel gauntlets, metal tassets, knee plates, greaves and pointed plate sabatons. Entirely metal: NO cape, NO cloak, NO tabard, NO tunic, NO skirt, NO fabric, NO ribbons, NO exposed skin. Empty hands, no weapons or shield.
Style: polished hand-painted / pre-rendered 2D game sprite, severe and restrained, readable silhouette, realistic plate construction, blackened charcoal steel with subdued silver edge highlights and a few tiny antique-brass rivets. No cartoon face, no chibi proportions. Soft fixed upper-left lighting.
Camera: fixed orthographic elevated isometric/three-quarter camera, looking down about 30 degrees, knight faces screen right with his front and right-facing helmet visible. Identical camera, armour design, size, lighting, and placement in EVERY frame. Character walks in place; do not translate across a cell.
Layout: a perfectly regular FOUR COLUMN by TWO ROW sprite atlas on a 1536 by 1024 transparent canvas, each equal cell 384 by 512. NO outlines or gutters between cells; invisible regular grid only. Every knight's ground contact anchor is exactly at cell centre x=192 and local y=464. Leave clear padding around every silhouette so neighbours never touch. Each figure about 360 pixels tall. Exactly eight complete full-body figures, one per cell, ordered left to right then top to bottom.
Frame 0 (top-left): neutral standing idle, both feet on ground, arms relaxed.
Frames 1 through 6: six successive phases of a natural complete looping WALK to the RIGHT: left-foot forward contact, weight down, left leg passing under torso, right-foot forward contact, weight down, right leg passing under torso. Arms counter-swing naturally. Keep believable small vertical body bob and distinct leg poses; metal armour plates retain exactly the same shape and coverage. Frames 1-6 will loop in order.
Frame 7 (bottom-right): exact repeat of the neutral idle frame 0.
Background: actual fully transparent alpha with absolutely no opaque background, no checkerboard painted into the image, no floor plane, no cast shadow, no glow.
No text, no labels, no numbers, no borders, no extra characters or objects. This is an animation sheet, not a concept illustration.
```
