# Virelden

A browser-first **2D isometric dark-fantasy action RPG**, built with **Phaser + TypeScript + Vite**. Separate from the old Unity experiment and the Virelden lore website.

## Play without installing anything

Enable the included GitHub Pages workflow once:

1. Open this repository's **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**. Do not create a second workflow.
3. Open **Actions → Verify and publish → Run workflow**, on `main`.
4. After the publish step succeeds, open **https://edmundwhittaker-tech.github.io/Virelden/**.

That is the expected address, **not a claim the site is already live**. The workflow skips publication when Pages is unconfigured and explains why in its summary. A green verification job alone does not mean publication happened.

This repository and any Pages build are public. Never add private GM lore, credentials or passwords.

## Develop entirely in your browser

Open **Code → Codespaces → Create codespace on main**. The configuration installs the dependencies in the cloud. In that browser-based terminal run:

```sh
npm run dev
```

Open forwarded port **5173**. Stop the Codespace when finished; compute/storage allowances and billing are controlled by your GitHub account. Playing a deployed Pages build does not require a running Codespace.

Phaser is a library inside this project, not a separate application or account. GitHub stores the source and history; Codespaces is an optional cloud editor; Actions tests and builds; Pages serves the game.

## What the starter includes

One small ruined courtyard, a fixed angled 2D view, screen-relative movement, solid pillar footprints, depth sorting, a mouse-directed sword attack, stamina and rolling, two telegraphing sentries, a checkpoint and one persistent sword-strengthening relic.

The room fits on screen. Camera-follow, connected rooms, final art/animation, audio, multiplayer and mobile controls are not implemented. The procedural silhouettes and geometry are **placeholders, not final Virelden art or new lore canon**.

| Control | Action |
| --- | --- |
| WASD / arrows | Move relative to the screen |
| Mouse + left click | Aim / sword attack |
| Space / Shift | Roll; costs stamina, early frames avoid damage |
| E | Claim nearby relic / rest at checkpoint |
| R | Restart encounter; retain discovery |
| Escape | Pause / controls |
| F2 | Collision footprints |

Discovery is stored in this browser, not in an account. Clearing browser data removes it. Blocked storage is handled without preventing play.

## Development commands

Use Node **22.12+ within the 22.x line**. Top-level dependencies are deliberately pinned.

```sh
npm install             # Initial bootstrap only when no lock exists
npm ci                  # Use once package-lock.json is committed
npm run dev
npm test                # 15 engine-independent rules tests
npm run typecheck
npm run build           # Type-check + production build into dist/
npx playwright install chromium
npm run test:browser     # Real browser input tests against the built game
```

The workflow runs rules tests, a strict build and Chromium smoke tests before publication. Its `virelden-build` artifact retains the production build, generated dependency lock and screenshot evidence. Commit the generated lock after the initial dependency bootstrap; subsequent installs use `npm ci`.

## Project map

- `src/core/game.ts`: deterministic rules, collision, projection, save decoding.
- `src/game/CourtyardScene.ts`: input, fixed-step update loop, HTML interface.
- `src/game/WorldView.ts`: replaceable procedural visuals.
- `tests/` and `browser-tests/`: gameplay and browser checks.
- `.devcontainer/`: browser-based Codespaces setup.
- `.github/workflows/`: verification and optional Pages publication.
- `AGENTS.md`: working instructions for coding agents.
- `docs/`: project brief, implementation status and work-chat handoff.

Read [the brief](docs/PROJECT_BRIEF.md), [status](docs/STATUS.md) and [work-chat handoff](docs/WORK_CHAT.md) before extending the game.

## References

- Phaser: https://docs.phaser.io/
- Official TypeScript/Vite template: https://github.com/phaserjs/template-vite-ts
- Pages workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

Phaser is an MIT-licensed dependency. No rights to Virelden's original content are granted merely by this repository being public.
