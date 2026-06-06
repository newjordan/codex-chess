import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import type { Board3DGameState, Board3DHandle } from './board3d/types';

const PIECES: Record<string, string> = {
  wp: 'P',
  wn: 'N',
  wb: 'B',
  wr: 'R',
  wq: 'Q',
  wk: 'K',
  bp: 'p',
  bn: 'n',
  bb: 'b',
  br: 'r',
  bq: 'q',
  bk: 'k',
};

function statusFor(game: Chess) {
  if (game.isCheckmate()) return `${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`;
  if (game.isStalemate()) return 'Draw by stalemate';
  if (game.isDraw()) return 'Draw';
  const side = game.turn() === 'w' ? 'White' : 'Black';
  return game.isCheck() ? `${side} to move - check` : `${side} to move`;
}

interface Board2DFallbackProps {
  initialFen: string;
  playerColor?: 'w' | 'b';
  inputEnabled?: boolean;
  onGameStateChange?: (state: Board3DGameState) => void;
  onMoveStart?: (isCapture: boolean) => void;
  reason?: string;
}

export const Board2DFallback = forwardRef<Board3DHandle, Board2DFallbackProps>(
  ({ initialFen, playerColor = 'w', inputEnabled = true, onGameStateChange, onMoveStart, reason }, ref) => {
    const [fen, setFen] = useState(initialFen);
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [flashSquare, setFlashSquare] = useState<string | null>(null);
    const game = useMemo(() => new Chess(fen), [fen]);
    const ranks = playerColor === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = playerColor === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    const legalMoves = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : [];
    const legalTargets = new Set(legalMoves.map((move) => move.to));

    const emit = (nextGame: Chess, nextSelected: Square | null) => {
      onGameStateChange?.({
        status: statusFor(nextGame),
        fen: nextGame.fen(),
        selectedSquare: nextSelected,
      });
    };

    const commitMove = (from: Square, to: Square, promotion = 'q') => {
      const nextGame = new Chess(fen);
      const move = nextGame.move({ from, to, promotion });
      if (!move) return false;
      onMoveStart?.(Boolean(move.captured) || move.flags.includes('c') || move.flags.includes('e'));
      setFen(nextGame.fen());
      setSelectedSquare(null);
      setFlashSquare(to);
      window.setTimeout(() => setFlashSquare((current) => current === to ? null : current), 260);
      emit(nextGame, null);
      return true;
    };

    useImperativeHandle(ref, () => ({
      applyMove(from, to, _isCapture, _flags, promotion) {
        commitMove(from as Square, to as Square, promotion ?? 'q');
      },
      resetToPosition(nextFen) {
        const nextGame = new Chess(nextFen);
        setFen(nextGame.fen());
        setSelectedSquare(null);
        emit(nextGame, null);
      },
      highlightSquare(square) {
        setSelectedSquare(square as Square | null);
      },
      flashSquare(square) {
        setFlashSquare(square);
        window.setTimeout(() => setFlashSquare((current) => current === square ? null : current), 260);
      },
    }));

    const selectSquare = (square: Square) => {
      if (!inputEnabled) return;
      if (selectedSquare && legalTargets.has(square)) {
        commitMove(selectedSquare, square);
        return;
      }

      const piece = game.get(square);
      if (!piece || piece.color !== game.turn()) {
        setSelectedSquare(null);
        emit(game, null);
        return;
      }

      setSelectedSquare(square);
      emit(game, square);
    };

    return (
      <div className="board2d-shell" data-reason={reason ?? 'webgl-unavailable'}>
        <div className="board2d-status">
          <strong>2D BOARD</strong>
          <span>{statusFor(game)}</span>
        </div>
        <div className="board2d-grid" role="grid" aria-label="Cyber Chess fallback board">
          {ranks.flatMap((rank) => files.map((file) => {
            const square = `${file}${rank}` as Square;
            const piece = game.get(square);
            const selected = selectedSquare === square;
            const legal = legalTargets.has(square);
            const dark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 1;

            return (
              <button
                key={square}
                type="button"
                className={[
                  'board2d-square',
                  dark ? 'board2d-dark' : 'board2d-light',
                  selected ? 'is-selected' : '',
                  legal ? 'is-legal' : '',
                  flashSquare === square ? 'is-flashing' : '',
                ].filter(Boolean).join(' ')}
                aria-label={`${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
                onClick={() => selectSquare(square)}
              >
                <span>{piece ? PIECES[`${piece.color}${piece.type}`] : ''}</span>
              </button>
            );
          }))}
        </div>
      </div>
    );
  }
);

Board2DFallback.displayName = 'Board2DFallback';
