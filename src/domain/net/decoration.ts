import { negateVec3, vec3Key } from './vectors';
import type { AxisDirection, DecorationOrientationResult, FaceDefinition, FaceFrame, Vec3 } from './types';

const AXIS_VECTORS: ReadonlyMap<AxisDirection, Vec3> = new Map([
  ['+x', [1, 0, 0]],
  ['-x', [-1, 0, 0]],
  ['+y', [0, 1, 0]],
  ['-y', [0, -1, 0]],
  ['+z', [0, 0, 1]],
  ['-z', [0, 0, -1]],
]);

const AXIS_BY_VECTOR = new Map(
  [...AXIS_VECTORS.entries()].map(([direction, vector]) => [vec3Key(vector), direction]),
);

/**
 * Evaluates a face decoration independently of cube-net validity. A flat face
 * points up along -down; each quarter turn follows the explicit learner
 * contract: -right, -down, right, down.
 */
export const evaluateDecorationOrientation = (
  face: FaceDefinition,
  frame: FaceFrame,
  targetWorldUp: AxisDirection,
): DecorationOrientationResult => {
  const localUpByQuarterTurn: readonly Vec3[] = [
    negateVec3(frame.right),
    negateVec3(frame.down),
    frame.right,
    frame.down,
  ];
  const worldUpVector = localUpByQuarterTurn[face.decorationQuarterTurn];
  if (worldUpVector === undefined) {
    throw new RangeError(`Unsupported decoration quarter turn: ${face.decorationQuarterTurn}`);
  }
  const worldUp = AXIS_BY_VECTOR.get(vec3Key(worldUpVector));
  if (worldUp === undefined) {
    throw new RangeError(`Decoration up vector is not a world axis: ${vec3Key(worldUpVector)}`);
  }

  return {
    worldUp,
    targetWorldUp,
    matchesTarget: worldUp === targetWorldUp,
  };
};

export type { DecorationOrientationResult } from './types';
