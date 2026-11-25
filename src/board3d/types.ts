import type * as THREE from 'three';
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Board3DEnemyTheme } from './floor';

export interface Board3DHandle {
  applyMove(from: string, to: string, isCapture: boolean, flags: string, promotion?: string, speedMultiplier?: number): void;
  resetToPosition(fen: string): void;
  highlightSquare(square: string | null): void;
  flashSquare(square: string): void;
}

export interface Board3DGameState {
  status: string;
  fen: string;
  selectedSquare: string | null;
}

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  controls: OrbitControls;
  tick(now?: number): void;
  dispose(): void;
}

export type { Board3DEnemyTheme };

export interface PieceInstance {
  group: THREE.Group;
  haloGroup: THREE.Group;
  haloMat: THREE.LineBasicMaterial;
  square: string;
  type: string; // 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
  color: 'w' | 'b';
}
