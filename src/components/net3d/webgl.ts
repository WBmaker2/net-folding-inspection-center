/** A guarded WebGL probe safe during SSR, jsdom, and browser security failures. */
export function isWebGLAvailable(
  canvasFactory?: () => HTMLCanvasElement,
): boolean {
  if (typeof document === 'undefined' && canvasFactory === undefined) return false;
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
