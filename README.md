# Virelden — The Courtyard

A small **Phaser + TypeScript + Vite** starter: one isometric stone courtyard and one movable knight. The character has generated full-plate artwork, idle poses and six-frame walk cycles for east/west and all four isometric diagonals. The environment remains placeholder geometry in Virelden's muted dark fantasy style.

**Controls:** WASD or arrow keys to walk. **Reset position** returns to the centre.
The courtyard edges and four pillars are solid. Keyboard and desktop browser first.

| Direction | Keys |
| --- | --- |
| Northeast | W + D |
| Northwest | W + A |
| Southeast | S + D |
| Southwest | S + A |

Equivalent arrow-key pairs also work. W/S alone switch to rear/front artwork while retaining the last horizontal side.

## Develop entirely in your browser

You do not need to install anything on your computer or open a separate Phaser application.

1. Open [this repository](https://github.com/edmundwhittaker-tech/Virelden).
2. Click **Code → Codespaces → Create codespace on main**.
3. Wait for setup to finish. It installs the project dependencies automatically.
4. In the terminal at the bottom, type:

   ```sh
   npm run dev
   ```

5. Click **Open in Browser** when prompted. If there is no prompt, open the **Ports** panel and click the browser icon beside **5173**.
6. Keep that game tab open. Changes to the source update the preview automatically.
7. When finished, commit and push changes from **Source Control**, then stop the Codespace at [github.com/codespaces](https://github.com/codespaces).

Codespaces has a monthly included allowance; usage beyond it can cost money if billing is enabled. A stopped Codespace no longer uses compute, but stored Codespaces still use storage. This project does not create or start one automatically.

## What each part does

| Part | Purpose |
| --- | --- |
| GitHub repository | Saves the game's files and change history |
| Codespaces | Optional editor and development server running in the cloud |
| Phaser | The library that draws the scene and runs the game |
| TypeScript | The language used for the game code |
| Vite | Runs the live preview and builds the finished game |
| GitHub Actions | Automatically tests and builds code |
| GitHub Pages | Can host the built game at a permanent browser link |

You can use VS Code on your home computer later with the same repository. It is optional; you do not need a powerful gaming computer for this prototype.

## Play a published build

Expected Pages address: https://edmundwhittaker-tech.github.io/Virelden/

If Pages is not configured, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
Then open **Actions → Verify and publish → Run workflow** on main.
A green verification job alone does not mean Pages publication happened; check the publish job and its deployment URL.
Playing a published build does not need a running Codespace.

## Commands

Node 22.12+ in the 22.x line is configured in Codespaces and CI.

```sh
npm ci
npm run dev             # Live preview on port 5173
npm test                # Movement and collision checks
npm run build           # TypeScript check + production build into dist/
npx playwright install chromium
npm run test:browser    # Real keyboard input and screenshot checks
npm run preview         # Test the production build on port 4173
```

For a fresh local setup, install Node 22 and VS Code, clone this repository, then run the same commands.

## Files to know

- src/core/game.ts — movement, solid boundaries and isometric projection
- src/game/WorldView.ts — courtyard and character drawing
- src/game/KnightSprite.ts — generated full-plate sprite and animation
- docs/CHARACTER_ART.md — artwork layout, direction limits and generation prompt
- src/game/CourtyardScene.ts — keyboard controls and game loop
- src/style.css and index.html — surrounding page and controls
- .devcontainer/devcontainer.json — browser development setup
- .github/workflows/verify-and-publish.yml — checks and optional Pages deployment

The larger combat prototype has been superseded by this deliberately basic starting point. Its version remains in Git history.
There is no combat, AI, inventory, saving, audio, multiplayer or touch control in this starter.
The code and any Pages build are public: keep private GM content and credentials out of them.

