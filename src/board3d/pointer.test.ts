import { describe, expect, test } from 'vitest';
import { isPrimaryPointer, isTap, pieceRayThreshold, tapSlopPixels } from './pointer';
import { TOUCH_ORBIT_STEPS, applyOrbitDelta } from './orbitNudge';

describe('pointer and touch picking', () => {
  test('accepts a finger or pen even when the button field is unset', () => {
    expect(isPrimaryPointer({ button: 0, pointerType: 'mouse' })).toBe(true);
    expect(isPrimaryPointer({ button: 2, pointerType: 'mouse' })).toBe(false);
    expect(isPrimaryPointer({ button: -1, pointerType: 'touch' })).toBe(true);
    expect(isPrimaryPointer({ button: 0, pointerType: 'pen' })).toBe(true);
  });

  test('gives touch a larger tap slop and piece threshold than a mouse click', () => {
    expect(tapSlopPixels('mouse')).toBe(8);
    expect(tapSlopPixels('touch')).toBeGreaterThan(8);
    expect(isTap(20, 0, 'mouse')).toBe(false);
    expect(isTap(20, 0, 'touch')).toBe(true);
    expect(isTap(40, 0, 'touch')).toBe(false);
    expect(pieceRayThreshold('touch')).toBeGreaterThan(pieceRayThreshold('mouse'));
  });
});

describe('touch orbit nudges', () => {
  const limits = { minPhi: Math.PI / 7, maxPhi: Math.PI / 2.1, minRadius: 8, maxRadius: 28 };

  test('rotates and zooms inside the board camera limits', () => {
    const start = { theta: 0, phi: Math.PI / 3, radius: 16 };
    const turned = applyOrbitDelta(start, { theta: TOUCH_ORBIT_STEPS.rotate }, limits);
    expect(turned.theta).toBeCloseTo(TOUCH_ORBIT_STEPS.rotate);
    expect(turned.phi).toBe(start.phi);
    const zoomedOut = applyOrbitDelta(start, { radius: TOUCH_ORBIT_STEPS.zoom }, limits);
    expect(zoomedOut.radius).toBeCloseTo(17.2);
    const capped = applyOrbitDelta({ ...start, radius: 27.5, phi: limits.maxPhi }, { radius: 4, phi: 1 }, limits);
    expect(capped.radius).toBe(limits.maxRadius);
    expect(capped.phi).toBe(limits.maxPhi);
  });
});
