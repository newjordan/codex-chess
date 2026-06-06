'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Board3DEnemyTheme, Board3DGameState, Board3DHandle } from './board3d/types';
import { useBoard3D } from './board3d/useBoard3D';
import { Board2DFallback } from './Board2DFallback';

interface Board3DSceneProps {
  whiteName?: string;
  blackName?: string;
  inputEnabled?: boolean;
  enemyTheme?: Board3DEnemyTheme;
  playerColor?: 'w' | 'b';
  super90sEnabled?: boolean;
  onGameStateChange?: (state: Board3DGameState) => void;
  onMoveStart?: (isCapture: boolean) => void;
}

function getWebGLBlockReason() {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  try {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    return gl ? '' : 'webgl-unavailable';
  } catch (error) {
    return error instanceof Error ? error.message : 'webgl-context-failed';
  }
}

export const Board3DScene = forwardRef<Board3DHandle, Board3DSceneProps>(
  ({ whiteName = 'White AI', blackName = 'Black AI', inputEnabled = true, enemyTheme = 'goop', playerColor = 'w', super90sEnabled = false, onGameStateChange, onMoveStart }, ref) => {
    const webglBlockReason = useMemo(() => getWebGLBlockReason(), []);
    const [setupError, setSetupError] = useState('');
    const fallbackReason = setupError || webglBlockReason;
    const fallbackRef = useRef<Board3DHandle>(null);
    const { canvasRef, handleRef } = useBoard3D(whiteName, blackName, onGameStateChange, inputEnabled, enemyTheme, playerColor, onMoveStart, super90sEnabled, setSetupError);

    useImperativeHandle(ref, () => ({
      applyMove: (...args) => (fallbackReason ? fallbackRef.current : handleRef.current)?.applyMove(...args),
      resetToPosition: (fen) => (fallbackReason ? fallbackRef.current : handleRef.current)?.resetToPosition(fen),
      highlightSquare: (sq) => (fallbackReason ? fallbackRef.current : handleRef.current)?.highlightSquare(sq),
      flashSquare: (sq) => (fallbackReason ? fallbackRef.current : handleRef.current)?.flashSquare(sq),
    }), [fallbackReason]);

    if (fallbackReason) {
      window.__chess.renderMode = '2d-fallback';
      window.__chess.renderFallbackReason = fallbackReason;
      return (
        <Board2DFallback
          ref={fallbackRef}
          initialFen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          playerColor={playerColor}
          inputEnabled={inputEnabled}
          onGameStateChange={onGameStateChange}
          onMoveStart={onMoveStart}
          reason={fallbackReason}
        />
      );
    }

    window.__chess.renderMode = '3d';
    window.__chess.renderFallbackReason = '';
    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block', touchAction: 'none', userSelect: 'none' }}
      />
    );
  }
);

Board3DScene.displayName = 'Board3DScene';
