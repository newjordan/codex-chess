import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runStep(label, command, args) {
  console.log(`[Cyber Chess] ${label}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function newestSourceMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestSourceMtime(path));
      continue;
    }
    if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name))) {
      newest = Math.max(newest, statSync(path).mtimeMs);
    }
  }
  return newest;
}

function dependenciesReady() {
  const required = ['chess.js', 'react', 'react-dom', 'three', 'esbuild'];
  return required.every((name) => existsSync(join(rootDir, 'node_modules', name)));
}

function bundleFresh() {
  const appPath = join(rootDir, 'app.js');
  if (!existsSync(appPath)) return false;
  const appMtime = statSync(appPath).mtimeMs;
  return newestSourceMtime(join(rootDir, 'src')) <= appMtime;
}

const depsReady = dependenciesReady();
const needsBuild = !bundleFresh();

if (!depsReady) {
  runStep('Installing locked dependencies...', npmCommand, ['ci']);
}

if (needsBuild) {
  runStep('Rebuilding app.js...', npmCommand, ['run', 'build']);
}

console.log('[Cyber Chess] Starting local server...');
const server = spawn(process.execPath, ['scripts/static-server.mjs'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

server.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

server.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
