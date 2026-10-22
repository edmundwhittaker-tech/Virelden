# Ordinary textured weapon assets

Six original generated steel/wood weapon sprites live in `src/assets/weapons/sprites/*.webp`, with source-grip/extents metadata and prompt provenance alongside them. Only optimized runtime WebP files are packaged; bulky raw PNGs and generation/QA workspaces are not committed. Source hashes and measured calibration remain in the manifest. No third-party artwork was incorporated; these are task-generated ordinary equipment, not true Warplate or a new canon claim.

## Runtime transform

Each source points +X. Primary grip is the authoritative hand socket. `core/weaponPlacement.ts` computes:

- origin = packed grip / source size;
- scale = `pose.weaponLength / (axisTip.x - grip.x)`;
- rotation = shared `pose.weaponAngle`;
- local Y scale = `scale * (flipped ? -1 : 1)`.

The lateral inversion is essential for asymmetric axes/falchions: the shared angle mirrors the shaft but does not itself reflect the blade silhouette. The whole actor's roll/death transform applies once afterward. Weapon image depth14 is behind near forearm/hand overlays.

Physical lengths are sword53, spear93, hammer46, axe60, falchion66 and poleaxe110 game pixels, against an88px human. Poleaxe's measured support grip is44source pixels behind primary (11game pixels at nominal scale), matching the pure rig through every attack phase. Do not change poleaxe scale independently from its support socket.

`axisTip` is a longitudinal reference; `contactTip` records the actual curved painted point. Alpha/opaque bounds use exclusive right/bottom. Readiness checks require the real texture and its exact recorded dimensions before an item can be equipped; missing artwork never starts an asynchronous equip load.

## Evidence and limits

Authoring alpha/anchor/lossless checks passed6/6. Correctly mirrored centerline max-range raster composites have positive visible contact48/48;46meet the conservative3opaque-pixel threshold. Poleaxe SE/SW exactly at132px reach each has2opaque overlap pixels, not a zero-contact gap. Art was not reshaped to satisfy an arbitrary threshold. These are measured composites, **not browser screenshots**. Actual game-enemy contact and near-arc-edge damage timing still require focused browser QA. Poleaxe remains unequippable until its full two-hand runtime is visually accepted.

Equipment-menu previews use diagonal blade/head-detail crops of these same loaded textures. They are UI-only64×72 canvases; runtime art, physical length, grip, reflection and hit geometry are not changed.
