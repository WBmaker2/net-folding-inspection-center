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
const FACE_STYLES: Readonly<Record<FaceId, Pick<FaceDefinition, 'colorToken' | 'symbol'>>> = {
  F1: { colorToken: 'blue', symbol: 'circle' },
  F2: { colorToken: 'yellow', symbol: 'square' },
  F3: { colorToken: 'green', symbol: 'triangle' },
  F4: { colorToken: 'coral', symbol: 'star' },
  F5: { colorToken: 'purple', symbol: 'diamond' },
  F6: { colorToken: 'teal', symbol: 'cross' },
};
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
const isFaceDefinition = (value: unknown): value is FaceDefinition => {
  if (typeof value !== 'object' || value === null) return false;
  const face = value as Partial<FaceDefinition>;
  return isFaceId(face.id)
    && isGridPoint(face.grid)
    && face.colorToken === FACE_STYLES[face.id].colorToken
    && face.symbol === FACE_STYLES[face.id].symbol
    && typeof face.decorationQuarterTurn === 'number'
    && Number.isInteger(face.decorationQuarterTurn)
    && face.decorationQuarterTurn >= 0
    && face.decorationQuarterTurn <= 3;
};
const isValidNet = (value: unknown): value is NetDefinition => {
  try {
    if (typeof value !== 'object' || value === null || !Array.isArray((value as NetDefinition).faces)) {
      return false;
    }
    const faces = (value as NetDefinition).faces;
    return faces.length === FACE_IDS.length
      && faces.every(isFaceDefinition)
      && new Set(faces.map((face) => face.id)).size === FACE_IDS.length
      && new Set(faces.map((face) => pointKey(face.grid))).size === faces.length;
  } catch {
    return false;
  }
};
const assertValidNet: (value: unknown) => asserts value is NetDefinition = (value) => {
  if (!isValidNet(value)) throw new TypeError('A net must contain six unique, well-formed faces');
};

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

/** Drops extension fields while validating a candidate's complete face shape. */
export const canonicalizeNet = (value: unknown): NetDefinition | null => {
  try {
    return isValidNet(value) ? freezeNet(value.faces) : null;
  } catch {
    return null;
  }
};

const faceById = (net: NetDefinition): ReadonlyMap<FaceId, FaceDefinition> => {
  const faces = new Map<FaceId, FaceDefinition>();
  for (const face of Array.isArray(net?.faces) ? net.faces : []) {
    if (isFaceDefinition(face) && !faces.has(face.id)) faces.set(face.id, face);
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
  isValidNet(net)
);

/** Moves one face and returns a completely independent, deeply frozen net. */
export const moveFace = (
  net: NetDefinition,
  faceId: FaceId,
  target: GridPoint,
): NetDefinition => {
  assertValidNet(net);
  if (!isFaceId(faceId)) throw new TypeError('A known face is required');
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
  assertValidNet(net);
  if (!isFaceId(faceId)) throw new TypeError('A known face is required');
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
  try {
    if (!Array.isArray(candidate?.faces) || candidate.faces.length !== FACE_IDS.length) {
      reason = 'invalid-face-count';
    } else if (!candidate.faces.some((face) => face.id === baseFaceId)) {
      reason = 'disconnected';
    }
  } catch {
    reason = 'invalid-face-count';
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
  if (!isValidNet(candidate)) return invalidValidation(candidate, baseFaceId);
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
  try {
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
  } catch {
    return Object.freeze({
      changedFaceIds: Object.freeze([]),
      isSingleFaceMove: false,
      remainsConnected: false,
      validation: invalidValidation(candidate, baseFaceId),
      accepted: false,
    });
  }
};

/**
 * Lists empty integer cells adjacent to the remaining net after removing a
 * selected face. Candidates are row-major and filtered by post-move reachability.
 */
export const enumerateRepairTargets = (
  net: NetDefinition,
  faceId: FaceId,
): readonly GridPoint[] => {
  assertValidNet(net);
  if (!isFaceId(faceId)) throw new TypeError('A known face is required');
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
