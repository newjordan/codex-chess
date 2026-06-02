# CODEX CHESS

<p align="center">
  <img src="media/cyber-chess-header.png" alt="Codex Chess arcade header" width="900">
</p>

<p align="center">
  <strong>Cyber Chess</strong><br>
  For one player. Browser required. No cartridge!
</p>

<p align="center">
  <a href="https://newjordan.github.io/codex-chess/">Meat the Machine</a>
  &nbsp;|&nbsp;
  <a href="media/chessagent-intro.mp4">WATCH THE INTRO MP4</a>
</p>

---

## OPENING CINEMA

<p align="center">
  <a href="media/chessagent-intro.mp4">
    <img src="media/cyber-chess-header.png" alt="Click to watch the Codex Chess intro MP4" width="760">
  </a>
</p>

<video src="media/chessagent-intro.mp4" controls width="900"></video>

If the video player does not appear in your browser, open `media/chessagent-intro.mp4`.

---

## HOW TO PLAY

1. Click `CLICK TO ENTER`.
2. Watch or skip the story sequence.
3. Enter your fighter name.
4. Choose `Play White` or `Play Black`.
5. Press `CONTINUE`, review the tower floor, then press `ASCEND`.
6. Click a piece, then click a legal destination square.
7. Checkmate the current enemy to climb to the next floor.
8. Clear Goop, Frostd4d, Razorblade, and GORDO to post a local leaderboard score.

Controls:

- Mouse or trackpad: select and move pieces.
- `Reset`: restart the current matchup.
- `Menu`: return to the intro and setup flow.
- `CONTINUE`: spend your remaining life after a loss.

---

## WHAT IS IN THE CARTRIDGE

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
- Generated moniker-themed settings background art.
- Imported announcer clips for tower opponent reveals.
- Imported loading-screen music for the menu and tower flow.
- Generated story, enemy, tower, victory, and defeat art.
- Embedded Lozza chess engine worker, included under its MIT license in `media/engines/`.
- ElevenLabs SFX prompt notes in `media/sfx/README.md` for future static sound assets.

---

## HOW CODEX HELPED

Codex helped turn the prototype into a playable static browser game, build the campaign structure, debug the board-name placement, add the player profile and local leaderboard, create the story/tower/enemy art direction, generate the image assets, add Web Audio music and SFX, and verify the game with automated browser smoke tests.

---

## RUN LOCALLY

```bash
npm install
npm start
```

Open `http://127.0.0.1:5173/`.

## REBUILD

The built `app.js` is committed so GitHub Pages can serve the game directly.

```bash
npm install
npm run build
```

## VERIFY

```bash
npm run smoke
```

To verify a deployed copy:

```bash
SMOKE_URL=https://newjordan.github.io/codex-chess/ npm run smoke
```

## HOSTING

Serve the repository root so `index.html`, `app.js`, `media/`, `avatars/`, and `pieces_fbx/` are all available at the same base path.

To generate a Pages-friendly static output directory:

```bash
npm run build:pages
```

Publish `dist/` from GitHub Pages or an Actions deploy step.
