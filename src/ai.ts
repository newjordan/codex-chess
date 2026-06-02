import { Chess } from 'chess.js';

export type AiProfileId = 'goop' | 'frostd4d' | 'razorblade' | 'gordo';
export type PlayerColor = 'w' | 'b';

export type AiMove = {
  from: string;
  to: string;
  flags: string;
  san: string;
  piece: string;
  color: 'w' | 'b';
  captured?: string;
  promotion?: string;
};

const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

function legalMoves(game: Chess): AiMove[] {
  return game.moves({ verbose: true }) as AiMove[];
}

function sample<T>(items: T[]): T | null {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function materialScore(game: Chess, perspective: PlayerColor): number {
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUE[piece.type] ?? 0;
      score += piece.color === perspective ? value : -value;
    }
  }
  return score;
}

function moveScore(game: Chess, move: AiMove, perspective: PlayerColor, depthBonus = 0): number {
  let score = 0;
  if (move.captured) score += (PIECE_VALUE[move.captured] ?? 0) + 8;
  if (move.promotion) score += PIECE_VALUE[move.promotion] ?? 700;
  if (move.flags.includes('k') || move.flags.includes('q')) score += 18;

  const clone = new Chess(game.fen());
  clone.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
  if (clone.isCheckmate()) score += 100000;
  else if (clone.isCheck()) score += 55;
  score += materialScore(clone, perspective) * depthBonus;
  return score;
}

function chooseEasy(game: Chess): AiMove | null {
  const moves = legalMoves(game);
  const captures = moves.filter((move) => move.captured);
  if (captures.length && Math.random() < 0.35) return sample(captures);
  return sample(moves);
}

function chooseMedium(game: Chess, perspective: PlayerColor): AiMove | null {
  const moves = legalMoves(game);
  if (!moves.length) return null;
  const scored = moves
    .map((move) => ({ move, score: moveScore(game, move, perspective, 0.02) + Math.random() * 36 }))
    .sort((a, b) => b.score - a.score);
  const pool = scored.slice(0, Math.min(3, scored.length));
  return sample(pool.map((entry) => entry.move));
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, perspective: PlayerColor): number {
  if (game.isCheckmate()) return game.turn() === perspective ? -100000 : 100000;
  if (game.isDraw() || game.isStalemate() || depth === 0) return materialScore(game, perspective);

  const maximizing = game.turn() === perspective;
  const moves = legalMoves(game)
    .map((move) => ({ move, score: moveScore(game, move, perspective, 0) }))
    .sort((a, b) => maximizing ? b.score - a.score : a.score - b.score)
    .map((entry) => entry.move);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, perspective));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    best = Math.min(best, minimax(game, depth - 1, alpha, beta, perspective));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function chooseHard(game: Chess, perspective: PlayerColor): AiMove | null {
  const moves = legalMoves(game);
  if (!moves.length) return null;
  let bestScore = -Infinity;
  const bestMoves: AiMove[] = [];

  for (const move of moves) {
    game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    const score = minimax(game, 2, -Infinity, Infinity, perspective);
    game.undo();
    const total = score + moveScore(game, move, perspective, 0) * 0.1 + Math.random() * 8;
    if (total > bestScore + 0.001) {
      bestScore = total;
      bestMoves.length = 0;
      bestMoves.push(move);
    } else if (Math.abs(total - bestScore) <= 0.001) {
      bestMoves.push(move);
    }
  }

  return sample(bestMoves);
}

function moveFromUci(game: Chess, uci: string): AiMove | null {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(uci)) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci[4]?.toLowerCase();
  return legalMoves(game).find((move) => {
    if (move.from !== from || move.to !== to) return false;
    return !promotion || move.promotion === promotion;
  }) ?? null;
}

function chooseLozza(fen: string, aiColor: PlayerColor): Promise<AiMove | null> {
  const game = new Chess(fen);
  if (game.isGameOver() || game.turn() !== aiColor) return Promise.resolve(null);
  const fallback = () => chooseHard(new Chess(fen), aiColor);

  if (typeof Worker === 'undefined') return Promise.resolve(fallback());

  return new Promise((resolve) => {
    let worker: Worker | null = null;
    let settled = false;

    const finish = (move: AiMove | null) => {
      if (settled) return;
      settled = true;
      if (worker) worker.terminate();
      resolve(move ?? fallback());
    };

    try {
      worker = new Worker('media/engines/lozza.js');
      worker.onmessage = (event: MessageEvent<string>) => {
        const line = String(event.data).trim();
        const match = /^bestmove\s+(\S+)/i.exec(line);
        if (match) finish(moveFromUci(game, match[1]));
      };
      worker.onerror = () => finish(null);
      worker.postMessage('uci');
      worker.postMessage('isready');
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage('go depth 5');
      window.setTimeout(() => finish(null), 5000);
    } catch (_) {
      finish(null);
    }
  });
}

export async function chooseAiMove(fen: string, profile: AiProfileId, aiColor: PlayerColor = 'b'): Promise<AiMove | null> {
  const game = new Chess(fen);
  if (game.isGameOver() || game.turn() !== aiColor) return null;
  if (profile === 'goop') return chooseEasy(game);
  if (profile === 'frostd4d') return chooseMedium(game, aiColor);
  if (profile === 'gordo') return chooseLozza(fen, aiColor);
  return chooseHard(game, aiColor);
}
