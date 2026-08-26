import {
  evaluateRepair,
  type RepairEvaluation,
} from './repair';
import type { RepairSubmission } from './types';
import type { FaceId, GridPoint, NetDefinition } from '../net/types';

const FACE_IDS: readonly FaceId[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
const isFaceId = (value: unknown): value is FaceId => FACE_IDS.includes(value as FaceId);
const isPoint = (value: unknown): value is GridPoint => (
  typeof value === 'object' && value !== null
  && Number.isSafeInteger((value as GridPoint).x)
  && Number.isSafeInteger((value as GridPoint).y)
);
const isCandidate = (value: unknown): value is NetDefinition => (
  typeof value === 'object' && value !== null
  && Array.isArray((value as NetDefinition).faces)
  && (value as NetDefinition).faces.every((face) => (
    typeof face === 'object' && face !== null && isFaceId(face.id) && isPoint(face.grid)
  ))
);
const samePoint = (left: GridPoint, right: GridPoint): boolean => (
  left.x === right.x && left.y === right.y
);

export class RepairValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepairValidationError';
  }
}

export interface VerifiedRepair {
  readonly submission: RepairSubmission;
  readonly evaluation: RepairEvaluation;
}

/** Validates the envelope and recomputes acceptance from the mission net. */
export const verifyRepairSubmission = (
  original: NetDefinition,
  baseFaceId: FaceId,
  value: unknown,
): VerifiedRepair => {
  if (typeof value !== 'object' || value === null || !isFaceId((value as RepairSubmission).faceId)
    || !isPoint((value as RepairSubmission).target)
    || typeof (value as RepairSubmission).accepted !== 'boolean'
    || !isCandidate((value as RepairSubmission).candidate)) {
    throw new RepairValidationError('A repair must include a candidate net and an acceptance flag');
  }
  const submission = value as RepairSubmission;
  const candidate = submission.candidate;
  const evaluation = evaluateRepair(original, candidate, baseFaceId);
  if (!evaluation.isSingleFaceMove || evaluation.changedFaceIds.length !== 1
    || evaluation.changedFaceIds[0] !== submission.faceId) {
    throw new RepairValidationError('The candidate must change exactly the submitted face');
  }
  const changedFace = candidate.faces.find((face) => face.id === submission.faceId);
  if (changedFace === undefined || !samePoint(changedFace.grid, submission.target)) {
    throw new RepairValidationError('The submitted target does not match the candidate face');
  }
  if (submission.accepted !== evaluation.accepted) {
    throw new RepairValidationError('The acceptance flag does not match the repair evaluation');
  }
  return { submission, evaluation };
};
