export const WEBGL_FALLBACK_TITLE = 'WebGL2 unavailable';
export const WEBGL_FALLBACK_KICKER = 'DISPLAY LINK FAILED';
export const WEBGL_FALLBACK_DETAIL =
  'Cyber Chess needs WebGL2 to draw the 3D board. This browser could not create a WebGL2 context. Enable hardware acceleration, update your graphics driver, or switch to a current desktop browser.';

export function webglUnavailableMessage(): string | null {
  if (typeof document === 'undefined') return WEBGL_FALLBACK_DETAIL;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) return WEBGL_FALLBACK_DETAIL;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  } catch {
    return WEBGL_FALLBACK_DETAIL;
  }
}
