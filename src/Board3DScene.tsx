'use client';

import { forwardRef, useImperativeHandle } from 'react';
import type { Board3DGameState, Board3DHandle } from './board3d/types';
import { useBoard3D } from './board3d/useBoard3D';

interface Board3DSceneProps {
  whiteName?: string;
  blackName?: string;
  inputEnabled?: boolean;
  onGameStateChange?: (state: Board3DGameState) => void;
}

export const Board3DScene = forwardRef<Board3DHandle, Board3DSceneProps>(
  ({ whiteName = 'White AI', blackName = 'Black AI', inputEnabled = true, onGameStateChange }, ref) => {
    const { canvasRef, handleRef } = useBoard3D(whiteName, blackName, onGameStateChange, inputEnabled);

    useImperativeHandle(ref, () => ({
      applyMove: (...args) => handleRef.current.applyMove(...args),
      resetToPosition: (fen) => handleRef.current.resetToPosition(fen),
      highlightSquare: (sq) => handleRef.current.highlightSquare(sq),
      flashSquare: (sq) => handleRef.current.flashSquare(sq),
    }));

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
