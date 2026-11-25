import { Chess } from 'chess.js';
import type { AiProfileId, PlayerColor } from './ai';

export const MAX_LIVES = 2;
export const CONTINUE_SECONDS = 10;
export const MAX_LEADERBOARD = 8;

export type CampaignOpponent = {
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
};

export const OPPONENTS: CampaignOpponent[] = [
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
    avatar: 'media/avatars/gordo-standard.jpg',
    avatarStates: {
      damaged: 'media/avatars/gordo-damaged.jpg',
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

export const INTRO_STORY = [
  {
    image: 'media/intro/01-pre-computation.jpg',
    kicker: 'PRE-COMPUTATION',
    title: 'THE PLAYER',
    body: 'Before the board was neon, the greatest chess mind alive hunted a rumor in the machine: the Shannon Prime.',
  },
  {
    image: 'media/intro/flower_delve_wide.png',
    kicker: 'THE DELVE',
    title: 'TOO DEEP',
    body: 'The ultimate maneuver was right at the keyboard when warnings lights began to blare. Delving too deep, the primes stirred, aware of the inevitability.\n\nClaxons climaxed into shreaking alarms as the screens flashed incoming... The Shannon knights are breaching through the flux plasma calculators.',
  },
  {
    image: 'media/intro/02-shannon-knights-kidnap.jpg',
    kicker: 'THE SHANNON KNIGHTS',
    title: 'THE BREACH',
    body: 'Oh crimes! The lab breached, his family kidnapped, {playerName} must find a way to become more than meat, he must become the ultimeat challenger to the Shannon knights. There was only one way...',
  },
  {
    image: 'media/intro/02-consciousness-floppies.jpg',
    kicker: '42 DISKS',
    title: 'THE TRANSFER',
    body: 'He knew the only device that can hold the soft flesh of the human brain, was the floppy disc. He began the preparation, to start the initiation of the first transfer boot up sequence.',
  },
  {
    image: 'media/intro/03-floppy-tower.jpg',
    kicker: 'FLOPPY TOWER ONLINE',
    title: 'THE ASCENT',
    body: 'SUCCESS! all 42 discs held the matrix of his conscious as defined by historical books, and psychology manuals from the 90s, he was able to discern what a "conscious" was and then put it on the floppy discs. He had found it. and the Ascent had begun. His conscious radically transferred to the digital realm.',
  },
  {
    image: 'media/intro/04-shannon-knights-tower-chase.jpg',
    kicker: 'CYBERSPACE',
    title: 'THE CHASE',
    body: 'Now he rides the grid to save his family, defeat the Shannon Knights, and seize the impossible prime at the center of chess.',
  },
] as const;

export type ResultKind = 'win' | 'loss' | 'game-over' | 'clear';

export type ResultState = {
  kind: ResultKind;
  opponent: CampaignOpponent;
  nextOpponent?: CampaignOpponent;
  livesAfter: number;
};

export type LeaderboardEntry = {
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

export type ScreenState = 'intro' | 'loading' | 'playing' | 'result';
export type MenuStep = 'video' | 'story' | 'profile' | 'side' | 'opponent';

export type SaveGameState = {
  version: 1;
  savedAt: string;
  screen: ScreenState;
  menuStep: MenuStep;
  storyIndex: number;
  selectedId: AiProfileId;
  playerColor: PlayerColor;
  playerName: string;
  lives: number;
  continueSeconds: number;
  fen: string;
  resultState: {
    kind: ResultKind;
    opponentId: AiProfileId;
    nextOpponentId?: AiProfileId;
    livesAfter: number;
  } | null;
  runStartedAt: number;
};

const RESULT_LINES: Record<AiProfileId, {
  winTitle: string;
  winBody: (playerName: string, nextOpponent?: CampaignOpponent) => string;
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

export function getOpponentById(id: AiProfileId | undefined) {
  return OPPONENTS.find((opponent) => opponent.id === id) ?? OPPONENTS[0];
}

export function nextCampaignOpponent(id: AiProfileId) {
  const index = OPPONENTS.findIndex((opponent) => opponent.id === id);
  return OPPONENTS[index + 1];
}

export function sanitizePlayerName(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  const safe = compact.replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 14).trim();
  return safe || 'PLAYER 1';
}

export function isGordoDebugName(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase();
  return normalized === 'gordo' || normalized === 'chris p butthole';
}

export function classifyMatch(input: {
  fen: string;
  playerColor: PlayerColor;
  lives: number;
  opponent: CampaignOpponent;
  nextOpponent?: CampaignOpponent;
}): ResultState | null {
  const game = new Chess(input.fen);
  if (!game.isGameOver()) return null;

  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'b' : 'w';
    if (winner === input.playerColor) {
      return {
        kind: input.nextOpponent ? 'win' : 'clear',
        opponent: input.opponent,
        nextOpponent: input.nextOpponent,
        livesAfter: input.lives,
      };
    }

    const livesAfter = Math.max(0, input.lives - 1);
    return {
      kind: livesAfter > 0 ? 'loss' : 'game-over',
      opponent: input.opponent,
      livesAfter,
    };
  }

  const livesAfter = Math.max(0, input.lives - 1);
  return {
    kind: livesAfter > 0 ? 'loss' : 'game-over',
    opponent: input.opponent,
    livesAfter,
  };
}

export function forcedWinResult(opponent: CampaignOpponent, nextOpponent: CampaignOpponent | undefined, lives: number): ResultState {
  return {
    kind: nextOpponent ? 'win' : 'clear',
    opponent,
    nextOpponent,
    livesAfter: lives,
  };
}

export function forcedLossResult(opponent: CampaignOpponent, lives: number): ResultState {
  const livesAfter = Math.max(0, lives - 1);
  return {
    kind: livesAfter > 0 ? 'loss' : 'game-over',
    opponent,
    livesAfter,
  };
}

export function continueExpired(kind: ResultKind, seconds: number) {
  return kind === 'loss' && seconds <= 0;
}

export function decrementContinueSeconds(seconds: number) {
  return Math.max(0, seconds - 1);
}

export function expireContinueResult(result: ResultState): ResultState {
  return { ...result, kind: 'game-over', livesAfter: 0 };
}

export function createLeaderboardEntry(input: {
  id: string;
  name: string;
  kind: 'clear' | 'game-over';
  opponentName: string;
  livesAfter: number;
  seconds: number;
  opponentIndex: number;
  opponentCount: number;
  completedAt: string;
}): LeaderboardEntry {
  const seconds = Math.max(1, input.seconds);
  const wins = input.kind === 'clear' ? input.opponentCount : Math.max(0, input.opponentIndex);
  const speedBonus = input.kind === 'clear' ? Math.max(0, 900 - seconds) : 0;
  const score = wins * 1000 + input.livesAfter * 250 + speedBonus;
  return {
    id: input.id,
    name: input.name,
    score,
    outcome: input.kind,
    opponent: input.opponentName,
    wins,
    lives: input.livesAfter,
    seconds,
    completedAt: input.completedAt,
  };
}

export function mergeLeaderboard(entries: LeaderboardEntry[], entry: LeaderboardEntry, max = MAX_LEADERBOARD) {
  return [...entries, entry]
    .sort((a, b) => b.score - a.score || a.seconds - b.seconds)
    .slice(0, max);
}

export function nextStoryAction(index: number, length = INTRO_STORY.length) {
  if (index >= length - 1) return { index, finished: true as const };
  return { index: Math.min(length - 1, index + 1), finished: false as const };
}

export function previousStoryAction(index: number) {
  if (index <= 0) return { index: 0, backToProfile: true as const };
  return { index: index - 1, backToProfile: false as const };
}

export function getResultBackdrop(result: ResultState) {
  if (result.kind === 'clear') return FINAL_CLEAR_BACKDROP_SRC;
  const set = RESULT_BACKDROPS[result.opponent.id];
  if (result.kind === 'win') return set.win;
  if (result.kind === 'loss') return set.loss;
  return set.gameOver;
}

export function getResultPresentation(result: ResultState, playerName: string) {
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

export function getFightHudState(fen: string, playerColor: PlayerColor, aiColor: PlayerColor) {
  const playerAdvantage = (playerColor === 'w' ? 1 : -1) * getWhiteMaterialScore(fen);
  let playerInCheck = false;
  let enemyInCheck = false;
  try {
    const game = new Chess(fen);
    if (game.isCheck()) {
      playerInCheck = game.turn() === playerColor;
      enemyInCheck = game.turn() === aiColor;
    }
  } catch {
    // Invalid positions keep the material readout and skip check pressure.
  }

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

export type NormalizedCampaignSave = {
  screen: ScreenState;
  menuStep: MenuStep;
  storyIndex: number;
  selectedId: AiProfileId;
  playerColor: PlayerColor;
  playerName: string;
  lives: number;
  continueSeconds: number;
  fen: string;
  resultState: ResultState | null;
  runStartedAt: number;
  opponent: CampaignOpponent;
};

const SCREENS: ScreenState[] = ['intro', 'loading', 'playing', 'result'];
const MENU_STEPS: MenuStep[] = ['video', 'story', 'profile', 'side', 'opponent'];

function restoreResultState(saved: SaveGameState['resultState']): ResultState | null {
  if (!saved) return null;
  return {
    kind: saved.kind,
    opponent: getOpponentById(saved.opponentId),
    nextOpponent: saved.nextOpponentId ? getOpponentById(saved.nextOpponentId) : undefined,
    livesAfter: saved.livesAfter,
  };
}

export function inspectCampaignSave(
  raw: unknown,
  storyLength = INTRO_STORY.length,
  fallbackName = 'PLAYER 1',
): { ok: true; save: NormalizedCampaignSave } | { ok: false; reason: 'missing' | 'invalid-fen' } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'missing' };
  const parsed = raw as Partial<SaveGameState>;
  if (parsed.version !== 1 || typeof parsed.fen !== 'string') return { ok: false, reason: 'missing' };
  try {
    new Chess(parsed.fen);
  } catch {
    return { ok: false, reason: 'invalid-fen' };
  }

  const opponent = getOpponentById(parsed.selectedId);
  const nextScreen: ScreenState = SCREENS.includes(parsed.screen as ScreenState) ? parsed.screen as ScreenState : 'playing';
  const screen: ScreenState = nextScreen === 'result' && !parsed.resultState ? 'playing' : nextScreen;
  const menuStep: MenuStep = MENU_STEPS.includes(parsed.menuStep as MenuStep) ? parsed.menuStep as MenuStep : 'opponent';
  const playerColor: PlayerColor = parsed.playerColor === 'b' ? 'b' : 'w';

  return {
    ok: true,
    save: {
      screen,
      menuStep,
      storyIndex: Math.max(0, Math.min(storyLength - 1, Number(parsed.storyIndex ?? 0))),
      selectedId: opponent.id,
      playerColor,
      playerName: sanitizePlayerName(String(parsed.playerName || fallbackName)),
      lives: Math.max(0, Math.min(MAX_LIVES, Number(parsed.lives ?? MAX_LIVES))),
      continueSeconds: Math.max(0, Math.min(CONTINUE_SECONDS, Number(parsed.continueSeconds ?? CONTINUE_SECONDS))),
      fen: parsed.fen,
      resultState: restoreResultState(parsed.resultState ?? null),
      runStartedAt: Number(parsed.runStartedAt) || 0,
      opponent,
    },
  };
}
