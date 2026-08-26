import { evaluateDecorationOrientation } from '../net/decoration';
import type { DecorationOrientationResult, AxisDirection, FaceFrame, FaceId, FoldSequence, Vec3 } from '../net/types';
import { validateCubeNet, type CubeValidationResult } from '../net/validateCubeNet';
import type { DiagnosisErrorType, DiagnosisSubmission, MissionDefinition } from './types';

export interface DiagnosisEvaluation {
  readonly isCorrect: boolean;
  /** Whether the authoritative context was available and structurally valid. */
  readonly contextValid: boolean;
  /** Whether every externally supplied engine result matched recomputation. */
  readonly sourceMatches: boolean;
  readonly validation: CubeValidationResult;
  readonly expectedErrorType: DiagnosisErrorType;
  readonly collisionPair?: readonly [FaceId, FaceId];
  readonly missingDirection?: AxisDirection;
  readonly decoration?: DecorationOrientationResult;
}

export interface DiagnosisEvaluationOptions {
  /** 화면이 보여 준 독립 검증 결과입니다. 제공되면 권위 결과와 일치해야 합니다. */
  readonly validation?: CubeValidationResult;
  /** 화면이 보여 준 장식 결과입니다. tracking 진단에는 반드시 필요합니다. */
  readonly decoration?: DecorationOrientationResult;
  /** UI callers can require an independently supplied decoration result. */
  readonly decorationRequired?: boolean;
}

const FACE_IDS: readonly FaceId[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
const AXIS_DIRECTIONS: readonly AxisDirection[] = ['+x', '-x', '+y', '-y', '+z', '-z'];

const sameFaceSet = (left: readonly FaceId[], right: readonly FaceId[]): boolean => (
  left.length === right.length
  && new Set(left).size === left.length
  && new Set(right).size === right.length
  && left.every((faceId) => right.includes(faceId))
);

const sameVec3 = (left: Vec3, right: Vec3): boolean => (
  left[0] === right[0] && left[1] === right[1] && left[2] === right[2]
);

const sameFrame = (left: FaceFrame, right: FaceFrame): boolean => (
  sameVec3(left.normal, right.normal)
  && sameVec3(left.right, right.right)
  && sameVec3(left.down, right.down)
  && sameVec3(left.center, right.center)
);

/** Optional UI data must not override an independently recomputed result. */
export const validationMatches = (
  provided: CubeValidationResult,
  expected: CubeValidationResult,
): boolean => {
  if (!isValidationShape(provided) || !isValidationShape(expected)) return false;
  try {
    if (provided.isValid !== expected.isValid || provided.reason !== expected.reason
      || provided.missingNormals.length !== expected.missingNormals.length
      || provided.missingNormals.some((direction, index) => direction !== expected.missingNormals[index])
      || provided.collisions.length !== expected.collisions.length
      || provided.collisions.some((collision, index) => {
        const expectedCollision = expected.collisions[index];
        return expectedCollision === undefined
          || !Array.isArray(collision?.faceIds) || collision.faceIds.length !== 2
          || !Array.isArray(expectedCollision.faceIds) || expectedCollision.faceIds.length !== 2
          || collision.faceIds[0] !== expectedCollision.faceIds[0]
          || collision.faceIds[1] !== expectedCollision.faceIds[1]
          || !sameVec3(collision.normal, expectedCollision.normal);
      })) return false;

    const expectedEntries = [...expected.frames.entries()];
    return provided.frames.size === expected.frames.size
      && expectedEntries.every(([faceId, frame]) => {
        const providedFrame = provided.frames.get(faceId);
        return providedFrame !== undefined && sameFrame(providedFrame, frame);
      });
  } catch {
    return false;
  }
};

export const isValidationShape = (value: unknown): value is CubeValidationResult => {
  try {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<CubeValidationResult>;
    return typeof candidate.isValid === 'boolean'
      && typeof candidate.reason === 'string'
      && Array.isArray(candidate.missingNormals)
      && candidate.missingNormals.every((direction) => AXIS_DIRECTIONS.includes(direction as AxisDirection))
      && Array.isArray(candidate.collisions)
      && candidate.frames !== null
      && candidate.frames !== undefined
      && typeof candidate.frames.size === 'number'
      && typeof candidate.frames.get === 'function';
  } catch {
    return false;
  }
};

const collisionPairFor = (
  mission: MissionDefinition,
  validation: CubeValidationResult,
): readonly [FaceId, FaceId] | undefined => {
  if (mission.kind === 'collision') return mission.answer.collisionPair;
  if (mission.kind === 'repair') return validation.collisions[0]?.faceIds;
  return undefined;
};

const expectedErrorTypeFor = (mission: MissionDefinition): DiagnosisErrorType => (
  mission.kind === 'tracking' ? 'decoration-direction' : 'overlap'
);

const expectedDecorationFor = (
  mission: MissionDefinition,
  validation: CubeValidationResult,
): DecorationOrientationResult | undefined => {
  if (mission.kind !== 'tracking' || !validation.isValid) return undefined;
  const target = mission.answer.decorationTarget;
  const face = mission.net.faces.find((candidate) => candidate.id === target.faceId);
  const frame = validation.frames.get(target.faceId);
  if (face === undefined || frame === undefined) return undefined;
  return evaluateDecorationOrientation(face, frame, target.targetWorldUp);
};

const suppliedDecorationMatches = (
  provided: DecorationOrientationResult | undefined,
  expected: DecorationOrientationResult | undefined,
  required: boolean,
): boolean => {
  if (expected === undefined || (required && provided === undefined)) return false;
  if (provided === undefined) return true;
  try {
    return typeof provided === 'object' && provided !== null
      && provided.worldUp === expected.worldUp
      && provided.targetWorldUp === expected.targetWorldUp
      && provided.matchesTarget === expected.matchesTarget;
  } catch {
    return false;
  }
};

/**
 * The sole diagnosis authority. It always recomputes from the learner's base;
 * supplied screen results are only accepted when they match that computation.
 */
export const evaluateDiagnosis = (
  mission: MissionDefinition,
  diagnosis: DiagnosisSubmission,
  baseFaceId = mission.baseFaceId,
  options: DiagnosisEvaluationOptions = {},
): DiagnosisEvaluation => {
  const validation = validateCubeNet(mission.net, baseFaceId);
  const expectedErrorType = expectedErrorTypeFor(mission);
  const sourceValidationMatches = options.validation === undefined
    || validationMatches(options.validation, validation);

  if (!diagnosis || !Array.isArray(diagnosis.selectedFaceIds)) {
    return {
      isCorrect: false,
      contextValid: sourceValidationMatches,
      sourceMatches: sourceValidationMatches,
      validation,
      expectedErrorType,
    };
  }
  const facesAreKnown = diagnosis.selectedFaceIds.every((faceId) => FACE_IDS.includes(faceId));
  const errorTypeMatches = diagnosis.selectedErrorType === expectedErrorType;
  const expectedPair = collisionPairFor(mission, validation);
  const pairMatches = expectedPair !== undefined
    && sameFaceSet(diagnosis.selectedFaceIds, expectedPair);

  if (mission.kind === 'tracking') {
    const expectedDecoration = expectedDecorationFor(mission, validation);
    const providedDecoration = options.decoration;
    const decorationMatches = suppliedDecorationMatches(
      providedDecoration,
      expectedDecoration,
      options.decorationRequired === true,
    );
    const sourceMatches = sourceValidationMatches && decorationMatches;
    const selectedTarget = diagnosis.selectedFaceIds.length === 1
      && diagnosis.selectedFaceIds[0] === mission.answer.decorationTarget.faceId;
    return {
      isCorrect: validation.isValid && facesAreKnown && errorTypeMatches
        && selectedTarget && diagnosis.selectedMissingDirection === undefined && decorationMatches,
      contextValid: sourceMatches && expectedDecoration !== undefined,
      sourceMatches,
      validation,
      expectedErrorType,
      decoration: expectedDecoration,
    };
  }

  const missingDirection = validation.missingNormals[0];
  const isCollisionModel = validation.reason === 'overlap' && expectedPair !== undefined;
  return {
    isCorrect: isCollisionModel && facesAreKnown && errorTypeMatches && pairMatches
      && missingDirection !== undefined && diagnosis.selectedMissingDirection === missingDirection,
    contextValid: sourceValidationMatches && isCollisionModel && missingDirection !== undefined,
    sourceMatches: sourceValidationMatches,
    validation,
    expectedErrorType,
    collisionPair: expectedPair,
    ...(missingDirection === undefined ? {} : { missingDirection }),
  };
};

/** First completed fold where the selected faces have the same normal. */
export const firstSharedNormalStep = (
  sequence: FoldSequence | undefined,
  faceIds: readonly FaceId[],
): number | null => {
  if (sequence === undefined || faceIds.length < 2) return null;
  for (const snapshot of sequence.snapshots) {
    const frames = faceIds.map((faceId) => snapshot.frames.get(faceId));
    if (frames.length >= 2 && frames.every((frame) => frame !== undefined)
      && frames.slice(1).every((frame) => sameVec3(frame!.normal, frames[0]!.normal))) {
      return snapshot.stepIndex;
    }
  }
  return null;
};

export const isAxisDirection = (value: unknown): value is AxisDirection => (
  AXIS_DIRECTIONS.includes(value as AxisDirection)
);
