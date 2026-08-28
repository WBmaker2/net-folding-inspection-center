import type { FaceFrame, FaceId } from '../../domain/net/types';
import type { CubeFoldView } from './CubeFoldViewer';
import type { SceneFace } from './sceneModel';

export interface CameraPose {
  readonly position: readonly [number, number, number];
  readonly up: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly zoom: number;
}

export interface CameraLike {
  readonly position: { set(x: number, y: number, z: number): void };
  readonly up: { set(x: number, y: number, z: number): void };
  lookAt(x: number, y: number, z: number): void;
  updateProjectionMatrix(): void;
  readonly zoom?: number;
}

const DEFAULT_ZOOM = 64;
const MIN_ZOOM = 48;
const MAX_ZOOM = 90;
const FIT_SCALE = 160;

export function applyCameraPose(
  camera: CameraLike,
  pose: CameraPose,
  invalidate: () => void,
): void {
  camera.position.set(...pose.position);
  camera.up.set(...pose.up);
  camera.lookAt(...pose.target);
  if ('zoom' in camera) Object.assign(camera, { zoom: pose.zoom });
  camera.updateProjectionMatrix();
  invalidate();
}

const scale = (value: readonly [number, number, number], amount: number): [number, number, number] => [
  value[0] * amount, value[1] * amount, value[2] * amount,
];

const add = (...values: readonly [number, number, number][]): [number, number, number] => [
  values.reduce((sum, value) => sum + value[0], 0),
  values.reduce((sum, value) => sum + value[1], 0),
  values.reduce((sum, value) => sum + value[2], 0),
];

const copy = (value: readonly [number, number, number]): [number, number, number] => [
  value[0], value[1], value[2],
];

const baseFallback: FaceFrame = {
  normal: [0, 0, 1],
  right: [1, 0, 0],
  down: [0, 1, 0],
  center: [0, 0, 1],
};

interface SceneBounds {
  readonly center: readonly [number, number, number];
  readonly span: number;
}

const getSceneBounds = (
  faces: readonly Pick<SceneFace, 'frame' | 'transform'>[] | undefined,
): SceneBounds | undefined => {
  if (faces === undefined || faces.length === 0) return undefined;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  faces.forEach((face) => {
    const position = face.transform.position;
    for (let index = 0; index < 3; index += 1) {
      min[index] = Math.min(min[index]!, position[index]! - 0.5);
      max[index] = Math.max(max[index]!, position[index]! + 0.5);
    }
  });
  if (min.some((value) => !Number.isFinite(value)) || max.some((value) => !Number.isFinite(value))) {
    return undefined;
  }
  const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1);
  return Object.freeze({
    center: Object.freeze([
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ]) as readonly [number, number, number],
    span,
  });
};

const clampZoom = (span: number): number => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, FIT_SCALE / span));

export function buildCameraPose(
  view: CubeFoldView,
  baseFace?: Pick<SceneFace, 'normal' | 'right' | 'down' | 'frame' | 'id'>,
  sceneFaces?: readonly Pick<SceneFace, 'frame' | 'transform'>[],
): CameraPose {
  const frame = baseFace?.frame ?? baseFallback;
  const bounds = getSceneBounds(sceneFaces);
  const center = copy(bounds?.center ?? frame.center);
  const zoom = bounds === undefined ? DEFAULT_ZOOM : clampZoom(bounds.span);
  if (view === 'right') {
    return Object.freeze({
      position: add(center, scale([1, 0, 0], 7)),
      up: [0, 1, 0] as const,
      target: center,
      zoom,
    });
  }
  if (view === 'top') {
    // A world-Y camera needs a world-Z up vector to avoid the up singularity.
    return Object.freeze({
      position: add(center, [0, 7, 0]),
      up: [0, 0, -1] as const,
      target: center,
      zoom,
    });
  }
  if (view === 'fixed-base') {
    return Object.freeze({
      position: add(center, scale(frame.normal, 7), scale(frame.right, 2)),
      up: copy(frame.down),
      target: center,
      zoom,
    });
  }
  // Shallow isometric world front keeps this distinct from fixed-base.
  return Object.freeze({
    position: add(center, [5, 3, 7]),
    up: [0, 1, 0] as const,
    target: center,
    zoom,
  });
}

export const findBaseSceneFace = (
  faces: readonly SceneFace[],
  baseFaceId?: FaceId,
): SceneFace | undefined => faces.find((face) => face.id === baseFaceId) ?? faces[0];
