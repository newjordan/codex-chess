'use client';

import { forwardRef, useImperativeHandle } from 'react';
import type { Board3DEnemyTheme, Board3DGameState, Board3DHandle } from './board3d/types';
import { useBoard3D } from './board3d/useBoard3D';
import { TouchCameraControls } from './TouchCameraControls';
import { WebglFallback } from './WebglFallback';

interface Board3DSceneProps {
  whiteName?: string;
  blackName?: string;
  inputEnabled?: boolean;
  enemyTheme?: Board3DEnemyTheme;
  playerColor?: 'w' | 'b';
  cameraControls?: boolean;
  onGameStateChange?: (state: Board3DGameState) => void;
  onMoveStart?: (isCapture: boolean) => void;
}

export const Board3DScene = forwardRef<Board3DHandle, Board3DSceneProps>(
  ({ whiteName = 'White AI', blackName = 'Black AI', inputEnabled = true, enemyTheme = 'goop', playerColor = 'w', cameraControls = false, onGameStateChange, onMoveStart }, ref) => {
    const { canvasRef, handleRef, controlsRef, webglError } = useBoard3D(whiteName, blackName, onGameStateChange, inputEnabled, enemyTheme, playerColor, onMoveStart);

    useImperativeHandle(ref, () => ({
      applyMove: (...args) => handleRef.current.applyMove(...args),
      resetToPosition: (fen) => handleRef.current.resetToPosition(fen),
      highlightSquare: (sq) => handleRef.current.highlightSquare(sq),
      flashSquare: (sq) => handleRef.current.flashSquare(sq),
    }));

    return (
      <>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: webglError ? 'none' : 'block', touchAction: 'none', userSelect: 'none' }}
        />
        {webglError ? <WebglFallback detail={webglError} /> : null}
        {cameraControls && !webglError ? <TouchCameraControls controlsRef={controlsRef} /> : null}
      </>
    );
  }
);

Board3DScene.displayName = 'Board3DScene';
