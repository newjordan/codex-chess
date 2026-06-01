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
const address = server.address();
const url = `http://127.0.0.1:${address.port}/`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
const failed = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(err.message));
page.on('requestfailed', (req) => failed.push(`${req.url()} ${req.failure()?.errorText || ''}`.trim()));

try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'CLICK TO ENTER' }).waitFor();
  await page.getByRole('button', { name: 'CLICK TO ENTER' }).click();
  await page.getByRole('button', { name: 'Play White' }).waitFor();
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: /Goop EASY/ }).waitFor();

  const mounted = await page.evaluate(() => window.__chess?.mounted === true);
  const hasCanvas = await page.locator('canvas').count();
  const checks = { mounted, hasCanvas: hasCanvas > 0, errors, failed };
  console.log(JSON.stringify(checks, null, 2));

  if (!checks.mounted || !checks.hasCanvas || errors.length || failed.length) {
    throw new Error('smoke check failed');
  }
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
