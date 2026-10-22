# Virelden environment art v1

Six original raster game assets generated with the built-in `image_gen` tool on 2026-10-22. Exact generation prompts are in `src/assets/environment-v1/prompts.json`; dimensions and anchors are in `manifest.json`. No API fallback was used. No third-party asset pack or public reference image pixels were incorporated into these assets.

## Art direction and provenance
The campaign owner's published Plate, sealed Vault and Inheritance images were visually reviewed as art-direction references: immense inherited **human** engineering, severe Gothic stonework, cold weathered slate, sparse moss and warm lantern pinpoints. Public canon sources: https://virelden-campaign.edmund-whittaker.chatgpt.site/history and /gallery. No GM archive was consulted. The exact architecture and courtyard are prototype inventions, not new established canon. No additional asset-pack licence applies; these are AI-generated project artwork, not a claim of copyright exclusivity or a grant over the campaign owner's source material.

## Integration contract
Projection: screen x = 640 + .8*(worldX-worldY); screen y = 180 + .4*(worldX+worldY). Vertical prop edges remain vertical. Keep collision footprints defined in world coordinates rather than deriving collision from sprite silhouettes.

- `slate-court.webp`: 1024x512, one full-court 2:1 diamond, origin(.5,.5), centre screen(640,436). **Not a repeatable tile**. No internal repetition seams; use once across the640-unit square court. Small natural boundary irregularities are best backed by the existing dark stone diamond, not a bright green underlay.
- `gothic-pillar.webp`: tall isolated pillar. Preserve generous vertical scale for monumental atmosphere; use ground-base origin(.5,.94) for footprint centre, or bottom origin for simplified placement. Fade when obstructing player. Do not enlarge collision to match overhanging cap.
- `sealed-vault.webp`: isolated background architecture with tiny amber lamps. Treat as inaccessible backdrop or align its visible wall foot with a real obstacle; do not stamp into traversable floor. The invented doorway is not a new Plate or a teleport destination.
- `fallen-masonry.webp`: low isolated rubble. Place inside a matching obstacle footprint or as clearly peripheral dressing; avoid implying traversable holes.
- `low-wall.webp`: one low isolated segment aligned down-right. Reverse using Phaser flipX for the opposite orientation; note this also reverses the baked light. Its generated axis is approximate, not an exact tile grid edge. Use short peripheral sections aligned visually; do not form long repeated seams.
- `mud-track.webp`: flat irregular ground decal, origin(.5,.5), screen-space rotation0 already follows down-right axis. Apply softly (suggest alpha0.35–0.6) over slate; no collision. Do not repeat edge-to-edge as a tile.

## Processing and verification
Generated RGBA alpha retained. Technical processing only: crop to visible silhouette bounds, Lanczos downsampling, WebP quality90. No repainting, recolouring, artificial transparency extraction or Python-generated replacement art. Prop alpha checked numerically and visually against a slate background; source exterior alpha0 and body typically252–253. At full opacity sprites retain a tiny near-transparent component from image generation. No black matte rectangle is baked into output. Court resized to exact1024x512 projection after generation. Original large source PNGs retained separately outside the shipped asset folder.

Final asset contact sheet is an **artwork preview**, not a gameplay screenshot. Full gameplay integration and collision/depth/readability tests belong to the scene builder and independent QA; this asset kit does not certify those tests by itself.
