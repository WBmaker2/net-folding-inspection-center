import type { EdgeNeighbor } from './adjacency';
import { buildAdjacency } from './adjacency';
import { negateVec3, vec3Key } from './vectors';
import type { FaceFrame, FaceId, FoldDirection, NetDefinition, Vec3 } from './types';

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

export type { FaceFrame } from './types';
