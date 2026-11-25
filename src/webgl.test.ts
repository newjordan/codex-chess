import { describe, expect, test } from 'vitest';
import { WEBGL_FALLBACK_DETAIL, WEBGL_FALLBACK_TITLE, webglUnavailableMessage } from './webgl';

describe('WebGL fallback', () => {
  test('explains that the board needs WebGL2 when no context exists', () => {
    expect(WEBGL_FALLBACK_TITLE).toMatch(/WebGL2/i);
    expect(WEBGL_FALLBACK_DETAIL).toMatch(/WebGL2/);
    expect(webglUnavailableMessage()).toBe(WEBGL_FALLBACK_DETAIL);
  });
});
