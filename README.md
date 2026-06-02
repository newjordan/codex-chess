# CODEX CHESS

<p align="center">
  <img src="media/cyber-chess-header.png" alt="Codex Chess arcade header" width="900">
</p>

<p align="center">
  <strong>OFFICIAL CYBERSPACE INSTRUCTION BOOKLET</strong><br>
  For one player. Browser required. No cartridge blowing necessary.
</p>

<p align="center">
  <a href="https://newjordan.github.io/codex-chess/">PLAY THE GAME</a>
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

## THE STORY SO FAR

Before the age of neon boards, the greatest chess mind alive chased a forbidden rumor hidden deep in computation: the Shannon Prime.

Then the Shannon Knights struck.

<table>
  <tr>
    <td width="50%"><img src="media/intro/01-pre-computation.png" alt="The player before computation"></td>
    <td width="50%"><img src="media/intro/02-shannon-knights-kidnap.png" alt="The Shannon Knights kidnapping the family"></td>
  </tr>
  <tr>
    <td><strong>PRE-COMPUTATION</strong><br>The brilliant player studies the impossible prime.</td>
    <td><strong>THE BREACH</strong><br>Goop, Frostd4d, and Razorblade tear open the lab and kidnap his family.</td>
  </tr>
  <tr>
    <td><img src="media/intro/02-consciousness-floppies.png" alt="Consciousness copied to floppy disks"></td>
    <td><img src="media/intro/03-floppy-tower.png" alt="The floppy tower loading forty-two disks"></td>
  </tr>
  <tr>
    <td><strong>42 DISKS</strong><br>He transfers his mind onto forty-two floppy disks.</td>
    <td><strong>FLOPPY TOWER ONLINE</strong><br>The disks load one by one. The room becomes light.</td>
  </tr>
  <tr>
    <td colspan="2"><img src="media/intro/04-shannon-knights.png" alt="The Shannon Knights waiting in cyberspace"></td>
  </tr>
  <tr>
    <td colspan="2"><strong>CYBERSPACE</strong><br>Now he must climb the tower, beat the Shannon Knights, save his family, and find the prime at the center of chess.</td>
  </tr>
</table>

---

## YOUR MISSION

<p align="center">
  <img src="media/floppy-tower-ladder.png" alt="The floppy tower ladder" width="760">
</p>

Ascend the Floppy Tower. You do not pick your opponent. You rise.

Start at the bottom with Goop, push through Frostd4d, and survive Razorblade at the top. You have two lives for the full run. Lose once and the continue clock starts. Lose twice and the cabinet owns your score.

---

## KNOW YOUR ENEMIES

<table>
  <tr>
    <th>FLOOR 1</th>
    <th>FLOOR 2</th>
    <th>FLOOR 3</th>
  </tr>
  <tr>
    <td><img src="media/enemies/goop-entrance.png" alt="Goop entrance hero"></td>
    <td><img src="media/enemies/frostd4d-entrance.png" alt="Frostd4d entrance hero"></td>
    <td><img src="media/enemies/razorblade-entrance.png" alt="Razorblade entrance hero"></td>
  </tr>
  <tr>
    <td><strong>GOOP</strong><br>Easy<br>Mostly legal. Frequently sticky.</td>
    <td><strong>FROSTD4D</strong><br>Medium<br>Cold reads, colder captures.</td>
    <td><strong>RAZORBLADE</strong><br>Hard<br>Depth search with bad intentions.</td>
  </tr>
  <tr>
    <td><img src="avatars/goop.png" alt="Goop avatar"></td>
    <td><img src="avatars/frostd4d.png" alt="Frostd4d avatar"></td>
    <td><img src="avatars/razorblade.png" alt="Razorblade avatar"></td>
  </tr>
</table>

Each enemy brings a custom arena mood: Goop glows green, Frostd4d freezes the background blue, and Razorblade stains the board red.

---

## VICTORY AND DEFEAT

<table>
  <tr>
    <td width="50%"><img src="media/campaign-victory-portrait.png" alt="Victory portrait"></td>
    <td width="50%"><img src="media/campaign-defeat-portrait.png" alt="Defeat portrait"></td>
  </tr>
  <tr>
    <td><strong>YOU WIN</strong><br>Clear a floor and the next challenger appears.</td>
    <td><strong>YOU LOSE</strong><br>Hit continue before the countdown expires.</td>
  </tr>
</table>

---

## HOW TO PLAY

1. Click `CLICK TO ENTER`.
2. Watch or skip the story sequence.
3. Enter your fighter name.
4. Choose `Play White` or `Play Black`.
5. Press `CONTINUE`, review the tower floor, then press `ASCEND`.
6. Click a piece, then click a legal destination square.
7. Checkmate the current enemy to climb to the next floor.
8. Clear Goop, Frostd4d, and Razorblade to post a local leaderboard score.

Controls:

- Mouse or trackpad: select and move pieces.
- `Reset`: restart the current matchup.
- `Menu`: return to the intro and setup flow.
- `CONTINUE`: spend your remaining life after a loss.

---

## WHAT IS IN THE CARTRIDGE

- 3D chess board built with React, Three.js, and chess.js.
- Animated FBX chess pieces.
- Three local AI personalities.
- Fixed floppy-tower campaign progression.
- Two-life continue system.
- Player name registration.
- Smart 3D board labels: white name on the white side, black name on the black side.
- Local leaderboard saved in `localStorage`.
- Browser-generated chiptune intro music.
- Browser-generated gameplay SFX for menu actions, reveals, moves, captures, checks, wins, losses, and countdown ticks.
- Generated story, enemy, tower, victory, and defeat art.
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
