import { Chess, type Move } from 'chess.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type RulesMove = {
  from: string;
  to: string;
  flags: string;
  san: string;
  piece: string;
  color: 'w' | 'b';
  captured?: string;
  promotion?: string;
};

export type PositionStatus = 'checkmate' | 'stalemate' | 'draw' | 'check' | 'active' | 'invalid';

export function turnFromFen(fen: string): 'w' | 'b' {
  try {
    return new Chess(fen).turn();
  } catch {
    return 'w';
  }
}

export function positionStatus(fen: string): PositionStatus {
  try {
    const game = new Chess(fen);
    if (game.isCheckmate()) return 'checkmate';
    if (game.isStalemate()) return 'stalemate';
    if (game.isDraw()) return 'draw';
    if (game.isCheck()) return 'check';
    return 'active';
  } catch {
    return 'invalid';
  }
}

export function legalMoves(fen: string): RulesMove[] {
  return new Chess(fen).moves({ verbose: true }) as RulesMove[];
}

export function tryMove(fen: string, from: string, to: string, promotion?: string) {
  const game = new Chess(fen);
  try {
    const move = game.move({ from, to, promotion: promotion as Move['promotion'] });
    if (!move) return null;
    return {
      fen: game.fen(),
      san: move.san,
      flags: move.flags,
      captured: move.captured,
      promotion: move.promotion,
    };
  } catch {
    return null;
  }
}

export function perft(fen: string, depth: number): number {
  if (depth < 0) throw new Error('perft depth must be >= 0');
  const game = new Chess(fen);
  return perftGame(game, depth);
}

function perftGame(game: Chess, depth: number): number {
  const moves = game.moves({ verbose: true });
  if (depth === 0) return 1;
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) {
    game.move(move);
    nodes += perftGame(game, depth - 1);
    game.undo();
  }
  return nodes;
}

export function moveIsCapture(move: { captured?: string; flags: string }): boolean {
  return Boolean(move.captured) || move.flags.includes('c') || move.flags.includes('e');
}

export function queenPromotionForPawn(piece: string, to: string, promotion?: string): string | undefined {
  return promotion ?? (piece === 'p' && (to[1] === '1' || to[1] === '8') ? 'q' : undefined);
}

export function preferredTargetMove<T extends { to: string; promotion?: string }>(moves: T[], square: string): T | null {
  const targetMoves = moves.filter((move) => move.to === square);
  return targetMoves.find((move) => move.promotion === 'q') ?? targetMoves[0] ?? null;
}

export function castlingRookTransit(from: string, flags: string): { rookFrom: string; rookTo: string } | null {
  if (!flags.includes('k') && !flags.includes('q')) return null;
  const rank = from[1];
  const kingside = flags.includes('k');
  return {
    rookFrom: (kingside ? 'h' : 'a') + rank,
    rookTo: (kingside ? 'f' : 'd') + rank,
  };
}

export function enPassantCapturedSquare(from: string, to: string, flags: string): string | null {
  if (!flags.includes('e')) return null;
  return to[0] + from[1];
}

export function findCastlingMoveForRookClick(
  game: Chess,
  selectedSquare: string | null,
  selectedMoves: RulesMove[],
  square: string,
): RulesMove | null {
  if (!selectedSquare) return null;

  const selectedPiece = game.get(selectedSquare as Move['from']);
  const clickedPiece = game.get(square as Move['from']);
  if (
    selectedPiece?.type !== 'k' ||
    !clickedPiece ||
    clickedPiece.type !== 'r' ||
    clickedPiece.color !== selectedPiece.color ||
    selectedPiece.color !== game.turn() ||
    selectedSquare[1] !== square[1]
  ) {
    return null;
  }

  const castleFlag = square[0] > selectedSquare[0] ? 'k' : 'q';
  return selectedMoves.find((move) => move.from === selectedSquare && move.flags.includes(castleFlag)) ?? null;
}

export function boardPointToSquare(x: number, z: number): string | null {
  const file = Math.floor(x + 4);
  const rankIndex = Math.floor(z + 4);
  if (file < 0 || file > 7 || rankIndex < 0 || rankIndex > 7) return null;
  return `${String.fromCharCode(97 + file)}${rankIndex + 1}`;
}
