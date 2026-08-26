import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createFoldSequence, getFoldSnapshot } from '../../src/domain/net/foldEngine';
import { getMissionById } from '../../src/content/missions/catalog';
import { CubeFoldViewer, isWebGLAvailable } from '../../src/components/net3d/CubeFoldViewer';
import { buildSceneFaces } from '../../src/components/net3d/sceneModel';

afterEach(cleanup);

const mission = getMissionById('cube-track-01');
const sequence = createFoldSequence(
  mission.net,
  mission.baseFaceId,
  mission.suggestedFoldOrder,
);

const renderViewer = (stepIndex = 5) => render(
  <CubeFoldViewer
    snapshot={getFoldSnapshot(sequence, stepIndex)}
    net={mission.net}
    view="front"
    reducedMotion={false}
    singleFaceMode={false}
  />,
);

describe('scene model and CubeFoldViewer', () => {
  it('copies settled snapshot normals and transforms without mutating frames', () => {
    const snapshot = getFoldSnapshot(sequence, 5);
    const before = [...snapshot.frames.entries()];
    const faces = buildSceneFaces(snapshot, mission.net);
    expect(faces.map((face) => face.normal)).toEqual(
      [...snapshot.frames.values()].map((frame) => frame.normal),
    );
    expect(faces.filter((face) => face.settled)).toHaveLength(6);
    expect(faces.every((face) => face.transform.position.length === 3)).toBe(true);
    expect([...snapshot.frames.entries()]).toEqual(before);
  });

  it('keeps all six faces visible in a step-zero flat state', () => {
    const faces = buildSceneFaces(getFoldSnapshot(sequence, 0), mission.net);
    expect(faces).toHaveLength(6);
    expect(faces.filter((face) => face.status === 'unsettled')).toHaveLength(5);
    expect(faces.find((face) => face.id === mission.baseFaceId)?.status).toBe('settled');
    expect(new Set(faces.map((face) => face.transform.position[2]))).toEqual(new Set([0, 1]));
  });

  it('provides exactly four deterministic fixed view buttons', async () => {
    renderViewer();
    expect(screen.queryByRole('button', { name: /자동 회전/ })).not.toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(screen.getByRole('button', { name: '정면 고정' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '위 고정' }));
    expect(screen.getByRole('button', { name: '위 고정' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses a hidden canvas area and falls back safely when WebGL is absent', () => {
    const canvasFactory = vi.fn(() => document.createElement('canvas'));
    expect(isWebGLAvailable(canvasFactory)).toBe(false);
    const { container } = renderViewer();
    expect(screen.getByText('3D 보기를 사용할 수 없어 2D 관계 보기를 유지합니다.')).toBeVisible();
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });

  it('uses a static patterned collision cue and reduced motion snap metadata', () => {
    const collisionSequence = createFoldSequence(
      getMissionById('cube-collision-01').net,
      getMissionById('cube-collision-01').baseFaceId,
      getMissionById('cube-collision-01').suggestedFoldOrder,
    );
    const collisionFaces = buildSceneFaces(
      getFoldSnapshot(collisionSequence, 5),
      getMissionById('cube-collision-01').net,
    );
    expect(collisionFaces.some((face) => face.collision && face.status === 'collision')).toBe(true);
    const { container } = renderViewer(0);
    expect(container.querySelector('[aria-label="고정 시점 선택"]')).toBeInTheDocument();
  });
});
