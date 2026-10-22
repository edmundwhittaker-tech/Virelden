# Virelden working instructions

Read README.md, docs/PROJECT_BRIEF.md and docs/STATUS.md, then inspect the current source before editing.

## Current scope

Phaser + TypeScript + Vite. The owner's 22 October follow-up authorizes one continuous level about four times the original playable action-RPG slice with combat, enemies, stamina, rolling, equipment/upgrades, exploration and saving, plus atmospheric textured terrain. Keep it bounded; do not expand into a large RPG or multiplayer. Read docs/PROJECT_BRIEF.md for canon boundaries.
Keep a severe, muted dark fantasy tone. The environment uses original generated textured assets; collision and combat feedback remain procedural. The generated knight is shared across loadouts and enemies. Artwork does not establish new lore canon.
The generated knight wears fully enclosed metal plate with no cloth. Preserve that constraint. His art supports east/west and northeast/northwest/southeast/southwest walking. Exact north/south use rear/front artwork with the previous horizontal side. See docs/CHARACTER_ART.md.
Never commit private GM lore, secrets or credentials to this public repository.

## Workflow

- Use a small feature branch and pull request. Preserve the prior version in Git history.
- Keep movement, collision and projection in src/core/game.ts; visuals in WorldView; input integration in CourtyardScene.
- Keep screen-relative normalized movement, fixed simulation steps, collision substeps and input cleanup on lost focus.
- Run npm test, npm run build and npm run test:browser after player-facing changes. Inspect screenshots.
- Update docs/STATUS.md with actual results and limits. Distinguish code authored, locally verified, CI verified and publicly deployed.
- Pin dependencies and commit package-lock.json. Use npm ci for reproducible installs.
- Debug snapshots are opt-in through ?debug=1, return copies and provide no state mutation API.
- Do not start billable cloud compute without the owner's request. Browser play on Pages requires no running Codespace.

