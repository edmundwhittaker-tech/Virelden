# Complete-frame enemy appearances

This candidate reuses the supplied skeleton, basic iron giant and robed Keeper designs in existing prototype encounters. It does not add levels, enemies, canonical named people or allegiance claims. The robed appearance is a generic monk-like adversary in this game, not a declaration that the named Keeper or a funerary order is hostile.

## Existing encounter mapping

| Area | Existing enemy IDs | Appearance |
|---|---|---|
| Station | raider, ascent-guard, transfer-raider | Maw skeleton with axe |
| Station | ascent-raider, watch-raider | Headless skeleton with twin knives |
| Station | captain, transfer-guard | Generic robed Keeper appearance |
| Station | upper-captain only | Basic iron giant body; **no added shield, weapon or hand overlays** |
| Cistern Viaduct | west-sentinel, bridge-guard | Maw skeleton |
| Cistern Viaduct | east-patrol, cache-guard | Headless skeleton |
| Cistern Viaduct | sluice-warden | Generic robed appearance |
| Record Annex | shutter-sentry | Maw skeleton |
| Record Annex | corner-raider, stair-guard | Headless skeleton |
| Record Annex | records-guard, annex-keeper | Generic robed appearance |

All six existing bow lookouts keep their real bow, nock registration and arrow projectiles. None of the supplied complete-character replacements has a bow. The other three robed/knight source kits are not loaded or made into hostile characters just to fill roles.

## Representation and bounds

`WholeEnemySprite` draws one complete image frame and one grounded shadow. It never assembles limbs or draws a separate weapon/hand pass. The skeletons are offline composites of the already-complete body poses, recorded equipment and hand-occlusion overlays from source commit `88339ff21808d812b46607ab50643764990dfc06`. The giant copies **only the basic complete body cells**. These are six existing poses per view, not newly painted 24-frame animations. `tools/art/bake-complete-enemies.py` reproduces their lossless sheets; the manifest and provenance identify source filenames, hashes and operations.

Each legacy atlas has 18 cells: E/SE/NE rows × idle, step A, step B, windup, contact and recovery. Source cells are 448×384 with fixed foot (160,352), including padding around the original body cell. Runtime scale stays 0.5 for skeletons (88px Maw and 79px headless body references) and 1 for the 176px giant. The export checks transformed source-alpha bounds before compositing, then checks nonempty alpha, cell borders and lossless decoding. Mirroring reflects the entire drawing about the world foot, using the complementary horizontal origin; depth and shadow remain at that foot.

The robed Keeper uses its supplied whole-character front/rear sheets from commit `f1c151c94edb6a4ceaf77f7723c65640d2eff39f`: 384×384 cells, foot (176,304), scale 0.5 and 88px human reference. It has four idle frames, eight walk frames, six attack frames, two hurt frames and four death frames. E/W reuse its front three-quarter drawing; N/S retain the previous horizontal side. Mirroring also mirrors apparent handedness and lighting; these are not eight independently authored views.

## Timing and gameplay boundary

The unchanged AI resolves melee damage at **windup → recovery**, with no simulation active phase. Visual windup is normalized to the existing timer. The first part of that same recovery displays the contact pose immediately; its remaining time shows recovery. Art playback suggestions never overwrite AI timings, damage, rewards or range envelopes. Samples use simulation time only, so pause, repeated draws and interrupted/repeated stagger cannot independently advance or replay a strike. Death begins once at an observed live-to-dead edge; loaded defeated foes hold their final state.

The three legacy sets have **no authored hurt or death drawings**. They deliberately use a static hurt tint and a whole-sprite fall/fade temporary fallback, not a fabricated clip or runtime limb animation. The robed set uses its real hurt/death frames.

Only the upper captain's receiving-body capsules scale 2× about the foot to match its 176px basic body. The six explicit headless skeleton encounters omit only the phantom skull capsule; their torso and leg capsule objects remain identical. Their source alpha never reaches the old skull top: all 18 source frames are empty at the skull-only world point (0,-83). Every other ordinary target retains the identical human capsule objects and contact decisions. This is a bounded receiving-body correction, **not** a change to outgoing attack reach, AI, movement collision, weapon envelopes, health, difficulty, rewards or saves. Empty sprite corners are not body. No shield-block mechanic is introduced. The existing movement footprint remains unchanged and requires native arena review; point-foot walkability does not establish full-body clearance or pixel-perfect contact.

## Verification state

Local deterministic rules and strict production build pass. Asset alpha, anchors, pre-clipping bounds and reproducible lossless output are verified independently of browser execution. Prepared native suites cover all four sets in eight orientations and all visual phases, the actual upper-watch passage and outgoing damage edge, eight player-to-giant receiving contacts, and the existing 144-contact and close/spaced-contact regressions. These are **prepared, not locally executed**; local browser launch was previously denied and is not retried. Seeded fixture checks are not an earned campaign replay. Publication and CI status belong in `STATUS.md`; this document does not claim deployment.
