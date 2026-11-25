import { Chess } from 'chess.js';
import { describe, expect, test } from 'vitest';
import { squareToXZ } from '../board3d/squareUtils';
import {
  START_FEN,
  boardPointToSquare,
  castlingRookTransit,
  enPassantCapturedSquare,
  findCastlingMoveForRookClick,
  legalMoves,
  moveIsCapture,
  perft,
  positionStatus,
  preferredTargetMove,
  queenPromotionForPawn,
  tryMove,
  turnFromFen,
} from './rules';

const PERFT_CASES = [
  { name: 'starting position', fen: START_FEN, depth: 1, nodes: 20 },
  { name: 'starting position', fen: START_FEN, depth: 2, nodes: 400 },
  { name: 'starting position', fen: START_FEN, depth: 3, nodes: 8902 },
  { name: 'starting position', fen: START_FEN, depth: 4, nodes: 197281 },
  {
    name: 'kiwipete',
    fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    depth: 1,
    nodes: 48,
  },
  {
    name: 'kiwipete',
    fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    depth: 2,
    nodes: 2039,
  },
  {
    name: 'kiwipete',
    fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    depth: 3,
    nodes: 97862,
  },
  { name: 'position 3', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', depth: 1, nodes: 14 },
  { name: 'position 3', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', depth: 2, nodes: 191 },
  { name: 'position 3', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', depth: 3, nodes: 2812 },
  { name: 'position 3', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', depth: 4, nodes: 43238 },
  {
    name: 'position 4',
    fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    depth: 1,
    nodes: 6,
  },
  {
    name: 'position 4',
    fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    depth: 2,
    nodes: 264,
  },
  {
    name: 'position 4',
    fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    depth: 3,
    nodes: 9467,
  },
  {
    name: 'position 5',
    fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    depth: 1,
    nodes: 44,
  },
  {
    name: 'position 5',
    fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    depth: 2,
    nodes: 1486,
  },
  {
    name: 'position 5',
    fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    depth: 3,
    nodes: 62379,
  },
  {
    name: 'position 6',
    fen: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
    depth: 1,
    nodes: 46,
  },
  {
    name: 'position 6',
    fen: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
    depth: 2,
    nodes: 2079,
  },
  {
    name: 'position 6',
    fen: 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
    depth: 3,
    nodes: 89890,
  },
];

describe('perft on standard positions', () => {
  test.each(PERFT_CASES)('$name depth $depth = $nodes', ({ fen, depth, nodes }) => {
    expect(perft(fen, depth)).toBe(nodes);
  });
});

describe('chess rules used by the board', () => {
  test('the opening position has the twenty quiet and pawn moves', () => {
    const sans = legalMoves(START_FEN).map((move) => move.san).sort();
    expect(sans).toEqual([
      'Na3', 'Nc3', 'Nf3', 'Nh3',
      'a3', 'a4', 'b3', 'b4', 'c3', 'c4', 'd3', 'd4',
      'e3', 'e4', 'f3', 'f4', 'g3', 'g4', 'h3', 'h4',
    ]);
    expect(tryMove(START_FEN, 'e2', 'e4')?.san).toBe('e4');
    expect(tryMove(START_FEN, 'e2', 'e5')).toBeNull();
    expect(turnFromFen('not a fen')).toBe('w');
  });

  test('rejects moves that leave the king in check', () => {
    const pinned = 'k3r3/8/8/8/8/8/4N3/4K3 w - - 0 1';
    expect(positionStatus(pinned)).toBe('active');
    expect(tryMove(pinned, 'e2', 'd4')).toBeNull();
    expect(tryMove(pinned, 'e2', 'c3')).toBeNull();
    expect(tryMove(pinned, 'e1', 'd1')?.san).toBe('Kd1');
  });

  test('detects checkmate, stalemate, and insufficient material', () => {
    const foolsMate = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
    expect(positionStatus(foolsMate)).toBe('checkmate');
    expect(positionStatus('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toBe('stalemate');
    expect(positionStatus('8/8/8/8/8/8/6k1/6K1 w - - 0 1')).toBe('draw');
  });

  test('castling moves the rook and a rook click selects that castle', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const game = new Chess(fen);
    const moves = legalMoves(fen);
    expect(castlingRookTransit('e1', 'k')).toEqual({ rookFrom: 'h1', rookTo: 'f1' });
    expect(castlingRookTransit('e1', 'q')).toEqual({ rookFrom: 'a1', rookTo: 'd1' });
    expect(castlingRookTransit('e8', 'kq')).toEqual({ rookFrom: 'h8', rookTo: 'f8' });
    expect(findCastlingMoveForRookClick(game, 'e1', moves, 'h1')?.san).toBe('O-O');
    expect(findCastlingMoveForRookClick(game, 'e1', moves, 'a1')?.san).toBe('O-O-O');
    expect(findCastlingMoveForRookClick(game, 'e1', moves, 'e2')).toBeNull();
    expect(tryMove(fen, 'e1', 'g1')?.flags).toContain('k');
  });

  test('en passant captures the pawn beside the landing square', () => {
    const game = new Chess();
    game.move('e4');
    game.move('a6');
    game.move('e5');
    game.move('d5');
    const ep = legalMoves(game.fen()).find((move) => move.flags.includes('e'));
    expect(ep).toMatchObject({ from: 'e5', to: 'd6', captured: 'p' });
    expect(enPassantCapturedSquare('e5', 'd6', ep?.flags ?? '')).toBe('d5');
    expect(moveIsCapture({ flags: 'e', captured: 'p' })).toBe(true);
    expect(moveIsCapture({ flags: 'n' })).toBe(false);
  });

  test('pawn promotion defaults to a queen and every promotion is legal', () => {
    const fen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
    const promotions = legalMoves(fen).filter((move) => move.from === 'a7' && move.to === 'a8');
    expect(promotions.map((move) => move.promotion).sort()).toEqual(['b', 'n', 'q', 'r']);
    expect(queenPromotionForPawn('p', 'a8')).toBe('q');
    expect(queenPromotionForPawn('p', 'a8', 'n')).toBe('n');
    expect(queenPromotionForPawn('n', 'a8')).toBeUndefined();
    expect(preferredTargetMove(promotions, 'a8')?.promotion).toBe('q');
    expect(tryMove(fen, 'a7', 'a8', 'n')?.san).toBe('a8=N');
  });

  test('board picks map back onto algebraic squares', () => {
    for (const square of ['a1', 'h1', 'a8', 'h8', 'e4', 'd5']) {
      const { x, z } = squareToXZ(square);
      expect(boardPointToSquare(x, z)).toBe(square);
    }
    expect(boardPointToSquare(10, 0)).toBeNull();
    expect(boardPointToSquare(-0.01, -3.5)).toBe('d1');
  });
});
