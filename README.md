# Codex Chess

<p align="center">
  <img src="media/cyber-chess-header.jpg" alt="Codex Chess arcade header" width="900">
</p>

<p align="center">
  <strong>Cyber Chess</strong><br>
  One-player 3D arcade chess for the browser. No backend required.
</p>

<p align="center">
  <a href="https://newjordan.github.io/codex-chess/">Play Cyber Chess</a>
  &nbsp;|&nbsp;
  <a href="media/chessagent-intro.mp4">Watch the intro MP4</a>
</p>

---

## Challenge Submission

- Public GitHub repo: <https://github.com/newjordan/codex-chess>
- Playable game link: <https://newjordan.github.io/codex-chess/>
- Short description: a static browser chess campaign where you climb a cyber arcade tower, fight three local AI personalities, and face GORDO, a final boss powered by the embedded Lozza chess engine.

## What I Made

Codex Chess is a one-player browser game built with React, Three.js, chess.js, and a static asset pipeline. It has animated 3D chess pieces, a story intro, opponent reveal screens, local audio controls, a two-life continue system, a final boss, and a local leaderboard saved in `localStorage`.

No API keys, `.env` files, backend services, or runtime AI API calls are required. The game is designed to run as a static site on GitHub Pages, itch.io, Vercel, or any plain HTTP server.

## Opening Cinema

<p align="center">
  <a href="media/chessagent-intro.mp4">
    <img src="media/cyber-chess-header.jpg" alt="Click to watch the Codex Chess intro MP4" width="760">
  </a>
</p>

<video src="media/chessagent-intro.mp4" controls width="900"></video>

If the video player does not appear in your browser, open `media/chessagent-intro.mp4`.

## How To Play

1. Click `CLICK TO ENTER`.
2. Watch or skip the story sequence.
3. Enter your fighter name.
4. Choose `Play White` or `Play Black`.
5. Press `CONTINUE`, review the tower floor, then press `ASCEND`.
6. Click a piece, then click a legal destination square.
7. Checkmate the current enemy to climb to the next floor.
8. Clear Goop, Frostd4d, Razorblade, and GORDO to post a local leaderboard score.

## Controls

- Mouse or trackpad: select and move pieces.
- `Esc`: open the in-game pause/settings panel.
- `RESET BOARD`: restart the current matchup from the pause panel.
- `MAIN MENU`: return to the intro and setup flow.
- `CONTINUE`: spend one remaining life after a loss.

## What Is In The Cartridge

- 3D chess board built with React, Three.js, and chess.js.
- Animated FBX chess pieces.
- Three local AI personalities plus GORDO, a final boss backed by the embedded Lozza chess engine worker.
- Fixed floppy-tower campaign progression.
- Two-life continue system.
- Player name registration.
- Smart 3D board labels: white name on the white side, black name on the black side.
- Local leaderboard saved in `localStorage`.
- Browser-generated chiptune intro music.
- Browser-generated gameplay SFX for menu actions, reveals, moves, captures, checks, wins, losses, and countdown ticks.
- Settings panel with Full Audio, SFX Only, and Muted modes.
- Static generated art and audio assets.
- Embedded Lozza chess engine worker, included under its MIT license in `media/engines/`.

## How Codex Helped

Codex helped turn the prototype into a playable static browser game, build the campaign structure, debug the 3D board and name placement, add the player profile and local leaderboard, shape the story/tower/enemy art direction, package the static assets, add audio controls, and verify the game with automated browser smoke tests.

All non-Lozza opponents are local chess heuristics written for this game. Codex was the only AI coding assistant used to build and package the project.

## One-Command Local Play

From a fresh clone:

```bash
npm run play
```

That command installs locked dependencies, rebuilds `app.js`, and starts a local static server. Open `http://127.0.0.1:5173/`.

## Local Development

```bash
npm ci
npm run build
npm start
```

## Rebuild

The built `app.js` is committed so GitHub Pages can serve the game directly.

```bash
npm run build
```

## Verify

```bash
npm run preflight
```

To verify a deployed copy:

```bash
SMOKE_URL=https://newjordan.github.io/codex-chess/ npm run smoke
```

## Hosting

Serve the repository root so `index.html`, `app.js`, `media/`, `avatars/`, and `pieces_fbx/` are all available at the same base path.

To generate a Pages-friendly static output directory:

```bash
npm run build:pages
```

Publish `dist/` from GitHub Pages or an Actions deploy step.

## Attributions

See `ATTRIBUTIONS.md` for Lozza, ElevenLabs-generated audio notes, fonts, and asset notices.
