import * as packagerModule from '@electron/packager';
import { constants as fsConstants } from 'node:fs';
import { access, cp, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packager = packagerModule.default ?? packagerModule.packager;

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktopDir = resolve(rootDir, 'dist-desktop');
const stageDir = resolve(desktopDir, 'stage');
const staticDir = resolve(stageDir, 'app');
const outputDir = desktopDir;
const desktopProductName = 'CC V0.5';
const desktopAppVersion = '0.5.0';
const desktopReleaseDirName = 'Cyber_Chess_0.5';

const command = process.argv[2] ?? 'package';
const runtimeMediaDirs = ['audio', 'avatars', 'bonus', 'buttons', 'enemies', 'engines', 'fonts', 'hud', 'intro', 'results', 'sfx'];

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyIfPresent(from, to) {
  if (await exists(from)) {
    await cp(from, to, { recursive: true });
  }
}

async function copyTopLevelFiles(fromDir, toDir) {
  if (!(await exists(fromDir))) return;
  await mkdir(toDir, { recursive: true });
  for (const entry of await readdir(fromDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      await cp(resolve(fromDir, entry.name), resolve(toDir, entry.name));
    }
  }
}

async function stageDesktopApp() {
  await rm(stageDir, { recursive: true, force: true });
  await mkdir(staticDir, { recursive: true });

  await copyIfPresent(resolve(rootDir, 'desktop/main.cjs'), resolve(stageDir, 'main.cjs'));
  await copyIfPresent(resolve(rootDir, 'desktop/preload.cjs'), resolve(stageDir, 'preload.cjs'));
  await copyIfPresent(resolve(rootDir, 'index.html'), resolve(staticDir, 'index.html'));
  await copyIfPresent(resolve(rootDir, 'app.js'), resolve(staticDir, 'app.js'));
  await copyIfPresent(resolve(rootDir, 'avatars'), resolve(staticDir, 'avatars'));
  await copyIfPresent(resolve(rootDir, 'pieces_fbx'), resolve(staticDir, 'pieces_fbx'));

  await mkdir(resolve(staticDir, 'media'), { recursive: true });
  await copyTopLevelFiles(resolve(rootDir, 'media'), resolve(staticDir, 'media'));
  for (const dir of runtimeMediaDirs) {
    await copyIfPresent(resolve(rootDir, 'media', dir), resolve(staticDir, 'media', dir));
  }

  await writeFile(
    resolve(stageDir, 'package.json'),
    JSON.stringify(
      {
        name: 'cyber-chess-desktop',
        productName: desktopProductName,
        version: desktopAppVersion,
        description: 'Portable desktop build of Cyber Chess.',
        main: 'main.cjs',
        private: true,
      },
      null,
      2,
    ) + '\n',
  );
}

async function packageWindows() {
  const packagerDir = resolve(outputDir, `${desktopProductName}-win32-x64`);
  const releaseDir = resolve(outputDir, desktopReleaseDirName);
  await rm(packagerDir, { recursive: true, force: true });
  await packager({
    dir: stageDir,
    out: outputDir,
    name: desktopProductName,
    platform: 'win32',
    arch: 'x64',
    overwrite: true,
    asar: false,
    appVersion: desktopAppVersion,
    executableName: desktopProductName,
    prune: true,
    quiet: false,
  });
  if (await exists(releaseDir)) {
    await cp(stageDir, resolve(releaseDir, 'resources', 'app'), { recursive: true, force: true });
    await rm(packagerDir, { recursive: true, force: true });
  } else {
    await rename(packagerDir, releaseDir);
  }
}

if (!['stage', 'package'].includes(command)) {
  console.error(`Unknown desktop packaging command: ${command}`);
  process.exit(1);
}

await stageDesktopApp();
console.log(`Staged Cyber Chess desktop app at ${stageDir}`);

if (command === 'package') {
  await packageWindows();
  console.log(`Packaged ${desktopProductName} for Windows at ${resolve(outputDir, desktopReleaseDirName)}`);
}
