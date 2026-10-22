# Optional sound texture QA candidate

Baseline: public main `a932dc5e561fe21b54b7b1e49679e97e6eca11c5` (tree `3c3309ed8db342e429fd2b5ad97954ddffebb1c6`). The initial local-only checkpoint is `ca78c207b03a8a00143d26a41d5cfb454db72de3`. This is a separate review candidate, not a published release. The original release checkout and public main were not edited.

## Bounded scope

- Fresh loads are always muted, with no AudioContext until **Controls → Enable sound** is activated. The same accessible button becomes **Mute sound**, including while resume is pending. The Controls panel has a labelled native range with a 12% initial gain and 35% ceiling; arrows operate that range, not the player. Escape still closes Controls.
- Only actual stone-step support switches, HP-reducing physical weapon contacts, actual bow-projectile insertion, and real lever/gate/shortcut transitions produce primitive cues. No proximity/swing/damage/enemy-footstep cues, music, continuous ambience, external sound assets, or new dependencies.
- Phaser remains `audio: {noAudio: true}`. WebAudio is isolated under `src/audio`. The core optional recorder is a fixed primitive buffer (32 default, 128 hard maximum), drops overflow and has no audio/async APIs. Events never enter Adventure or durable saves.
- One deterministic precomputed noise buffer is shared per live context. Twelve event-only filtered-noise textures last at most 0.46 seconds; at most six voices may exist. Muting/interruption stops and disconnects sources, clears the Scene queue, lowers output and suspends. Generation tokens reject stale resume completions. There are no timers, playback queues, per-frame audio nodes, or added global listeners.
- Menus, equipment, death, protected-save/artwork screens, blur, hidden documents, area transitions and scene shutdown stop sound. Returning to play never replays old cues. Sound and volume preferences are not persisted; gameplay/save formats and content are unchanged.

## Local evidence

**Result: 207/207 tests, strict typecheck and production build passed.** The available runtime was Node 24.19.0, outside the declared Node 22 engine range; the existing pinned dependency tree was reused unchanged. No supported Node 22 runtime was found in the checked paths, so a Node 22 reproducibility recheck is still required.

`npm run check` compiles deterministic/core, WebAudio-mock and UI contract tests and performs strict TypeScript plus the production build. The focused rule cases cover six weapons (miss/contact/repeat/fatal/dead), actual arrow creation, each gate/shortcut transition and repeated E, suppressed steps, recorder overflow and exact full-state plus valid v4-save equality with recording absent, present, drained or overflowing. Controller mocks cover zero context while muted, direct gesture initiation/failure, partial graph failure, unchanged lifecycle idempotence, rapid out-of-order resume/mute/visibility/shutdown, voice cap, cleanup and WAV encoding.

UI/source contract tests are not native browser acceptance. Local Chromium launch was previously denied; it was not retried or bypassed for this experiment. No actual sound was played or listened to. Graph bounds and mocked WAV bytes are not evidence of acoustic quality, loudness, click-free interruption or browser autoplay behavior.

## Explicit remaining gates before publication

1. The initial local patch was reviewed and an isolated text-only `qa/optional-sound-textures` branch was authorized for QA. No main update, release PR or publication is authorized.
2. On an authorized native browser, verify fresh-load zero-context silence; trusted button/keyboard activation; pending-enable mute cancellation; range Arrow keys and focus trap/Return/Escape; all pause/equipment/death/protection/blur/hidden/area/shutdown interruptions; rapid resume races; and no replay after pause.
3. Render and actually listen to the source-backed offline samples and live transitions at low/default/max volume. Reject shrill/bleep-like or intrusive textures; assess simultaneous contacts and interruption transients. A scheduled master fade with immediate safe source stop is not a verified audible fade.
4. Recheck with the declared Node 22 runtime, then run the existing native regression suite and inspect screenshots. Reconfirm public save safety and released content without enabling held enemy integrations.

## Source-backed listening preview capability

`src/audio/texturePreview.ts` exports `renderCuePreview(cue, sampleRate=44100): Promise<ArrayBuffer>`. It creates a short mono OfflineAudioContext render, calls the identical `createTextureNoise` / `synthesizeTexture` functions used by live sound, and encodes PCM WAV bytes. It does not create a live playback context or play sound. Supply a numeric `SoundCue` from `src/core/soundEvents.ts` (1–12); the render is 0.75 seconds, bounded to 8–48 kHz.

A later authorized native QA harness can import these source modules through the dev server, export each WAV and obtain real listening review. The offline utility is deliberately not connected to gameplay or its default bundle, and these preview bytes were not fabricated or presented as listened-to evidence.

## Authorized isolated QA stage

The owner authorized text-only source and a QA-only workflow on `qa/optional-sound-textures`. Node 22 rules/build precede focused headed-native lifecycle and real OfflineAudioContext WAV exports; standard browser/component/contact/expedition/poleaxe regressions precede two distinct full earned campaigns. The original default-muted route remains unchanged in behavior. Its sound-enabled counterpart explicitly opts in through Controls after loadout choice and retains every original earned-route assertion: all 24 foes, 1,620 XP, 12 armor pieces, six weapons, +2 spear, level 10, poleaxe use before the keeper, physical return and durable reload. Native sound instrumentation is test-only and provides no game-state mutation API.

`tests/browser/audio-preview.spec.ts` exports 12 genuine cue WAVs and two six-contact overlap WAVs through the same synthesis code, plus a source/browser/hash manifest. They belong only in bounded seven-day QA artifacts, never repository media or production assets. Export validity is not acoustic acceptance; root review of actual listening files is required before a release decision.

At preparation, native jobs and actual listening are still pending; only local compilation, test discovery and the 207-rule/mock/UI check have passed. Exact CI commit/tree/run and results must be reported from the resulting workflow, not inferred from this document. No Chromium launch has been retried locally.

No main/Pages write, release PR, publication, held enemy integration, adapted skeleton/giant activation, default gait change, dependency change or repository media upload is part of this authorized QA stage.

### First native observation — not full acceptance

Run `39767940430` on source `59932c960a83d7fc23f514c5ada7619494e3eafe` / tree `1ce61acfa6095f292c41e709ada9ee723b7f0c7a` passed Node 22 rules/build and exported all 14 real WAVs with Chromium 141.0.7390.37. The native lane passed 9/11 cases; neither downstream regression nor campaign job ran. Actual hidden-tab setup was defeated by Playwright's default focus emulation; the corrected fixture disables that override before ordinary tab activation, never fabricates a visibility event. Corrupt-storage injection raced a legitimate autosave; the corrected fixture pauses before injecting corruption and reloading. These are QA-only corrections; production audio/synthesis bytes remain unchanged. Listening quality and the corrected run are still pending.
