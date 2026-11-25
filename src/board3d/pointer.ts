export function isPrimaryPointer(event: { button: number; pointerType: string }): boolean {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
    return event.button === 0 || event.button === -1;
  }
  return event.button === 0;
}

export function tapSlopPixels(pointerType: string): number {
  return pointerType === 'touch' || pointerType === 'pen' ? 28 : 8;
}

export function isTap(dx: number, dy: number, pointerType: string): boolean {
  return Math.hypot(dx, dy) <= tapSlopPixels(pointerType);
}

export function pieceRayThreshold(pointerType: string): number {
  return pointerType === 'touch' || pointerType === 'pen' ? 0.45 : 0.14;
}
