import { execFileSync, spawnSync } from 'node:child_process';
import { accessSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mediaAudioDir = resolve(rootDir, 'media', 'audio');
const coverArtPath = resolve(mediaAudioDir, 'album_cover.png');
const outFile = resolve(rootDir, 'long_music_with_cover.zip');

const durationThreshold = 30;
const fallbackLongTracks = new Set([
  'boogie_knights.mp3',
  'checkmeat_freakazoid.mp3',
  'checkmeat_you_lose_song.mp3',
  'Chrome fresh.mp3',
  'Chrome Gambit.mp3',
  'Chrome_Chess_Mode.mp3',
  'Chrome_city.mp3',
  'cybercrimes.mp3',
  'cyber_chess_music.mp3',
  'drummin_pawns.mp3',
  'Pawns_of_Destiny.mp3',
  'synthetic_dreams_cyber_eyes.mp3',
  'the_pulse_long_song.mp3',
  'The_Pulse_of_the_Board_2.mp3',
  'victorious_1.mp3',
]);

const audioExtensions = new Set(['.mp3', '.wav']);

const hasFfprobe = (() => {
  try {
    return spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;
  } catch (error) {
    return false;
  }
})();

const audioTracks = readdirSync(mediaAudioDir).filter((entry) => {
  const extStart = entry.lastIndexOf('.');
  const ext = extStart >= 0 ? entry.slice(extStart) : '';
  return audioExtensions.has(ext.toLowerCase()) && entry !== 'album_cover.png';
});

const getDuration = (filePath) => {
  if (!hasFfprobe) return null;
  const result = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=nw=1:nk=1',
      filePath,
    ],
    { encoding: 'utf8' },
  ).trim();

  const duration = Number(result);
  return Number.isFinite(duration) ? duration : null;
};

const durations = audioTracks.map((fileName) => {
  const fullPath = resolve(mediaAudioDir, fileName);
  return {
    fileName,
    duration: (() => {
      try {
        return getDuration(fullPath);
      } catch (_error) {
        return null;
      }
    })(),
  };
});

const longTracks = durations.filter((track) => track.duration > durationThreshold).map((track) => track.fileName);

const tracksToPackage =
  longTracks.length > 0
    ? longTracks
    : [...fallbackLongTracks].filter((track) => audioTracks.includes(track));

if (longTracks.length === 0) {
  if (!hasFfprobe) {
    console.warn('ffprobe unavailable; using fallback duration list.');
  } else if (longTracks.length === 0) {
    console.warn('Could not detect any tracks longer than 30 seconds. Using fallback duration list.');
  }
}

const zipInputs = [
  ...tracksToPackage.map((track) => `media/audio/${track}`),
  'media/audio/album_cover.png',
];

if (!tracksToPackage.length) {
  console.error('No long tracks found for packaging.');
  process.exit(1);
}

accessSync(coverArtPath);

const crc32Table = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let i = 0; i < 8; i += 1) {
    crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return crc >>> 0;
});

const crc32 = (input) => {
  let crc = 0xffffffff;
  const data = Buffer.isBuffer(input) ? input : Buffer.from(input);
  for (const value of data) {
    crc = crc32Table[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const toDosTimeDate = (dateLike) => {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
};

const writeUInt32LE = (buffer, value, offset) => {
  buffer.writeUInt32LE(value >>> 0, offset);
};

const writeUInt16LE = (buffer, value, offset) => {
  buffer.writeUInt16LE(value >>> 0, offset);
};

const makeLocalHeader = ({ fileNameBuffer, crc, fileSize, dosTime, dosDate }) => {
  const header = Buffer.alloc(30 + fileNameBuffer.length);
  writeUInt32LE(header, 0x04034b50, 0);
  writeUInt16LE(header, 20, 4);
  writeUInt16LE(header, 0, 6);
  writeUInt16LE(header, 0, 8);
  writeUInt16LE(header, dosTime, 10);
  writeUInt16LE(header, dosDate, 12);
  writeUInt32LE(header, crc, 14);
  writeUInt32LE(header, fileSize, 18);
  writeUInt32LE(header, fileSize, 22);
  writeUInt16LE(header, fileNameBuffer.length, 26);
  writeUInt16LE(header, 0, 28);
  header.set(fileNameBuffer, 30);
  return header;
};

const makeCentralHeader = ({
  fileNameBuffer,
  crc,
  fileSize,
  dosTime,
  dosDate,
  localHeaderOffset,
}) => {
  const header = Buffer.alloc(46 + fileNameBuffer.length);
  writeUInt32LE(header, 0x02014b50, 0);
  writeUInt16LE(header, 0x0014, 4);
  writeUInt16LE(header, 0x0014, 6);
  writeUInt16LE(header, 0, 8);
  writeUInt16LE(header, 0, 10);
  writeUInt16LE(header, dosTime, 12);
  writeUInt16LE(header, dosDate, 14);
  writeUInt32LE(header, crc, 16);
  writeUInt32LE(header, fileSize, 20);
  writeUInt32LE(header, fileSize, 24);
  writeUInt16LE(header, fileNameBuffer.length, 28);
  writeUInt16LE(header, 0, 30);
  writeUInt16LE(header, 0, 32);
  writeUInt16LE(header, 0, 34);
  writeUInt16LE(header, 0, 36);
  writeUInt32LE(header, 0, 38);
  writeUInt32LE(header, 0, 42);
  writeUInt32LE(header, localHeaderOffset, 46);
  header.set(fileNameBuffer, 46);
  return header;
};

const writeZip = (sourceFileNames, destination) => {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const filePath of sourceFileNames) {
    const data = readFileSync(resolve(rootDir, filePath));
    const fileNameBuffer = Buffer.from(filePath);
    const crc = crc32(data);
    const { dosTime, dosDate } = toDosTimeDate(new Date());
    const localHeader = makeLocalHeader({
      fileNameBuffer,
      crc,
      fileSize: data.length,
      dosTime,
      dosDate,
    });
    const centralHeader = makeCentralHeader({
      fileNameBuffer,
      crc,
      fileSize: data.length,
      dosTime,
      dosDate,
      localHeaderOffset: localOffset,
    });

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const centralOffset = localOffset;

  const eocd = Buffer.alloc(22);
  writeUInt32LE(eocd, 0x06054b50, 0);
  writeUInt16LE(eocd, 0, 4);
  writeUInt16LE(eocd, 0, 6);
  writeUInt16LE(eocd, centralParts.length, 8);
  writeUInt16LE(eocd, centralParts.length, 10);
  writeUInt32LE(eocd, centralSize, 12);
  writeUInt32LE(eocd, centralOffset, 16);
  writeUInt16LE(eocd, 0, 20);

  const zipBuffer = Buffer.concat([...localParts, ...centralParts, eocd]);
  mkdirSync(resolve(rootDir), { recursive: true });
  writeFileSync(destination, zipBuffer);
};

try {
  writeZip(zipInputs, outFile);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to create zip: ${message}`);
  process.exit(1);
}

console.log(`Created zip: ${outFile}`);
for (const track of tracksToPackage) {
  console.log(` - ${track}`);
}
console.log(' + album_cover.png');
