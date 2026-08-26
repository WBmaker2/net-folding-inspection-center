import type { FaceId, FoldDirection, GridPoint, NetDefinition } from './types';
import { gridKey } from './vectors';

export interface EdgeNeighbor {
  readonly faceId: FaceId;
  readonly neighborFaceId: FaceId;
  readonly direction: FoldDirection;
}

export class DuplicateGridPointError extends Error {
  readonly point: GridPoint;
  readonly firstFaceId: FaceId;
  readonly duplicateFaceId: FaceId;

  constructor(point: GridPoint, firstFaceId: FaceId, duplicateFaceId: FaceId) {
    super(
      `Grid point (${point.x},${point.y}) is already occupied by ${firstFaceId}; `
        + `cannot place ${duplicateFaceId}`,
    );
    this.name = 'DuplicateGridPointError';
    this.point = point;
    this.firstFaceId = firstFaceId;
    this.duplicateFaceId = duplicateFaceId;
  }
}

const DIRECTIONS: readonly {
  readonly direction: FoldDirection;
  readonly delta: GridPoint;
}[] = [
  { direction: 'north', delta: { x: 0, y: -1 } },
  { direction: 'east', delta: { x: 1, y: 0 } },
  { direction: 'south', delta: { x: 0, y: 1 } },
  { direction: 'west', delta: { x: -1, y: 0 } },
];

export const buildAdjacency = (
  net: NetDefinition,
): ReadonlyMap<FaceId, readonly EdgeNeighbor[]> => {
  const faceAtGrid = new Map<string, FaceId>();

  for (const face of net.faces) {
    const key = gridKey(face.grid);
    const firstFaceId = faceAtGrid.get(key);
    if (firstFaceId !== undefined) {
      throw new DuplicateGridPointError(face.grid, firstFaceId, face.id);
    }
    faceAtGrid.set(key, face.id);
  }

  const adjacency = new Map<FaceId, readonly EdgeNeighbor[]>();
  for (const face of net.faces) {
    const neighbors: EdgeNeighbor[] = [];
    for (const { direction, delta } of DIRECTIONS) {
      const neighborFaceId = faceAtGrid.get(
        gridKey({ x: face.grid.x + delta.x, y: face.grid.y + delta.y }),
      );
      if (neighborFaceId !== undefined) {
        neighbors.push({ faceId: face.id, neighborFaceId, direction });
      }
    }
    adjacency.set(face.id, neighbors);
  }

  return adjacency;
};

export const isConnectedNet = (net: NetDefinition): boolean => {
  const adjacency = buildAdjacency(net);
  if (net.faces.length === 0) {
    return true;
  }

  const visited = new Set<FaceId>();
  const queue: FaceId[] = [net.faces[0].id];
  visited.add(net.faces[0].id);

  while (queue.length > 0) {
    const currentFaceId = queue.shift();
    if (currentFaceId === undefined) {
      continue;
    }
    for (const neighbor of adjacency.get(currentFaceId) ?? []) {
      if (!visited.has(neighbor.neighborFaceId)) {
        visited.add(neighbor.neighborFaceId);
        queue.push(neighbor.neighborFaceId);
      }
    }
  }

  return visited.size === net.faces.length;
};
