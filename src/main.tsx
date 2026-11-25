// Standalone Cyber Chess entry point. Bundled by Vite.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Chess } from 'chess.js';
import { Board3DScene } from './Board3DScene';
import type { Board3DGameState, Board3DHandle } from './board3d/types';
import { chooseAiMove, type AiProfileId, type PlayerColor } from './ai';
import { START_FEN as START, moveIsCapture, queenPromotionForPawn, turnFromFen } from './chess/rules';
import {
  CONTINUE_SECONDS,
  INTRO_STORY,
  MAX_LEADERBOARD,
  MAX_LIVES,
  OPPONENTS,
  classifyMatch,
  continueExpired,
  createLeaderboardEntry,
  decrementContinueSeconds,
  expireContinueResult,
  forcedLossResult,
  forcedWinResult,
  getFightHudState,
  getOpponentById,
  getResultBackdrop,
  getResultPresentation,
  inspectCampaignSave,
  isGordoDebugName,
  mergeLeaderboard,
  nextStoryAction,
  previousStoryAction,
  sanitizePlayerName,
  type LeaderboardEntry,
  type ResultState,
  type SaveGameState,
} from './campaign';

const PLAYER_NAME_KEY = 'cyberChessPlayerName';
const LEADERBOARD_KEY = 'cyberChessLeaderboardV1';
const AUDIO_MODE_KEY = 'cyberChessAudioMode';
const AUDIO_VOLUME_KEY = 'cyberChessAudioVolume';
const SAVE_GAME_KEY = 'cyberChessSaveGameV1';

const INTRO_MP4_SRC = 'media/chessagent-intro.mp4';
const HEADER_IMAGE_SRC = 'media/hero_image_zo.png';
const SIDE_SELECTION_BG_SRC = 'media/cyber-chess-header-frostd4d-v2.jpg';
const PROFILE_BG_SRC = 'media/big_wallpaper.jpg';
const FLOPPY_TOWER_SRC = 'media/floppy-tower-ladder-embedded.jpg';
const SETTINGS_BG_SRC = 'media/settings-moniker-bg.jpg';
const CYBER_CHESS_ANNOUNCER_SRC = 'media/audio/cyber-chess-announcer.mp3';
const SOUNDTRACK_SOURCES = [
  'media/audio/the_pulse_long_song.mp3',
  'media/audio/pawn2queen.mp3',
  'media/audio/fapponacci_twister.mp3',
  'media/audio/dont twist the bishop.mp3',
  'media/audio/floppie_discs.mp3',
  'media/audio/rooks and kings.mp3',
  'media/audio/Synesthetic Circuit.mp3',
  'media/audio/Velvet Queen.mp3',
  'media/audio/Glitch Relaxor.mp3',
  'media/audio/Glitch Reliable.mp3',
  'media/audio/Moonbowl_Smoke.mp3',
  'media/audio/Pixelot.mp3',
  'media/audio/cyber_chess_music.mp3',
  'media/audio/Chrome Gambit.mp3',
  'media/audio/Chrome fresh.mp3',
  'media/audio/Chrome_Chess_Mode.mp3',
  'media/audio/Chrome_city.mp3',
  'media/audio/boogie_knights.mp3',
  'media/audio/drummin_pawns.mp3',
  'media/audio/cybercrimes.mp3',
  'media/audio/The_Pulse_of_the_Board_2.mp3',
  'media/audio/Pawns_of_Destiny.mp3',
  'media/audio/checkmeat_freakazoid.mp3',
  'media/audio/checkmeat_you_lose_song.mp3',
  'media/audio/victorious_1.mp3',
  'media/audio/synthetic_dreams_cyber_eyes.mp3',
] as const;
const LOADING_MUSIC_SRC = SOUNDTRACK_SOURCES[0];
const PIECE_SLIDE_SFX_SRC = 'media/audio/piece_slide.wav';
const CHECK_SFX_SRC = 'media/audio/check.mp3';
const CHECKMATE_SFX_SRC = 'media/audio/checkmeat.mp3';
const VICTORY_MUSIC_SOURCES = [
  'media/audio/victorious_1.mp3',
  'media/audio/victorioius_2.mp3',
] as const;
const PLAYER_AVATARS = {
  normal: 'media/avatars/player_normal.jpg',
  damaged: 'media/avatars/player_damage.jpg',
  dominating: 'media/avatars/player_dominating.jpg',
} as const;
declare global {
  interface Window {
    __chess: any;
    cyberChessDesktop?: {
      close: () => Promise<void>;
    };
  }
}
window.__chess = { mounted: false };

function getAudioReactiveState() {
  window.__chess.audioReactive ??= {
    level: 0,
    musicLevel: 0,
    pulse: 0,
  };
  return window.__chess.audioReactive as {
    level: number;
    musicLevel: number;
    pulse: number;
  };
}

function pushAudioReactivePulse(amount: number) {
  const state = getAudioReactiveState();
  const nextPulse = Math.max(state.pulse || 0, Math.max(0, Math.min(1, amount)) * 0.28);
  state.pulse = nextPulse;
  state.level = Math.max(state.musicLevel || 0, nextPulse * 0.3);
}

function setMusicReactiveLevel(level: number) {
  const state = getAudioReactiveState();
  const nextMusicLevel = Math.max(0, Math.min(1, level));
  const currentMusicLevel = state.musicLevel || 0;
  const smoothing = nextMusicLevel > currentMusicLevel ? 0.035 : 0.012;
  state.musicLevel = currentMusicLevel + (nextMusicLevel - currentMusicLevel) * smoothing;
  state.pulse = Math.max(0, (state.pulse || 0) * 0.982);
  state.level = Math.max(state.musicLevel, state.pulse * 0.3);
}

type AudioEngine = {
  play: (name: 'menu' | 'select' | 'move' | 'capture' | 'check' | 'win' | 'loss' | 'reveal' | 'tick') => void;
  setVolume: (volume: number) => void;
  stop: () => void;
};
type AudioMode = 'full' | 'sfx' | 'muted';
type ScreenState = 'intro' | 'loading' | 'playing' | 'result';
type MenuStep = 'video' | 'story' | 'profile' | 'side' | 'opponent';
function normalizeSoundtrackIndex(index: number) {
  return ((index % SOUNDTRACK_SOURCES.length) + SOUNDTRACK_SOURCES.length) % SOUNDTRACK_SOURCES.length;
}

function getSoundtrackTitle(src: string) {
  const fileName = src.split('/').pop()?.replace(/\.[^.]+$/, '') ?? src;
  return fileName
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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
      const pulseByName: Record<typeof name, number> = {
        menu: 0.28,
        select: 0.34,
        move: 0.46,
        capture: 0.84,
        check: 0.72,
        win: 0.8,
        loss: 0.68,
        reveal: 0.62,
        tick: 0.3,
      };
      pushAudioReactivePulse(pulseByName[name]);
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
  const musicAnalyserRef = useRef<{
    ctx: AudioContext;
    source: MediaElementAudioSourceNode;
    analyser: AnalyserNode;
    data: Uint8Array;
    raf: number;
    clip: HTMLAudioElement;
  } | null>(null);
  const loadingMusicPassRef = useRef(0);
  const loadingMusicFinishedRef = useRef(false);
  const loadingMusicHandlersRef = useRef<{
    onEnded: () => void;
    onTimeUpdate: () => void;
  } | null>(null);
  const endMusicRef = useRef<HTMLAudioElement | null>(null);
  const endMusicSrcRef = useRef('');
  const announcerRef = useRef<HTMLAudioElement | null>(null);
  const introAnnouncerPlayedRef = useRef(false);
  const loadingMusicIndexRef = useRef(0);
  const lastAnnouncedRef = useRef('');
  const audioModeRef = useRef<AudioMode>(readStoredAudioMode());
  const audioVolumeRef = useRef(readStoredAudioVolume());
  const previousFenRef = useRef(START);
  const previousContinueSecondsRef = useRef(CONTINUE_SECONDS);
  const [screen, setScreen] = useState<ScreenState>('intro');
  const [menuStep, setMenuStep] = useState<MenuStep>('video');
  const [storyIndex, setStoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<AiProfileId>('goop');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [playerName, setPlayerName] = useState(readStoredName);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(readLeaderboard);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioMode>(audioModeRef.current);
  const [audioVolume, setAudioVolume] = useState(audioVolumeRef.current);
  const [soundtrackIndex, setSoundtrackIndex] = useState(loadingMusicIndexRef.current);
  const [introVideoReady, setIntroVideoReady] = useState(false);
  const [introVideoStarted, setIntroVideoStarted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [lives, setLives] = useState(MAX_LIVES);
  const [continueSeconds, setContinueSeconds] = useState(CONTINUE_SECONDS);
  const [resultState, setResultState] = useState<ResultState | null>(null);
  const [settingsNotice, setSettingsNotice] = useState('');
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [gameState, setGameState] = useState<Board3DGameState>({
    status: 'Loading pieces',
    fen: START,
    selectedSquare: null,
  });

  const selectedIndex = OPPONENTS.findIndex((opponent) => opponent.id === selectedId);
  const selected = getOpponentById(selectedId);
  const nextOpponent = OPPONENTS[selectedIndex + 1];
  const turn = turnFromFen(gameState.fen);
  const aiColor: PlayerColor = playerColor === 'w' ? 'b' : 'w';
  const inputEnabled = screen === 'playing' && turn === playerColor && !thinking;
  const whiteName = playerColor === 'w' ? playerName : selected.name;
  const blackName = playerColor === 'b' ? playerName : selected.name;
  const fightHud = getFightHudState(gameState.fen, playerColor, aiColor);
  const currentStory = INTRO_STORY[storyIndex];
  const currentStoryBody = currentStory.body.replaceAll('{playerName}', playerName);
  const storyTextDuration = Math.max(3.4, Math.min(7.2, currentStoryBody.length * 0.052));
  const enemyAvatarSrc =
    fightHud.enemyMood === 'damaged'
      ? selected.avatarStates.damaged
      : fightHud.enemyMood === 'dominating'
        ? selected.avatarStates.dominating
        : selected.avatar;
  const soundtrackTitle = getSoundtrackTitle(SOUNDTRACK_SOURCES[soundtrackIndex]);
  const musicControlsDisabled = audioMode !== 'full';

  const updateGameState = (state: Board3DGameState) => {
    window.__chess.state = state;
    if (turnFromFen(state.fen) !== aiColor) {
      aiBusyRef.current = false;
      setThinking(false);
    }
    setGameState(state);
  };

  const buildResultForFen = (fen: string): ResultState | null => classifyMatch({
    fen,
    playerColor,
    lives,
    opponent: selected,
    nextOpponent,
  });

  const recordRun = (result: ResultState) => {
    if (result.kind !== 'clear' && result.kind !== 'game-over') return;
    const resultKey = `${result.kind}:${result.opponent.id}:${result.livesAfter}:${runStartedAtRef.current}`;
    if (recordedResultKeyRef.current === resultKey) return;
    recordedResultKeyRef.current = resultKey;

    const seconds = Math.max(1, Math.round((Date.now() - runStartedAtRef.current) / 1000));
    const entry = createLeaderboardEntry({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: playerName,
      kind: result.kind,
      opponentName: result.opponent.name,
      livesAfter: result.livesAfter,
      seconds,
      opponentIndex: selectedIndex,
      opponentCount: OPPONENTS.length,
      completedAt: new Date().toISOString(),
    });
    const next = mergeLeaderboard(leaderboard, entry);
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
    stopMusicAnalyser();
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
      if (event.key === 'Escape') {
        event.preventDefault();
        if (settingsOpen) {
          audioRef.current?.play('menu');
          if (creditsOpen) {
            setCreditsOpen(false);
            return;
          }
          setSettingsOpen(false);
          return;
        }
        ensureAudioEngine()?.play('menu');
        setSettingsOpen(true);
        return;
      }

      if (audioModeRef.current !== 'full' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        switchSoundtrackSong(loadingMusicIndexRef.current + 1);
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        switchSoundtrackSong(loadingMusicIndexRef.current - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [creditsOpen, settingsOpen]);

  useEffect(() => {
    const previousFen = previousFenRef.current;
    if (previousFen !== gameState.fen) {
      try {
        const current = new Chess(gameState.fen);
        if (!current.isCheckmate() && current.isCheck()) playClip(CHECK_SFX_SRC);
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
        moveIsCapture(move),
        move.flags,
        queenPromotionForPawn(move.piece, move.to, move.promotion),
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
    const isCheckmate = new Chess(gameState.fen).isCheckmate();
    if (isCheckmate) {
      playClip(CHECKMATE_SFX_SRC);
    } else {
      audioRef.current?.play(result.kind === 'win' || result.kind === 'clear' ? 'win' : 'loss');
    }
    setScreen('result');
  }, [gameState.fen, lives, nextOpponent, playerColor, screen, selected]);

  useEffect(() => {
    if (screen !== 'result' || resultState?.kind !== 'loss') return;
    if (continueExpired(resultState.kind, continueSeconds)) {
      setResultState(expireContinueResult(resultState));
      setLives(0);
      return;
    }

    const id = window.setTimeout(() => setContinueSeconds((current) => decrementContinueSeconds(current)), 1000);
    return () => window.clearTimeout(id);
  }, [continueSeconds, resultState, screen]);

  useEffect(() => {
    if (screen === 'result' && resultState) {
      const resultMusicSrc =
        resultState.kind === 'win' ? VICTORY_MUSIC_SOURCES[0] :
        resultState.kind === 'clear' ? VICTORY_MUSIC_SOURCES[1] :
        '';
      if (!resultMusicSrc) {
        endMusicRef.current?.pause();
        endMusicRef.current = null;
        endMusicSrcRef.current = '';
        window.__chess.endMusic = { active: false, src: '' };
        return;
      }
      if (!endMusicRef.current || endMusicSrcRef.current !== resultMusicSrc) {
        endMusicRef.current?.pause();
        endMusicRef.current = playClip(resultMusicSrc, { music: true, loop: true });
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
    if (screen !== 'intro' || menuStep !== 'video' || !introVideoStarted) {
      return;
    }
    if (introAnnouncerPlayedRef.current) return;

    const id = window.setTimeout(() => {
      if (introAnnouncerPlayedRef.current) return;
      if (window.__chess.campaign?.screen !== 'intro') return;
      introAnnouncerPlayedRef.current = true;
      playAnnouncer(CYBER_CHESS_ANNOUNCER_SRC);
    }, 10_000);

    return () => window.clearTimeout(id);
  }, [introVideoStarted, menuStep, screen]);

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
      soundtrackIndex,
      soundtrackSrc: SOUNDTRACK_SOURCES[soundtrackIndex],
    };
    window.__chess.forceWin = () => {
      const forcedResult = forcedWinResult(selected, nextOpponent, lives);
      setResultState(forcedResult);
      recordRun(forcedResult);
      audioRef.current?.play(forcedResult.kind === 'clear' ? 'win' : 'reveal');
      setScreen('result');
    };
    window.__chess.forceLoss = () => {
      const forcedResult = forcedLossResult(selected, lives);
      setLives(forcedResult.livesAfter);
      setContinueSeconds(CONTINUE_SECONDS);
      setResultState(forcedResult);
      recordRun(forcedResult);
      audioRef.current?.play(forcedResult.kind === 'game-over' ? 'loss' : 'tick');
      setScreen('result');
    };
  }, [audioMode, audioVolume, blackName, continueSeconds, leaderboard, lives, nextOpponent, playerName, resultState, screen, selected, selectedId, settingsOpen, soundtrackIndex, whiteName]);

  useEffect(() => {
    if (screen === 'intro' && menuStep === 'profile') setPlayerNameInput('');
  }, [menuStep, screen]);

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

  const startOpponentLoading = (opponent = selected) => {
    endMusicRef.current?.pause();
    endMusicRef.current = null;
    endMusicSrcRef.current = '';
    ensureAudioEngine()?.play('reveal');
    announcerRef.current?.pause();
    setScreen('loading');
    setResultState(null);

    const clip = playAnnouncer(opponent.introAudio);
    const fallback = window.setTimeout(() => {
      if (window.__chess.campaign?.screen === 'loading' && window.__chess.campaign?.selectedId === opponent.id) {
        startGame();
      }
    }, 4200);

    if (clip) {
      clip.onended = () => {
        window.clearTimeout(fallback);
        if (window.__chess.campaign?.screen === 'loading' && window.__chess.campaign?.selectedId === opponent.id) {
          startGame();
        }
      };
    }
  };

  const openMenu = () => {
    endMusicRef.current?.pause();
    endMusicRef.current = null;
    endMusicSrcRef.current = '';
    announcerRef.current?.pause();
    introAnnouncerPlayedRef.current = false;
    setIntroVideoStarted(false);
    setMenuStep('video');
    setLives(MAX_LIVES);
    setResultState(null);
    setScreen('intro');
  };

  const ensureAudioEngine = () => {
    if (!audioRef.current) audioRef.current = createAudioEngine(() => audioModeRef.current, () => audioVolumeRef.current);
    return audioRef.current;
  };

  const stopMusicAnalyser = () => {
    const current = musicAnalyserRef.current;
    if (!current) return;
    window.cancelAnimationFrame(current.raf);
    current.source.disconnect();
    current.analyser.disconnect();
    current.ctx.close().catch(() => undefined);
    musicAnalyserRef.current = null;
    setMusicReactiveLevel(0);
  };

  const ensureMusicAnalyser = (clip: HTMLAudioElement) => {
    if (musicAnalyserRef.current?.clip === clip) {
      if (musicAnalyserRef.current.ctx.state === 'suspended') musicAnalyserRef.current.ctx.resume().catch(() => undefined);
      return;
    }

    stopMusicAnalyser();

    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    try {
      const ctx = new AudioCtor();
      const source = ctx.createMediaElementSource(clip);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.94;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const reactive = {
        ctx,
        source,
        analyser,
        data: new Uint8Array(analyser.frequencyBinCount),
        raf: 0,
        clip,
      };

      const sample = () => {
        analyser.getByteFrequencyData(reactive.data);
        let harmonicTotal = 0;
        let harmonicWeight = 0;
        const startBin = Math.floor(reactive.data.length * 0.18);
        const endBin = Math.floor(reactive.data.length * 0.78);
        for (let i = startBin; i < endBin; i += 1) {
          const value = reactive.data[i] / 255;
          const position = (i - startBin) / Math.max(1, endBin - startBin);
          const weight = 0.65 + Math.sin(position * Math.PI) * 0.7;
          harmonicTotal += value * weight;
          harmonicWeight += weight;
        }
        const harmonicAverage = harmonicTotal / Math.max(1, harmonicWeight);
        const level = Math.min(1, Math.pow(Math.max(0, harmonicAverage - 0.045) * 1.65, 1.25));
        setMusicReactiveLevel(clip.paused ? 0 : level);
        reactive.raf = window.requestAnimationFrame(sample);
      };

      musicAnalyserRef.current = reactive;
      reactive.raf = window.requestAnimationFrame(sample);
      ctx.resume().catch(() => undefined);
    } catch (error) {
      console.warn('[Audio] Could not attach soundtrack analyser.', error);
      setMusicReactiveLevel(0);
    }
  };

  const updateAudioMode = (mode: AudioMode) => {
    audioModeRef.current = mode;
    setAudioMode(mode);
    try {
      window.localStorage.setItem(AUDIO_MODE_KEY, mode);
    } catch (_) {}
    if (mode !== 'full') stopIntroMusic();
    if (mode !== 'full') {
      stopLoadingMusic();
      endMusicRef.current?.pause();
      endMusicRef.current = null;
      endMusicSrcRef.current = '';
      window.__chess.endMusic = { active: false, src: '' };
    } else {
      startLoadingMusic();
    }
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

  const switchSoundtrackSong = (index: number) => {
    if (audioModeRef.current !== 'full') return;
    const nextIndex = normalizeSoundtrackIndex(index);
    loadingMusicIndexRef.current = nextIndex;
    setSoundtrackIndex(nextIndex);

    let clip = loadingMusicRef.current;
    if (!clip) {
      startLoadingMusic();
      ensureAudioEngine()?.play('select');
      return;
    }
    ensureMusicAnalyser(clip);
    const nextSrc = SOUNDTRACK_SOURCES[nextIndex];
    clip.src = nextSrc;
    clip.load();
    clip.currentTime = 0;
    clip.volume = mediaVolume(audioVolumeRef.current) * 0.9;
    loadingMusicFinishedRef.current = false;
    if (loadingMusicPassRef.current <= 0) loadingMusicPassRef.current = 1;
    window.__chess.loadingMusic = {
      ...(window.__chess.loadingMusic || {}),
      active: false,
      attempted: true,
      blocked: false,
      src: nextSrc,
      pass: loadingMusicPassRef.current,
      maxPasses: 'playlist',
      loop: true,
      playlist: [...SOUNDTRACK_SOURCES],
      index: nextIndex,
      fading: false,
      finished: false,
    };
    clip.play()
      .then(() => {
        window.__chess.loadingMusic = {
          ...(window.__chess.loadingMusic || {}),
          active: true,
          src: nextSrc,
          index: nextIndex,
        };
      })
      .catch(() => {
        window.__chess.loadingMusic = {
          ...(window.__chess.loadingMusic || {}),
          active: false,
          blocked: true,
          src: nextSrc,
          index: nextIndex,
        };
      });
    ensureAudioEngine()?.play('select');
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
    stopMusicAnalyser();
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
    if (audioModeRef.current !== 'full') return;
    loadingMusicFinishedRef.current = false;
    let clip = loadingMusicRef.current;
    if (!clip) {
      clip = new Audio(SOUNDTRACK_SOURCES[loadingMusicIndexRef.current % SOUNDTRACK_SOURCES.length]);
      clip.loop = false;
      clip.preload = 'auto';
      loadingMusicRef.current = clip;
      ensureMusicAnalyser(clip);
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
        setSoundtrackIndex(loadingMusicIndexRef.current);
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
    ensureMusicAnalyser(clip);
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
    setMenuStep('profile');
  };

  const startIntroSequence = () => {
    ensureAudioEngine()?.play('menu');
    startLoadingMusic();
    introAnnouncerPlayedRef.current = false;
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
    setMenuStep('side');
  };

  const advanceIntroStory = () => {
    audioRef.current?.play('menu');
    const action = nextStoryAction(storyIndex, INTRO_STORY.length);
    if (action.finished) {
      finishIntroStory();
      return;
    }
    setStoryIndex(action.index);
  };

  const retreatIntroStory = () => {
    audioRef.current?.play('menu');
    const action = previousStoryAction(storyIndex);
    if (action.backToProfile) {
      setMenuStep('profile');
      return;
    }
    setStoryIndex(action.index);
  };

  const commitPlayerName = () => {
    const nextName = sanitizePlayerName(playerNameInput);
    setPlayerName(nextName);
    try {
      window.localStorage.setItem(PLAYER_NAME_KEY, nextName);
    } catch (_) {}
    return nextName;
  };

  const startGordoDebugMatch = () => {
    const gordo = getOpponentById('gordo');
    setSelectedId(gordo.id);
    setLives(MAX_LIVES);
    setContinueSeconds(CONTINUE_SECONDS);
    runStartedAtRef.current = Date.now();
    recordedResultKeyRef.current = '';
    previousFenRef.current = START;
    resultHandledFenRef.current = '';
    lastAiFenRef.current = '';
    aiBusyRef.current = false;
    aiRequestRef.current += 1;
    setThinking(false);
    lastAnnouncedRef.current = '';
    window.setTimeout(() => startOpponentLoading(gordo), 0);
  };

  const savePlayerProfile = () => {
    const rawName = playerNameInput;
    commitPlayerName();
    ensureAudioEngine();
    playClip(CHECKMATE_SFX_SRC);
    if (isGordoDebugName(rawName)) {
      startGordoDebugMatch();
      return;
    }
    setStoryIndex(0);
    setMenuStep('story');
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

  const makeSaveGame = (): SaveGameState => ({
    version: 1,
    savedAt: new Date().toISOString(),
    screen,
    menuStep,
    storyIndex,
    selectedId,
    playerColor,
    playerName,
    lives,
    continueSeconds,
    fen: gameState.fen,
    resultState: resultState ? {
      kind: resultState.kind,
      opponentId: resultState.opponent.id,
      nextOpponentId: resultState.nextOpponent?.id,
      livesAfter: resultState.livesAfter,
    } : null,
    runStartedAt: runStartedAtRef.current,
  });

  const saveGame = () => {
    try {
      const save = makeSaveGame();
      window.localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(save));
      setSettingsNotice(`SAVED ${getOpponentById(save.selectedId).name.toUpperCase()} / ${save.screen.toUpperCase()}`);
      audioRef.current?.play('select');
    } catch (_) {
      setSettingsNotice('SAVE FAILED');
      audioRef.current?.play('loss');
    }
  };

  const loadGame = () => {
    try {
      const inspected = inspectCampaignSave(
        JSON.parse(window.localStorage.getItem(SAVE_GAME_KEY) || 'null'),
        INTRO_STORY.length,
        playerName,
      );
      if (!inspected.ok) {
        setSettingsNotice(inspected.reason === 'invalid-fen' ? 'LOAD FAILED' : 'NO SAVE FOUND');
        audioRef.current?.play('loss');
        return;
      }
      const save = inspected.save;
      const effectiveScreen = save.screen;

      aiBusyRef.current = false;
      aiRequestRef.current += 1;
      lastAiFenRef.current = '';
      resultHandledFenRef.current = '';
      recordedResultKeyRef.current = '';
      setThinking(false);
      setSelectedId(save.selectedId);
      setPlayerColor(save.playerColor);
      setPlayerName(save.playerName);
      setPlayerNameInput(save.playerName);
      setLives(save.lives);
      setContinueSeconds(save.continueSeconds);
      setStoryIndex(save.storyIndex);
      setMenuStep(save.menuStep);
      setResultState(save.resultState);
      runStartedAtRef.current = save.runStartedAt || Date.now();
      previousFenRef.current = save.fen;
      setGameState({ status: 'Save loaded', fen: save.fen, selectedSquare: null });

      if (effectiveScreen === 'loading') {
        setSettingsOpen(false);
        setCreditsOpen(false);
        startOpponentLoading(save.opponent);
      } else {
        setScreen(effectiveScreen);
        setSettingsOpen(false);
        setCreditsOpen(false);
        window.setTimeout(() => {
          ref.current?.resetToPosition(save.fen);
        }, 0);
      }

      setSettingsNotice(`LOADED ${save.opponent.name.toUpperCase()} / ${effectiveScreen.toUpperCase()}`);
      audioRef.current?.play('reveal');
    } catch (_) {
      setSettingsNotice('LOAD FAILED');
      audioRef.current?.play('loss');
    }
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
        cameraControls={screen === 'playing' && !settingsOpen}
        onGameStateChange={updateGameState}
        onMoveStart={() => {
          playClip(PIECE_SLIDE_SFX_SRC);
        }}
      />

      {window.cyberChessDesktop && (
        <>
          <div className="electron-drag-tag" aria-hidden="true" title="Drag window" />
          <button
            type="button"
            className="electron-close"
            aria-label="Close Cyber Chess"
            onClick={() => {
              window.cyberChessDesktop?.close().catch(() => undefined);
            }}
          >
            X
          </button>
        </>
      )}

      {!settingsOpen && screen === 'intro' && menuStep === 'video' && (
        <button type="button" className="settings-launcher" aria-label="SETTINGS" onClick={() => {
          ensureAudioEngine()?.play('menu');
          setSettingsOpen(true);
        }}>
          <span>SETTINGS</span>
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
                  <img
                    key={currentStory.image}
                    className={'story-art' + (currentStory.title === 'TOO DEEP' ? ' story-art-too-deep' : '')}
                    src={currentStory.image}
                    alt=""
                    style={{ '--story-image-duration': `${storyTextDuration}s` } as CSSProperties}
                  />
                  <div className="story-scanline" />
                  <div className="story-copy" aria-live="polite" aria-labelledby={`story-title-${storyIndex}`}>
                    <span className="story-kicker">{currentStory.kicker}</span>
                    <h2 id={`story-title-${storyIndex}`} className="story-title">{currentStory.title}</h2>
                    <p
                      key={`${storyIndex}-${currentStoryBody}`}
                      className="story-terminal-text"
                      style={{
                        '--story-text-duration': `${storyTextDuration}s`,
                      } as CSSProperties}
                    >
                      {currentStoryBody}
                    </p>
                    <div className="story-progress" aria-hidden="true">
                      {INTRO_STORY.map((_, index) => (
                        <i key={index} className={index === storyIndex ? 'active' : ''} />
                      ))}
                    </div>
                  </div>
                  <div className="story-actions">
                    <button type="button" className="art-button art-button-back" onClick={retreatIntroStory}>
                      <span>BACK</span>
                    </button>
                    <button type="button" className="art-button art-button-continue selected" onClick={advanceIntroStory}>
                      <span>{storyIndex >= INTRO_STORY.length - 1 ? 'LOAD GAME' : 'NEXT'}</span>
                    </button>
                    <button type="button" className="art-button art-button-skip" onClick={finishIntroStory}>
                      <span>SKIP</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {menuStep === 'profile' && (
              <div className="menu-step profile-step">
                <img className="profile-bg" src={PROFILE_BG_SRC} alt="" />
                <div className="profile-vignette" />
                <img className="profile-title-art" src="media/cyber_chess_title_hero.png" alt="Cyber Chess" />
                <div className="profile-panel">
                  <span className="profile-kicker">BATTLE READY</span>
                  <label htmlFor="player-name">Name your hero</label>
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
                    setStoryIndex(1);
                    setMenuStep('story');
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
            {resultState.kind !== 'clear' && (
              <p>{resultPresentation.body}</p>
            )}
            {(resultState.kind === 'loss' || resultState.kind === 'game-over') && (
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
          {creditsOpen && (
            <div className="credits-modal" role="dialog" aria-label="Credits">
              <div className="credits-panel">
                <div className="credits-roll-shell" aria-live="polite">
                  <div className="credits-roll">
                    <div className="credits-roll-set">
                      <p>Game created by Frosty40 and Codex.</p>
                      <p>GORDO uses the Lozza chess engine by Colin Jenkins.</p>
                      <p>Audio assets generated with ElevenLabs and Suno.</p>
                    </div>
                    <div className="credits-roll-set" aria-hidden="true">
                      <p>Game created by Frosty40 and Codex.</p>
                      <p>GORDO uses the Lozza chess engine by Colin Jenkins.</p>
                      <p>Audio assets generated with ElevenLabs and Suno.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="settings-panel">
            <img className="settings-panel-frame" src="media/buttons/settings_bg_frame.png" alt="" />
            <div className="settings-panel-header">
              <h2 id="settings-title"><span>SETTINGS</span></h2>
            </div>
            <div className="settings-panel-body">
              <div className="settings-group settings-audio-group">
                <strong>AUDIO MODE</strong>
                <div className="settings-options" role="group" aria-label="Audio mode">
                  <button type="button" className={'settings-toggle' + (audioMode === 'full' ? ' selected' : '')} onClick={() => updateAudioMode('full')}>
                    <span className="settings-toggle-label">FULL AUDIO</span>
                  </button>
                  <button type="button" className={'settings-toggle' + (audioMode === 'sfx' ? ' selected' : '')} onClick={() => updateAudioMode('sfx')}>
                    <span className="settings-toggle-label">SFX ONLY</span>
                  </button>
                  <button type="button" className={'settings-toggle' + (audioMode === 'muted' ? ' selected' : '')} onClick={() => updateAudioMode('muted')}>
                    <span className="settings-toggle-label">MUTED</span>
                  </button>
                </div>
              </div>
              <label className="settings-volume" htmlFor="audio-volume">
                <span>OUTPUT LEVEL <strong>{audioVolume}%</strong></span>
                <span
                  className="settings-slider-shell"
                  style={{ '--settings-volume-progress': `${Math.min(100, Math.max(0, audioVolume / 2))}%` } as CSSProperties}
                >
                  <input
                    id="audio-volume"
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={audioVolume}
                    onChange={(event) => updateAudioVolume(Number(event.currentTarget.value))}
                  />
                </span>
              </label>
              <div className="settings-group settings-playlist">
                <strong>SOUNDTRACK</strong>
                <div className="settings-track-control">
                  <button
                    type="button"
                    className="settings-track-step"
                    aria-label="Previous song"
                    disabled={musicControlsDisabled}
                    onClick={() => switchSoundtrackSong(soundtrackIndex - 1)}
                  >
                    <span aria-hidden="true">PREV</span>
                  </button>
                  <div className="settings-track-now" aria-live="polite">
                    <span>NOW PLAYING</span>
                    <strong>{soundtrackTitle}</strong>
                  </div>
                  <button
                    type="button"
                    className="settings-track-step"
                    aria-label="Next song"
                    disabled={musicControlsDisabled}
                    onClick={() => switchSoundtrackSong(soundtrackIndex + 1)}
                  >
                    <span aria-hidden="true">NEXT</span>
                  </button>
                </div>
                <div className="settings-track-list" role="listbox" aria-label="Soundtrack playlist" aria-disabled={musicControlsDisabled}>
                  {SOUNDTRACK_SOURCES.map((src, index) => {
                    const title = getSoundtrackTitle(src);
                    return (
                      <button
                        type="button"
                        key={src}
                        className={'settings-track-option' + (index === soundtrackIndex ? ' selected' : '')}
                        role="option"
                        aria-selected={index === soundtrackIndex}
                        disabled={musicControlsDisabled}
                        onClick={() => switchSoundtrackSong(index)}
                      >
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <strong>{title}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="settings-footer">
              <div className="settings-group settings-save-group">
                <strong>GAME DATA</strong>
                <div className="settings-options settings-options-save" role="group" aria-label="Save and credits controls">
                  <button type="button" className="settings-toggle settings-command" onClick={saveGame}>
                    <span>SAVE GAME</span>
                  </button>
                  <button type="button" className="settings-toggle settings-command" onClick={loadGame}>
                    <span>LOAD GAME</span>
                  </button>
                  <button type="button" className={'settings-toggle settings-command' + (creditsOpen ? ' selected' : '')} onClick={() => {
                    audioRef.current?.play('menu');
                    setCreditsOpen((open) => !open);
                  }}>
                    <span>CREDITS</span>
                  </button>
                </div>
                {settingsNotice && (
                  <div className="settings-save-status" role="status" aria-live="polite">{settingsNotice}</div>
                )}
              </div>
              <div className="settings-actions">
                <button type="button" className="art-button art-button-close" onClick={() => {
                  audioRef.current?.play('menu');
                  setSettingsOpen(false);
                }}>
                  <span>CLOSE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const el = document.getElementById('root')!;
createRoot(el).render(<App />);
