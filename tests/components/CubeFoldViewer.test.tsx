import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { computeFaceFrames, createFoldSequence, getFoldSnapshot } from '../../src/domain/net/foldEngine';
import { getMissionById } from '../../src/content/missions/catalog';
import { CubeFoldViewer } from '../../src/components/net3d/CubeFoldViewer';
import { isWebGLAvailable } from '../../src/components/net3d/webgl';
import {
  buildSceneFaces,
  getDecorationShapeDescriptor,
  getSceneFaceEmphasis,
} from '../../src/components/net3d/sceneModel';
import { buildCameraPose } from '../../src/components/net3d/cameraModel';
import { applyCameraPose } from '../../src/components/net3d/cameraModel';
import { isWebGLAvailable as exportedWebGLProbe } from '../../src/components/net3d/CubeFoldViewer';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
    expect(new Set(faces.map((face) => face.transform.position[2]))).toEqual(new Set([1]));
  });

  it.each(['F1', 'F2'] as const)('places the step-zero flat faces on the base plane for %s', (baseFaceId) => {
    const baseComputation = computeFaceFrames(mission.net, baseFaceId);
    const baseFrame = baseComputation.frames.get(baseFaceId)!;
    const snapshot = {
      stepIndex: 0,
      settledFaceIds: [baseFaceId] as const,
      frames: new Map([[baseFaceId, baseFrame]]),
    };
    const faces = buildSceneFaces(snapshot, mission.net);
    const base = faces.find((face) => face.id === baseFaceId)!;
    const basePosition = base.transform.position;
    faces.filter((face) => !face.settled).forEach((face) => {
      const delta = face.transform.position.map((value, index) => value - basePosition[index]!) as [number, number, number];
      expect(delta[0] * base.normal[0] + delta[1] * base.normal[1] + delta[2] * base.normal[2]).toBe(0);
      expect(face.frame.center).toEqual(face.transform.position);
    });
  });

  it('exposes visible decoration geometry descriptors with quarter-turn orientation', () => {
    const face = mission.net.faces.find((value) => value.id === 'F3')!;
    const descriptor = getDecorationShapeDescriptor(face);
    expect(descriptor.kind).toBe('triangle');
    expect(descriptor.points.length).toBeGreaterThanOrEqual(3);
    expect(descriptor.rotationRadians).toBe(face.decorationQuarterTurn * Math.PI / 2);
  });

  it('emphasizes base, moving, hinge and collision faces only in one-face mode', () => {
    const focus = { singleFaceMode: true, baseFaceId: 'F1' as const, movingFaceId: 'F2' as const, hingeFaceId: 'F3' as const };
    expect(getSceneFaceEmphasis('F1', false, focus)).toBe('full');
    expect(getSceneFaceEmphasis('F2', false, focus)).toBe('full');
    expect(getSceneFaceEmphasis('F3', false, focus)).toBe('full');
    expect(getSceneFaceEmphasis('F4', false, focus)).toBe('dim');
    expect(getSceneFaceEmphasis('F4', true, focus)).toBe('full');
  });

  it('builds four distinct camera poses and avoids a top-view up singularity', () => {
    const poses = (['front', 'right', 'top', 'fixed-base'] as const).map((view) => buildCameraPose(view));
    expect(new Set(poses.map((pose) => pose.position.join(','))).size).toBe(4);
    expect(buildCameraPose('top').up).toEqual([0, 0, -1]);
  });

  it('centers a flat net on all scene faces and chooses a readable zoom', () => {
    const snapshot = getFoldSnapshot(sequence, 0);
    const faces = buildSceneFaces(snapshot, mission.net);
    const baseFace = faces.find((face) => face.id === mission.baseFaceId);
    const pose = buildCameraPose('front', baseFace, faces);

    expect(pose.target).not.toEqual(baseFace?.frame.center);
    expect(pose.zoom).toBeGreaterThan(3.8);
    expect(pose.zoom).toBeLessThanOrEqual(90);
  });

  it('provides exactly four deterministic fixed view buttons', async () => {
    renderViewer();
    expect(screen.queryByRole('button', { name: /자동 회전/ })).not.toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(screen.getByRole('button', { name: '정면에서 보기' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '위에서 보기' }));
    expect(screen.getByRole('button', { name: '위에서 보기' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '기준면 중심으로 보기' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses a hidden canvas area and falls back safely when WebGL is absent', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const canvasFactory = vi.fn(() => ({
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement));
    expect(isWebGLAvailable(canvasFactory)).toBe(false);
    expect(exportedWebGLProbe(canvasFactory)).toBe(false);
    const { container } = renderViewer();
    expect(screen.getByText('3D 보기를 사용할 수 없어 2D 관계 보기를 유지합니다.')).toBeVisible();
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('applies each camera pose through the complete controller contract', () => {
    const camera = {
      position: { set: vi.fn() },
      up: { set: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
      zoom: 1,
    };
    const invalidate = vi.fn();
    const pose = buildCameraPose('right');
    applyCameraPose(camera, pose, invalidate);
    expect(camera.position.set).toHaveBeenCalledWith(...pose.position);
    expect(camera.up.set).toHaveBeenCalledWith(...pose.up);
    expect(camera.lookAt).toHaveBeenCalledWith(...pose.target);
    expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
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
    expect(container.querySelector('[aria-label="보기 시점 선택"]')).toBeInTheDocument();
  });
});
