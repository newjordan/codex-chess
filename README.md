# Codex Chess

Cyber Chess is a playable 3D browser chess game made for the Codex game challenge. It runs fully client-side: choose a side, pick an opponent, and play on a neon 3D board with animated FBX pieces.

## What I Made

- A standalone browser game built with React, Three.js, and chess.js.
- A menu flow with intro video, side selection, and three AI opponents.
- Local AI personalities:
  - Goop: easy, chaotic move choice.
  - Frostd4d: medium tactical move scoring.
  - Razorblade: harder minimax search.
- A 3D board with legal move handling, animated captures, reset, and menu return.

## How Codex Helped

Codex helped package the existing Cyber Chess prototype into this standalone repo, preserve the playable static bundle, add repo scripts, write the README, and verify the game opens through a browser smoke test.

## How To Play / Controls

1. Open the game.
2. Click `CLICK TO ENTER`.
3. Choose `Play White` or `Play Black`, then click `CONTINUE`.
4. Pick an opponent and click `BEGIN`.
5. Click one of your pieces, then click a legal destination square.

Controls:

- Mouse / trackpad: select and move pieces.
- `Reset`: restart the current matchup.
- `Menu`: return to side and opponent selection.

## Run Locally

```bash
npm install
npm start
```

Then open `http://127.0.0.1:5173/`.

## Rebuild

The built `app.js` is committed so GitHub Pages can serve the game directly. To rebuild it from source:

```bash
npm install
npm run build
```

## Verify

```bash
npm run smoke
```

## Hosting

This repo is ready for GitHub Pages. Serve the repository root so `index.html`, `app.js`, `media/`, `avatars/`, and `pieces_fbx/` are all available at the same base path.

To generate a Pages-friendly static output directory instead:

```bash
npm run build:pages
```

Publish `dist/` from GitHub Pages or an Actions deploy step. The game uses relative asset paths, so the output works under a project URL such as `/codex-chess/`.
