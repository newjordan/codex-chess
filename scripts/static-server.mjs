import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 5173);
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.mp4', 'video/mp4'],
  ['.fbx', 'application/octet-stream'],
]);

const server = createServer((req, res) => {
  const rawPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const relativePath = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
  const filePath = resolve(rootDir, relativePath);

  if (!filePath.startsWith(rootDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }

  res.writeHead(200, { 'content-type': mimeTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Cyber Chess: http://127.0.0.1:${port}/`);
});
