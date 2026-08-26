import { getMissionById } from '../../content/missions/catalog';
import { validateCubeNet } from '../net/validateCubeNet';
import type {
  AxisDirection,
  DiagnosisSubmission,
  FaceId,
  FoldDirection,
  GridPoint,
  MissionDefinition,
  MissionId,
  PersistedEvidenceSubmission,
  PersistedLearningAttempts,
  PersistedProgress,
  PredictionRecord,
  RepairSubmission,
} from './types';

const MISSION_IDS: readonly MissionId[] = [
  'cube-track-01', 'cube-track-02',
  'cube-opposite-01', 'cube-opposite-02',
  'cube-collision-01', 'cube-collision-02',
  'cube-repair-01', 'cube-repair-02',
];
const FACE_IDS: readonly FaceId[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
const FOLD_DIRECTIONS: readonly FoldDirection[] = ['north', 'east', 'south', 'west'];
const AXIS_DIRECTIONS: readonly AxisDirection[] = ['+x', '-x', '+y', '-y', '+z', '-z'];
const DIAGNOSIS_TYPES = ['overlap', 'missing-face', 'decoration-direction'] as const;
const LEARNING_STAGES = [
  'intake', 'prediction', 'folding', 'diagnosis', 'repair', 'evidence', 'complete',
] as const;
const GEOMETRY_TERMS = ['맞은편', '모서리', '면', '접는 방향', '겹침', '빈 면'] as const;
type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);
const isMissionId = (value: unknown): value is MissionId => MISSION_IDS.includes(value as MissionId);
const isFaceId = (value: unknown): value is FaceId => FACE_IDS.includes(value as FaceId);
const isFoldDirection = (value: unknown): value is FoldDirection => (
  FOLD_DIRECTIONS.includes(value as FoldDirection)
);
const isAxisDirection = (value: unknown): value is AxisDirection => (
  AXIS_DIRECTIONS.includes(value as AxisDirection)
);
const isStage = (value: unknown): value is PersistedProgress['stage'] => (
  LEARNING_STAGES.includes(value as PersistedProgress['stage'])
);
const isGeometryTerm = (value: unknown): value is typeof GEOMETRY_TERMS[number] => (
  GEOMETRY_TERMS.includes(value as typeof GEOMETRY_TERMS[number])
);
const uniqueFaces = (value: readonly FaceId[]): boolean => new Set(value).size === value.length;
const integerPoint = (value: unknown): value is GridPoint => (
  isRecord(value)
  && Number.isSafeInteger(value.x)
  && Number.isSafeInteger(value.y)
);
const movingFacesForBase = (
  mission: MissionDefinition,
  baseFaceId: FaceId,
): readonly FaceId[] => (
  mission.net.faces
    .map((face) => face.id)
    .filter((faceId) => faceId !== baseFaceId)
);

const sanitizeArrowByFace = (
  value: unknown,
  mission: MissionDefinition,
  baseFaceId: FaceId,
): Partial<Record<FaceId, FoldDirection>> | null => {
  if (!isRecord(value)) return null;
  const movingFaceIds = movingFacesForBase(mission, baseFaceId);
  const keys = Reflect.ownKeys(value);
  if (keys.length !== movingFaceIds.length || keys.some((key) => typeof key !== 'string')) {
    return null;
  }
  if (keys.some((key) => {
    if (typeof key !== 'string' || !isFaceId(key)) return true;
    return key === baseFaceId || !movingFaceIds.includes(key);
  })) return null;
  if (movingFaceIds.some((faceId) => !Object.prototype.hasOwnProperty.call(value, faceId))) {
    return null;
  }
  const arrowByFace: Partial<Record<FaceId, FoldDirection>> = {};
  for (const faceId of movingFaceIds) {
    const direction = value[faceId];
    if (!isFoldDirection(direction)) return null;
    arrowByFace[faceId] = direction;
  }
  return arrowByFace;
};

const sanitizePrediction = (
  value: unknown,
  mission: MissionDefinition,
): PredictionRecord | null => {
  if (!isRecord(value) || !isFaceId(value.baseFaceId) || !isFaceId(value.predictedTopFaceId)
    || !mission.net.faces.some((face) => face.id === value.baseFaceId)
    || !mission.net.faces.some((face) => face.id === value.predictedTopFaceId)
    || value.predictedTopFaceId === value.baseFaceId
    || !Array.isArray(value.foldOrder)) return null;
  const movingFaceIds = movingFacesForBase(mission, value.baseFaceId);
  if (value.foldOrder.length !== movingFaceIds.length
    || !value.foldOrder.every(isFaceId) || !uniqueFaces(value.foldOrder)
    || !value.foldOrder.every((faceId) => movingFaceIds.includes(faceId))
    || typeof value.submittedAtIso !== 'string'
    || value.submittedAtIso.trim().length === 0) return null;
  const arrowByFace = sanitizeArrowByFace(value.arrowByFace, mission, value.baseFaceId);
  if (arrowByFace === null) return null;
  return {
    baseFaceId: value.baseFaceId,
    predictedTopFaceId: value.predictedTopFaceId,
    foldOrder: [...value.foldOrder],
    arrowByFace,
    submittedAtIso: value.submittedAtIso,
  };
};

const sanitizeDiagnosis = (value: unknown): DiagnosisSubmission | null => {
  if (!isRecord(value)) return null;
  const selectedErrorType = value.selectedErrorType;
  if (typeof selectedErrorType !== 'string'
    || !DIAGNOSIS_TYPES.includes(selectedErrorType as typeof DIAGNOSIS_TYPES[number])
    || !Array.isArray(value.selectedFaceIds) || !value.selectedFaceIds.every(isFaceId)
    || !uniqueFaces(value.selectedFaceIds)) return null;
  if (value.selectedMissingDirection !== undefined && !isAxisDirection(value.selectedMissingDirection)) {
    return null;
  }
  return {
    selectedErrorType: selectedErrorType as DiagnosisSubmission['selectedErrorType'],
    selectedFaceIds: [...value.selectedFaceIds],
    ...(value.selectedMissingDirection === undefined
      ? {}
      : { selectedMissingDirection: value.selectedMissingDirection }),
  };
};

const sanitizeFace = (value: unknown): RecordValue | null => {
  const turn = isRecord(value) ? value.decorationQuarterTurn : undefined;
  if (!isRecord(value) || !isFaceId(value.id) || !integerPoint(value.grid)
    || typeof value.colorToken !== 'string' || typeof value.symbol !== 'string'
    || typeof turn !== 'number' || !Number.isInteger(turn)
    || turn < 0 || turn > 3) return null;
  return {
    id: value.id,
    grid: { x: value.grid.x, y: value.grid.y },
    colorToken: value.colorToken,
    symbol: value.symbol,
    decorationQuarterTurn: turn,
  };
};

const sanitizeRepair = (value: unknown): RepairSubmission | null => {
  if (!isRecord(value) || !isFaceId(value.faceId) || !integerPoint(value.target)) return null;
  if (typeof value.accepted !== 'boolean') return null;
  if (value.submittedAtIso !== undefined && typeof value.submittedAtIso !== 'string') return null;
  let repair: RepairSubmission = {
    faceId: value.faceId,
    target: { x: value.target.x, y: value.target.y },
    accepted: value.accepted,
    ...(value.submittedAtIso === undefined ? {} : { submittedAtIso: value.submittedAtIso }),
  };
  if (value.candidate !== undefined) {
    if (!isRecord(value.candidate) || !Array.isArray(value.candidate.faces)) return null;
    const faces = value.candidate.faces.map(sanitizeFace);
    if (faces.some((face) => face === null)) return null;
    repair = {
      ...repair,
      candidate: { faces: faces as RecordValue[] } as unknown as RepairSubmission['candidate'],
    };
  }
  return repair;
};

const sanitizePersistedEvidence = (value: unknown): PersistedEvidenceSubmission | null => {
  if (!isRecord(value) || !Array.isArray(value.selectedTerms) || value.selectedTerms.length === 0
    || !value.selectedTerms.every(isGeometryTerm)
    || new Set(value.selectedTerms).size !== value.selectedTerms.length) return null;
  if (value.oppositePair !== undefined
    && (!isRecord(value.oppositePair) || !isFaceId(value.oppositePair.a)
      || !isFaceId(value.oppositePair.b) || value.oppositePair.a === value.oppositePair.b)) return null;
  const oppositePair = value.oppositePair;
  return {
    ...(oppositePair === undefined ? {} : {
      oppositePair: {
        a: oppositePair.a as FaceId,
        b: oppositePair.b as FaceId,
      },
    }),
    selectedTerms: [...value.selectedTerms],
  };
};

const sanitizePersistedAttempts = (
  value: unknown,
  mission: MissionDefinition | null,
): PersistedLearningAttempts | null => {
  if (!isRecord(value) || !Array.isArray(value.predictions) || !Array.isArray(value.diagnoses)
    || !Array.isArray(value.repairs) || !Array.isArray(value.evidence)) return null;
  const predictions = mission === null
    ? value.predictions.map(() => null)
    : value.predictions.map((prediction) => sanitizePrediction(prediction, mission));
  const diagnoses = value.diagnoses.map(sanitizeDiagnosis);
  const repairs = value.repairs.map(sanitizeRepair);
  const evidence = value.evidence.map(sanitizePersistedEvidence);
  if ([...predictions, ...diagnoses, ...repairs, ...evidence].some((item) => item === null)) return null;
  return {
    predictions: predictions as PredictionRecord[],
    diagnoses: diagnoses as DiagnosisSubmission[],
    repairs: repairs as RepairSubmission[],
    evidence: evidence as PersistedEvidenceSubmission[],
  };
};

const predictionMatchesMission = (
  prediction: PredictionRecord,
  mission: MissionDefinition,
): boolean => {
  const movingFaceIds = movingFacesForBase(mission, prediction.baseFaceId);
  return mission.net.faces.some((face) => face.id === prediction.baseFaceId)
    && prediction.predictedTopFaceId !== prediction.baseFaceId
    && prediction.foldOrder.length === movingFaceIds.length
    && new Set(prediction.foldOrder).size === prediction.foldOrder.length
    && prediction.foldOrder.every((faceId) => movingFaceIds.includes(faceId));
};

const sameFaceSet = (left: readonly FaceId[], right: readonly FaceId[]): boolean => (
  left.length === right.length
  && new Set(left).size === left.length
  && new Set(right).size === right.length
  && left.every((faceId) => right.includes(faceId))
);

const expectedCollisionFaces = (mission: MissionDefinition): readonly FaceId[] => {
  if (mission.kind === 'collision') return mission.answer.collisionPair;
  if (mission.kind === 'repair') {
    return validateCubeNet(mission.net, mission.baseFaceId).collisions[0]?.faceIds ?? [];
  }
  return [];
};

const diagnosisIsCorrect = (
  mission: MissionDefinition,
  diagnosis: DiagnosisSubmission,
  baseFaceId = mission.baseFaceId,
): boolean => {
  if (mission.kind !== 'collision' && mission.kind !== 'repair') return false;
  if (diagnosis.selectedErrorType !== mission.errorModel
    || !sameFaceSet(diagnosis.selectedFaceIds, expectedCollisionFaces(mission))
    || diagnosis.selectedMissingDirection === undefined) return false;
  const expectedDirection = validateCubeNet(mission.net, baseFaceId).missingNormals[0];
  return expectedDirection !== undefined
    && diagnosis.selectedMissingDirection === expectedDirection;
};

const hasNoReviewData = (
  diagnosis: DiagnosisSubmission | null,
  repair: RepairSubmission | null,
  evidence: PersistedEvidenceSubmission | null,
): boolean => diagnosis === null && repair === null && evidence === null;

const attemptsAreEmpty = (attempts: PersistedLearningAttempts): boolean => (
  attempts.predictions.length === 0
  && attempts.diagnoses.length === 0
  && attempts.repairs.length === 0
  && attempts.evidence.length === 0
);

/** Sanitizers emit deterministic key order, so JSON is a stable structural comparison here. */
const structurallyEqual = (left: unknown, right: unknown): boolean => (
  JSON.stringify(left) === JSON.stringify(right)
);

const matchesLastAttempt = <T>(current: T | null, attempts: readonly T[]): boolean => (
  current === null
  || (attempts.length > 0 && structurallyEqual(current, attempts[attempts.length - 1]))
);

const isReachableProgress = (
  missionId: MissionId | null,
  stage: PersistedProgress['stage'],
  prediction: PredictionRecord | null,
  foldStepIndex: number,
  diagnosis: DiagnosisSubmission | null,
  repair: RepairSubmission | null,
  evidence: PersistedEvidenceSubmission | null,
  attempts: PersistedLearningAttempts,
  completedMissionIds: readonly MissionId[],
): boolean => {
  if (missionId === null) {
    return stage === 'intake'
      && prediction === null
      && foldStepIndex === 0
      && hasNoReviewData(diagnosis, repair, evidence)
      && attemptsAreEmpty(attempts);
  }

  const mission = getMissionById(missionId);
  if (stage === 'intake' || prediction !== null && !predictionMatchesMission(prediction, mission)) {
    return false;
  }
  if (stage === 'prediction') {
    return prediction === null
      && foldStepIndex === 0
      && hasNoReviewData(diagnosis, repair, evidence)
      && attemptsAreEmpty(attempts);
  }
  if (prediction === null
    || attempts.predictions.length !== 1
    || !structurallyEqual(prediction, attempts.predictions[attempts.predictions.length - 1])
    || !matchesLastAttempt(diagnosis, attempts.diagnoses)
    || !matchesLastAttempt(repair, attempts.repairs)
    || !matchesLastAttempt(evidence, attempts.evidence)) return false;
  if (stage === 'folding') {
    return foldStepIndex >= 0 && foldStepIndex < 5
      && hasNoReviewData(diagnosis, repair, evidence);
  }
  if (foldStepIndex !== 5) return false;

  const diagnosticMission = mission.kind === 'collision' || mission.kind === 'repair';
  if (!diagnosticMission && (attempts.diagnoses.length > 0 || attempts.repairs.length > 0)) {
    return false;
  }
  if (stage === 'diagnosis') {
    return diagnosticMission && repair === null && evidence === null
      && (diagnosis === null || !diagnosisIsCorrect(mission, diagnosis, prediction.baseFaceId));
  }
  if (stage === 'repair') {
    return diagnosticMission && diagnosis !== null
      && diagnosisIsCorrect(mission, diagnosis, prediction.baseFaceId)
      && evidence === null
      && (repair === null || repair.accepted === false);
  }
  if (stage === 'evidence' || stage === 'complete') {
    if (diagnosticMission) {
      if (diagnosis === null || !diagnosisIsCorrect(mission, diagnosis, prediction.baseFaceId)
        || repair === null || repair.accepted !== true) return false;
    } else if (diagnosis !== null || repair !== null) {
      return false;
    }
    if (stage === 'complete') {
      return evidence !== null && attempts.evidence.length > 0
        && completedMissionIds.includes(missionId);
    }
    return true;
  }
  return false;
};

/** Rebuilds persisted data from an allowlist, dropping unknown/personal fields. */
export const sanitizePersistedProgress = (value: unknown): PersistedProgress | null => {
  if (!isRecord(value) || value.version !== 1
    || (value.missionId !== null && !isMissionId(value.missionId))
    || !isStage(value.stage)
    || typeof value.foldStepIndex !== 'number'
    || !Number.isInteger(value.foldStepIndex)
    || value.foldStepIndex < 0 || value.foldStepIndex > 5
    || !Array.isArray(value.completedMissionIds)
    || !value.completedMissionIds.every(isMissionId)) return null;

  const missionId = value.missionId as MissionId | null;
  const mission = missionId === null ? null : getMissionById(missionId);
  const prediction = value.prediction === null
    ? null
    : mission === null ? null : sanitizePrediction(value.prediction, mission);
  const diagnosis = value.diagnosis === null ? null : sanitizeDiagnosis(value.diagnosis);
  const repair = value.repair === null ? null : sanitizeRepair(value.repair);
  const evidence = value.evidence === null
    ? null
    : sanitizePersistedEvidence(value.evidence);
  const attempts = sanitizePersistedAttempts(value.attempts, mission);
  if ((value.prediction !== null && prediction === null)
    || (value.diagnosis !== null && diagnosis === null)
    || (value.repair !== null && repair === null)
    || (value.evidence !== null && evidence === null)
    || attempts === null) return null;

  const completedMissionIds = value.completedMissionIds as MissionId[];
  if (new Set(completedMissionIds).size !== completedMissionIds.length
    || !isReachableProgress(
      missionId,
      value.stage,
      prediction,
      value.foldStepIndex,
      diagnosis,
      repair,
      evidence,
      attempts,
      completedMissionIds,
    )) return null;

  return {
    version: 1,
    missionId,
    stage: value.stage,
    prediction,
    foldStepIndex: value.foldStepIndex,
    diagnosis,
    repair,
    evidence,
    attempts,
    completedMissionIds: [...completedMissionIds],
  };
};
