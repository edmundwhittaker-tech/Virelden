# Virelden: working instructions

Read README.md, docs/PROJECT_BRIEF.md and docs/STATUS.md before editing. Inspect the actual current source and build results, not only conversation history.

## Constraints

- Phaser + TypeScript; fixed-view 2D isometric / three-quarter presentation. No Unity or 3D migration without explicit approval.
- Desktop keyboard/mouse first; browser playtesting and cloud development. Do not require Edmund to install local tools or manually wire an editor.
- Free WASD movement, mouse-directed attacks, stamina and roll. Designed encounters and persistent discoveries; not horde runs, lock-on or combo trees.
- Severe muted dark fantasy, monumental ruins, readable silhouettes. Placeholder names/art are not new lore canon. The existing Virelden lore site remains canonical.
- Separate gameplay from character artwork. Prove one directional character with usable animation before bulk art generation.
- Never commit secrets, tokens or private GM content to this public repository or browser bundle.

## Process

1. Inspect the latest branch. After initial bootstrap, use small feature branches and PRs, preserving the known-good version.
2. Define observable acceptance criteria for the next change.
3. Keep deterministic rules in src/core, presentation in WorldView and input/HUD integration in CourtyardScene.
4. Retain the fixed simulation step and collision substeps. Do not make speed, damage or stamina frame-rate dependent.
5. Run npm test and npm run build; run npm run test:browser after user-facing changes. Inspect the screenshot, not only an exit code.
6. Do not remove tests to disguise failures or add new features while existing ones are broken.
7. Update docs/STATUS.md with what changed, what was tested and remaining limits. Distinguish authored code, a successful build, browser-tested behaviour and user-approved feel.
8. Report the exact commit/PR and actual preview status. A configured Pages workflow is not proof of a live site.

Keep dependencies pinned and commit package-lock.json after bootstrap. No telemetry, paid services, AI API calls or extra hosting accounts by default. Do not start billable cloud compute without the owner's request. Debug snapshots appear only with ?debug=1 and are read-only copies; no test-only state mutation APIs in production.
