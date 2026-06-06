import * as THREE from 'three';

type Super90sWindow = {
  root: THREE.Group;
  visual: THREE.ShaderMaterial;
  basePosition: THREE.Vector3;
  driftSeed: number;
  orbitRadius: number;
  spinSpeed: number;
  pulseScale: number;
};

export type Super90sEnvironment = {
  group: THREE.Group;
  tick(delta: number, audioLevel: number, audioPulse: number): void;
  dispose(): void;
};

const TITLE_COLORS = [0x001a88, 0x8a008f, 0x008c3a, 0xd5c400, 0xc50031, 0x0098c8, 0x6d4acb];
const BUTTON_COLORS = [0xff2bd6, 0xfff200, 0x45ff00];
const FRAME_GRAY = 0xb9b9b9;
const DARK_GRAY = 0x4a4a4a;
const LIGHT_GRAY = 0xffffff;

const MilkdropShader = {
  uniforms: {
    time: { value: 0 },
    audioLevel: { value: 0 },
    audioPulse: { value: 0 },
    hueSeed: { value: 0 },
    variant: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform float time;
    uniform float audioLevel;
    uniform float audioPulse;
    uniform float hueSeed;
    uniform float variant;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    vec3 palette(float t) {
      vec3 a = vec3(0.55, 0.45, 0.58);
      vec3 b = vec3(0.52, 0.53, 0.45);
      vec3 c = vec3(1.00, 1.00, 1.00);
      vec3 d = vec3(0.00 + hueSeed, 0.28 + hueSeed * 0.5, 0.58 + hueSeed * 0.25);
      return a + b * cos(6.28318 * (c * t + d));
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      float t = time * (0.34 + variant * 0.028);
      float pulse = audioPulse * 2.2 + audioLevel * 0.9;

      float angle = atan(uv.y, uv.x);
      float radius = length(uv);
      float folds = 3.0 + mod(variant, 5.0);
      float kaleido = abs(fract((angle / 6.28318) * folds + 0.5) - 0.5) * 2.0;
      vec2 warped = vec2(cos(kaleido * 6.28318), sin(kaleido * 6.28318)) * radius;

      float radial = sin(24.0 * radius - t * 8.0 + pulse * 2.0);
      float plasma = sin((warped.x + warped.y) * (8.0 + variant) + t * 4.0);
      float bands = sin((uv.y * 18.0) + sin(uv.x * 9.0 + t) * 4.0 - t * 5.0);
      float rings = sin(42.0 * radius + sin(angle * folds + t) * 5.0 - t * 9.0);

      float signal = radial * 0.28 + plasma * 0.25 + bands * 0.22 + rings * 0.25;
      signal += hash(floor(vUv * vec2(96.0, 54.0)) + time) * 0.18;
      signal += pulse * (0.16 + smoothstep(0.75, 0.05, radius) * 0.26);

      vec3 color = palette(signal + radius * 0.22 + time * 0.045);
      color.rg += vec2(0.22, -0.08) * sin(t + variant);
      color.b += 0.24 * cos(t * 1.7 + radius * 8.0);

      float scanline = 0.82 + 0.18 * step(0.5, fract(vUv.y * 120.0));
      float dither = step(0.45, hash(floor(vUv * vec2(160.0, 90.0)) + variant)) * 0.08;
      float vignette = smoothstep(1.2, 0.18, radius);
      color = (color + dither) * scanline * (0.58 + vignette * 0.52 + pulse * 0.16);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

function createBox(width: number, height: number, depth: number, color: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshBasicMaterial({ color })
  );
  mesh.position.set(x, y, z);
  return mesh;
}

function createWindowFrame(index: number) {
  const group = new THREE.Group();
  const width = 5.8 + (index % 3) * 0.55;
  const height = 3.7 + (index % 2) * 0.4;
  const depth = 0.1;
  const titleHeight = 0.45;
  const border = 0.16;

  const back = createBox(width, height, depth, FRAME_GRAY, 0, 0, -0.04);
  group.add(back);

  const title = createBox(width - border * 2, titleHeight, depth + 0.025, TITLE_COLORS[index % TITLE_COLORS.length], 0, height / 2 - titleHeight / 2 - border, 0.04);
  group.add(title);

  const contentWidth = width - border * 2.4;
  const contentHeight = height - titleHeight - border * 3.1;
  const visual = new THREE.Mesh(
    new THREE.PlaneGeometry(contentWidth, contentHeight),
    new THREE.ShaderMaterial({
      ...MilkdropShader,
      uniforms: THREE.UniformsUtils.clone(MilkdropShader.uniforms),
      side: THREE.DoubleSide,
    })
  );
  visual.position.set(0, -height / 2 + border + contentHeight / 2, 0.12);
  group.add(visual);

  group.add(createBox(width, border, depth + 0.05, LIGHT_GRAY, 0, height / 2 - border / 2, 0.08));
  group.add(createBox(border, height, depth + 0.05, LIGHT_GRAY, -width / 2 + border / 2, 0, 0.08));
  group.add(createBox(width, border, depth + 0.05, DARK_GRAY, 0, -height / 2 + border / 2, 0.09));
  group.add(createBox(border, height, depth + 0.05, DARK_GRAY, width / 2 - border / 2, 0, 0.09));

  for (let i = 0; i < 3; i += 1) {
    const button = createBox(0.22, 0.22, depth + 0.06, BUTTON_COLORS[i], width / 2 - 0.42 - i * 0.32, height / 2 - titleHeight / 2 - border, 0.13);
    group.add(button);
  }

  const insetLineMat = new THREE.LineBasicMaterial({ color: 0x202020, transparent: true, opacity: 0.75 });
  const points = [
    new THREE.Vector3(-contentWidth / 2, -height / 2 + border, 0.135),
    new THREE.Vector3(contentWidth / 2, -height / 2 + border, 0.135),
    new THREE.Vector3(contentWidth / 2, -height / 2 + border + contentHeight, 0.135),
    new THREE.Vector3(-contentWidth / 2, -height / 2 + border + contentHeight, 0.135),
    new THREE.Vector3(-contentWidth / 2, -height / 2 + border, 0.135),
  ];
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), insetLineMat));

  const shaderMaterial = visual.material as THREE.ShaderMaterial;
  shaderMaterial.uniforms.hueSeed.value = index * 0.137;
  shaderMaterial.uniforms.variant.value = index;

  return { group, visual: shaderMaterial };
}

export function createSuper90sEnvironment(playerColor: 'w' | 'b'): Super90sEnvironment {
  const group = new THREE.Group();
  group.name = 'super-90s-windows';

  const behind = playerColor === 'w' ? 1 : -1;
  const placements = [
    [-8.2, 5.2, behind * 10.2, 0.18],
    [7.8, 4.5, behind * 9.3, -0.2],
    [-11.4, 2.7, behind * 3.3, 0.55],
    [11.3, 3.0, behind * 2.4, -0.58],
    [-5.2, 8.0, behind * 13.5, 0.08],
    [5.5, 7.4, behind * 12.6, -0.1],
    [0.0, 6.7, behind * 16.4, 0],
  ] as const;

  const windows: Super90sWindow[] = placements.map(([x, y, z, yaw], index) => {
    const { group: root, visual } = createWindowFrame(index);
    root.position.set(x, y, z);
    root.rotation.set(-0.08 + (index % 2) * 0.08, yaw + (playerColor === 'w' ? Math.PI : 0), -0.04 + index * 0.018);
    root.scale.setScalar(0.92 + (index % 3) * 0.08);
    group.add(root);

    return {
      root,
      visual,
      basePosition: root.position.clone(),
      driftSeed: index * 1.91 + 0.6,
      orbitRadius: 0.18 + index * 0.035,
      spinSpeed: 0.12 + index * 0.018,
      pulseScale: 1.04 + index * 0.025,
    };
  });

  let elapsed = 0;

  return {
    group,
    tick(delta, audioLevel, audioPulse) {
      elapsed += delta;
      const level = Math.max(0, Math.min(1, audioLevel || 0));
      const pulse = Math.max(0, Math.min(1, audioPulse || 0));
      windows.forEach((entry, index) => {
        const phase = elapsed * entry.spinSpeed + entry.driftSeed;
        entry.root.position.set(
          entry.basePosition.x + Math.sin(phase * 1.7) * entry.orbitRadius,
          entry.basePosition.y + Math.sin(phase * 1.1) * (0.24 + level * 0.38),
          entry.basePosition.z + Math.cos(phase * 1.3) * entry.orbitRadius
        );
        entry.root.rotation.y += delta * (0.035 + level * 0.08) * (index % 2 === 0 ? 1 : -1);
        entry.root.rotation.z = Math.sin(phase) * 0.09;
        const scale = entry.pulseScale + level * 0.08 + pulse * 0.14;
        entry.root.scale.setScalar(scale);
        entry.visual.uniforms.time.value = elapsed;
        entry.visual.uniforms.audioLevel.value = level;
        entry.visual.uniforms.audioPulse.value = pulse;
      });
    },
    dispose() {
      group.traverse((child) => {
        const disposable = child as THREE.Object3D & {
          geometry?: THREE.BufferGeometry;
          material?: THREE.Material | THREE.Material[];
        };
        disposable.geometry?.dispose();
        if (disposable.material) {
          const materials = Array.isArray(disposable.material) ? disposable.material : [disposable.material];
          materials.forEach((material) => material.dispose());
        }
      });
      group.clear();
    },
  };
}
