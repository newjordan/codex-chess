// Standalone entry for the portfolio: mounts Jordan's real Board3DScene
// (the board3d module - procedural neon board, FBX pieces, bloom post-fx,
// lightning/capture/jump animations) with no backend. Bundled by esbuild
// into ../app.js.
import { useEffect, useRef, useState } from 'react';
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
const MAX_LEADERBOARD = 8;

const OPPONENTS: Array<{
  id: AiProfileId;
  name: string;
  difficulty: string;
  avatar: string;
  hero: string;
  theme: 'goop' | 'frostd4d' | 'razorblade';
  tagline: string;
  bio: string;
  speed: number;
  delay: number;
}> = [
  {
    id: 'goop',
    name: 'Goop',
    difficulty: 'EASY',
    avatar: 'avatars/goop.png',
    hero: 'media/enemies/goop-entrance.png',
    theme: 'goop',
    tagline: 'Mostly legal. Frequently sticky.',
    bio: 'A training-room nuisance that values chaos, trades material for vibes, and occasionally stumbles into real tactics.',
    speed: 1.7,
    delay: 760,
  },
  {
    id: 'frostd4d',
    name: 'Frostd4d',
    difficulty: 'MED',
    avatar: 'avatars/frostd4d.png',
    hero: 'media/enemies/frostd4d-entrance.png',
    theme: 'frostd4d',
    tagline: 'Cold reads, colder captures.',
    bio: 'A mid-depth board reader built for pressure: it hunts loose pieces, likes checks, and punishes autopilot openings.',
    speed: 2.1,
    delay: 520,
  },
  {
    id: 'razorblade',
    name: 'Razorblade',
    difficulty: 'HARD',
    avatar: 'avatars/razorblade.png',
    hero: 'media/enemies/razorblade-entrance.png',
    theme: 'razorblade',
    tagline: 'Depth search with bad intentions.',
    bio: 'The sharpest Cyber Chess agent in the cabinet. Razorblade searches deeper, converts captures hard, and turns slow mistakes into endgame problems.',
    speed: 2.45,
    delay: 320,
  },
];

const INTRO_MP4_SRC = 'media/chessagent-intro.mp4';
const HEADER_IMAGE_SRC = 'media/cyber-chess-header.png';
const VICTORY_PORTRAIT_SRC = 'media/campaign-victory-portrait.png';
const DEFEAT_PORTRAIT_SRC = 'media/campaign-defeat-portrait.png';
const FLOPPY_TOWER_SRC = 'media/floppy-tower-ladder.png';
const INTRO_STORY = [
  {
    image: 'media/intro/01-pre-computation.png',
    kicker: 'PRE-COMPUTATION',
    title: 'THE PLAYER',
    body: 'Before the board was neon, the greatest chess mind alive hunted a rumor in the machine: the Shannon Prime.',
  },
  {
    image: 'media/intro/02-shannon-knights-kidnap.png',
    kicker: 'THE SHANNON KNIGHTS',
    title: 'THE BREACH',
    body: 'Goop, Frostd4d, and Razorblade struck as one, tearing open the lab and dragging his family into the grid.',
  },
  {
    image: 'media/intro/02-consciousness-floppies.png',
    kicker: '42 DISKS',
    title: 'THE TRANSFER',
    body: 'When the Shannon Knights breached his home and stole his family, he copied his consciousness onto forty-two floppy disks.',
  },
  {
    image: 'media/intro/03-floppy-tower.png',
    kicker: 'FLOPPY TOWER ONLINE',
    title: 'THE ASCENT',
    body: 'One by one, all forty-two disks loaded into the tower. The drives screamed. The room became a square of light.',
  },
  {
    image: 'media/intro/04-shannon-knights.png',
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
  stop: () => void;
};

function turnFromFen(fen: string) {
  try {
    return new Chess(fen).turn();
  } catch (_) {
    return 'w';
  }
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

function persistLeaderboard(entries: LeaderboardEntry[]) {
  try {
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, MAX_LEADERBOARD)));
  } catch (_) {}
}

function createAudioEngine(): AudioEngine | null {
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  const ctx = new AudioCtor();
  const master = ctx.createGain();
  master.gain.value = 0.08;
  master.connect(ctx.destination);
  window.__chess.audio = {
    ready: true,
    last: window.__chess.audio?.last || null,
    played: window.__chess.audio?.played || 0,
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
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      const now = ctx.currentTime;
      window.__chess.audio = {
        ready: true,
        last: name,
        played: (window.__chess.audio?.played || 0) + 1,
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
  const resultHandledFenRef = useRef('');
  const runStartedAtRef = useRef(Date.now());
  const recordedResultKeyRef = useRef('');
  const introMusicRef = useRef<{ stop: () => void } | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const previousFenRef = useRef(START);
  const previousContinueSecondsRef = useRef(CONTINUE_SECONDS);
  const [screen, setScreen] = useState<'intro' | 'playing' | 'result'>('intro');
  const [menuStep, setMenuStep] = useState<'video' | 'story' | 'profile' | 'side' | 'opponent'>('video');
  const [storyIndex, setStoryIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<AiProfileId>('goop');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [playerName, setPlayerName] = useState(readStoredName);
  const [playerNameInput, setPlayerNameInput] = useState(readStoredName);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(readLeaderboard);
  const [introVideoReady, setIntroVideoReady] = useState(false);
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
  const playerSideName = playerColor === 'w' ? 'White' : 'Black';
  const agentSideName = aiColor === 'w' ? 'White' : 'Black';

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
    audioRef.current?.stop();
    audioRef.current = null;
  }, []);

  useEffect(() => {
    const previousFen = previousFenRef.current;
    if (previousFen !== gameState.fen) {
      try {
        const previous = new Chess(previousFen);
        const current = new Chess(gameState.fen);
        const previousPieces = previous.board().flat().filter(Boolean).length;
        const currentPieces = current.board().flat().filter(Boolean).length;
        audioRef.current?.play(currentPieces < previousPieces ? 'capture' : current.isCheck() ? 'check' : 'move');
      } catch (_) {
        audioRef.current?.play('move');
      }
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

    const id = window.setTimeout(() => {
      const move = chooseAiMove(gameState.fen, selected.id, aiColor);
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

    return () => window.clearTimeout(id);
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
    if (screen === 'result' && resultState?.kind === 'loss' && continueSeconds !== previousContinueSecondsRef.current) {
      audioRef.current?.play('tick');
    }
    previousContinueSecondsRef.current = continueSeconds;
  }, [continueSeconds, resultState?.kind, screen]);

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
  }, [blackName, continueSeconds, leaderboard, lives, nextOpponent, playerName, resultState, screen, selected, selectedId, whiteName]);

  const resetGame = () => {
    aiBusyRef.current = false;
    lastAiFenRef.current = '';
    resultHandledFenRef.current = '';
    setThinking(false);
    ref.current?.resetToPosition(START);
  };

  const startGame = () => {
    setScreen('playing');
    setResultState(null);
    resetGame();
  };

  const openMenu = () => {
    setMenuStep('video');
    setLives(MAX_LIVES);
    setResultState(null);
    setScreen('intro');
  };

  const startIntroMusic = () => {
    if (!audioRef.current) audioRef.current = createAudioEngine();
    if (introMusicRef.current) return;
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = 0.05;
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
    startIntroMusic();
    setMenuStep('story');
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
    audioRef.current?.play('reveal');
    startGame();
  };

  const continueAfterLoss = () => {
    if (!resultState || resultState.kind !== 'loss') return;
    setLives(resultState.livesAfter);
    audioRef.current?.play('menu');
    startGame();
  };

  const advanceAfterWin = () => {
    if (!resultState) return;
    if (resultState.kind === 'clear') {
      restartCampaign();
      return;
    }

    if (resultState.nextOpponent) {
      setSelectedId(resultState.nextOpponent.id);
      audioRef.current?.play('reveal');
      window.setTimeout(startGame, 0);
    }
  };

  const restartCampaign = () => {
    setSelectedId(OPPONENTS[0].id);
    setLives(MAX_LIVES);
    setResultState(null);
    setContinueSeconds(CONTINUE_SECONDS);
    runStartedAtRef.current = Date.now();
    recordedResultKeyRef.current = '';
    previousFenRef.current = START;
    audioRef.current?.play('menu');
    startGame();
  };

  const clearLeaderboard = () => {
    setLeaderboard([]);
    persistLeaderboard([]);
    audioRef.current?.play('menu');
  };

  return (
    <>
      <Board3DScene
        key={`${selected.id}-${playerColor}-${playerName}`}
        ref={ref}
        whiteName={whiteName}
        blackName={blackName}
        inputEnabled={inputEnabled}
        onGameStateChange={updateGameState}
      />

      {screen === 'intro' && (
        <div className="cyber-menu">
          <div className="cyber-panel">
            {menuStep === 'video' && (
              <div className="menu-step menu-step-video">
                <div className={'intro-video-shell' + (introVideoReady ? ' ready' : '')}>
                  <video
                    autoPlay
                    muted
                    playsInline
                    preload="metadata"
                    onCanPlay={() => setIntroVideoReady(true)}
                    onError={() => setIntroVideoReady(false)}
                  >
                    <source src={INTRO_MP4_SRC} type="video/mp4" />
                  </video>
                  {!introVideoReady && <span>INTRO MP4 SLOT</span>}
                </div>
                <button type="button" className="cyber-start" onClick={beginIntroStory}>
                  CLICK TO ENTER
                </button>
              </div>
            )}

            {menuStep === 'story' && (
              <div className="menu-step story-step">
                <img className="story-art" src={INTRO_STORY[storyIndex].image} alt="" />
                <div className="story-scanline" />
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
                    <button type="button" onClick={retreatIntroStory} disabled={storyIndex === 0}>BACK</button>
                    <button type="button" onClick={finishIntroStory}>SKIP</button>
                    <button type="button" className="selected" onClick={advanceIntroStory}>
                      {storyIndex >= INTRO_STORY.length - 1 ? 'LOAD GAME' : 'NEXT'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {menuStep === 'profile' && (
              <div className="menu-step profile-step">
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
                    <button type="button" onClick={savePlayerProfile}>LOCK IN</button>
                  </div>
                  <div className="leaderboard-panel">
                    <div className="leaderboard-heading">
                      <strong>LOCAL LEADERBOARD</strong>
                      {leaderboard.length > 0 && <button type="button" onClick={clearLeaderboard}>CLEAR</button>}
                    </div>
                    {leaderboard.length === 0 ? (
                      <p>No local scores yet.</p>
                    ) : (
                      <ol>
                        {leaderboard.map((entry) => (
                          <li key={entry.id}>
                            <span>{entry.name}</span>
                            <strong>{entry.score}</strong>
                            <em>{entry.outcome === 'clear' ? 'CLEAR' : `${entry.wins} WIN${entry.wins === 1 ? '' : 'S'}`}</em>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            )}

            {menuStep === 'side' && (
              <div className="menu-step">
                <div className="cyber-hero">
                  <img className="cyber-hero-bg" src={HEADER_IMAGE_SRC} alt="" />
                  <div className="hero-color-overlay">
                    <div className="color-picker" role="group" aria-label="Choose your color">
                      <button
                        type="button"
                        className={playerColor === 'w' ? 'selected' : ''}
                        onClick={() => {
                          audioRef.current?.play('select');
                          setPlayerColor('w');
                        }}
                      >
                        Play White
                      </button>
                      <button
                        type="button"
                        className={playerColor === 'b' ? 'selected' : ''}
                        onClick={() => {
                          audioRef.current?.play('select');
                          setPlayerColor('b');
                        }}
                      >
                        Play Black
                      </button>
                    </div>
                  </div>
                </div>
                <div className="intro-copy">
                  <p>
                    Cyber Chess is a neon board duel against local machine personalities. Claim white or black, then
                    play directly on the 3D board while the agent answers with its own tempo, search style, and appetite
                    for risk.
                  </p>
                </div>
                <button type="button" className="cyber-start" onClick={() => {
                  audioRef.current?.play('menu');
                  setMenuStep('opponent');
                }}>
                  CONTINUE
                </button>
              </div>
            )}

            {menuStep === 'opponent' && (
              <div className="menu-step tower-step">
                <img className="tower-bg" src={FLOPPY_TOWER_SRC} alt="" />
                <div className="tower-overlay" />
                <img className={'tower-hero tower-hero-' + selected.theme} src={selected.hero} alt="" />
                <div className="tower-copy">
                  <span>FLOPPY TOWER ASCENT</span>
                  <h2>FLOOR {selectedIndex + 1} / {OPPONENTS.length}</h2>
                  <p>{playerName}: {playerSideName} / {selected.name}: {agentSideName}</p>
                </div>
                <div className="tower-slots" aria-label="Floppy tower opponents">
                  {OPPONENTS.map((opponent, index) => (
                    <div
                      key={opponent.id}
                      className={
                        'tower-opponent tower-opponent-' + opponent.id +
                        (index === selectedIndex ? ' active' : '') +
                        (index < selectedIndex ? ' cleared' : '')
                      }
                    >
                      <img src={opponent.avatar} alt="" />
                      <div>
                        <span>{index < selectedIndex ? 'CLEARED' : index === selectedIndex ? 'CURRENT FLOOR' : 'LOCKED ABOVE'}</span>
                        <strong>{opponent.name}</strong>
                        <em>{opponent.difficulty} / {opponent.tagline}</em>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="tower-actions">
                  <button type="button" onClick={() => {
                    audioRef.current?.play('menu');
                    setMenuStep('side');
                  }}>Back</button>
                  <button type="button" className="selected" onClick={startCampaign}>ASCEND</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {screen === 'playing' && (
        <div className={'cyber-hud enemy-theme-' + selected.theme}>
          <img src={selected.avatar} alt="" />
          <div>
            <strong>{playerName} vs {selected.name}</strong>
            <span>{thinking ? `${selected.name} (${agentSideName}) is thinking...` : `${gameState.status} / Lives ${lives}`}</span>
          </div>
          <button type="button" onClick={() => {
            audioRef.current?.play('menu');
            resetGame();
          }}>Reset</button>
          <button type="button" onClick={() => {
            audioRef.current?.play('menu');
            openMenu();
          }}>Menu</button>
        </div>
      )}

      {screen === 'result' && resultState && (
        <div className={'result-screen result-screen-' + resultState.kind + ' enemy-theme-' + resultState.opponent.theme}>
          <img
            className="result-portrait"
            src={resultState.kind === 'win' || resultState.kind === 'clear' ? VICTORY_PORTRAIT_SRC : DEFEAT_PORTRAIT_SRC}
            alt=""
          />
          <div className="result-vignette" />
          <div className="result-copy">
            <span className="result-kicker">CYBER CHESS LADDER</span>
            <h1>
              {resultState.kind === 'win' && 'YOU WIN'}
              {resultState.kind === 'clear' && 'LADDER CLEAR'}
              {resultState.kind === 'loss' && 'YOU LOSE'}
              {resultState.kind === 'game-over' && 'GAME OVER'}
            </h1>
            <p>
              {resultState.kind === 'win' && `${playerName} dropped ${resultState.opponent.name}. ${resultState.nextOpponent?.name} steps into the board.`}
              {resultState.kind === 'clear' && `${playerName} beat Razorblade and cleared the Cyber Chess cabinet with ${lives} ${lives === 1 ? 'life' : 'lives'} left.`}
              {resultState.kind === 'loss' && `${resultState.opponent.name} took the round from ${playerName}. Continue before the counter hits zero.`}
              {resultState.kind === 'game-over' && `${resultState.opponent.name} ended ${playerName}'s run. Two lives spent.`}
            </p>
            <div className="result-stats">
              <span>PLAYER: {playerName}</span>
              <span>OPPONENT: {resultState.opponent.name}</span>
              <span>LIVES: {resultState.livesAfter}</span>
              {resultState.kind === 'loss' && <span>CONTINUE: {continueSeconds}</span>}
            </div>
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
                <button type="button" className="result-primary" onClick={advanceAfterWin}>
                  NEXT OPPONENT
                </button>
              )}
              {resultState.kind === 'clear' && (
                <button type="button" className="result-primary" onClick={advanceAfterWin}>
                  RUN IT BACK
                </button>
              )}
              {resultState.kind === 'loss' && (
                <button type="button" className="result-primary" onClick={continueAfterLoss}>
                  CONTINUE
                </button>
              )}
              {resultState.kind === 'game-over' && (
                <button type="button" className="result-primary" onClick={restartCampaign}>
                  NEW RUN
                </button>
              )}
              <button type="button" onClick={openMenu}>MENU</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const el = document.getElementById('root')!;
createRoot(el).render(<App />);
