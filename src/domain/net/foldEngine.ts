import type { EdgeNeighbor } from './adjacency';
import { buildAdjacency } from './adjacency';
import { negateVec3, vec3Key } from './vectors';
import type {
  FaceFrame,
  FaceId,
  FoldDirection,
  FoldSequence,
  FoldSnapshot,
  FoldStep,
  NetDefinition,
  Vec3,
} from './types';

export interface NetInspector<TNet, TResult> {
  inspect(net: TNet, baseFaceId: FaceId): TResult;
}

export interface FrameConflict {
  readonly faceId: FaceId;
  readonly existingFrame: FaceFrame;
  readonly proposedFrame: FaceFrame;
  readonly via: EdgeNeighbor;
}

export interface FoldComputation {
  readonly frames: ReadonlyMap<FaceId, FaceFrame>;
  readonly parentEdgeByFace: ReadonlyMap<FaceId, EdgeNeighbor>;
  readonly frameConflicts: readonly FrameConflict[];
}

export interface OppositePair {
  readonly a: FaceId;
  readonly b: FaceId;
}

export class InvalidFoldOrderError extends Error {
  readonly movingFaceId?: FaceId;
  readonly stepIndex?: number;
  readonly settledFaceIds: readonly FaceId[];

  constructor(message: string, options: {
    readonly movingFaceId?: FaceId;
    readonly stepIndex?: number;
    readonly settledFaceIds?: readonly FaceId[];
  } = {}) {
    super(message);
    this.name = 'InvalidFoldOrderError';
    this.movingFaceId = options.movingFaceId;
    this.stepIndex = options.stepIndex;
    this.settledFaceIds = Object.freeze([...(options.settledFaceIds ?? [])]);
  }
}

const BASE_FRAME: FaceFrame = {
  normal: [0, 0, 1],
  right: [1, 0, 0],
  down: [0, 1, 0],
  center: [0, 0, 1],
};

const FACE_ID_ORDER: readonly FaceId[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

const faceIdOrder = (faceId: FaceId): number => FACE_ID_ORDER.indexOf(faceId);

const copyVec3 = (value: Vec3): Vec3 => [value[0], value[1], value[2]];

const framesEqual = (left: FaceFrame, right: FaceFrame): boolean => (
  vec3Key(left.normal) === vec3Key(right.normal)
  && vec3Key(left.right) === vec3Key(right.right)
  && vec3Key(left.down) === vec3Key(right.down)
  && vec3Key(left.center) === vec3Key(right.center)
);

const makeFrame = (normal: Vec3, right: Vec3, down: Vec3): FaceFrame => ({
  normal: copyVec3(normal),
  right: copyVec3(right),
  down: copyVec3(down),
  center: copyVec3(normal),
});

const foldAcross = (frame: FaceFrame, direction: FoldDirection): FaceFrame => {
  switch (direction) {
    case 'east':
      return makeFrame(frame.right, negateVec3(frame.normal), frame.down);
    case 'west':
      return makeFrame(negateVec3(frame.right), frame.normal, frame.down);
    case 'south':
      return makeFrame(frame.down, frame.right, negateVec3(frame.normal));
    case 'north':
      return makeFrame(negateVec3(frame.down), frame.right, frame.normal);
  }
};

const edgeKey = (edge: EdgeNeighbor): string => {
  const pair = [edge.faceId, edge.neighborFaceId].sort(
    (left, right) => faceIdOrder(left) - faceIdOrder(right),
  );
  return `${pair[0]}:${pair[1]}`;
};

const freezeFrame = (frame: FaceFrame): FaceFrame => {
  const freezeVector = (value: Vec3): Vec3 => Object.freeze([
    value[0], value[1], value[2],
  ]) as unknown as Vec3;
  return Object.freeze({
    normal: freezeVector(frame.normal),
    right: freezeVector(frame.right),
    down: freezeVector(frame.down),
    center: freezeVector(frame.center),
  });
};

const copyFrameMap = (
  frames: ReadonlyMap<FaceId, FaceFrame>,
  selectedFaceIds?: readonly FaceId[],
): ReadonlyMap<FaceId, FaceFrame> => {
  const selected = selectedFaceIds === undefined ? undefined : new Set(selectedFaceIds);
  const copied = new Map<FaceId, FaceFrame>();
  for (const [faceId, frame] of frames) {
    if (selected === undefined || selected.has(faceId)) {
      copied.set(faceId, freezeFrame(frame));
    }
  }
  Object.defineProperties(copied, {
    set: {
      configurable: false,
      value: () => {
        throw new TypeError('Fold frame maps are immutable');
      },
    },
    delete: {
      configurable: false,
      value: () => {
        throw new TypeError('Fold frame maps are immutable');
      },
    },
    clear: {
      configurable: false,
      value: () => {
        throw new TypeError('Fold frame maps are immutable');
      },
    },
  });
  return Object.freeze(copied);
};

const createSnapshot = (
  stepIndex: number,
  settledFaceIds: readonly FaceId[],
  frames: ReadonlyMap<FaceId, FaceFrame>,
): FoldSnapshot => Object.freeze({
  stepIndex,
  settledFaceIds: Object.freeze([...settledFaceIds]),
  frames: copyFrameMap(frames, settledFaceIds),
});

/**
 * Propagates an integer face frame through the net. A west-first queue tie-break
 * keeps the collision mission's designated overlap stable when a cycle offers
 * more than one path to a face; the graph itself remains the Task 2 ordering.
 */
export const computeFaceFrames = (
  net: NetDefinition,
  baseFaceId: FaceId,
): FoldComputation => {
  const adjacency = buildAdjacency(net);
  const frames = new Map<FaceId, FaceFrame>();
  const parentEdgeByFace = new Map<FaceId, EdgeNeighbor>();
  const frameConflicts: FrameConflict[] = [];
  const conflictEdges = new Set<string>();
  const faceIds = new Set(net.faces.map((face) => face.id));

  if (!faceIds.has(baseFaceId)) {
    return { frames, parentEdgeByFace, frameConflicts };
  }

  frames.set(baseFaceId, makeFrame(BASE_FRAME.normal, BASE_FRAME.right, BASE_FRAME.down));
  const queue: FaceId[] = [baseFaceId];
  while (queue.length > 0) {
    const currentFaceId = queue.shift();
    if (currentFaceId === undefined) {
      continue;
    }
    const currentFrame = frames.get(currentFaceId);
    if (currentFrame === undefined) {
      continue;
    }

    const edges = [...(adjacency.get(currentFaceId) ?? [])].sort(
      (left, right) => (
        ({ west: 0, north: 1, east: 2, south: 3 } as const)[left.direction]
        - ({ west: 0, north: 1, east: 2, south: 3 } as const)[right.direction]
      ),
    );
    for (const edge of edges) {
      const proposedFrame = foldAcross(currentFrame, edge.direction);
      const existingFrame = frames.get(edge.neighborFaceId);
      if (existingFrame === undefined) {
        frames.set(edge.neighborFaceId, proposedFrame);
        parentEdgeByFace.set(edge.neighborFaceId, edge);
        queue.push(edge.neighborFaceId);
      } else if (!framesEqual(existingFrame, proposedFrame) && !conflictEdges.has(edgeKey(edge))) {
        conflictEdges.add(edgeKey(edge));
        frameConflicts.push({
          faceId: edge.neighborFaceId,
          existingFrame,
          proposedFrame,
          via: edge,
        });
      }
    }
  }

  return { frames, parentEdgeByFace, frameConflicts };
};

/**
 * Builds the learner-requested order without changing the authoritative final
 * frame computation. Each new face must be attached to a face already settled
 * in the sequence, so every step has a concrete hinge and quarter-turn hint.
 */
export const createFoldSequence = (
  net: NetDefinition,
  baseFaceId: FaceId,
  requestedOrder: readonly FaceId[],
): FoldSequence => {
  const computation = computeFaceFrames(net, baseFaceId);
  const adjacency = buildAdjacency(net);
  const faceIds = new Set(net.faces.map((face) => face.id));
  const expectedStepCount = net.faces.length - 1;

  if (!faceIds.has(baseFaceId)) {
    throw new InvalidFoldOrderError(`Base face ${baseFaceId} is not in the net`);
  }
  if (requestedOrder.length !== expectedStepCount) {
    throw new InvalidFoldOrderError(
      `A fold order must contain ${expectedStepCount} faces; received ${requestedOrder.length}`,
    );
  }

  const settledOrder: FaceId[] = [baseFaceId];
  const seen = new Set<FaceId>([baseFaceId]);
  const steps: FoldStep[] = [];

  for (const [orderIndex, movingFaceId] of requestedOrder.entries()) {
    if (!faceIds.has(movingFaceId) || movingFaceId === baseFaceId || seen.has(movingFaceId)) {
      throw new InvalidFoldOrderError(
        `Face ${movingFaceId} cannot be folded at step ${orderIndex + 1}`,
        { movingFaceId, stepIndex: orderIndex + 1, settledFaceIds: settledOrder },
      );
    }

    const hingeEdge = settledOrder
      .flatMap((hingeFaceId) => adjacency.get(hingeFaceId) ?? [])
      .find((edge) => edge.neighborFaceId === movingFaceId);
    const endFrame = computation.frames.get(movingFaceId);
    if (hingeEdge === undefined || endFrame === undefined) {
      throw new InvalidFoldOrderError(
        `Face ${movingFaceId} does not share an edge with a settled face at step ${orderIndex + 1}`,
        { movingFaceId, stepIndex: orderIndex + 1, settledFaceIds: settledOrder },
      );
    }
    const hingeFrame = computation.frames.get(hingeEdge.faceId);
    if (hingeFrame === undefined) {
      throw new InvalidFoldOrderError(
        `Hinge face ${hingeEdge.faceId} has no computed frame`,
        { movingFaceId, stepIndex: orderIndex + 1, settledFaceIds: settledOrder },
      );
    }

    steps.push(Object.freeze({
      index: orderIndex + 1,
      movingFaceId,
      hingeFaceId: hingeEdge.faceId,
      direction: hingeEdge.direction,
      angleDegrees: 90 as const,
      startFrame: freezeFrame(hingeFrame),
      endFrame: freezeFrame(endFrame),
    }));
    settledOrder.push(movingFaceId);
    seen.add(movingFaceId);
  }

  const snapshots: FoldSnapshot[] = [createSnapshot(0, settledOrder.slice(0, 1), computation.frames)];
  for (let stepIndex = 1; stepIndex <= steps.length; stepIndex += 1) {
    snapshots.push(createSnapshot(
      stepIndex,
      settledOrder.slice(0, stepIndex + 1),
      computation.frames,
    ));
  }

  return Object.freeze({
    baseFaceId,
    steps: Object.freeze(steps),
    snapshots: Object.freeze(snapshots),
    frames: copyFrameMap(computation.frames),
  });
};

export const getFoldSnapshot = (
  sequence: FoldSequence,
  stepIndex: number,
): FoldSnapshot => {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= sequence.snapshots.length) {
    throw new RangeError(
      `Fold snapshot index must be between 0 and ${sequence.snapshots.length - 1}; received ${stepIndex}`,
    );
  }
  const snapshot = sequence.snapshots[stepIndex];
  if (snapshot === undefined) {
    throw new RangeError(`No fold snapshot exists at index ${stepIndex}`);
  }
  return snapshot;
};

export const getOppositePairs = (
  frames: ReadonlyMap<FaceId, FaceFrame>,
): readonly OppositePair[] => {
  const entries = [...frames.entries()].sort(
    ([left], [right]) => faceIdOrder(left) - faceIdOrder(right),
  );
  const pairs: OppositePair[] = [];
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    const [leftId, leftFrame] = entries[leftIndex] ?? [];
    if (leftId === undefined || leftFrame === undefined) {
      continue;
    }
    const oppositeNormal = vec3Key(negateVec3(leftFrame.normal));
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const [rightId, rightFrame] = entries[rightIndex] ?? [];
      if (rightId !== undefined && rightFrame !== undefined
        && vec3Key(rightFrame.normal) === oppositeNormal) {
        pairs.push({ a: leftId, b: rightId });
      }
    }
  }
  return pairs;
};

export type {
  FaceFrame,
  FoldSequence,
  FoldSnapshot,
  FoldStep,
} from './types';
