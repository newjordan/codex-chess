import { WEBGL_FALLBACK_DETAIL, WEBGL_FALLBACK_KICKER, WEBGL_FALLBACK_TITLE } from './webgl';

export function WebglFallback({ detail = WEBGL_FALLBACK_DETAIL }: { detail?: string }) {
  return (
    <div className="webgl-fallback" role="alert">
      <p className="webgl-fallback-kicker">{WEBGL_FALLBACK_KICKER}</p>
      <h1>{WEBGL_FALLBACK_TITLE}</h1>
      <p>{detail}</p>
    </div>
  );
}
