/** A guarded WebGL probe safe during SSR, jsdom, and browser security failures. */
export function isWebGLAvailable(
  canvasFactory?: () => HTMLCanvasElement,
): boolean {
  if (typeof document === 'undefined' && canvasFactory === undefined) return false;
  const hasNativeWebGlFeature = typeof WebGL2RenderingContext !== 'undefined'
    || typeof WebGLRenderingContext !== 'undefined';
  // jsdom exposes HTMLCanvasElement but intentionally has no native WebGL
  // implementation. Avoid invoking its throwing stub and keep test output
  // quiet; an explicit factory remains an opt-in probe for real contexts.
  if (canvasFactory === undefined && !hasNativeWebGlFeature) return false;
  try {
    const canvas = canvasFactory?.() ?? document.createElement('canvas');
    if (typeof canvas.getContext !== 'function') return false;
    const webgl2 = canvas.getContext('webgl2');
    if (webgl2 !== null) return true;
    return canvas.getContext('webgl') !== null
      || canvas.getContext('experimental-webgl') !== null;
  } catch {
    return false;
  }
}
