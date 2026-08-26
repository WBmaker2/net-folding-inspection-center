import { isConnectedNet } from '../net/adjacency';
import { validateCubeNet, type CubeValidationResult } from '../net/validateCubeNet';
import type {
  FaceDefinition,
  FaceId,
  GridPoint,
  NetDefinition,
  QuarterTurn,
} from '../net/types';

const FACE_IDS: readonly FaceId[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
const NEIGHBOR_DELTAS: readonly GridPoint[] = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
];

export interface RepairEvaluation {
  readonly changedFaceIds: readonly FaceId[];
  readonly isSingleFaceMove: boolean;
  readonly remainsConnected: boolean;
  readonly validation: CubeValidationResult;
  readonly accepted: boolean;
}

const isFaceId = (value: unknown): value is FaceId => FACE_IDS.includes(value as FaceId);
const isGridPoint = (value: unknown): value is GridPoint => (
  typeof value === 'object' && value !== null
  && Number.isSafeInteger((value as GridPoint).x)
  && Number.isSafeInteger((value as GridPoint).y)
);
const pointKey = (point: GridPoint): string => `${point.x},${point.y}`;
const samePoint = (left: GridPoint, right: GridPoint): boolean => (
  left.x === right.x && left.y === right.y
);

const cloneFace = (face: FaceDefinition): FaceDefinition => Object.freeze({
  id: face.id,
  grid: Object.freeze({ x: face.grid.x, y: face.grid.y }),
  colorToken: face.colorToken,
  symbol: face.symbol,
  decorationQuarterTurn: face.decorationQuarterTurn,
});

const freezeNet = (faces: readonly FaceDefinition[]): NetDefinition => Object.freeze({
  faces: Object.freeze(faces.map(cloneFace)),
});

const faceById = (net: NetDefinition): ReadonlyMap<FaceId, FaceDefinition> => {
  const faces = new Map<FaceId, FaceDefinition>();
  for (const face of Array.isArray(net?.faces) ? net.faces : []) {
    if (isFaceId(face.id) && !faces.has(face.id)) faces.set(face.id, face);
  }
  return faces;
};

const metadataEqual = (left: FaceDefinition, right: FaceDefinition): boolean => (
  left.id === right.id
  && left.colorToken === right.colorToken
  && left.symbol === right.symbol
  && left.decorationQuarterTurn === right.decorationQuarterTurn
);

const allFaceIds = (net: NetDefinition): boolean => (
  Array.isArray(net?.faces)
  && net.faces.length === FACE_IDS.length
  && new Set(net.faces.map((face) => face.id)).size === FACE_IDS.length
  && FACE_IDS.every((faceId) => net.faces.some((face) => face.id === faceId))
);

/** Moves one face and returns a completely independent, deeply frozen net. */
export const moveFace = (
  net: NetDefinition,
  faceId: FaceId,
  target: GridPoint,
): NetDefinition => {
  if (!net || !Array.isArray(net.faces) || !isFaceId(faceId)) {
    throw new TypeError('A known face and net are required');
  }
  if (!isGridPoint(target)) throw new TypeError('The repair target must use integer coordinates');
  const movingFace = net.faces.find((face) => face.id === faceId);
  if (movingFace === undefined) throw new RangeError(`Face ${faceId} is not in this net`);
  const occupiedByOtherFace = net.faces.some((face) => (
    face.id !== faceId && samePoint(face.grid, target)
  ));
  if (occupiedByOtherFace) throw new RangeError('The repair target is already occupied');
  return freezeNet(net.faces.map((face) => face.id === faceId
    ? { ...face, grid: { x: target.x, y: target.y } }
    : face));
};

/** Turns only the visual decoration; this is deliberately not a repair move. */
export const rotateFaceDecoration = (net: NetDefinition, faceId: FaceId): NetDefinition => {
  if (!net || !Array.isArray(net.faces) || !isFaceId(faceId)) {
    throw new TypeError('A known face and net are required');
  }
  if (!net.faces.some((face) => face.id === faceId)) {
    throw new RangeError(`Face ${faceId} is not in this net`);
  }
  return freezeNet(net.faces.map((face) => {
    if (face.id !== faceId) return face;
    const next = (face.decorationQuarterTurn + 1) % 4;
    return { ...face, decorationQuarterTurn: next as QuarterTurn };
  }));
};

const invalidValidation = (candidate: NetDefinition, baseFaceId: FaceId): CubeValidationResult => {
  let reason: CubeValidationResult['reason'] = 'inconsistent-fold';
  if (!Array.isArray(candidate?.faces) || candidate.faces.length !== FACE_IDS.length) {
    reason = 'invalid-face-count';
  } else if (!candidate.faces.some((face) => face.id === baseFaceId)) {
    reason = 'disconnected';
  }
  return {
    isValid: false,
    reason,
    collisions: [],
    missingNormals: [],
    oppositePairs: [],
    frames: new Map(),
  };
};

const safeValidation = (candidate: NetDefinition, baseFaceId: FaceId): CubeValidationResult => {
  try {
    return validateCubeNet(candidate, baseFaceId);
  } catch {
    return invalidValidation(candidate, baseFaceId);
  }
};

/**
 * Recomputes every acceptance field from the original and candidate nets.
 * Canonical answer coordinates are intentionally not consulted.
 */
export const evaluateRepair = (
  original: NetDefinition,
  candidate: NetDefinition,
  baseFaceId: FaceId,
): RepairEvaluation => {
  const originals = faceById(original);
  const candidates = faceById(candidate);
  const changedFaceIds = FACE_IDS.filter((faceId) => {
    const left = originals.get(faceId);
    const right = candidates.get(faceId);
    if (left === undefined || right === undefined) return left !== right;
    return !samePoint(left.grid, right.grid) || !metadataEqual(left, right);
  });
  const completeShape = allFaceIds(original) && allFaceIds(candidate);
  const singleGridMove = completeShape && changedFaceIds.length === 1
    && FACE_IDS.every((faceId) => {
      const left = originals.get(faceId);
      const right = candidates.get(faceId);
      if (left === undefined || right === undefined) return false;
      return faceId === changedFaceIds[0]
        ? metadataEqual(left, right) && !samePoint(left.grid, right.grid)
        : metadataEqual(left, right) && samePoint(left.grid, right.grid);
    });
  const remainsConnected = (() => {
    try {
      return completeShape && isConnectedNet(candidate);
    } catch {
      return false;
    }
  })();
  const validation = safeValidation(candidate, baseFaceId);
  return Object.freeze({
    changedFaceIds: Object.freeze([...changedFaceIds]),
    isSingleFaceMove: singleGridMove,
    remainsConnected,
    validation,
    accepted: singleGridMove && remainsConnected && validation.isValid,
  });
};

/**
 * Lists empty integer cells adjacent to the remaining net after removing a
 * selected face. Candidates are row-major and filtered by post-move reachability.
 */
export const enumerateRepairTargets = (
  net: NetDefinition,
  faceId: FaceId,
): readonly GridPoint[] => {
  if (!net || !Array.isArray(net.faces) || !isFaceId(faceId)) {
    throw new TypeError('A known face and net are required');
  }
  if (!net.faces.some((face) => face.id === faceId)) {
    throw new RangeError(`Face ${faceId} is not in this net`);
  }
  const remaining = net.faces.filter((face) => face.id !== faceId);
  const occupied = new Set(remaining.map((face) => pointKey(face.grid)));
  const current = net.faces.find((face) => face.id === faceId)?.grid;
  if (current === undefined) return [];
  const boundary = new Map<string, GridPoint>();
  remaining.forEach((face) => NEIGHBOR_DELTAS.forEach((delta) => {
    const point = { x: face.grid.x + delta.x, y: face.grid.y + delta.y };
    const key = pointKey(point);
    if (!occupied.has(key) && !samePoint(point, current)) boundary.set(key, point);
  }));
  return Object.freeze([...boundary.values()]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .filter((target) => {
      try {
        return isConnectedNet(moveFace(net, faceId, target));
      } catch {
        return false;
      }
    })
    .map((point) => Object.freeze({ x: point.x, y: point.y })));
};

export const getRepairTargets = enumerateRepairTargets;
