import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { createAmbientCircuitLayer, createCellWaveEnvironment, DEFAULT_CELLWAVE_DEV_CONTROLS } from './floor';
import type { CellWaveDevControls } from './floor';
import { createSuper90sEnvironment } from './super90s';
import type { Board3DEnemyTheme, SceneContext } from './types';

const DotMatrixShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 grid = fract(vUv * (resolution / 2.5));
      float dotMask = step(0.3, grid.x) * step(0.3, grid.y);
      vec3 techFuzz = texel.rgb * (dotMask * 0.2 + 0.8);
      gl_FragColor = vec4(techFuzz, texel.a);
    }
  `,
};

export function setupScene(
  canvas: HTMLCanvasElement,
  enemyTheme: Board3DEnemyTheme = 'goop',
  playerColor: 'w' | 'b' = 'w',
  super90sEnabled = false
): SceneContext {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000510, 0.015);

  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 600;

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  const playerSideZ = playerColor === 'w' ? -1 : 1;
  camera.position.set(0, 18, playerSideZ * 13.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minPolarAngle = Math.PI / 7;
  controls.minDistance = 8;
  controls.maxDistance = 28;
  controls.target.set(0, 0, 0);
  controls.update();

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Keep the neon style, but avoid over-blooming bright cyan highlights.
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.1, 0.18, 0.55));
  const dotPass = new ShaderPass(DotMatrixShader);
  dotPass.uniforms.resolution.value.set(w, h);
  composer.addPass(dotPass);

  // Structured dot-matrix starfield
  const starPositions: number[] = [];
  for (let x = -50; x <= 50; x += 4) {
    for (let y = -50; y <= 50; y += 4) {
      for (let z = -50; z <= 50; z += 4) {
        if (Math.sqrt(x * x + y * y + z * z) < 12) continue;
        starPositions.push(x, y, z);
      }
    }
  }
  const starsGeo = new THREE.BufferGeometry();
  starsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(starPositions), 3));
  scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ size: 0.08, color: 0x66aaff, transparent: true, opacity: 0.4 })));

  const cellWaveEnvironment = createCellWaveEnvironment(enemyTheme);
  scene.add(cellWaveEnvironment.mesh);
  const chessGlobal = (window as typeof window & {
    __chess?: {
      cellWaveDevControls?: Partial<CellWaveDevControls>;
      cellWaveDev?: {
        defaults: CellWaveDevControls;
        setParams(params: Partial<CellWaveDevControls>): void;
        reset(): void;
      };
    };
  }).__chess;
  const applyCellWaveDevControls = (params: Partial<CellWaveDevControls>) => {
    cellWaveEnvironment.setDevControls(params);
    if (chessGlobal) {
      chessGlobal.cellWaveDevControls = {
        ...(chessGlobal.cellWaveDevControls ?? {}),
        ...params,
      };
    }
  };
  if (chessGlobal) {
    chessGlobal.cellWaveDev = {
      defaults: { ...DEFAULT_CELLWAVE_DEV_CONTROLS },
      setParams: applyCellWaveDevControls,
      reset() {
        applyCellWaveDevControls(DEFAULT_CELLWAVE_DEV_CONTROLS);
      },
    };
    cellWaveEnvironment.setDevControls(chessGlobal.cellWaveDevControls ?? DEFAULT_CELLWAVE_DEV_CONTROLS);
  }
  const ambientCircuitLayer = createAmbientCircuitLayer(enemyTheme);
  scene.add(ambientCircuitLayer.group);
  const super90sEnvironment = super90sEnabled ? createSuper90sEnvironment(playerColor) : null;
  const super90sStatus = {
    enabled: Boolean(super90sEnvironment),
    windows: super90sEnvironment?.group.children.length ?? 0,
  };
  if (chessGlobal) chessGlobal.super90s = super90sStatus;
  if (super90sEnvironment) scene.add(super90sEnvironment.group);
  const clock = new THREE.Clock();

  const ro = new ResizeObserver(() => {
    const rw = canvas.clientWidth;
    const rh = canvas.clientHeight;
    if (rw === 0 || rh === 0) return;
    camera.aspect = rw / rh;
    camera.updateProjectionMatrix();
    renderer.setSize(rw, rh);
    composer.setSize(rw, rh);
    dotPass.uniforms.resolution.value.set(rw, rh);
  });
  ro.observe(canvas.parentElement ?? canvas);

  return {
    scene,
    camera,
    renderer,
    composer,
    controls,
    tick() {
      const delta = clock.getDelta();
      const audioReactive = (window as typeof window & {
        __chess?: { audioReactive?: { level?: number; pulse?: number } };
      }).__chess?.audioReactive;
      if (chessGlobal?.cellWaveDevControls) {
        cellWaveEnvironment.setDevControls(chessGlobal.cellWaveDevControls);
      }
      cellWaveEnvironment.setAudioReactivity(audioReactive?.level ?? 0, audioReactive?.pulse ?? 0);
      cellWaveEnvironment.tick(delta);
      ambientCircuitLayer.tick(delta);
      super90sEnvironment?.tick(delta, audioReactive?.level ?? 0, audioReactive?.pulse ?? 0);
    },
    dispose() {
      ro.disconnect();
      controls.dispose();
      cellWaveEnvironment.dispose();
      if (chessGlobal?.cellWaveDev?.setParams === applyCellWaveDevControls) delete chessGlobal.cellWaveDev;
      ambientCircuitLayer.dispose();
      super90sEnvironment?.dispose();
      if (chessGlobal?.super90s === super90sStatus) delete chessGlobal.super90s;
      composer.renderTarget1.dispose();
      composer.renderTarget2.dispose();
      renderer.dispose();
    },
  };
}
