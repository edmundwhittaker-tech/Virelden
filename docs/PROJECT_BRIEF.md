# Project brief — 21 October 2026

Virelden is a severe dark-fantasy top-down/isometric action-exploration RPG. The previous Unity-assisted attempt introduced excessive editor, asset and animation friction. This project restarts with Phaser + TypeScript and a browser-playable development loop.

Preserve immediate controls, deliberate exploration, secrets, distinct weapons, designed encounters and persistent progression. Keep discoveries after death; return to checkpoints. Do not turn this into a horde-survival or run-based roguelike.

## Foundation scope

One courtyard, one character, one sword, stamina and roll, two instances of one enemy type, readable attack warnings, one checkpoint and one upgrade. Prove edit → build → play → fix before expanding.

Ground positions and collision are ordinary 2D coordinates. A fixed 2:1 ground projection creates the angled view. The first room fits on screen. Real elevation, rotating cameras, multi-floor navigation and large-world streaming are not included.

## Acceptance

A clean checkout installs and builds. A browser opens the game without runtime errors. Movement, aim, sword, dodge, collision, death and restart work. Rules and actual input have tests; a rendered screenshot exists. Discovery loads safely; corrupt or unavailable storage cannot block boot. Verification and actual deployment status are reported separately.

## Next milestones

1. Owner playtest: tune movement, attack timing, roll distance and warnings.
2. One character proof: consistent silhouette, pivot, scale and required directions; idle/movement/attack/roll. Replace visuals without rewriting rules.
3. One environment art proof: a few matching ruins; validate perspective, scale, depth and collision.
4. Small exploration extension: connected side passage and hidden discovery, followed by a second weapon.

No large map, quest system, dialogue framework, inventory framework or mass art generation during the foundation milestone. Prototype presentation is not final art and does not establish lore canon.
