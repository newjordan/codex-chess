import { chromium } from 'playwright';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.mp3', 'audio/mpeg'],
  ['.mp4', 'video/mp4'],
  ['.fbx', 'application/octet-stream'],
]);

const server = createServer((req, res) => {
  const rawPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const relativePath = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
  const filePath = resolve(rootDir, relativePath);
  if (!filePath.startsWith(rootDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': mimeTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

function unfilterPngScanlines(raw, width, height, bytesPerPixel) {
  const stride = width * bytesPerPixel;
  const out = Buffer.alloc(stride * height);
  let inputOffset = 0;
  let outputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[inputOffset];
    inputOffset += 1;

    for (let x = 0; x < stride; x += 1) {
      const value = raw[inputOffset + x];
      const left = x >= bytesPerPixel ? out[outputOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? out[outputOffset + x - stride] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? out[outputOffset + x - stride - bytesPerPixel] : 0;
      let restored = value;

      if (filter === 1) restored = value + left;
      else if (filter === 2) restored = value + up;
      else if (filter === 3) restored = value + Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upperLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upperLeft);
        restored = value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft);
      } else if (filter !== 0) {
        throw new Error(`unsupported PNG filter ${filter}`);
      }

      out[outputOffset + x] = restored & 0xff;
    }

    inputOffset += stride;
    outputOffset += stride;
  }

  return out;
}

function pngHasVisibleVariance(buffer) {
  if (buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('screenshot is not a PNG');

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`unsupported PNG format bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const pixels = unfilterPngScanlines(inflateSync(Buffer.concat(idat)), width, height, bytesPerPixel);
  const stride = width * bytesPerPixel;
  const first = [
    pixels[0],
    pixels[1],
    pixels[2],
  ];
  let varied = 0;
  const step = Math.max(1, Math.floor((width * height) / 9000));

  for (let i = 0; i < width * height; i += step) {
    const pixelOffset = Math.floor(i / width) * stride + (i % width) * bytesPerPixel;
    const delta =
      Math.abs(pixels[pixelOffset] - first[0]) +
      Math.abs(pixels[pixelOffset + 1] - first[1]) +
      Math.abs(pixels[pixelOffset + 2] - first[2]);
    if (delta > 20) varied += 1;
    if (varied > 30) return true;
  }

  return false;
}

const externalUrl = process.env.SMOKE_URL;
let url = externalUrl;
if (!url) {
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  url = `http://127.0.0.1:${address.port}/`;
}
const browser = await chromium.launch({ headless: true });

async function runPlayableSmoke(label, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  const failed = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('response', (res) => {
    if (res.status() === 404) errors.push(`404 ${res.url()}`);
  });
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('requestfailed', (req) => failed.push(`${req.url()} ${req.failure()?.errorText || ''}`.trim()));

  try {
    const waitForEmbeddedTower = async () => {
      await page.locator('.tower-bg').waitFor();
      await page.waitForFunction(() => {
        const image = document.querySelector('.tower-bg');
        return image instanceof HTMLImageElement &&
          image.complete &&
          image.naturalWidth >= 1600 &&
          image.naturalHeight >= 900 &&
          image.currentSrc.includes('floppy-tower-ladder-embedded.jpg') &&
          document.querySelectorAll('.tower-opponent, .tower-slots').length === 0;
      });
    };
    const ascendThroughHeroLoad = async (expectedId, expectedHero, expectedIntro) => {
      await page.getByRole('button', { name: 'ASCEND' }).click();
      await page.locator('.enemy-load-screen').waitFor();
      await page.waitForFunction(
        ({ id, hero, intro }) => {
          const campaign = window.__chess?.campaign;
          const image = document.querySelector('.enemy-load-bg');
          return campaign?.screen === 'loading' &&
            campaign?.selectedId === id &&
            image instanceof HTMLImageElement &&
            image.complete &&
            image.currentSrc.includes(hero) &&
            window.__chess?.announcer?.src?.includes(intro);
        },
        { id: expectedId, hero: expectedHero, intro: expectedIntro }
      );
      await page.waitForFunction(
        (id) => window.__chess?.campaign?.screen === 'playing' && window.__chess?.campaign?.selectedId === id,
        expectedId,
        { timeout: 12000 }
      );
    };
    const expectEnemyResult = async (heading, expectedHero, expectedName) => {
      await page.getByRole('heading', { name: heading }).waitFor();
      await page.waitForFunction(
        ({ hero, name }) => {
          const image = document.querySelector('.result-portrait');
          const card = document.querySelector('.result-enemy-card strong');
          return image instanceof HTMLImageElement &&
            image.complete &&
            image.currentSrc.includes(hero) &&
            card?.textContent === name;
        },
        { hero: expectedHero, name: expectedName }
      );
    };
    const expectClearResult = async (heading, expectedHero) => {
      await page.getByRole('heading', { name: heading }).waitFor();
      await page.waitForFunction(
        (hero) => {
          const image = document.querySelector('.result-portrait');
          return image instanceof HTMLImageElement &&
            image.complete &&
            image.currentSrc.includes(hero) &&
            document.querySelector('.result-enemy-card') === null;
        },
        expectedHero
      );
    };

    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const startButton = page.getByRole('button', { name: 'PLAY' });
    await startButton.waitFor();
    await startButton.click();
    await page.waitForFunction(() => window.__chess?.audio?.ready === true);
    await page.waitForFunction(() => window.__chess?.loadingMusic?.active === true);
    await page.getByRole('button', { name: 'PLAY' }).click();
    await page.getByLabel('Name your hero').fill('CODXACE');
    await page.getByRole('button', { name: 'LOCK IN' }).click();
    await page.waitForFunction(() => window.__chess?.campaign?.playerName === 'CODXACE');
    await page.getByRole('heading', { name: 'THE PLAYER' }).waitFor();
    await page.getByRole('button', { name: 'BACK' }).click();
    await page.getByLabel('Name your hero').waitFor();
    await page.getByRole('button', { name: 'LOCK IN' }).click();
    await page.getByRole('heading', { name: 'THE PLAYER' }).waitFor();
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('heading', { name: 'TOO DEEP' }).waitFor();
    await page.getByRole('button', { name: 'BACK' }).click();
    await page.getByRole('heading', { name: 'THE PLAYER' }).waitFor();
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('heading', { name: 'TOO DEEP' }).waitFor();
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('heading', { name: 'THE BREACH' }).waitFor();
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('heading', { name: 'THE TRANSFER' }).waitFor();
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('heading', { name: 'THE ASCENT' }).waitFor();
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('heading', { name: 'THE CHASE' }).waitFor();
    await page.getByRole('button', { name: 'LOAD GAME' }).click();
    await page.getByRole('button', { name: 'Play White' }).waitFor();
    await page.getByRole('button', { name: 'CONTINUE' }).click();
    await waitForEmbeddedTower();
    if (await page.getByText(/FLOPPY TOWER ASCENT|CURRENT FLOOR|LOCKED ABOVE|CLEARED/).count()) {
      throw new Error('tower should not render floating copy');
    }
    if (await page.getByRole('button', { name: /Goop EASY/ }).count()) {
      throw new Error('opponent selection should be replaced by tower ascent');
    }
    await ascendThroughHeroLoad('goop', 'goop-entrance.jpg', 'goop_intro.mp3');
    await page.locator('.cyber-hud').waitFor();
    if (await page.getByRole('button', { name: /^Reset$/ }).count()) {
      throw new Error('reset button should not render in the gameplay HUD');
    }
    if (await page.getByRole('button', { name: /^Menu$/ }).count()) {
      throw new Error('menu button should not render in the gameplay HUD');
    }
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'RESET BOARD' }).waitFor();
    await page.getByRole('button', { name: 'MAIN MENU' }).waitFor();
    await page.getByRole('button', { name: 'CLOSE' }).click();
    await page.waitForFunction(() =>
      window.__chess?.campaign?.playerName === 'CODXACE' &&
      window.__chess?.boardLabels?.whiteName === 'CODXACE' &&
      window.__chess?.boardLabels?.blackName === 'Goop' &&
      window.__chess?.boardLabels?.whiteSide === 'rank-1' &&
      window.__chess?.boardLabels?.blackSide === 'rank-8'
    );

    await page.waitForFunction(() => window.__chess?.board3d?.squareToClient && window.__chess?.state?.fen);
    const startFen = await page.evaluate(() => window.__chess.state.fen);
    const movePoints = await page.evaluate(() => ({
      from: window.__chess.board3d.squareToClient('e2'),
      to: window.__chess.board3d.squareToClient('e4'),
    }));
    if (!movePoints.from || !movePoints.to) {
      throw new Error('could not project board squares for smoke move');
    }
    await page.mouse.click(movePoints.from.x, movePoints.from.y);
    await page.waitForFunction(() => window.__chess?.state?.selectedSquare === 'e2');
    await page.mouse.click(movePoints.to.x, movePoints.to.y);
    await page.waitForFunction((fen) => window.__chess?.state?.fen !== fen, startFen);
    const madeOpeningMove = await page.evaluate((fen) => window.__chess.state.fen !== fen, startFen);

    await page.evaluate(() => window.__chess.forceLoss());
    await expectEnemyResult('GOOP CLOGGED THE BOARD', 'goop-loss.jpg', 'Goop');
    await page.waitForFunction(() => window.__chess?.campaign?.continueSeconds <= 9);
    await page.getByRole('button', { name: 'CONTINUE' }).click();
    await page.locator('.enemy-load-screen').waitFor();
    await page.waitForFunction(() => window.__chess?.campaign?.screen === 'playing' && window.__chess?.campaign?.lives === 1, null, { timeout: 12000 });

    await page.evaluate(() => window.__chess.forceLoss());
    await expectEnemyResult('GOOP FLOODED THE RUN', 'goop-game-over.jpg', 'Goop');
    await page.getByRole('button', { name: 'NEW RUN' }).click();
    await page.waitForFunction(() =>
      window.__chess?.campaign?.screen === 'intro' &&
      window.__chess?.campaign?.selectedId === 'goop' &&
      window.__chess?.campaign?.lives === 2
    );
    await waitForEmbeddedTower();
    await ascendThroughHeroLoad('goop', 'goop-entrance.jpg', 'goop_intro.mp3');
    await page.waitForFunction(() =>
      window.__chess?.campaign?.screen === 'playing' &&
      window.__chess?.campaign?.selectedId === 'goop' &&
      window.__chess?.campaign?.lives === 2
    );

    await page.evaluate(() => window.__chess.forceWin());
    await expectEnemyResult('GOOP CONTAINED', 'goop-win.jpg', 'Goop');
    await page.getByText('NEXT CHALLENGER').waitFor();
    await page.getByText('Frostd4d', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'NEXT OPPONENT' }).click();
    await page.waitForFunction(() => window.__chess?.campaign?.screen === 'intro' && window.__chess?.campaign?.selectedId === 'frostd4d');
    await waitForEmbeddedTower();
    await ascendThroughHeroLoad('frostd4d', 'frostd4d-entrance.jpg', 'frostd4d_intro.mp3');

    await page.evaluate(() => window.__chess.forceWin());
    await expectEnemyResult('FROSTD4D THAWED', 'frostd4d-win.jpg', 'Frostd4d');
    await page.getByRole('button', { name: 'NEXT OPPONENT' }).click();
    await page.waitForFunction(() => window.__chess?.campaign?.screen === 'intro' && window.__chess?.campaign?.selectedId === 'razorblade');
    await waitForEmbeddedTower();
    await ascendThroughHeroLoad('razorblade', 'razorblade-entrance.jpg', 'razorblade_intro.mp3');

    await page.evaluate(() => window.__chess.forceWin());
    await expectEnemyResult('RAZORBLADE DISARMED', 'razorblade-win.jpg', 'Razorblade');
    await page.getByText('GORDO', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'NEXT OPPONENT' }).click();
    await page.waitForFunction(() => window.__chess?.campaign?.screen === 'intro' && window.__chess?.campaign?.selectedId === 'gordo');
    await waitForEmbeddedTower();
    await ascendThroughHeroLoad('gordo', 'gordo-entrance.jpg', 'gordo_intro.mp3');

    await page.evaluate(() => window.__chess.forceWin());
    await expectClearResult('THANKS FOR PLAYING', 'final-clear-family-reunion.jpg');
    await page.getByRole('button', { name: 'RUN IT BACK' }).waitFor();
    await page.waitForFunction(() => {
      const leaderboard = JSON.parse(window.localStorage.getItem('cyberChessLeaderboardV1') || '[]');
      return leaderboard.some((entry) => entry.name === 'CODXACE' && entry.outcome === 'clear' && entry.score >= 4000);
    });

    const canvasBox = await page.locator('canvas').boundingBox();
    if (!canvasBox) throw new Error('could not locate canvas box');
    const canvasScreenshot = await page.screenshot({ clip: canvasBox });

    const mounted = await page.evaluate(() => window.__chess?.mounted === true);
    const hasCanvas = await page.locator('canvas').count();
    const renderedPixels = pngHasVisibleVariance(canvasScreenshot);
    const campaign = await page.evaluate(() => window.__chess.campaign);
    const boardLabels = await page.evaluate(() => window.__chess.boardLabels);
    const audio = await page.evaluate(() => window.__chess.audio);
    const leaderboardSaved = await page.evaluate(() => {
      const leaderboard = JSON.parse(window.localStorage.getItem('cyberChessLeaderboardV1') || '[]');
      return leaderboard.some((entry) => entry.name === 'CODXACE' && entry.outcome === 'clear');
    });
    const intentionallyInterruptedAudio = [
      '/media/audio/the_pulse_long_song.mp3 net::ERR_ABORTED',
      '/media/audio/The_Pulse_of_the_Board_2.mp3 net::ERR_ABORTED',
      '/media/audio/cyber_chess_music.mp3 net::ERR_ABORTED',
      '/media/audio/synthetic_dreams_cyber_eyes.mp3 net::ERR_ABORTED',
      '/media/audio/victorious_1.mp3 net::ERR_ABORTED',
      '/media/audio/victorioius_2.mp3 net::ERR_ABORTED',
      '/media/audio/game_over.mp3 net::ERR_ABORTED',
    ];
    const relevantFailed = failed.filter((entry) =>
      !intentionallyInterruptedAudio.some((audio) => entry.includes(audio))
    );
    const checks = {
      label,
      viewport,
      mounted,
      hasCanvas: hasCanvas > 0,
      moved: madeOpeningMove,
      renderedPixels,
      campaignClear: campaign?.resultState?.kind === 'clear',
      playerNamed: campaign?.playerName === 'CODXACE',
      boardNames:
        campaign?.whiteName === 'CODXACE' &&
        campaign?.blackName === 'GORDO' &&
        boardLabels?.whiteSide === 'rank-1' &&
        boardLabels?.blackSide === 'rank-8',
      audioReady: campaign?.audioReady === true && audio?.ready === true && audio?.played > 0,
      leaderboardSaved,
      errors,
      failed: relevantFailed,
    };
    console.log(JSON.stringify(checks, null, 2));

    if (
      !checks.mounted ||
      !checks.hasCanvas ||
      !checks.moved ||
      !checks.renderedPixels ||
      !checks.campaignClear ||
      !checks.playerNamed ||
      !checks.boardNames ||
      !checks.audioReady ||
      !checks.leaderboardSaved ||
      errors.length ||
      relevantFailed.length
    ) {
      throw new Error(`${label} smoke check failed`);
    }
  } finally {
    await page.close();
  }
}

try {
  await runPlayableSmoke('desktop', { width: 1280, height: 900 });
  await runPlayableSmoke('mobile', { width: 390, height: 844 });
} finally {
  await browser.close();
  if (server.listening) {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}
