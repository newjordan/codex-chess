import * as THREE from 'three';

export type Board3DEnemyTheme = 'goop' | 'frostd4d' | 'razorblade' | 'gordo';

const THEME_COLORS: Record<Board3DEnemyTheme, [number, number, number]> = {
  goop: [0x020c06, 0x20a84d, 0xa5cc36],
  frostd4d: [0x020b12, 0x2095c7, 0xa9d2e0],
  razorblade: [0x110306, 0xb4314e, 0xc28a38],
  gordo: [0x100417, 0xb847a8, 0xc98a37],
};

export type CellWaveEnvironment = {
  mesh: THREE.Mesh;
  tick(delta: number): void;
  dispose(): void;
};

export type AmbientCircuitLayer = {
  group: THREE.Group;
  tick(delta: number): void;
  dispose(): void;
};

export function createCellWaveEnvironment(theme: Board3DEnemyTheme): CellWaveEnvironment {
  const colors = THEME_COLORS[theme];
  const uniforms = {
    uTime: { value: 0 },
    uBase: { value: new THREE.Color(colors[0]) },
    uMid: { value: new THREE.Color(colors[1]) },
    uHigh: { value: new THREE.Color(colors[2]) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform vec3 uBase;
      uniform vec3 uMid;
      uniform vec3 uHigh;
      varying vec3 vWorld;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float hash31(vec3 p) {
        p = fract(p * vec3(123.34, 456.21, 345.45));
        p += dot(p, p.yzx + 45.32);
        return fract((p.x + p.y) * p.z);
      }

      float vnoise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
        float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
        float nx00 = mix(n000, n100, u.x);
        float nx10 = mix(n010, n110, u.x);
        float nx01 = mix(n001, n101, u.x);
        float nx11 = mix(n011, n111, u.x);
        float nxy0 = mix(nx00, nx10, u.y);
        float nxy1 = mix(nx01, nx11, u.y);
        return mix(nxy0, nxy1, u.z);
      }

      float bayer4(vec2 p) {
        int x = int(mod(p.x, 4.0));
        int y = int(mod(p.y, 4.0));
        int xy = y * 4 + x;
        int v = 0;
        if (xy == 0) v = 0; else if (xy == 1) v = 8; else if (xy == 2) v = 2; else if (xy == 3) v = 10;
        else if (xy == 4) v = 12; else if (xy == 5) v = 4; else if (xy == 6) v = 14; else if (xy == 7) v = 6;
        else if (xy == 8) v = 3; else if (xy == 9) v = 11; else if (xy == 10) v = 1; else if (xy == 11) v = 9;
        else if (xy == 12) v = 15; else if (xy == 13) v = 7; else if (xy == 14) v = 13; else v = 5;
        return float(v) / 16.0;
      }

      float band(vec3 dir, vec3 axis, float freq, float phase) {
        float coord = dot(dir, normalize(axis)) * freq + phase;
        return 1.0 - smoothstep(0.018, 0.044, abs(fract(coord) - 0.5));
      }

      void main() {
        vec3 dir = normalize(vWorld);
        vec3 slowDrift = vec3(uTime * 0.10, -uTime * 0.07, uTime * 0.06);
        vec3 crossDrift = vec3(-uTime * 0.12, uTime * 0.09, -uTime * 0.05);
        float n1 = vnoise3(dir * 7.5 + slowDrift);
        float n2 = vnoise3(dir * 15.0 + crossDrift);
        float n3 = vnoise3(dir * 28.0 + vec3(uTime * 0.04, uTime * 0.03, -uTime * 0.05));
        float waveA = sin(dot(dir, normalize(vec3(2.4, 1.1, 1.5))) * 6.4 + n1 * 1.2 + uTime * 0.82) * 0.5 + 0.5;
        float waveB = sin(dot(dir, normalize(vec3(-1.2, -0.7, 2.8))) * 7.2 + n2 * 1.0 - uTime * 0.68) * 0.5 + 0.5;
        float speedTone = smoothstep(0.18, 0.94, n1 * 0.38 + n2 * 0.24 + n3 * 0.08 + waveA * 0.2 + waveB * 0.1);

        vec2 pix = floor(gl_FragCoord.xy);
        float ordered = bayer4(pix / 2.0);
        float flux = vnoise3(dir * 10.0 + vec3(uTime * 0.16, uTime * 0.11, -uTime * 0.09));
        float blue = hash21(pix + floor(uTime * 24.0));
        float threshold = mix(ordered, blue, 0.18 + flux * 0.22);
        float dither = speedTone > threshold ? 1.0 : 0.0;

        vec3 gradient = mix(uBase, uMid, speedTone);
        gradient = mix(gradient, uHigh, smoothstep(0.68, 1.0, speedTone));
        vec3 color = mix(gradient * 0.78, gradient * 1.15, dither);

        float grid = max(
          max(band(dir, vec3(0.91, 0.18, 0.36), 11.5, uTime * 0.035), band(dir, vec3(-0.34, 0.82, 0.46), 10.0, -uTime * 0.028)),
          band(dir, vec3(0.22, -0.42, 0.88), 12.5, uTime * 0.024)
        );
        float horizonFade = smoothstep(-0.72, -0.08, dir.y) * (1.0 - smoothstep(0.65, 0.95, dir.y));
        float alpha = (0.085 + speedTone * 0.145 + grid * 0.026) * (0.38 + horizonFade * 0.56);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(48, 96, 48), material);
  mesh.renderOrder = -20;

  return {
    mesh,
    tick(delta) {
      uniforms.uTime.value += delta;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}

export function createAmbientCircuitLayer(theme: Board3DEnemyTheme): AmbientCircuitLayer {
  const colors = THEME_COLORS[theme];
  const group = new THREE.Group();
  group.renderOrder = -18;

  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(colors[2]) },
  };

  const shellMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    wireframe: true,
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormalWorld;
      void main() {
        vec3 normalWorld = normalize(mat3(modelMatrix) * normal);
        vNormalWorld = normalWorld;
        vec3 pos = position + normal * (sin(position.y * 0.22 + position.x * 0.09 + position.z * 0.07 + uTime * 0.34) * 0.08);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vNormalWorld;

      void main() {
        float busPulse = sin((vNormalWorld.x * 4.0 + vNormalWorld.y * 6.0 - vNormalWorld.z * 3.0) + uTime * 0.8) * 0.5 + 0.5;
        float gate = smoothstep(0.52, 0.92, busPulse);
        vec3 color = mix(uColor * 0.55, vec3(0.45, 0.92, 1.0), gate * 0.45);
        gl_FragColor = vec4(color, 0.034 + gate * 0.035);
      }
    `,
  });

  const shell = new THREE.Mesh(new THREE.SphereGeometry(47.2, 28, 14), shellMaterial);
  shell.renderOrder = -18;
  group.add(shell);

  const cageMaterial = new THREE.MeshBasicMaterial({
    color: colors[1],
    transparent: true,
    opacity: 0.045,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    wireframe: true,
  });
  const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(45.7, 2), cageMaterial);
  cage.rotation.set(0.18, 0.42, 0.08);
  cage.renderOrder = -17;
  group.add(cage);

  const ringMaterial = new THREE.LineBasicMaterial({
    color: colors[2],
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ringGeometry = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 145 }, (_, i) => {
      const a = (i / 144) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 43.8, 0, Math.sin(a) * 43.8);
    })
  );
  const rings = [new THREE.LineLoop(ringGeometry, ringMaterial), new THREE.LineLoop(ringGeometry, ringMaterial), new THREE.LineLoop(ringGeometry, ringMaterial)];
  rings[0].rotation.x = Math.PI / 2;
  rings[1].rotation.z = Math.PI / 2;
  rings[2].rotation.set(Math.PI / 2, Math.PI / 3, 0);
  rings.forEach((ring) => {
    ring.renderOrder = -16;
    group.add(ring);
  });

  return {
    group,
    tick(delta) {
      uniforms.uTime.value += delta;
      shell.rotation.y += delta * 0.018;
      cage.rotation.y -= delta * 0.012;
      cage.rotation.x += delta * 0.006;
      rings[0].rotation.z += delta * 0.01;
      rings[1].rotation.x -= delta * 0.008;
      rings[2].rotation.y += delta * 0.006;
    },
    dispose() {
      shell.geometry.dispose();
      shellMaterial.dispose();
      cage.geometry.dispose();
      cageMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
    },
  };
}
