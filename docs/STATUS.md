# Project status — 22 October 2026

## Isolated opt-in sound QA candidate

A separate candidate based on public main `a932dc5` adds muted-by-default event-only sound textures, with enable/mute/low-volume controls confined to Controls. No audio preferences or gameplay/save formats are persisted. All 207 local tests, strict typecheck and production build pass using the existing pinned dependencies; Node 22 rules/build and genuine 14-WAV OfflineAudioContext exports also passed in isolated QA runs `39767940430` (`59932c9`) and `39769592040` (`8039515`). Native assertions improved from 9/11 to 10/11 after pausing before intentional QA-save corruption; Playwright's real-tab fixture still fails because its primary session forces focus. A separately labelled CI-only raw-CDP headed-tab lane is authored, not yet executed, without synthetic visibility, autoplay/security bypass or local Chromium launch. Standard regressions and both separately labelled full campaigns remain gated, not passed. Actual listening is unresolved (the available audio-input tool cannot hear the files). Local Chromium's earlier launch denial was never retried. No main/Pages change or release PR is authorized. See [sound experiment scope and QA gates](SOUND_EXPERIMENT.md).

## Playable content

The released reference is main `f080674`: one continuous four-section station level with twelve encounters, four caches, two checkpoints, a shortcut and a monumental operated gate. Ordinary Git history retains this working version for rollback.

The connected integration candidate adds two fully playable areas, Cistern Viaduct and Record Annex, for **three expeditions total**. Each new area has six foes and 440 XP, guarded equipment finds, a checkpoint, an operated shortcut, an objective and ordinary reversible service stairs. Station, cistern and annex together contain 24 foes and 1,620 XP. Human raider/bow/captain artwork remains an explicit prototype fallback; no external skeleton, headless or giant artwork is active.

Ward, Delver and Marcher provide twelve independently swappable armor pieces. Six weapons have registered textured artwork. The poleaxe is available in a guarded main-route annex find before the final keeper and is enabled after actual two-hand renderer acceptance. Checkpoint training, explicit rest, forge upgrades and all equipment remain global across areas. Controls, last-keyboard-facing attacks, physical contact, grounded depth, actor scale, textured floors and black offboard space are preserved.

Active persistence uses a strict v4 envelope, per-area durable state, staged validated writes, one bounded previous-good fallback and an explicit reset tombstone. Full valid v3 equipment, upgrades, marks, training and station progress migrate without reconstruction. Older v3/v1 keys stay read-only. Released older-client forward guards remain in the legacy codec; active v4 additionally protects successor namespaces and cross-tab arrivals. See [Connected expeditions](CONNECTED_EXPEDITIONS.md) and [Progression contract](PROGRESSION_CONTRACT.md).

## Evidence and pending release gates

The pre-integration [connected QA run](https://github.com/edmundwhittaker-tech/Virelden/actions/runs/39746889034) passed 177 rules/build checks, all 12 explicitly seeded native feature cases and 160 actual Phaser image-matrix poleaxe poses. Its unseeded player physically traversed station→cistern→annex→cistern→station, defeated all 24 foes, earned all 1,620 XP, found twelve armor pieces and six weapons, used the poleaxe before the keeper, returned to the forge, and passed durable reload equality assertions. One genuine death/retry occurred. **The overall route test was red:** its total timeout expired during a redundant second long forge approach after reload. This is meaningful traversal evidence, not a green completion claim.

The main-based integration candidate retains the released weapon-detail thumbnails, compatibility cases, contact diagnostics and older-client guards. A real Lower Ward beacon rest before final reload avoids the redundant long repeat without removing persistence or forge assertions. The exact final integration tree must independently pass the complete earned route, standard verification, compatibility cases and renderer/contact fixtures before any merge or publication.

Representative grounded shelf feet, service-stair treads, reservoir water and bridge masking have been visually reviewed. Geometry-only checks cover both reserved finale positions with 26-unit feet, retreat rings and approach lanes. A known conservative floor-union seam can reject larger bodies elsewhere; this is **not** full-map giant navigation or long-trident combat acceptance. No map widening or giant activation is claimed.

Canvas rendering and normal requestAnimationFrame are used without SwiftShader. Browser evidence comes from GitHub Actions. Compact screenshots and state are workflow artifacts, not committed archives.

All local places, gear and adversaries are prototype adaptations, not additions to official Virelden lore. No Plate fast travel, private campaign material or starter true Warplate is introduced. Single-player desktop keyboard/mouse; no audio, touch, multiplayer or account service.
