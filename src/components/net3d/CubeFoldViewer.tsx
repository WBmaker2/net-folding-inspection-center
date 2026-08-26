import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import type { FoldSnapshot, NetDefinition } from '../../domain/net/types';
import { buildSceneFaces } from './sceneModel';
import { FoldScene } from './FoldScene';
import './cube-fold-viewer.css';

export type CubeFoldView = 'front' | 'right' | 'top' | 'fixed-base';

export interface CubeFoldViewerProps {
  readonly snapshot: FoldSnapshot;
  readonly net: NetDefinition;
  readonly view: CubeFoldView;
  readonly reducedMotion: boolean;
  readonly singleFaceMode: boolean;
}

const VIEW_LABELS: Readonly<Record<CubeFoldView, string>> = {
  front: '정면 고정',
  right: '오른쪽 고정',
  top: '위 고정',
  'fixed-base': '기준면 고정',
};

const VIEW_POSITIONS: Readonly<Record<CubeFoldView, readonly [number, number, number]>> = {
  front: [0, 0, 7],
  right: [7, 0, 0],
  top: [0, 7, 0],
  'fixed-base': [0, 0, 7],
};

/** A guarded probe that is safe during SSR, jsdom, and browser security failures. */
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

const viewKeys: readonly CubeFoldView[] = ['front', 'right', 'top', 'fixed-base'];

export function CubeFoldViewer({
  snapshot,
  net,
  view,
  reducedMotion,
  singleFaceMode,
}: CubeFoldViewerProps): React.JSX.Element {
  const [selectedView, setSelectedView] = useState<CubeFoldView>(view);
  const [webglAvailable] = useState(() => isWebGLAvailable());
  const faces = buildSceneFaces(snapshot, net);

  return (
    <section
      className="cube-fold-viewer"
      aria-label="접기 3D 보조 보기"
      data-motion-mode={reducedMotion ? 'snap' : 'limited'}
    >
      <div className="cube-view-controls" aria-label="고정 시점 선택">
        {viewKeys.map((viewKey) => (
          <button
            key={viewKey}
            type="button"
            aria-label={VIEW_LABELS[viewKey]}
            aria-pressed={selectedView === viewKey}
            onClick={() => setSelectedView(viewKey)}
          >
            {VIEW_LABELS[viewKey]}
          </button>
        ))}
      </div>
      {webglAvailable ? (
        <div className="cube-canvas-shell" aria-hidden="true">
          <Canvas
            orthographic
            camera={{ position: VIEW_POSITIONS[selectedView], zoom: 3.8, near: -100, far: 100 }}
            dpr={[1, 2]}
            frameloop="demand"
            aria-hidden="true"
          >
            <FoldScene
              faces={faces}
              reducedMotion={reducedMotion}
              singleFaceMode={singleFaceMode}
            />
          </Canvas>
        </div>
      ) : (
        <p className="cube-webgl-fallback" aria-live="polite">
          3D 보기를 사용할 수 없어 2D 관계 보기를 유지합니다.
        </p>
      )}
    </section>
  );
}
