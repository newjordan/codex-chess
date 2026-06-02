import { chromium } from 'playwright';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
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
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
const url = process.env.GORDO_CHECK_URL || `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  const waitForEmbeddedTower = async () => {
    await page.locator('.tower-bg').waitFor();
    await page.waitForFunction(() => {
      const image = document.querySelector('.tower-bg');
      return image instanceof HTMLImageElement &&
        image.complete &&
        image.naturalWidth >= 1600 &&
        image.naturalHeight >= 900 &&
        image.currentSrc.includes('floppy-tower-ladder-embedded.png') &&
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

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'CLICK TO START' }).click();
  await page.waitForFunction(() => window.__chess?.loadingMusic?.active === true);
  await page.getByRole('button', { name: 'ENTER STORY' }).click();
  await page.getByRole('button', { name: 'SKIP' }).click();
  await page.locator('#player-name').fill('GORDOTEST');
  await page.getByRole('button', { name: 'LOCK IN' }).click();
  await page.getByRole('button', { name: 'Play White' }).click();
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  if (process.env.TOWER_SCREENSHOT) {
    await waitForEmbeddedTower();
    if (await page.getByRole('button', { name: 'SETTINGS' }).count()) {
      throw new Error('settings button should not be visible on tower screen');
    }
    await page.screenshot({ path: process.env.TOWER_SCREENSHOT, fullPage: true });
  }
  await ascendThroughHeroLoad('goop', 'goop-entrance.png', 'goop_intro.mp3');

  for (const [expected, hero, intro] of [
    ['frostd4d', 'frostd4d-entrance.png', 'frostd4d_intro.mp3'],
    ['razorblade', 'razorblade-entrance.png', 'razorblade_intro.mp3'],
    ['gordo', 'gordo-entrance.png', 'gordo_intro.mp3'],
  ]) {
    await page.evaluate(() => window.__chess.forceWin());
    await page.getByRole('button', { name: 'NEXT OPPONENT' }).click();
    await page.waitForFunction((id) => window.__chess?.campaign?.screen === 'intro' && window.__chess?.campaign?.selectedId === id, expected);
    await waitForEmbeddedTower();
    await ascendThroughHeroLoad(expected, hero, intro);
  }

  await page.waitForFunction(() => window.__chess?.board3d?.squareToClient && window.__chess?.state?.fen);
  const startFen = await page.evaluate(() => window.__chess.state.fen);
  const movePoints = await page.evaluate(() => ({
    from: window.__chess.board3d.squareToClient('e2'),
    to: window.__chess.board3d.squareToClient('e4'),
  }));
  await page.mouse.click(movePoints.from.x, movePoints.from.y);
  await page.mouse.click(movePoints.to.x, movePoints.to.y);
  await page.waitForFunction((fen) => window.__chess?.state?.fen !== fen, startFen);
  const playerFen = await page.evaluate(() => window.__chess.state.fen);
  await page.waitForFunction((fen) => window.__chess?.state?.fen !== fen, playerFen, { timeout: 20000 });
  const finalFen = await page.evaluate(() => window.__chess.state.fen);
  const campaign = await page.evaluate(() => window.__chess.campaign);
  const result = {
    selectedId: campaign.selectedId,
    blackName: campaign.blackName,
    playerMoved: playerFen !== startFen,
    gordoMoved: finalFen !== playerFen,
    finalFen,
  };
  console.log(JSON.stringify(result, null, 2));
  if (result.selectedId !== 'gordo' || result.blackName !== 'GORDO' || !result.playerMoved || !result.gordoMoved) {
    throw new Error('GORDO worker move check failed');
  }
} finally {
  await browser.close();
  if (server.listening) server.close();
}
