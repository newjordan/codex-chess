import { describe, expect, test } from 'vitest';
import { START_FEN } from './chess/rules';
import {
  CONTINUE_SECONDS,
  INTRO_STORY,
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
  nextCampaignOpponent,
  nextStoryAction,
  previousStoryAction,
  sanitizePlayerName,
} from './campaign';

const FOOLS_MATE = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';

describe('campaign tower', () => {
  test('climbs Goop, Frostd4d, Razorblade, then GORDO', () => {
    expect(OPPONENTS.map((opponent) => opponent.id)).toEqual(['goop', 'frostd4d', 'razorblade', 'gordo']);
    expect(OPPONENTS.map((opponent) => opponent.difficulty)).toEqual(['EASY', 'MED', 'HARD', 'FINAL']);
    expect(nextCampaignOpponent('goop')?.id).toBe('frostd4d');
    expect(nextCampaignOpponent('razorblade')?.name).toBe('GORDO');
    expect(nextCampaignOpponent('gordo')).toBeUndefined();
    expect(getOpponentById(undefined).id).toBe('goop');
    expect(MAX_LIVES).toBe(2);
    expect(CONTINUE_SECONDS).toBe(10);
  });

  test('a checkmate win advances, and only GORDO clears the cabinet', () => {
    const goop = classifyMatch({
      fen: FOOLS_MATE,
      playerColor: 'b',
      lives: 2,
      opponent: OPPONENTS[0],
      nextOpponent: OPPONENTS[1],
    });
    expect(goop).toMatchObject({ kind: 'win', livesAfter: 2, nextOpponent: { id: 'frostd4d' } });
    expect(getResultPresentation(goop!, 'CODXACE').title).toBe('GOOP CONTAINED');
    expect(getResultBackdrop(goop!)).toBe('media/results/goop-win.jpg');

    const clear = classifyMatch({
      fen: FOOLS_MATE,
      playerColor: 'b',
      lives: 1,
      opponent: OPPONENTS[3],
    });
    expect(clear?.kind).toBe('clear');
    expect(getResultPresentation(clear!, 'CODXACE').title).toBe('THANKS FOR PLAYING');
    expect(getResultBackdrop(clear!)).toContain('final-clear-family-reunion.jpg');
  });

  test('checkmate and drawn games spend a life, and the last life ends the run', () => {
    const loss = classifyMatch({
      fen: FOOLS_MATE,
      playerColor: 'w',
      lives: 2,
      opponent: OPPONENTS[0],
      nextOpponent: OPPONENTS[1],
    });
    expect(loss).toMatchObject({ kind: 'loss', livesAfter: 1 });
    expect(getResultPresentation(loss!, 'CODXACE').title).toBe('GOOP CLOGGED THE BOARD');

    const drawn = classifyMatch({
      fen: STALEMATE,
      playerColor: 'w',
      lives: 2,
      opponent: OPPONENTS[1],
      nextOpponent: OPPONENTS[2],
    });
    expect(drawn).toMatchObject({ kind: 'loss', livesAfter: 1 });

    const over = classifyMatch({
      fen: FOOLS_MATE,
      playerColor: 'w',
      lives: 1,
      opponent: OPPONENTS[3],
    });
    expect(over).toMatchObject({ kind: 'game-over', livesAfter: 0 });
    expect(getResultPresentation(over!, 'CODXACE').title).toBe('CORE LOCKED');
    expect(classifyMatch({
      fen: START_FEN,
      playerColor: 'w',
      lives: 2,
      opponent: OPPONENTS[0],
      nextOpponent: OPPONENTS[1],
    })).toBeNull();
  });

  test('the continue timer turns a loss into game over at zero', () => {
    const loss = forcedLossResult(OPPONENTS[0], 2);
    expect(loss).toMatchObject({ kind: 'loss', livesAfter: 1 });
    expect(forcedLossResult(OPPONENTS[2], 1).kind).toBe('game-over');
    expect(decrementContinueSeconds(10)).toBe(9);
    expect(decrementContinueSeconds(0)).toBe(0);
    expect(continueExpired('loss', 0)).toBe(true);
    expect(continueExpired('loss', 3)).toBe(false);
    expect(continueExpired('win', 0)).toBe(false);
    expect(expireContinueResult(loss)).toMatchObject({ kind: 'game-over', livesAfter: 0 });
    expect(forcedWinResult(OPPONENTS[3], undefined, 2).kind).toBe('clear');
  });

  test('scores a clear faster than a game over and keeps eight scores', () => {
    const clear = createLeaderboardEntry({
      id: 'clear',
      name: 'CODXACE',
      kind: 'clear',
      opponentName: 'GORDO',
      livesAfter: 2,
      seconds: 100,
      opponentIndex: 3,
      opponentCount: OPPONENTS.length,
      completedAt: '2026-11-25T00:00:00.000Z',
    });
    expect(clear).toMatchObject({ wins: 4, score: 5300, seconds: 100, outcome: 'clear' });

    const earlyLoss = createLeaderboardEntry({
      id: 'loss',
      name: 'PIXEL',
      kind: 'game-over',
      opponentName: 'Goop',
      livesAfter: 0,
      seconds: 40,
      opponentIndex: 0,
      opponentCount: OPPONENTS.length,
      completedAt: '2026-11-25T00:00:00.000Z',
    });
    expect(earlyLoss).toMatchObject({ wins: 0, score: 0 });

    const tiedFaster = { ...earlyLoss, id: 'fast', seconds: 12, score: 5300 };
    const ranked = mergeLeaderboard([earlyLoss], clear);
    expect(ranked.map((entry) => entry.id)).toEqual(['clear', 'loss']);
    expect(mergeLeaderboard([clear], tiedFaster).map((entry) => entry.id)).toEqual(['fast', 'clear']);

    const overflow = Array.from({ length: 8 }, (_, index) => ({
      ...earlyLoss,
      id: `row-${index}`,
      score: index,
    }));
    expect(mergeLeaderboard(overflow, clear)).toHaveLength(8);
    expect(mergeLeaderboard(overflow, clear)[0].id).toBe('clear');
  });

  test('sanitizes fighter names and recognizes the GORDO debug names', () => {
    expect(sanitizePlayerName('  frost   ace!! ')).toBe('frost ace');
    expect(sanitizePlayerName('***')).toBe('PLAYER 1');
    expect(sanitizePlayerName('ABCDEFGHIJKLMNOPQRSTUV')).toBe('ABCDEFGHIJKLMN');
    expect(isGordoDebugName('  GORDO ')).toBe(true);
    expect(isGordoDebugName('Chris P Butthole')).toBe(true);
    expect(isGordoDebugName('gordo!')).toBe(false);
  });

  test('story beats advance and retreat without leaving the reel', () => {
    expect(INTRO_STORY.map((beat) => beat.title)).toEqual([
      'THE PLAYER',
      'TOO DEEP',
      'THE BREACH',
      'THE TRANSFER',
      'THE ASCENT',
      'THE CHASE',
    ]);
    expect(previousStoryAction(0)).toEqual({ index: 0, backToProfile: true });
    expect(nextStoryAction(1)).toEqual({ index: 2, finished: false });
    expect(nextStoryAction(INTRO_STORY.length - 1).finished).toBe(true);
  });

  test('fight HUD health follows piece counts and check', () => {
    expect(getFightHudState(START_FEN, 'w', 'b')).toMatchObject({
      playerHealth: 100,
      enemyHealth: 100,
      pressure: 'EVEN FIGHT',
      playerMood: 'normal',
      enemyMood: 'neutral',
    });
    const downAQueen = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const hud = getFightHudState(downAQueen, 'w', 'b');
    expect(hud.playerAdvantage).toBeGreaterThan(0);
    expect(hud.enemyHealth).toBeLessThan(100);
    expect(hud.pressure).toBe('ADVANTAGE');
    expect(getFightHudState(FOOLS_MATE, 'w', 'b').pressure).toBe('CHECK DANGER');
  });

  test('save inspection keeps legal floors and rejects a broken cartridge', () => {
    expect(inspectCampaignSave(null).reason).toBe('missing');
    expect(inspectCampaignSave({ version: 1 }).reason).toBe('missing');
    expect(inspectCampaignSave({ version: 1, fen: 'nope' }).reason).toBe('invalid-fen');

    const inspected = inspectCampaignSave({
      version: 1,
      fen: START_FEN,
      screen: 'result',
      menuStep: 'nope',
      storyIndex: 99,
      selectedId: 'razorblade',
      playerColor: 'b',
      playerName: '  ace!!playername  ',
      lives: 9,
      continueSeconds: -4,
      resultState: null,
      runStartedAt: 0,
    }, INTRO_STORY.length, 'PLAYER 1');
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    expect(inspected.save).toMatchObject({
      screen: 'playing',
      menuStep: 'opponent',
      storyIndex: INTRO_STORY.length - 1,
      selectedId: 'razorblade',
      playerColor: 'b',
      playerName: 'aceplayername',
      lives: 2,
      continueSeconds: 0,
      resultState: null,
      runStartedAt: 0,
    });

    const restored = inspectCampaignSave({
      version: 1,
      fen: START_FEN,
      screen: 'playing',
      selectedId: 'gordo',
      lives: 1,
      resultState: {
        kind: 'loss',
        opponentId: 'gordo',
        livesAfter: 1,
      },
    });
    expect(restored.ok && restored.save.resultState).toMatchObject({
      kind: 'loss',
      livesAfter: 1,
      opponent: { id: 'gordo' },
    });
  });
});
