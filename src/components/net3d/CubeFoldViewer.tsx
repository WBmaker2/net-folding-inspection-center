import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import type { FaceId, FoldSnapshot, NetDefinition } from '../../domain/net/types';
import { buildSceneFaces } from './sceneModel';
import { FoldScene } from './FoldScene';
import { isWebGLAvailable } from './webgl';
import './cube-fold-viewer.css';

// Public compatibility export; implementation lives in a non-component module.
// eslint-disable-next-line react-refresh/only-export-components
export { isWebGLAvailable } from './webgl';

export type CubeFoldView = 'front' | 'right' | 'top' | 'fixed-base';

export interface CubeFoldViewerProps {
  readonly snapshot: FoldSnapshot;
  readonly net: NetDefinition;
  readonly view: CubeFoldView;
  readonly reducedMotion: boolean;
  readonly singleFaceMode: boolean;
  readonly baseFaceId?: FaceId;
  readonly movingFaceId?: FaceId;
  readonly hingeFaceId?: FaceId;
}

const VIEW_LABELS: Readonly<Record<CubeFoldView, string>> = {
  front: '정면에서 보기',
  right: '오른쪽에서 보기',
  top: '위에서 보기',
  'fixed-base': '기준면 중심으로 보기',
};

const viewKeys: readonly CubeFoldView[] = ['front', 'right', 'top', 'fixed-base'];

export function CubeFoldViewer({
  snapshot,
  net,
  view,
  reducedMotion,
  singleFaceMode,
  baseFaceId,
  movingFaceId,
  hingeFaceId,
}: CubeFoldViewerProps): React.JSX.Element {
  const [selectedView, setSelectedView] = useState<CubeFoldView>(view);
  const [webglAvailable] = useState(() => isWebGLAvailable());
  const faces = buildSceneFaces(snapshot, net);

  // Keep the externally selected preset authoritative while still allowing
  // the four local buttons to switch presets in the viewer.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSelectedView(view), [view]);

  return (
    <section
      className="cube-fold-viewer"
      aria-label="접기 3D 보조 보기"
      data-motion-mode={reducedMotion ? 'snap' : 'limited'}
    >
      <div className="cube-view-controls" aria-label="보기 시점 선택">
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
            camera={{ position: [0, 0, 7], zoom: 3.8, near: -100, far: 100 }}
            dpr={[1, 2]}
            frameloop="demand"
            aria-hidden="true"
          >
            <FoldScene
              faces={faces}
              view={selectedView}
              baseFaceId={baseFaceId}
              movingFaceId={movingFaceId}
              hingeFaceId={hingeFaceId}
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
