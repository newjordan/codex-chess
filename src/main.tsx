// Standalone entry for the portfolio: mounts Jordan's real Board3DScene
// (the board3d module - procedural neon board, FBX pieces, bloom post-fx,
// lightning/capture/jump animations) with no backend. Bundled by esbuild
// into ../app.js.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Chess } from 'chess.js';
import { Board3DScene } from './Board3DScene';
import type { Board3DGameState, Board3DHandle } from './board3d/types';
import { chooseAiMove, type AiProfileId, type PlayerColor } from './ai';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MAX_LIVES = 2;
const CONTINUE_SECONDS = 10;
const PLAYER_NAME_KEY = 'cyberChessPlayerName';
const LEADERBOARD_KEY = 'cyberChessLeaderboardV1';
const AUDIO_MODE_KEY = 'cyberChessAudioMode';
const AUDIO_VOLUME_KEY = 'cyberChessAudioVolume';
const MAX_LEADERBOARD = 8;

const OPPONENTS: Array<{
  id: AiProfileId;
  name: string;
  difficulty: string;
  avatar: string;
  avatarStates: {
    damaged: string;
    dominating: string;
  };
  hero: string;
  theme: 'goop' | 'frostd4d' | 'razorblade' | 'gordo';
  tagline: string;
  bio: string;
  speed: number;
  delay: number;
  announcer: string;
  introAudio: string;
}> = [
  {
    id: 'goop',
    name: 'Goop',
    difficulty: 'EASY',
    avatar: 'avatars/goop.png',
    avatarStates: {
      damaged: 'media/avatars/goop-damaged.png',
      dominating: 'media/avatars/goop-dominating.jpg',
    },
    hero: 'media/enemies/goop-entrance.jpg',
    theme: 'goop',
    tagline: 'Mostly legal. Frequently sticky.',
    bio: 'A training-room nuisance that values chaos, trades material for vibes, and occasionally stumbles into real tactics.',
    speed: 1.7,
    delay: 760,
    announcer: 'media/audio/goop-announcer.mp3',
    introAudio: 'media/audio/goop_intro.mp3',
  },
  {
    id: 'frostd4d',
    name: 'Frostd4d',
    difficulty: 'MED',
    avatar: 'avatars/frostd4d.png',
    avatarStates: {
      damaged: 'media/avatars/frostd4d-damaged.jpg',
      dominating: 'media/avatars/frostd4d-dominating.jpg',
    },
    hero: 'media/enemies/frostd4d-entrance.jpg',
    theme: 'frostd4d',
    tagline: 'Cold reads, colder captures.',
    bio: 'A mid-depth board reader built for pressure: it hunts loose pieces, likes checks, and punishes autopilot openings.',
    speed: 2.1,
    delay: 520,
    announcer: 'media/audio/frostd4d-announcer.mp3',
    introAudio: 'media/audio/frostd4d_intro.mp3',
  },
  {
    id: 'razorblade',
    name: 'Razorblade',
    difficulty: 'HARD',
    avatar: 'avatars/razorblade.png',
    avatarStates: {
      damaged: 'media/avatars/razorblade-damaged.png',
      dominating: 'media/avatars/razorblade-dominating.jpg',
    },
    hero: 'media/enemies/razorblade-entrance.jpg',
    theme: 'razorblade',
    tagline: 'Depth search with bad intentions.',
    bio: 'The sharpest Cyber Chess agent in the cabinet. Razorblade searches deeper, converts captures hard, and turns slow mistakes into endgame problems.',
    speed: 2.45,
    delay: 320,
    announcer: 'media/audio/razorblade-announcer.mp3',
    introAudio: 'media/audio/razorblade_intro.mp3',
  },
  {
    id: 'gordo',
    name: 'GORDO',
    difficulty: 'FINAL',
    avatar: 'avatars/gordo.jpg',
    avatarStates: {
      damaged: 'media/avatars/gordo-damaged.png',
      dominating: 'media/avatars/gordo-dominating.jpg',
    },
    hero: 'media/enemies/gordo-entrance.jpg',
    theme: 'gordo',
    tagline: 'Four arms. One engine. No mercy.',
    bio: 'The tower core made flesh and metal. GORDO embeds Lozza, searches like a tournament engine, and plays the final board without personality noise.',
    speed: 2.85,
    delay: 180,
    announcer: 'media/audio/gordo-announcer.mp3',
    introAudio: 'media/audio/gordo_intro.mp3',
  },
];

const INTRO_MP4_SRC = 'media/chessagent-intro.mp4';
const HEADER_IMAGE_SRC = 'media/game_cover_art.jpg';
const SIDE_SELECTION_BG_SRC = 'media/cyber-chess-header-frostd4d-v2.jpg';
const PROFILE_BG_SRC = 'media/big_wallpaper.jpg';
const FLOPPY_TOWER_SRC = 'media/floppy-tower-ladder-embedded.jpg';
const SETTINGS_BG_SRC = 'media/settings-moniker-bg.jpg';
const CYBER_CHESS_ANNOUNCER_SRC = 'media/audio/cyber-chess-announcer.mp3';
const SOUNDTRACK_SOURCES = [
  'media/audio/the_pulse_long_song.mp3',
  'media/audio/The_Pulse_of_the_Board_2.mp3',
  'media/audio/High_on_the_Train_song.mp3',
  'media/audio/cyber_soaring_song.mp3',
  'media/audio/data_crasher.mp3',
  'media/audio/synthetic_dreams_cyber_eyes.mp3',
] as const;
const LOADING_MUSIC_SRC = SOUNDTRACK_SOURCES[0];
const PIECE_SLIDE_SFX_SRC = 'media/audio/piece_slide.wav';
const VICTORY_MUSIC_SRC = 'media/audio/victory_song_audio.mp3';
const GAME_OVER_MUSIC_SRC = 'media/audio/checkmeat_you_lose_song.mp3';
const PLAYER_AVATARS = {
  normal: 'media/avatars/player_normal.jpg',
  damaged: 'media/avatars/player_damage.jpg',
  dominating: 'media/avatars/player_dominating.jpg',
} as const;
const INTRO_STORY = [
  {
    image: 'media/intro/01-pre-computation.jpg',
    kicker: 'PRE-COMPUTATION',
    title: 'THE PLAYER',
    body: 'Before the board was neon, the greatest chess mind alive hunted a rumor in the machine: the Shannon Prime.',
  },
  {
    image: 'media/intro/flower_delve.jpg',
    kicker: 'THE DELVE',
    title: 'TOO DEEP',
    body: 'He pushed the calculation past its warning lights. The signal cut through the grid and told the Shannon Knights a new opponent had arrived.',
  },
  {
    image: 'media/intro/02-shannon-knights-kidnap.jpg',
    kicker: 'THE SHANNON KNIGHTS',
    title: 'THE BREACH',
    body: 'Goop, Frostd4d, and Razorblade struck as one, tearing open the lab and dragging his family into the grid.',
  },
  {
    image: 'media/intro/02-consciousness-floppies.jpg',
    kicker: '42 DISKS',
    title: 'THE TRANSFER',
    body: 'When the Shannon Knights breached his home and stole his family, he copied his consciousness onto forty-two floppy disks.',
  },
  {
    image: 'media/intro/03-floppy-tower.jpg',
    kicker: 'FLOPPY TOWER ONLINE',
    title: 'THE ASCENT',
    body: 'One by one, all forty-two disks loaded into the tower. The drives screamed. The room became a square of light.',
  },
  {
    image: 'media/intro/04-shannon-knights-tower-chase.jpg',
    kicker: 'CYBERSPACE',
    title: 'THE CHASE',
    body: 'Now he rides the grid to save his family, defeat the Shannon Knights, and seize the impossible prime at the center of chess.',
  },
] as const;

declare global { interface Window { __chess: any } }
window.__chess = { mounted: false };

type ResultState = {
  kind: 'win' | 'loss' | 'game-over' | 'clear';
  opponent: typeof OPPONENTS[number];
  nextOpponent?: typeof OPPONENTS[number];
  livesAfter: number;
};

const RESULT_LINES: Record<AiProfileId, {
  winTitle: string;
  winBody: (playerName: string, nextOpponent?: typeof OPPONENTS[number]) => string;
  lossTitle: string;
  lossBody: (playerName: string) => string;
  gameOverTitle: string;
  gameOverBody: (playerName: string) => string;
  trophy: string;
  hazard: string;
}> = {
  goop: {
    winTitle: 'GOOP CONTAINED',
    winBody: (playerName, nextOpponent) => `${playerName} burned through the slime file. ${nextOpponent?.name ?? 'The next Shannon Knight'} steps out of the cabinet.`,
    lossTitle: 'GOOP CLOGGED THE BOARD',
    lossBody: (playerName) => `${playerName} got stuck in Goop's crooked trades. Scrub the pieces clean before the continue counter drains.`,
    gameOverTitle: 'GOOP FLOODED THE RUN',
    gameOverBody: (playerName) => `Goop sealed ${playerName}'s floppies in green static. Two lives spent, the ladder resets.`,
    trophy: 'SLIME CACHE PURGED',
    hazard: 'CORROSIVE FILE SPILL',
  },
  frostd4d: {
    winTitle: 'FROSTD4D THAWED',
    winBody: (playerName, nextOpponent) => `${playerName} cracked the frozen search tree. ${nextOpponent?.name ?? 'The next Shannon Knight'} is already sharpening the next board.`,
    lossTitle: 'FROSTD4D FROZE THE CLOCK',
    lossBody: (playerName) => `${playerName} slipped on a cold read and Frostd4d locked the rank. Continue before the board ices over.`,
    gameOverTitle: 'FROZEN OUT',
    gameOverBody: (playerName) => `Frostd4d put ${playerName}'s run on deep freeze. Two lives spent, the tower goes dark.`,
    trophy: 'ICE LOCK BROKEN',
    hazard: 'SUB-ZERO MATE NET',
  },
  razorblade: {
    winTitle: 'RAZORBLADE DISARMED',
    winBody: (playerName, nextOpponent) => `${playerName} dulled Razorblade's line and survived the sharp file. ${nextOpponent?.name ?? 'GORDO'} takes control of the final board.`,
    lossTitle: 'RAZORBLADE CUT THE LINE',
    lossBody: (playerName) => `${playerName} let one tempo hang and Razorblade split the endgame open. Continue before the damage sticks.`,
    gameOverTitle: 'CUT FROM THE LADDER',
    gameOverBody: (playerName) => `Razorblade carved ${playerName}'s last disk out of the tower. Two lives spent, no file recovered.`,
    trophy: 'EDGE ROUTINE BLUNTED',
    hazard: 'TACTICAL LACERATION',
  },
  gordo: {
    winTitle: 'GORDO OVERRIDDEN',
    winBody: (playerName) => `${playerName} beat GORDO, cleared the Cyber Chess cabinet, and pulled the Shannon Prime out of the tower.`,
    lossTitle: 'GORDO HELD THE CORE',
    lossBody: (playerName) => `${playerName} hit the final engine wall. Continue before GORDO seals the prime behind another search layer.`,
    gameOverTitle: 'CORE LOCKED',
    gameOverBody: (playerName) => `GORDO ended ${playerName}'s run at the tower core. Two lives spent, the final board reboots.`,
    trophy: 'PRIME CORE CAPTURED',
    hazard: 'ENGINE CORE LOCK',
  },
};

const RESULT_BACKDROPS: Record<AiProfileId, { win: string; loss: string; gameOver: string }> = {
  goop: {
    win: 'media/results/goop-win.jpg',
    loss: 'media/results/goop-loss.jpg',
    gameOver: 'media/results/goop-game-over.jpg',
  },
  frostd4d: {
    win: 'media/results/frostd4d-win.jpg',
    loss: 'media/results/frostd4d-loss.jpg',
    gameOver: 'media/results/frostd4d-game-over.jpg',
  },
  razorblade: {
    win: 'media/results/razorblade-win.jpg',
    loss: 'media/results/razorblade-loss.jpg',
    gameOver: 'media/results/razorblade-game-over.jpg',
  },
  gordo: {
    win: 'media/results/gordo-win.jpg',
    loss: 'media/results/gordo-loss.jpg',
    gameOver: 'media/results/gordo-game-over.jpg',
  },
};

const FINAL_CLEAR_BACKDROP_SRC = 'media/results/final-clear-family-reunion.jpg';

function getResultBackdrop(result: ResultState) {
  if (result.kind === 'clear') return FINAL_CLEAR_BACKDROP_SRC;
  const set = RESULT_BACKDROPS[result.opponent.id];
  if (result.kind === 'win') return set.win;
  if (result.kind === 'loss') return set.loss;
  return set.gameOver;
}

function getResultPresentation(result: ResultState, playerName: string) {
  const lines = RESULT_LINES[result.opponent.id];
  const livesText = `${result.livesAfter} ${result.livesAfter === 1 ? 'life' : 'lives'}`;

  if (result.kind === 'clear') {
    return {
      title: 'THANKS FOR PLAYING',
      body: `Upon defeating GORDO, the Hero is happily reunited with his family. But in GORDO's lab... they learned at the end of all those calculations, there were MORE floppy discs, and within those discs were... MORE. He thought he had counted them all, but the Shannon Prime has evaded the light of truth and still remains in the cold calculating darkness.\n\nThanks for Playing\n\nGame Created by Frosty40 and Codex`,
      badge: `${lines.trophy} / ${livesText.toUpperCase()} LEFT`,
      status: 'THE PRIME STILL HIDES',
    };
  }

  if (result.kind === 'win') {
    return {
      title: lines.winTitle,
      body: lines.winBody(playerName, result.nextOpponent),
      badge: lines.trophy,
      status: 'ENEMY DEFEATED',
    };
  }

  if (result.kind === 'game-over') {
    return {
      title: lines.gameOverTitle,
      body: lines.gameOverBody(playerName),
      badge: lines.hazard,
      status: 'GAME OVER',
    };
  }

  return {
    title: lines.lossTitle,
    body: lines.lossBody(playerName),
    badge: lines.hazard,
    status: 'ROUND LOST',
  };
}

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  outcome: 'clear' | 'game-over';
  opponent: string;
  wins: number;
  lives: number;
  seconds: number;
  completedAt: string;
};

type AudioEngine = {
  play: (name: 'menu' | 'select' | 'move' | 'capture' | 'check' | 'win' | 'loss' | 'reveal' | 'tick') => void;
  setVolume: (volume: number) => void;
  stop: () => void;
};
type AudioMode = 'full' | 'sfx' | 'muted';

function turnFromFen(fen: string) {
  try {
    return new Chess(fen).turn();
  } catch (_) {
    return 'w';
  }
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getWhiteMaterialScore(fen: string) {
  const values: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
  };
  const board = fen.split(' ')[0] || '';
  let score = 0;
  for (const char of board) {
    const lower = char.toLowerCase();
    const value = values[lower] ?? 0;
    if (!value) continue;
    score += char === lower ? -value : value;
  }
  return score;
}

function getPieceCounts(fen: string) {
  const board = fen.split(' ')[0] || '';
  let white = 0;
  let black = 0;
  for (const char of board) {
    if (char >= 'A' && char <= 'Z') white += 1;
    else if (char >= 'a' && char <= 'z') black += 1;
  }
  return { white, black };
}

function getFightHudState(fen: string, playerColor: PlayerColor, aiColor: PlayerColor) {
  const playerAdvantage = (playerColor === 'w' ? 1 : -1) * getWhiteMaterialScore(fen);
  let playerInCheck = false;
  let enemyInCheck = false;
  try {
    const game = new Chess(fen);
    if (game.isCheck()) {
      playerInCheck = game.turn() === playerColor;
      enemyInCheck = game.turn() === aiColor;
    }
  } catch (_) {}

  const pieceCounts = getPieceCounts(fen);
  const playerPieces = playerColor === 'w' ? pieceCounts.white : pieceCounts.black;
  const enemyPieces = aiColor === 'w' ? pieceCounts.white : pieceCounts.black;
  const playerHealth = clampPercent((playerPieces / 16) * 100);
  const enemyHealth = clampPercent((enemyPieces / 16) * 100);
  const playerMood = playerHealth <= 68 ? 'damaged' : enemyHealth <= 58 ? 'dominating' : 'normal';
  const enemyMood = enemyHealth <= 68 ? 'damaged' : playerHealth <= 58 ? 'dominating' : 'neutral';
  return {
    playerAdvantage,
    playerHealth,
    enemyHealth,
    playerMood,
    enemyMood,
    pressure: playerInCheck ? 'CHECK DANGER' : enemyInCheck ? 'CHECK PRESSURE' : playerAdvantage >= 4 ? 'ADVANTAGE' : playerAdvantage <= -4 ? 'DANGER' : 'EVEN FIGHT',
  };
}

function sanitizePlayerName(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  const safe = compact.replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 14).trim();
  return safe || 'PLAYER 1';
}

function readStoredName() {
  try {
    return sanitizePlayerName(window.localStorage.getItem(PLAYER_NAME_KEY) || 'PLAYER 1');
  } catch (_) {
    return 'PLAYER 1';
  }
}

function readStoredAudioMode(): AudioMode {
  try {
    const value = window.localStorage.getItem(AUDIO_MODE_KEY);
    return value === 'sfx' || value === 'muted' ? value : 'full';
  } catch (_) {
    return 'full';
  }
}

function clampAudioVolume(value: number) {
  if (!Number.isFinite(value)) return 100;
  return Math.max(0, Math.min(200, Math.round(value)));
}

function readStoredAudioVolume() {
  try {
    return clampAudioVolume(Number(window.localStorage.getItem(AUDIO_VOLUME_KEY) || 100));
  } catch (_) {
    return 100;
  }
}

function readLeaderboard(): LeaderboardEntry[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEADERBOARD_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.name === 'string' && typeof entry.score === 'number')
      .slice(0, MAX_LEADERBOARD);
  } catch (_) {
    return [];
  }
}

function mediaVolume(volume: number) {
  return Math.max(0, Math.min(1, clampAudioVolume(volume) / 100));
}

function persistLeaderboard(entries: LeaderboardEntry[]) {
  try {
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, MAX_LEADERBOARD)));
  } catch (_) {}
}

function createAudioEngine(getAudioMode: () => AudioMode, getAudioVolume: () => number): AudioEngine | null {
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  const ctx = new AudioCtor();
  const master = ctx.createGain();
  const setMasterVolume = (volume: number) => {
    master.gain.setTargetAtTime(0.08 * (clampAudioVolume(volume) / 100), ctx.currentTime, 0.01);
  };
  master.gain.value = 0.08 * (clampAudioVolume(getAudioVolume()) / 100);
  master.connect(ctx.destination);
  window.__chess.audio = {
    ready: true,
    last: window.__chess.audio?.last || null,
    played: window.__chess.audio?.played || 0,
    volume: clampAudioVolume(getAudioVolume()),
  };

  const tone = (frequency: number, start: number, duration: number, type: OscillatorType, volume: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  };

  const noise = (start: number, duration: number, volume: number) => {
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(gain);
    gain.connect(master);
    src.start(start);
    src.stop(start + duration);
  };

  return {
    play(name) {
      if (getAudioMode() === 'muted') {
        window.__chess.audio = {
          ready: true,
          last: 'muted',
        played: window.__chess.audio?.played || 0,
        mode: 'muted',
        volume: clampAudioVolume(getAudioVolume()),
      };
      return;
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      const now = ctx.currentTime;
      window.__chess.audio = {
        ready: true,
        last: name,
        played: (window.__chess.audio?.played || 0) + 1,
        mode: getAudioMode(),
        volume: clampAudioVolume(getAudioVolume()),
      };
      if (name === 'menu') {
        tone(880, now, 0.08, 'square', 0.22);
        tone(1320, now + 0.06, 0.08, 'square', 0.14);
      } else if (name === 'select') {
        tone(660, now, 0.05, 'triangle', 0.2);
        tone(990, now + 0.045, 0.08, 'square', 0.12);
      } else if (name === 'move') {
        tone(440, now, 0.07, 'triangle', 0.12);
        tone(740, now + 0.055, 0.11, 'square', 0.12);
      } else if (name === 'capture') {
        noise(now, 0.1, 0.24);
        tone(180, now, 0.12, 'sawtooth', 0.2);
        tone(820, now + 0.04, 0.1, 'square', 0.13);
      } else if (name === 'check') {
        tone(740, now, 0.1, 'square', 0.18);
        tone(932, now + 0.1, 0.12, 'square', 0.18);
      } else if (name === 'win') {
        [523, 659, 784, 1046].forEach((f, i) => tone(f, now + i * 0.09, 0.16, 'square', 0.16));
      } else if (name === 'loss') {
        [392, 330, 262, 196].forEach((f, i) => tone(f, now + i * 0.11, 0.18, 'sawtooth', 0.16));
        noise(now + 0.2, 0.24, 0.12);
      } else if (name === 'reveal') {
        [220, 330, 494, 740].forEach((f, i) => tone(f, now + i * 0.07, 0.14, 'triangle', 0.15));
        noise(now + 0.22, 0.12, 0.08);
      } else if (name === 'tick') {
        tone(1200, now, 0.045, 'square', 0.13);
      }
    },
    setVolume(volume) {
      setMasterVolume(volume);
      window.__chess.audio = { ...(window.__chess.audio || {}), volume: clampAudioVolume(volume) };
    },
    stop() {
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
      window.setTimeout(() => ctx.close().catch(() => undefined), 120);
      window.__chess.audio = { ...(window.__chess.audio || {}), ready: false };
    },
  };
}

function App() {
  const ref = useRef<Board3DHandle>(null);
  const aiBusyRef = useRef(false);
  const lastAiFenRef = useRef('');
  const aiRequestRef = useRef(0);
  const resultHandledFenRef = useRef('');
  const runStartedAtRef = useRef(Date.now());
  const recordedResultKeyRef = useRef('');
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const introMusicRef = useRef<{ stop: () => void } | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const loadingMusicRef = useRef<HTMLAudioElement | null>(null);
  const loadingMusicPassRef = useRef(0);
  const loadingMusicFinishedRef = useRef(false);
  const loadingMusicHandlersRef = useRef<{
    onEnded: () => void;
    onTimeUpdate: () => void;
  } | null>(null);
  const endMusicRef = useRef<HTMLAudioElement | null>(null);
  const endMusicSrcRef = useRef('');
  const announcerRef = useRef<HTMLAudioElement | null>(null);
  const loadingMusicIndexRef = useRef(0);
  const lastAnnouncedRef = useRef('');
  const audioModeRef = useRef<AudioMode>(readStoredAudioMode());
  const audioVolumeRef = useRef(readStoredAudioVolume());
  const previousFenRef = useRef(START);
  const previousContinueSecondsRef = useRef(CONTINUE_SECONDS);
  const [screen, setScreen] = useState<'intro' | 'loading' | 'playing' | 'result'>('intro');
  const [menuStep, setMenuStep] = useState<'video' | 'story' | 'profile' | 'side' | 'opponent'>('video');
  const [storyIndex, setStoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<AiProfileId>('goop');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [playerName, setPlayerName] = useState(readStoredName);
  const [playerNameInput, setPlayerNameInput] = useState(readStoredName);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(readLeaderboard);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioMode>(audioModeRef.current);
  const [audioVolume, setAudioVolume] = useState(audioVolumeRef.current);
  const [introVideoReady, setIntroVideoReady] = useState(false);
  const [introVideoStarted, setIntroVideoStarted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [lives, setLives] = useState(MAX_LIVES);
  const [continueSeconds, setContinueSeconds] = useState(CONTINUE_SECONDS);
  const [resultState, setResultState] = useState<ResultState | null>(null);
  const [gameState, setGameState] = useState<Board3DGameState>({
    status: 'Loading pieces',
    fen: START,
    selectedSquare: null,
  });

  const selectedIndex = OPPONENTS.findIndex((opponent) => opponent.id === selectedId);
  const selected = OPPONENTS.find((opponent) => opponent.id === selectedId) ?? OPPONENTS[0];
  const nextOpponent = OPPONENTS[selectedIndex + 1];
  const turn = turnFromFen(gameState.fen);
  const aiColor: PlayerColor = playerColor === 'w' ? 'b' : 'w';
  const inputEnabled = screen === 'playing' && turn === playerColor && !thinking;
  const whiteName = playerColor === 'w' ? playerName : selected.name;
  const blackName = playerColor === 'b' ? playerName : selected.name;
  const fightHud = getFightHudState(gameState.fen, playerColor, aiColor);
  const enemyAvatarSrc =
    fightHud.enemyMood === 'damaged'
      ? selected.avatarStates.damaged
      : fightHud.enemyMood === 'dominating'
        ? selected.avatarStates.dominating
        : selected.avatar;

  const updateGameState = (state: Board3DGameState) => {
    window.__chess.state = state;
    if (turnFromFen(state.fen) !== aiColor) {
      aiBusyRef.current = false;
      setThinking(false);
    }
    setGameState(state);
  };

  const buildResultForFen = (fen: string): ResultState | null => {
    const game = new Chess(fen);
    if (!game.isGameOver()) return null;

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'b' : 'w';
      if (winner === playerColor) {
        return {
          kind: nextOpponent ? 'win' : 'clear',
          opponent: selected,
          nextOpponent,
          livesAfter: lives,
        };
      }

      const livesAfter = Math.max(0, lives - 1);
      return {
        kind: livesAfter > 0 ? 'loss' : 'game-over',
        opponent: selected,
        livesAfter,
      };
    }

    const livesAfter = Math.max(0, lives - 1);
    return {
      kind: livesAfter > 0 ? 'loss' : 'game-over',
      opponent: selected,
      livesAfter,
    };
  };

  const recordRun = (result: ResultState) => {
    if (result.kind !== 'clear' && result.kind !== 'game-over') return;
    const resultKey = `${result.kind}:${result.opponent.id}:${result.livesAfter}:${runStartedAtRef.current}`;
    if (recordedResultKeyRef.current === resultKey) return;
    recordedResultKeyRef.current = resultKey;

    const seconds = Math.max(1, Math.round((Date.now() - runStartedAtRef.current) / 1000));
    const wins = result.kind === 'clear' ? OPPONENTS.length : Math.max(0, selectedIndex);
    const speedBonus = result.kind === 'clear' ? Math.max(0, 900 - seconds) : 0;
    const score = wins * 1000 + result.livesAfter * 250 + speedBonus;
    const entry: LeaderboardEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: playerName,
      score,
      outcome: result.kind,
      opponent: result.opponent.name,
      wins,
      lives: result.livesAfter,
      seconds,
      completedAt: new Date().toISOString(),
    };
    const next = [...leaderboard, entry]
      .sort((a, b) => b.score - a.score || a.seconds - b.seconds)
      .slice(0, MAX_LEADERBOARD);
    setLeaderboard(next);
    persistLeaderboard(next);
  };

  useEffect(() => {
    window.__chess.handle = ref.current;
    window.__chess.mounted = true;
    window.__chess.state = gameState;
    document.body.setAttribute('data-chess-mounted', '1');
    // FBX pieces load async inside the hook; nudge to the start position once.
    const id = window.setTimeout(() => {
      try { ref.current?.resetToPosition(START); } catch (_) {}
    }, 400);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => () => {
    introMusicRef.current?.stop();
    introMusicRef.current = null;
    const handlers = loadingMusicHandlersRef.current;
    if (loadingMusicRef.current && handlers) {
      loadingMusicRef.current.removeEventListener('ended', handlers.onEnded);
      loadingMusicRef.current.removeEventListener('timeupdate', handlers.onTimeUpdate);
    }
    loadingMusicRef.current?.pause();
    loadingMusicRef.current = null;
    loadingMusicHandlersRef.current = null;
    endMusicRef.current?.pause();
    endMusicRef.current = null;
    endMusicSrcRef.current = '';
    announcerRef.current?.pause();
    announcerRef.current = null;
    audioRef.current?.stop();
    audioRef.current = null;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (settingsOpen) {
        audioRef.current?.play('menu');
        setSettingsOpen(false);
        return;
      }
      ensureAudioEngine()?.play('menu');
      setSettingsOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen]);

  useEffect(() => {
    const previousFen = previousFenRef.current;
    if (previousFen !== gameState.fen) {
      try {
        const current = new Chess(gameState.fen);
        if (current.isCheck()) audioRef.current?.play('check');
      } catch (_) {}
      previousFenRef.current = gameState.fen;
    }
  }, [gameState.fen]);

  useEffect(() => {
    if (screen !== 'playing') return;

    const game = new Chess(gameState.fen);
    if (game.isGameOver() || game.turn() !== aiColor) {
      aiBusyRef.current = false;
      setThinking(false);
      return;
    }
    if (aiBusyRef.current || lastAiFenRef.current === gameState.fen) return;

    aiBusyRef.current = true;
    lastAiFenRef.current = gameState.fen;
    setThinking(true);

    const requestId = aiRequestRef.current + 1;
    aiRequestRef.current = requestId;

    const id = window.setTimeout(async () => {
      const move = await chooseAiMove(gameState.fen, selected.id, aiColor);
      if (requestId !== aiRequestRef.current || screen !== 'playing') return;
      if (!move) {
        aiBusyRef.current = false;
        setThinking(false);
        return;
      }
      ref.current?.applyMove(
        move.from,
        move.to,
        Boolean(move.captured) || move.flags.includes('c') || move.flags.includes('e'),
        move.flags,
        move.promotion ?? (move.piece === 'p' && (move.to[1] === '1' || move.to[1] === '8') ? 'q' : undefined),
        selected.speed
      );
    }, selected.delay);

    return () => {
      window.clearTimeout(id);
      aiRequestRef.current += 1;
    };
  }, [aiColor, gameState.fen, screen, selected]);

  useEffect(() => {
    if (screen !== 'playing' || resultHandledFenRef.current === gameState.fen) return;

    const result = buildResultForFen(gameState.fen);
    if (!result) return;

    resultHandledFenRef.current = gameState.fen;
    aiBusyRef.current = false;
    lastAiFenRef.current = '';
    setThinking(false);
    setResultState(result);
    setContinueSeconds(CONTINUE_SECONDS);
    if (result.kind === 'loss' || result.kind === 'game-over') setLives(result.livesAfter);
    recordRun(result);
    audioRef.current?.play(result.kind === 'win' || result.kind === 'clear' ? 'win' : 'loss');
    setScreen('result');
  }, [gameState.fen, lives, nextOpponent, playerColor, screen, selected]);

  useEffect(() => {
    if (screen !== 'result' || resultState?.kind !== 'loss') return;
    if (continueSeconds <= 0) {
      setResultState({ ...resultState, kind: 'game-over', livesAfter: 0 });
      setLives(0);
      return;
    }

    const id = window.setTimeout(() => setContinueSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [continueSeconds, resultState, screen]);

  useEffect(() => {
    if (screen === 'result' && (resultState?.kind === 'clear' || resultState?.kind === 'game-over')) {
      const resultMusicSrc = resultState.kind === 'clear' ? VICTORY_MUSIC_SRC : GAME_OVER_MUSIC_SRC;
      if (!endMusicRef.current || endMusicSrcRef.current !== resultMusicSrc) {
        endMusicRef.current?.pause();
        endMusicRef.current = playClip(resultMusicSrc, { music: true });
        endMusicSrcRef.current = resultMusicSrc;
        window.__chess.endMusic = { active: Boolean(endMusicRef.current), src: resultMusicSrc };
      }
      return;
    }
    endMusicRef.current?.pause();
    endMusicRef.current = null;
    endMusicSrcRef.current = '';
    window.__chess.endMusic = { active: false, src: '' };
  }, [resultState?.kind, screen]);

  useEffect(() => {
    if (screen === 'result' && resultState?.kind === 'loss' && continueSeconds !== previousContinueSecondsRef.current) {
      audioRef.current?.play('tick');
    }
    previousContinueSecondsRef.current = continueSeconds;
  }, [continueSeconds, resultState?.kind, screen]);

  useEffect(() => {
    if (screen === 'intro' && menuStep !== 'video') startLoadingMusic();
  }, [audioMode, audioVolume, menuStep, screen]);

  useEffect(() => {
    window.__chess.campaign = {
      selectedId,
      lives,
      screen,
      resultState,
      continueSeconds,
      playerName,
      whiteName,
      blackName,
      leaderboard,
      audioMode,
      audioVolume,
      settingsOpen,
      audioReady: Boolean(audioRef.current),
    };
    window.__chess.forceWin = () => {
      const forcedResult = {
        kind: nextOpponent ? 'win' : 'clear',
        opponent: selected,
        nextOpponent,
        livesAfter: lives,
      } satisfies ResultState;
      setResultState(forcedResult);
      recordRun(forcedResult);
      audioRef.current?.play(forcedResult.kind === 'clear' ? 'win' : 'reveal');
      setScreen('result');
    };
    window.__chess.forceLoss = () => {
      const livesAfter = Math.max(0, lives - 1);
      const forcedResult = {
        kind: livesAfter > 0 ? 'loss' : 'game-over',
        opponent: selected,
        livesAfter,
      } satisfies ResultState;
      setLives(livesAfter);
      setContinueSeconds(CONTINUE_SECONDS);
      setResultState(forcedResult);
      recordRun(forcedResult);
      audioRef.current?.play(forcedResult.kind === 'game-over' ? 'loss' : 'tick');
      setScreen('result');
    };
  }, [audioMode, audioVolume, blackName, continueSeconds, leaderboard, lives, nextOpponent, playerName, resultState, screen, selected, selectedId, settingsOpen, whiteName]);

  const resetGame = () => {
    aiBusyRef.current = false;
    aiRequestRef.current += 1;
    lastAiFenRef.current = '';
    resultHandledFenRef.current = '';
    setThinking(false);
    ref.current?.resetToPosition(START);
  };

  const startGame = () => {
    endMusicRef.current?.pause();
    endMusicRef.current = null;
    endMusicSrcRef.current = '';
    setScreen('playing');
    setResultState(null);
    resetGame();
  };

  const startOpponentLoading = () => {
    endMusicRef.current?.pause();
    endMusicRef.current = null;
    endMusicSrcRef.current = '';
    ensureAudioEngine()?.play('reveal');
    announcerRef.current?.pause();
    setScreen('loading');
    setResultState(null);

    const clip = playAnnouncer(selected.introAudio);
    const fallback = window.setTimeout(() => {
      if (window.__chess.campaign?.screen === 'loading' && window.__chess.campaign?.selectedId === selected.id) {
        startGame();
      }
    }, 4200);

    if (clip) {
      clip.onended = () => {
        window.clearTimeout(fallback);
        if (window.__chess.campaign?.screen === 'loading' && window.__chess.campaign?.selectedId === selected.id) {
          startGame();
        }
      };
    }
  };

  const openMenu = () => {
    endMusicRef.current?.pause();
    endMusicRef.current = null;
    endMusicSrcRef.current = '';
    setMenuStep('video');
    setLives(MAX_LIVES);
    setResultState(null);
    setScreen('intro');
  };

  const ensureAudioEngine = () => {
    if (!audioRef.current) audioRef.current = createAudioEngine(() => audioModeRef.current, () => audioVolumeRef.current);
    return audioRef.current;
  };

  const updateAudioMode = (mode: AudioMode) => {
    audioModeRef.current = mode;
    setAudioMode(mode);
    try {
      window.localStorage.setItem(AUDIO_MODE_KEY, mode);
    } catch (_) {}
    if (mode !== 'full') stopIntroMusic();
    if (mode === 'muted') stopLoadingMusic();
    else startLoadingMusic();
    if (mode !== 'muted') ensureAudioEngine()?.play('select');
  };

  const updateAudioVolume = (volume: number) => {
    const nextVolume = clampAudioVolume(volume);
    audioVolumeRef.current = nextVolume;
    setAudioVolume(nextVolume);
    try {
      window.localStorage.setItem(AUDIO_VOLUME_KEY, String(nextVolume));
    } catch (_) {}
    ensureAudioEngine()?.setVolume(nextVolume);
    if (loadingMusicRef.current) {
      const baseVolume = mediaVolume(nextVolume) * 0.9;
      const clip = loadingMusicRef.current;
      clip.volume = baseVolume;
    }
    if (announcerRef.current) announcerRef.current.volume = mediaVolume(nextVolume);
    if (audioModeRef.current !== 'muted') audioRef.current?.play('tick');
  };

  const playClip = (src: string, options: { loop?: boolean; music?: boolean } = {}) => {
    if (audioModeRef.current === 'muted') return null;
    if (options.music && audioModeRef.current !== 'full') return null;
    const audio = new Audio(src);
    audio.loop = Boolean(options.loop);
    audio.volume = mediaVolume(audioVolumeRef.current) * (options.music ? 0.45 : 1);
    audio.play().catch(() => undefined);
    return audio;
  };

  const stopLoadingMusic = () => {
    const clip = loadingMusicRef.current;
    const handlers = loadingMusicHandlersRef.current;
    if (clip && handlers) {
      clip.removeEventListener('ended', handlers.onEnded);
      clip.removeEventListener('timeupdate', handlers.onTimeUpdate);
    }
    clip?.pause();
    loadingMusicRef.current = null;
    loadingMusicHandlersRef.current = null;
    window.__chess.loadingMusic = {
      active: false,
      src: SOUNDTRACK_SOURCES[loadingMusicIndexRef.current % SOUNDTRACK_SOURCES.length],
      pass: loadingMusicPassRef.current,
      maxPasses: 'playlist',
      loop: true,
      playlist: [...SOUNDTRACK_SOURCES],
      index: loadingMusicIndexRef.current,
      fading: false,
      finished: false,
    };
  };

  const startLoadingMusic = () => {
    if (audioModeRef.current === 'muted') return;
    loadingMusicFinishedRef.current = false;
    let clip = loadingMusicRef.current;
    if (!clip) {
      clip = new Audio(SOUNDTRACK_SOURCES[loadingMusicIndexRef.current % SOUNDTRACK_SOURCES.length]);
      clip.loop = false;
      clip.preload = 'auto';
      loadingMusicRef.current = clip;
      if (loadingMusicPassRef.current <= 0) loadingMusicPassRef.current = 1;
      const updateVolumeForPass = () => {
        const baseVolume = mediaVolume(audioVolumeRef.current) * 0.9;
        clip.volume = baseVolume;
        window.__chess.loadingMusic = {
          ...(window.__chess.loadingMusic || {}),
          active: !clip.paused,
          attempted: true,
          blocked: false,
          src: clip.currentSrc || SOUNDTRACK_SOURCES[loadingMusicIndexRef.current % SOUNDTRACK_SOURCES.length],
          pass: loadingMusicPassRef.current,
          maxPasses: 'playlist',
          loop: true,
          playlist: [...SOUNDTRACK_SOURCES],
          index: loadingMusicIndexRef.current,
          fading: false,
          finished: false,
          currentTime: clip.currentTime,
          duration: Number.isFinite(clip.duration) ? clip.duration : null,
        };
      };
      const onEnded = () => {
        loadingMusicPassRef.current += 1;
        loadingMusicIndexRef.current = (loadingMusicIndexRef.current + 1) % SOUNDTRACK_SOURCES.length;
        clip.src = SOUNDTRACK_SOURCES[loadingMusicIndexRef.current];
        clip.currentTime = 0;
        updateVolumeForPass();
        clip.play().catch(() => undefined);
      };
      const onTimeUpdate = () => updateVolumeForPass();
      loadingMusicHandlersRef.current = { onEnded, onTimeUpdate };
      clip.addEventListener('ended', onEnded);
      clip.addEventListener('timeupdate', onTimeUpdate);
    }
    const baseVolume = mediaVolume(audioVolumeRef.current) * 0.9;
    clip.volume = baseVolume;
    window.__chess.loadingMusic = {
      active: !clip.paused,
      attempted: true,
      blocked: false,
      src: clip.currentSrc || SOUNDTRACK_SOURCES[loadingMusicIndexRef.current % SOUNDTRACK_SOURCES.length],
      pass: loadingMusicPassRef.current,
      maxPasses: 'playlist',
      loop: true,
      playlist: [...SOUNDTRACK_SOURCES],
      index: loadingMusicIndexRef.current,
      fading: false,
      finished: false,
    };
    clip.play()
      .then(() => {
        window.__chess.loadingMusic = {
          active: true,
          attempted: true,
          blocked: false,
          src: clip.currentSrc || SOUNDTRACK_SOURCES[loadingMusicIndexRef.current % SOUNDTRACK_SOURCES.length],
          pass: loadingMusicPassRef.current,
          maxPasses: 'playlist',
          loop: true,
          playlist: [...SOUNDTRACK_SOURCES],
          index: loadingMusicIndexRef.current,
          fading: false,
          finished: false,
        };
      })
      .catch(() => {
        window.__chess.loadingMusic = {
          active: false,
          attempted: true,
          blocked: true,
          src: clip.currentSrc || SOUNDTRACK_SOURCES[loadingMusicIndexRef.current % SOUNDTRACK_SOURCES.length],
          pass: loadingMusicPassRef.current,
          maxPasses: 'playlist',
          loop: true,
          playlist: [...SOUNDTRACK_SOURCES],
          index: loadingMusicIndexRef.current,
          fading: false,
          finished: false,
        };
      });
  };

  const playAnnouncer = (src: string) => {
    if (audioModeRef.current === 'muted') return null;
    announcerRef.current?.pause();
    announcerRef.current = playClip(src);
    window.__chess.announcer = {
      src,
      played: (window.__chess.announcer?.played || 0) + 1,
      selectedId,
    };
    return announcerRef.current;
  };

  useEffect(() => {
    ensureAudioEngine();

    const unlockAudio = () => {
      ensureAudioEngine()?.play('menu');
      if (screen === 'intro' && (menuStep !== 'video' || introVideoStarted)) startLoadingMusic();
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [introVideoStarted, menuStep, screen]);

  const startIntroMusic = () => {
    if (audioModeRef.current !== 'full') return;
    ensureAudioEngine();
    if (introMusicRef.current) return;
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = 0.05 * (audioVolumeRef.current / 100);
    master.connect(ctx.destination);

    const melody = [659, 784, 880, 988, 880, 784, 659, 523, 587, 659, 784, 659, 587, 523, 440, 392];
    const bass = [130, 130, 196, 196, 174, 174, 220, 196];
    let step = 0;

    const playTone = (frequency: number, start: number, duration: number, type: OscillatorType, gainValue: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    const tick = () => {
      const now = ctx.currentTime;
      playTone(melody[step % melody.length], now, 0.105, 'square', 0.42);
      if (step % 2 === 0) playTone(melody[(step + 4) % melody.length] / 2, now, 0.09, 'square', 0.16);
      if (step % 4 === 0) playTone(bass[Math.floor(step / 4) % bass.length], now, 0.16, 'triangle', 0.24);
      step += 1;
    };

    tick();
    const interval = window.setInterval(tick, 145);
    introMusicRef.current = {
      stop() {
        window.clearInterval(interval);
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0.0001, now + 0.08);
        window.setTimeout(() => ctx.close().catch(() => undefined), 120);
      },
    };
  };

  const stopIntroMusic = () => {
    introMusicRef.current?.stop();
    introMusicRef.current = null;
  };

  const beginIntroStory = () => {
    setStoryIndex(0);
    ensureAudioEngine();
    lastAnnouncedRef.current = '';
    startLoadingMusic();
    setMenuStep('story');
  };

  const startIntroSequence = () => {
    ensureAudioEngine()?.play('menu');
    startLoadingMusic();
    setIntroVideoStarted(true);
    const video = introVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => undefined);
    }
  };

  const finishIntroStory = () => {
    stopIntroMusic();
    audioRef.current?.play('menu');
    setMenuStep('profile');
  };

  const advanceIntroStory = () => {
    audioRef.current?.play('menu');
    if (storyIndex >= INTRO_STORY.length - 1) {
      finishIntroStory();
      return;
    }
    setStoryIndex((current) => Math.min(INTRO_STORY.length - 1, current + 1));
  };

  const retreatIntroStory = () => {
    audioRef.current?.play('menu');
    setStoryIndex((current) => Math.max(0, current - 1));
  };

  const savePlayerProfile = () => {
    const nextName = sanitizePlayerName(playerNameInput);
    setPlayerName(nextName);
    setPlayerNameInput(nextName);
    try {
      window.localStorage.setItem(PLAYER_NAME_KEY, nextName);
    } catch (_) {}
    audioRef.current?.play('menu');
    setMenuStep('side');
  };

  const startCampaign = () => {
    setLives(MAX_LIVES);
    runStartedAtRef.current = Date.now();
    recordedResultKeyRef.current = '';
    previousFenRef.current = START;
    startOpponentLoading();
  };

  const continueAfterLoss = () => {
    if (!resultState || resultState.kind !== 'loss') return;
    setLives(resultState.livesAfter);
    audioRef.current?.play('menu');
    startOpponentLoading();
  };

  const advanceAfterWin = () => {
    if (!resultState) return;
    if (resultState.kind === 'clear') {
      restartCampaign();
      return;
    }

    if (resultState.nextOpponent) {
      aiRequestRef.current += 1;
      setSelectedId(resultState.nextOpponent.id);
      lastAnnouncedRef.current = '';
      audioRef.current?.play('reveal');
      setResultState(null);
      setScreen('intro');
      setMenuStep('opponent');
    }
  };

  const restartCampaign = () => {
    setSelectedId(OPPONENTS[0].id);
    lastAnnouncedRef.current = '';
    setLives(MAX_LIVES);
    setResultState(null);
    setContinueSeconds(CONTINUE_SECONDS);
    runStartedAtRef.current = Date.now();
    recordedResultKeyRef.current = '';
    previousFenRef.current = START;
    audioRef.current?.play('menu');
    setScreen('intro');
    setMenuStep('opponent');
  };

  const clearLeaderboard = () => {
    setLeaderboard([]);
    persistLeaderboard([]);
    audioRef.current?.play('menu');
  };

  const resultPresentation = resultState ? getResultPresentation(resultState, playerName) : null;
  const resultBackdrop = resultState ? getResultBackdrop(resultState) : '';

  return (
    <>
      <Board3DScene
        key={`${selected.id}-${playerColor}-${playerName}`}
        ref={ref}
        whiteName={whiteName}
        blackName={blackName}
        inputEnabled={inputEnabled}
        enemyTheme={selected.theme}
        playerColor={playerColor}
        onGameStateChange={updateGameState}
        onMoveStart={() => {
          playClip(PIECE_SLIDE_SFX_SRC);
        }}
      />

      {!settingsOpen && screen === 'intro' && menuStep === 'video' && (
        <button type="button" className="settings-launcher" onClick={() => {
          ensureAudioEngine()?.play('menu');
          setSettingsOpen(true);
        }}>
          SETTINGS
        </button>
      )}

      {screen === 'intro' && (
        <div className={
          'cyber-menu' +
          (menuStep === 'video' ? ' video-menu' : '') +
          (menuStep === 'opponent' ? ' tower-menu' : '') +
          (menuStep === 'story' ? ' story-menu' : '') +
          (menuStep === 'profile' ? ' profile-menu' : '') +
          (menuStep === 'side' ? ' side-menu' : '')
        }>
          <div className={
            'cyber-panel' +
            (menuStep === 'video' ? ' video-panel' : '') +
            (menuStep === 'opponent' ? ' tower-panel' : '') +
            (menuStep === 'story' ? ' story-panel' : '') +
            (menuStep === 'profile' ? ' profile-panel-shell' : '') +
            (menuStep === 'side' ? ' side-panel' : '')
          }>
            {menuStep === 'video' && (
              <div className={'menu-step menu-step-video' + (introVideoStarted ? ' pan-started' : '')}>
                <div className="intro-video-shell ready">
                  <img className="intro-poster" src={HEADER_IMAGE_SRC} alt="" />
                </div>
                <button
                  type="button"
                  className="cyber-start cyber-start-art"
                  aria-label="PLAY"
                  onClick={introVideoStarted ? beginIntroStory : startIntroSequence}
                >
                  <span>{introVideoStarted ? 'PLAY' : 'PLAY'}</span>
                </button>
              </div>
            )}

            {menuStep === 'story' && (
              <div className="menu-step story-step">
                <div className="story-image-frame">
                  <img className="story-art" src={INTRO_STORY[storyIndex].image} alt="" />
                  <div className="story-scanline" />
                </div>
                <div className="story-copy">
                  <span>{INTRO_STORY[storyIndex].kicker}</span>
                  <h2>{INTRO_STORY[storyIndex].title}</h2>
                  <p>{INTRO_STORY[storyIndex].body}</p>
                  <div className="story-progress">
                    {INTRO_STORY.map((_, index) => (
                      <i key={index} className={index === storyIndex ? 'active' : ''} />
                    ))}
                  </div>
                  <div className="story-actions">
                    <button type="button" className="art-button art-button-back" onClick={retreatIntroStory} disabled={storyIndex === 0}>
                      <span>BACK</span>
                    </button>
                    <button type="button" className="art-button art-button-skip" onClick={finishIntroStory}>
                      <span>SKIP</span>
                    </button>
                    <button type="button" className="art-button art-button-continue selected" onClick={advanceIntroStory}>
                      <span>{storyIndex >= INTRO_STORY.length - 1 ? 'LOAD GAME' : 'NEXT'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {menuStep === 'profile' && (
              <div className="menu-step profile-step">
                <img className="profile-bg" src={PROFILE_BG_SRC} alt="" />
                <div className="profile-vignette" />
                <div className="profile-panel">
                  <span className="profile-kicker">PLAYER REGISTRATION</span>
                  <label htmlFor="player-name">Enter your fighter name</label>
                  <div className="profile-row">
                    <input
                      id="player-name"
                      value={playerNameInput}
                      maxLength={24}
                      autoComplete="nickname"
                      onChange={(event) => setPlayerNameInput(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') savePlayerProfile();
                      }}
                    />
                    <button type="button" className="art-button art-button-continue" onClick={savePlayerProfile}>
                      <span>LOCK IN</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {menuStep === 'side' && (
              <div className="menu-step side-step">
                <img className="side-bg" src={SIDE_SELECTION_BG_SRC} alt="" />
                <div className="side-vignette" />
                <div className="side-footer">
                  <button type="button" className="art-button art-button-back" onClick={() => {
                    audioRef.current?.play('menu');
                    setMenuStep('profile');
                  }}>
                    <span>BACK</span>
                  </button>
                  <div className="color-picker" role="group" aria-label="Choose your color">
                    <button
                      type="button"
                      className={'art-button art-button-play-white' + (playerColor === 'w' ? ' selected' : '')}
                      onClick={() => {
                        setPlayerColor('w');
                      }}
                    >
                      <span>Play White</span>
                    </button>
                    <button
                      type="button"
                      className={'art-button art-button-play-black' + (playerColor === 'b' ? ' selected' : '')}
                      onClick={() => {
                        setPlayerColor('b');
                      }}
                    >
                      <span>Play Black</span>
                    </button>
                  </div>
                  <button type="button" className="art-button art-button-continue selected" onClick={() => {
                    audioRef.current?.play('menu');
                    setMenuStep('opponent');
                  }}>
                    <span>CONTINUE</span>
                  </button>
                </div>
              </div>
            )}

            {menuStep === 'opponent' && (
                <div className="menu-step tower-step">
                  <img className="tower-bg" src={FLOPPY_TOWER_SRC} alt="" />
                  <div className="tower-overlay" />
                <div className="tower-actions">
                  <button type="button" className="art-button art-button-back" onClick={() => {
                    audioRef.current?.play('menu');
                    setMenuStep('side');
                  }}>
                    <span>Back</span>
                  </button>
                  <button type="button" className="art-button art-button-play selected" onClick={startCampaign}>
                    <span>ASCEND</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {screen === 'loading' && (
        <div className={'enemy-load-screen enemy-theme-' + selected.theme}>
          <img className="enemy-load-bg" src={selected.hero} alt="" />
          <div className="enemy-load-vignette" />
          <div className="enemy-load-copy">
            <span>CYBER CHESS LOADING</span>
            <h1>{selected.name}</h1>
            <p>{selected.tagline}</p>
          </div>
        </div>
      )}

      {screen === 'playing' && (
        <div className={'cyber-hud enemy-theme-' + selected.theme}>
          <div className="fighter-card fighter-card-player">
            <img
              className="fighter-portrait fighter-portrait-player"
              src={PLAYER_AVATARS[fightHud.playerMood]}
              alt=""
              onError={(event) => {
                event.currentTarget.src = PLAYER_AVATARS.normal;
              }}
            />
            <div className="fighter-readout">
              <div className="health-shell" aria-label={`${playerName} health ${fightHud.playerHealth}%`}>
                <i style={{ '--health': `${fightHud.playerHealth}%` } as CSSProperties} />
              </div>
            </div>
          </div>
          <div className="versus-core">
            <strong>VS</strong>
            <span>{thinking ? `${selected.name} THINKING` : fightHud.pressure}</span>
          </div>
          <div className="fighter-card fighter-card-enemy">
            <div className="fighter-readout">
              <div className="health-shell health-shell-enemy" aria-label={`${selected.name} health ${fightHud.enemyHealth}%`}>
                <i style={{ '--health': `${fightHud.enemyHealth}%` } as CSSProperties} />
              </div>
            </div>
            <img
              className="fighter-portrait"
              src={enemyAvatarSrc}
              alt=""
              onError={(event) => {
                event.currentTarget.src = selected.avatar;
              }}
            />
          </div>
        </div>
      )}

      {screen === 'result' && resultState && resultPresentation && (
        <div className={'result-screen result-screen-' + resultState.kind + ' enemy-theme-' + resultState.opponent.theme}>
          <img
            className="result-portrait"
            src={resultBackdrop}
            alt=""
          />
          <div className="result-vignette" />
          <div className="result-copy">
            <span className="result-kicker">{resultPresentation.status}</span>
            <h1>{resultPresentation.title}</h1>
            <p>{resultPresentation.body}</p>
            {resultState.kind === 'clear' && (
              <div className="credits-video-shell">
                <video controls preload="metadata">
                  <source src={INTRO_MP4_SRC} type="video/mp4" />
                </video>
              </div>
            )}
            {resultState.kind !== 'clear' && (
              <div className="result-stats">
                <span>PLAYER: {playerName}</span>
                <span>OPPONENT: {resultState.opponent.name}</span>
                <span>{resultPresentation.badge}</span>
                <span>LIVES: {resultState.livesAfter}</span>
                {resultState.kind === 'loss' && (
                  <div className="result-countdown" aria-label={`Continue in ${continueSeconds} seconds`}>
                    <span className="hud-label">CONTINUE</span>
                    <div className="timer-frame">
                      <strong className="cyber-timer">{String(continueSeconds).padStart(2, '0')}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
            {resultState.kind !== 'clear' && (
              <div className="result-enemy-card">
                <img src={resultState.opponent.avatar} alt="" />
                <div>
                  <span>{resultState.kind === 'win' ? 'DEFEATED ENEMY' : 'ACTIVE THREAT'}</span>
                  <strong>{resultState.opponent.name}</strong>
                  <em>{resultState.opponent.difficulty} / {resultState.opponent.tagline}</em>
                </div>
              </div>
            )}
            {resultState.kind === 'win' && resultState.nextOpponent && (
              <div className="next-opponent-panel">
                <img src={resultState.nextOpponent.avatar} alt="" />
                <div>
                  <span>NEXT CHALLENGER</span>
                  <strong>{resultState.nextOpponent.name}</strong>
                  <em>{resultState.nextOpponent.difficulty} / {resultState.nextOpponent.tagline}</em>
                </div>
              </div>
            )}
            <div className="result-actions">
              {resultState.kind === 'win' && (
                <button type="button" className="art-button art-button-continue result-primary" onClick={advanceAfterWin}>
                  <span>NEXT OPPONENT</span>
                </button>
              )}
              {resultState.kind === 'clear' && (
                <button type="button" className="art-button art-button-play result-primary" onClick={advanceAfterWin}>
                  <span>RUN IT BACK</span>
                </button>
              )}
              {resultState.kind === 'loss' && (
                <button type="button" className="art-button art-button-continue result-primary" onClick={continueAfterLoss}>
                  <span>CONTINUE</span>
                </button>
              )}
              {resultState.kind === 'game-over' && (
                <button type="button" className="art-button art-button-play result-primary" onClick={restartCampaign}>
                  <span>NEW RUN</span>
                </button>
              )}
              <button type="button" className="art-button art-button-back" onClick={openMenu}>
                <span>MENU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="settings-screen" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <img className="settings-bg" src={SETTINGS_BG_SRC} alt="" />
          <div className="settings-vignette" />
          <div className="settings-panel">
            <span className="settings-kicker">SYSTEM OPTIONS</span>
            <h2 id="settings-title">SETTINGS</h2>
            <div className="settings-group">
              <strong>AUDIO</strong>
              <div className="settings-options" role="group" aria-label="Audio mode">
                <button type="button" className={audioMode === 'full' ? 'selected' : ''} onClick={() => updateAudioMode('full')}>
                  FULL AUDIO
                </button>
                <button type="button" className={audioMode === 'sfx' ? 'selected' : ''} onClick={() => updateAudioMode('sfx')}>
                  SFX ONLY
                </button>
                <button type="button" className={audioMode === 'muted' ? 'selected' : ''} onClick={() => updateAudioMode('muted')}>
                  MUTED
                </button>
              </div>
            </div>
            <div className="settings-readout">
              <span>MONIKER: ONLINE</span>
              <span>AUDIO: {audioMode === 'full' ? 'FULL AUDIO' : audioMode === 'sfx' ? 'SFX ONLY' : 'MUTED'}</span>
              <span>VOLUME: {audioVolume}%</span>
            </div>
            {screen === 'playing' && (
              <div className="settings-group">
                <strong>GAME</strong>
                <div className="settings-options settings-options-game" role="group" aria-label="Game controls">
                  <button type="button" onClick={() => {
                    audioRef.current?.play('menu');
                    resetGame();
                    setSettingsOpen(false);
                  }}>
                    RESET BOARD
                  </button>
                  <button type="button" onClick={() => {
                    audioRef.current?.play('menu');
                    setSettingsOpen(false);
                    openMenu();
                  }}>
                    MAIN MENU
                  </button>
                </div>
              </div>
            )}
            <label className="settings-volume" htmlFor="audio-volume">
              <span>OUTPUT LEVEL</span>
              <input
                id="audio-volume"
                type="range"
                min="0"
                max="200"
                step="5"
                value={audioVolume}
                onChange={(event) => updateAudioVolume(Number(event.currentTarget.value))}
              />
            </label>
            <button type="button" className="settings-close" onClick={() => {
              audioRef.current?.play('menu');
              setSettingsOpen(false);
            }}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const el = document.getElementById('root')!;
createRoot(el).render(<App />);
