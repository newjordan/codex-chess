import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

const staticDirs = ['media', 'avatars', 'pieces_fbx', 'music'];
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.mp3', 'audio/mpeg'],
  ['.mp4', 'video/mp4'],
  ['.wav', 'audio/wav'],
  ['.fbx', 'application/octet-stream'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function legacyStaticAssets(): Plugin {
  const root = process.cwd();

  const serve = (req: { url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string) => void }, next: () => void) => {
    try {
      const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
      const dir = staticDirs.find((name) => url === `/${name}` || url.startsWith(`/${name}/`));
      if (!dir) return next();
      const filePath = resolve(root, url.slice(1));
      const allowedRoot = resolve(root, dir);
      if (filePath !== allowedRoot && !filePath.startsWith(allowedRoot + sep)) return next();
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('not found');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', mimeTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream');
      createReadStream(filePath).pipe(res as unknown as NodeJS.WritableStream);
    } catch {
      next();
    }
  };

  return {
    name: 'legacy-static-assets',
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
    closeBundle() {
      const outDir = resolve(root, 'dist');
      for (const dir of staticDirs) {
        const from = resolve(root, dir);
        if (existsSync(from)) cpSync(from, resolve(outDir, dir), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), legacyStaticAssets()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
