import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const TOUCH_ORBIT_STEPS = {
  rotate: 0.18,
  zoom: 1.2,
} as const;

export type OrbitSample = { theta: number; phi: number; radius: number };
export type OrbitLimits = { minPhi: number; maxPhi: number; minRadius: number; maxRadius: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function applyOrbitDelta(
  state: OrbitSample,
  delta: { theta?: number; phi?: number; radius?: number },
  limits: OrbitLimits,
): OrbitSample {
  return {
    theta: state.theta + (delta.theta ?? 0),
    phi: clamp(state.phi + (delta.phi ?? 0), limits.minPhi, limits.maxPhi),
    radius: clamp(state.radius + (delta.radius ?? 0), limits.minRadius, limits.maxRadius),
  };
}

export function nudgeOrbit(
  controls: OrbitControls,
  delta: { theta?: number; phi?: number; radius?: number },
) {
  const camera = controls.object;
  const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  const next = applyOrbitDelta(
    { theta: spherical.theta, phi: spherical.phi, radius: spherical.radius },
    delta,
    {
      minPhi: controls.minPolarAngle,
      maxPhi: controls.maxPolarAngle,
      minRadius: controls.minDistance,
      maxRadius: controls.maxDistance,
    },
  );
  spherical.theta = next.theta;
  spherical.phi = next.phi;
  spherical.radius = next.radius;
  offset.setFromSpherical(spherical);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
  controls.update();
}
