# Plate knight — directional animation proof

## Runtime assets

| Asset | Artwork | Size |
| --- | --- | --- |
| `src/assets/plate-knight-v1.webp` | Original east view, mirrored for west | 95,000 bytes |
| `src/assets/plate-knight-ne-v1.webp` | Rear northeast view, mirrored for northwest | 124,298 bytes |
| `src/assets/plate-knight-se-v1.webp` | Front southeast view, mirrored for southwest | 116,366 bytes |

All were generated with the built-in image tool and mechanically resized/encoded as transparent WebP.
Each generated source is 1536 × 1024 RGBA; each runtime sheet is 768 × 512, four columns × two rows.
Each frame is 192 × 256. Frame 0 is idle; frames 1–6 are a six-frame walk at 12 fps; frame 7 is spare idle.

## Controls and direction selection

| Movement | Keys | Artwork |
| --- | --- | --- |
| Northeast | W+D / Up+Right | Rear view |
| Northwest | W+A / Up+Left | Rear view, mirrored |
| Southeast | S+D / Down+Right | Front view |
| Southwest | S+A / Down+Left | Front view, mirrored |
| East / west | D / A or Right / Left | Original side view |

W alone chooses a north-facing rear view and S chooses a south-facing front view, retaining the last horizontal side.
Idle keeps the last facing. Reset returns to east. Turning between views retains the current walk phase.
There are six authored/mirrored facings; exact straight north/south views are not separately authored.

## Ground registration

The original side sheet keeps its previous anchor and scale.
The new sheets use measured per-cell head, visible-top and ground coordinates in KnightSprite.ts.
Visible height is normalized to 88 game pixels; horizontal head alignment and foot grounding correct small generated cell-layout differences.
These are render adjustments only. Collision positions, speed and the fixed movement simulation are unchanged.
The runtime shadow and depth sorting keep the knight attached to the courtyard and behind pillars appropriately.

## Art constraints and limits

The same enclosed gothic full plate, pointed closed helmet, articulated gauntlets, metal tassets, knee plates, greaves and sabatons.
Blackened steel, silver edges and small antique-brass accents.
No cloth, cape, cloak, tabard, fabric skirt, exposed skin, weapon or shield.
Rear views show the rear helmet and backplate; front views show the breastplate and visor.
West uses mirrored east-facing art, including mirrored lighting.
Small frame-to-frame AI plate/pose variations remain; this is a playable animation proof, not a final production character pack or lore canon.

## Exact built-in generation prompts

### Original side sheet

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

### New rear sheet — initial generation

```text
Use case: stylized-concept.
Asset type: transparent production sprite sheet for the existing Virelden Phaser isometric game.
Input image 1: REFERENCE ONLY for the exact SAME knight identity, plate construction, materials, proportions, helmet, shoulder armour and hand-painted/pre-rendered 2D game-sprite style. It is an existing right-facing animation sheet. Create a NEW directional sheet, not a copy of the reference facing.
Subject invariants: one adult knight, complete closed blackened-steel gothic full plate, subdued silver edges and tiny antique-brass rivets, articulated gauntlets, metal tassets, knee plates, greaves and pointed sabatons. Preserve the distinctive pointed closed helmet and full metal silhouette. Empty hands. NO cloth, cape, cloak, tabard, tunic, fabric skirt, ribbons, exposed skin, weapons or shield.
Camera invariants: fixed elevated orthographic isometric camera looking down about 30 degrees, equal camera/lighting/armour/scale across every frame. Soft upper-left lighting. Severe restrained dark-fantasy tone, realistic adult proportions, no chibi or cartoon. Each frame is a walk-in-place pose; do not move the knight across his cell.
Output layout: 1536 by 1024 transparent image, precisely FOUR columns by TWO rows, eight equal 384 by 512 cells, no drawn grid or gutters. Every knight is full-body, fully contained in its cell, 450-460 pixels tall, helmet near local y=18, ground contact anchor at local x=192 and y=476. Keep all body parts inside the cell with padding.
Frame order left-to-right, then next row: frame0 neutral standing; frames1-6 six successive complete looping WALK phases with alternating legs and counter-swinging arms; frame7 repeat neutral standing. Phases: left-foot contact, left-foot weight down, passing position, right-foot contact, right-foot weight down, passing position. Actual leg and arm articulation; no costume changes or camera rotation across frames.
Actual transparent alpha background, no painted checkerboard, no floor, no shadow or glow. No text, labels, numbers or borders.
DIRECTION OVERRIDE: ALL EIGHT figures face NORTH-EAST, toward the UPPER-RIGHT of the image and AWAY FROM THE CAMERA, with their BACK and rear-right three-quarter silhouette visible. Show the knight's BACKPLATE, back of the closed helmet, backs of the gauntlets and rear leg plates, not his chest or visor. His walking path goes diagonally up and right on an isometric ground plane. Both feet foreshorten correctly. This is the REAR VIEW for moving away; do not draw the front-facing chest from the reference. Maintain the reference helmet and armour identity.
```

### Rear-view correction

```text
Use case: precise-object-edit.
Image 1 is the EDIT TARGET: a 4-column, 2-row animation sheet of the armoured knight.
Keep the transparent background, exact 1536x1024 canvas, equal 384x512 cells, same character size and anchors, all eight idle/walk poses, complete full plate and no cloth.
Correct ONE thing: every figure must be seen from BEHIND while walking NORTH-EAST, toward the top-right and away from the viewer. We are looking at his BACK, not his chest.
The knight's FACE IS COMPLETELY HIDDEN. Show only the smooth REAR helmet dome, rear neck lames and BACKPLATE. There must be NO VISOR, no face grille, no eye slit visible in any of the eight frames. The body has a rear cuirass and shoulder blade plates, not the front breastplate pattern. Keep the same pointed helmet crest, riveted charcoal steel and brass-edge identity. The back of both hands/armour and rear knee articulation should read as a rear view. The feet point toward the upper right. Do not turn his head back toward the viewer. Do not add a cape, cloth or any other item.
Preserve the walk-cycle order: top-left idle, next six frames a complete walk loop, bottom-right idle. Each figure stays fully inside its original grid cell, ground anchor at local (192,476). No text or grid lines. Actual transparent alpha, not a painted background.
```

### New front sheet — initial generation

```text
Use case: stylized-concept.
Asset type: transparent production sprite sheet for the existing Virelden Phaser isometric game.
Input image 1: REFERENCE ONLY for the exact SAME knight identity, plate construction, materials, proportions, helmet, shoulder armour and hand-painted/pre-rendered 2D game-sprite style. It is an existing right-facing animation sheet. Create a NEW directional sheet, not a copy of the reference facing.
Subject invariants: one adult knight, complete closed blackened-steel gothic full plate, subdued silver edges and tiny antique-brass rivets, articulated gauntlets, metal tassets, knee plates, greaves and pointed sabatons. Preserve the distinctive pointed closed helmet and full metal silhouette. Empty hands. NO cloth, cape, cloak, tabard, tunic, fabric skirt, ribbons, exposed skin, weapons or shield.
Camera invariants: fixed elevated orthographic isometric camera looking down about 30 degrees, equal camera/lighting/armour/scale across every frame. Soft upper-left lighting. Severe restrained dark-fantasy tone, realistic adult proportions, no chibi or cartoon. Each frame is a walk-in-place pose; do not move the knight across his cell.
Output layout: 1536 by 1024 transparent image, precisely FOUR columns by TWO rows, eight equal 384 by 512 cells, no drawn grid or gutters. Every knight is full-body, fully contained in its cell, 450-460 pixels tall, helmet near local y=18, ground contact anchor at local x=192 and y=476. Keep all body parts inside the cell with padding.
Frame order left-to-right, then next row: frame0 neutral standing; frames1-6 six successive complete looping WALK phases with alternating legs and counter-swinging arms; frame7 repeat neutral standing. Phases: left-foot contact, left-foot weight down, passing position, right-foot contact, right-foot weight down, passing position. Actual leg and arm articulation; no costume changes or camera rotation across frames.
Actual transparent alpha background, no painted checkerboard, no floor, no shadow or glow. No text, labels, numbers or borders.
DIRECTION OVERRIDE: ALL EIGHT figures face SOUTH-EAST, toward the LOWER-RIGHT of the image and TOWARD THE CAMERA, in a clearly FRONT-RIGHT THREE-QUARTER view. Show the reference chest armour, closed helmet visor and front knee plates. His walking path goes diagonally down and right on an isometric ground plane, distinct from a horizontal side-on walk. Both feet foreshorten correctly. Maintain the reference armour identity exactly.
```

### Final walk-pose refinement (rear)

```text
Use case: precise-object-edit.
Edit this transparent 4-column by 2-row sprite sheet. Keep the EXACT same knight armour design, head, camera direction, materials, lighting, size, cell layout and transparency. Keep frames 0 and 7 as the neutral standing pose.
Fix only the WALK ANIMATION in frames 1 through 6. The current sheet repeats the same lead-leg pose. We need one complete cyclic ALTERNATING-LEG walk. This is critical: FRAME 1 AND FRAME 4 MUST HAVE OPPOSITE LEAD LEGS, and frames 2 and 5 must show different passing legs.
The six frames, read left-to-right then next row, must be:
Frame 1, top row second cell: FOREGROUND / near leg trails behind, knee bent and foot lifting; BACKGROUND / far leg reaches forward and supports.
Frame 2, top row third cell: near leg swings UNDER the torso, near knee bent with foot tucked underneath; far leg supports the body.
Frame 3, top row fourth cell: near leg extends FORWARD toward the direction the helmet points, heel reaching for the ground; far leg pushes off behind.
Frame 4, bottom row first cell: near leg leads FORWARD and supports the weight; far leg trails BEHIND, knee bent and foot lifting. This is the OPPOSITE of frame 1.
Frame 5, bottom row second cell: far leg swings UNDER the torso while near leg supports, far knee bent with foot tucked underneath.
Frame 6, bottom row third cell: far leg extends FORWARD toward helmet direction, near leg pushes off behind; loops into frame 1.
Arms counter-swing with opposite legs. Preserve all metal plates and articulation. Maintain consistent upper-body height and ground contact within each 384x512 cell. No cloth, skin, weapons, floor, shadows, labels or grid lines. Real transparent alpha background. Canvas stays 1536x1024. Direction invariant: north-east, seen from BEHIND, only rear helmet and backplate; no face or visor.
```

### Final walk-pose refinement (front)

```text
Use case: precise-object-edit.
Edit this transparent 4-column by 2-row sprite sheet. Keep the EXACT same knight armour design, head, camera direction, materials, lighting, size, cell layout and transparency. Keep frames 0 and 7 as the neutral standing pose.
Fix only the WALK ANIMATION in frames 1 through 6. The current sheet repeats the same lead-leg pose. We need one complete cyclic ALTERNATING-LEG walk. This is critical: FRAME 1 AND FRAME 4 MUST HAVE OPPOSITE LEAD LEGS, and frames 2 and 5 must show different passing legs.
The six frames, read left-to-right then next row, must be:
Frame 1, top row second cell: FOREGROUND / near leg trails behind, knee bent and foot lifting; BACKGROUND / far leg reaches forward and supports.
Frame 2, top row third cell: near leg swings UNDER the torso, near knee bent with foot tucked underneath; far leg supports the body.
Frame 3, top row fourth cell: near leg extends FORWARD toward the direction the helmet points, heel reaching for the ground; far leg pushes off behind.
Frame 4, bottom row first cell: near leg leads FORWARD and supports the weight; far leg trails BEHIND, knee bent and foot lifting. This is the OPPOSITE of frame 1.
Frame 5, bottom row second cell: far leg swings UNDER the torso while near leg supports, far knee bent with foot tucked underneath.
Frame 6, bottom row third cell: far leg extends FORWARD toward helmet direction, near leg pushes off behind; loops into frame 1.
Arms counter-swing with opposite legs. Preserve all metal plates and articulation. Maintain consistent upper-body height and ground contact within each 384x512 cell. No cloth, skin, weapons, floor, shadows, labels or grid lines. Real transparent alpha background. Canvas stays 1536x1024. Direction invariant: south-east, FRONT-RIGHT THREE-QUARTER view, facing diagonally down-right.
```
