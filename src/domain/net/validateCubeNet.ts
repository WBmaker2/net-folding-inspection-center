import { isConnectedNet } from './adjacency';
import {
  computeFaceFrames,
  getOppositePairs,
  type NetInspector,
  type OppositePair,
} from './foldEngine';
import { vec3Key } from './vectors';
import type { AxisDirection, FaceFrame, FaceId, NetDefinition, Vec3 } from './types';

export type CubeValidationReason =
  | 'valid'
  | 'invalid-face-count'
  | 'disconnected'
  | 'overlap'
  | 'inconsistent-fold';

export interface FaceCollision {
  readonly faceIds: readonly [FaceId, FaceId];
  readonly normal: Vec3;
}

export interface CubeValidationResult {
  readonly isValid: boolean;
  readonly reason: CubeValidationReason;
  readonly collisions: readonly FaceCollision[];
  readonly missingNormals: readonly AxisDirection[];
  readonly oppositePairs: readonly OppositePair[];
  readonly frames: ReadonlyMap<FaceId, FaceFrame>;
}

const AXIS_DIRECTIONS: readonly { readonly direction: AxisDirection; readonly vector: Vec3 }[] = [
  { direction: '+x', vector: [1, 0, 0] },
  { direction: '-x', vector: [-1, 0, 0] },
  { direction: '+y', vector: [0, 1, 0] },
  { direction: '-y', vector: [0, -1, 0] },
  { direction: '+z', vector: [0, 0, 1] },
  { direction: '-z', vector: [0, 0, -1] },
];

const findCollisions = (
  frames: ReadonlyMap<FaceId, FaceFrame>,
): readonly FaceCollision[] => {
  const entries = [...frames.entries()].sort(([left], [right]) => left.localeCompare(right));
  const collisions: FaceCollision[] = [];
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    const [leftId, leftFrame] = entries[leftIndex] ?? [];
    if (leftId === undefined || leftFrame === undefined) {
      continue;
    }
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const [rightId, rightFrame] = entries[rightIndex] ?? [];
      if (rightId === undefined || rightFrame === undefined) {
        continue;
      }
      if (vec3Key(leftFrame.center) === vec3Key(rightFrame.center)
        && vec3Key(leftFrame.normal) === vec3Key(rightFrame.normal)) {
        collisions.push({
          faceIds: [leftId, rightId],
          normal: [leftFrame.normal[0], leftFrame.normal[1], leftFrame.normal[2]],
        });
      }
    }
  }
  return collisions;
};

const findMissingNormals = (frames: ReadonlyMap<FaceId, FaceFrame>): readonly AxisDirection[] => {
  const present = new Set([...frames.values()].map((frame) => vec3Key(frame.normal)));
  return AXIS_DIRECTIONS
    .filter(({ vector }) => !present.has(vec3Key(vector)))
    .map(({ direction }) => direction);
};

export const validateCubeNet = (
  net: NetDefinition,
  baseFaceId: FaceId,
): CubeValidationResult => {
  const computation = computeFaceFrames(net, baseFaceId);
  const connected = net.faces.length > 0
    && net.faces.some((face) => face.id === baseFaceId)
    && isConnectedNet(net);
  const collisions = findCollisions(computation.frames);
  const missingNormals = findMissingNormals(computation.frames);
  const oppositePairs = getOppositePairs(computation.frames);

  let reason: CubeValidationReason = 'valid';
  if (net.faces.length !== 6) {
    reason = 'invalid-face-count';
  } else if (!connected) {
    reason = 'disconnected';
  } else if (collisions.length > 0) {
    reason = 'overlap';
  } else if (computation.frameConflicts.length > 0 || missingNormals.length > 0) {
    reason = 'inconsistent-fold';
  }

  return {
    isValid: reason === 'valid',
    reason,
    collisions,
    missingNormals,
    oppositePairs,
    frames: computation.frames,
  };
};

export const cubeNetInspector: NetInspector<NetDefinition, CubeValidationResult> = {
  inspect: validateCubeNet,
};
