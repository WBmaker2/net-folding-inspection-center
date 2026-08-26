import { getMissionById } from '../../content/missions/catalog';
import { evaluateDiagnosis } from './diagnosis';
import { verifyRepairSubmission, RepairValidationError } from './repairValidation';
import type {
  AxisDirection,
  FaceId,
  FoldDirection,
  GridPoint,
  LearningAction,
  LearningAttempts,
  LearningState,
  MissionDefinition,
  MissionId,
  PredictionRecord,
  DiagnosisSubmission,
  EvidenceSubmission,
  RepairSubmission,
} from './types';
const FOLD_STEP_COUNT = 5;
const FOLD_DIRECTIONS = ['north', 'east', 'south', 'west'] as const;
const AXIS_DIRECTIONS: readonly AxisDirection[] = ['+x', '-x', '+y', '-y', '+z', '-z'];
const DIAGNOSIS_TYPES = ['overlap', 'missing-face', 'decoration-direction'] as const;
const GEOMETRY_TERMS = ['맞은편', '모서리', '면', '접는 방향', '겹침', '빈 면'] as const;
const FACE_IDS: readonly FaceId[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
export class LearningTransitionError extends Error {
  readonly actionType: LearningAction['type'];
  readonly stage: LearningState['stage'];

  constructor(
    message: string,
    actionType: LearningAction['type'],
    stage: LearningState['stage'],
  ) {
    super(message);
    this.name = 'LearningTransitionError';
    this.actionType = actionType;
    this.stage = stage;
  }
}
export class InvalidLearningTransitionError extends LearningTransitionError {
  constructor(message: string, actionType: LearningAction['type'], stage: LearningState['stage']) {
    super(message, actionType, stage);
    this.name = 'InvalidLearningTransitionError';
  }
}
export class PredictionRequiredError extends LearningTransitionError {
  constructor(actionType: LearningAction['type'], stage: LearningState['stage']) {
    super('A prediction is required before the fold result can be revealed', actionType, stage);
    this.name = 'PredictionRequiredError';
  }
}
export class StaleLearningActionError extends LearningTransitionError {
  constructor(actionType: LearningAction['type'], stage: LearningState['stage']) {
    super('The action belongs to a different mission', actionType, stage);
    this.name = 'StaleLearningActionError';
  }
}
/** Backwards-compatible name for callers that classify malformed actions. */
export { InvalidLearningTransitionError as InvalidLearningActionError };
const freezeArray = <T>(items: readonly T[]): readonly T[] => Object.freeze([...items]);

const freezePoint = (point: GridPoint): GridPoint => Object.freeze({ x: point.x, y: point.y });

const movingFaceIdsFor = (
  mission: MissionDefinition,
  baseFaceId = mission.baseFaceId,
): readonly FaceId[] => (
  mission.net.faces
    .map((face) => face.id)
    .filter((faceId) => faceId !== baseFaceId)
);
const clonePrediction = (
  prediction: PredictionRecord,
  mission: MissionDefinition,
): PredictionRecord => {
  const arrowByFace: Partial<Record<FaceId, FoldDirection>> = {};
  movingFaceIdsFor(mission, prediction.baseFaceId).forEach((faceId) => {
    arrowByFace[faceId] = prediction.arrowByFace[faceId] as FoldDirection;
  });
  return Object.freeze({
    baseFaceId: prediction.baseFaceId,
    predictedTopFaceId: prediction.predictedTopFaceId,
    foldOrder: freezeArray(prediction.foldOrder),
    arrowByFace: Object.freeze(arrowByFace),
    submittedAtIso: prediction.submittedAtIso,
  });
};
const cloneDiagnosis = (diagnosis: DiagnosisSubmission): DiagnosisSubmission => Object.freeze({
  selectedErrorType: diagnosis.selectedErrorType,
  selectedFaceIds: freezeArray(diagnosis.selectedFaceIds),
  ...(diagnosis.selectedMissingDirection === undefined
    ? {}
    : { selectedMissingDirection: diagnosis.selectedMissingDirection }),
});

const cloneRepair = (repair: RepairSubmission): RepairSubmission => Object.freeze({
  faceId: repair.faceId,
  target: freezePoint(repair.target),
  accepted: repair.accepted,
  candidate: Object.freeze({
    faces: freezeArray(repair.candidate.faces.map((face) => Object.freeze({
      id: face.id,
      grid: freezePoint(face.grid),
      colorToken: face.colorToken,
      symbol: face.symbol,
      decorationQuarterTurn: face.decorationQuarterTurn,
    }))),
  }),
  ...(repair.submittedAtIso === undefined ? {} : { submittedAtIso: repair.submittedAtIso }),
});

const cloneEvidence = (evidence: EvidenceSubmission): EvidenceSubmission => Object.freeze({
  ...(evidence.oppositePair === undefined ? {} : {
    oppositePair: Object.freeze({ ...evidence.oppositePair }),
  }),
  selectedTerms: freezeArray(evidence.selectedTerms),
  completedSentence: evidence.completedSentence,
});

const emptyAttempts = (): LearningAttempts => Object.freeze({
  predictions: freezeArray([]),
  diagnoses: freezeArray([]),
  repairs: freezeArray([]),
  evidence: freezeArray([]),
});

const freezeAttempts = (attempts: LearningAttempts): LearningAttempts => Object.freeze({
  predictions: freezeArray(attempts.predictions),
  diagnoses: freezeArray(attempts.diagnoses),
  repairs: freezeArray(attempts.repairs),
  evidence: freezeArray(attempts.evidence),
});

const freezeState = (state: LearningState): LearningState => Object.freeze({
  ...state,
  attempts: freezeAttempts(state.attempts),
  completedMissionIds: freezeArray(state.completedMissionIds),
});

export const createInitialLearningState = (): LearningState => freezeState({
  missionId: null,
  stage: 'intake',
  prediction: null,
  foldStepIndex: 0,
  diagnosis: null,
  repair: null,
  evidence: null,
  attempts: emptyAttempts(),
  storageOptIn: false,
  completedMissionIds: [],
});

const transitionError = (
  state: LearningState,
  action: LearningAction,
  message: string,
): InvalidLearningTransitionError => (
  new InvalidLearningTransitionError(message, action.type, state.stage)
);

const missionFor = (state: LearningState, action: LearningAction): MissionDefinition => {
  if (state.missionId === null) {
    throw transitionError(state, action, 'A mission must be selected first');
  }
  return getMissionById(state.missionId);
};

const assertMissionScope = (
  state: LearningState,
  action: LearningAction & { readonly missionId?: MissionId },
): void => {
  if (action.missionId !== undefined && action.missionId !== state.missionId) {
    throw new StaleLearningActionError(action.type, state.stage);
  }
};

const isFaceId = (value: unknown): value is FaceId => FACE_IDS.includes(value as FaceId);
const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);
const isFoldDirection = (value: unknown): value is typeof FOLD_DIRECTIONS[number] => (
  FOLD_DIRECTIONS.includes(value as typeof FOLD_DIRECTIONS[number])
);
const isAxisDirection = (value: unknown): value is AxisDirection => (
  AXIS_DIRECTIONS.includes(value as AxisDirection)
);
const isGeometryTerm = (value: unknown): value is typeof GEOMETRY_TERMS[number] => (
  GEOMETRY_TERMS.includes(value as typeof GEOMETRY_TERMS[number])
);

const sameFaceSet = (left: readonly FaceId[], right: readonly FaceId[]): boolean => (
  left.length === right.length
  && new Set(left).size === left.length
  && new Set(right).size === right.length
  && left.every((faceId) => right.includes(faceId))
);

const validatePrediction = (
  state: LearningState,
  action: Extract<LearningAction, { readonly type: 'SUBMIT_PREDICTION' }>,
  mission: MissionDefinition,
): PredictionRecord => {
  const value = action.prediction;
  if (value === null || typeof value !== 'object') {
    throw transitionError(state, action, 'A prediction record is required');
  }
  const missionFaces = mission.net.faces.map((face) => face.id);
  if (!missionFaces.includes(value.baseFaceId)) {
    throw transitionError(state, action, 'The prediction base face does not match this mission');
  }
  if (!isFaceId(value.predictedTopFaceId)
    || !missionFaces.includes(value.predictedTopFaceId)
    || value.predictedTopFaceId === value.baseFaceId) {
    throw transitionError(state, action, 'The predicted top face must differ from the base face');
  }
  const movingFaceIds = missionFaces.filter((faceId) => faceId !== value.baseFaceId);
  if (!Array.isArray(value.foldOrder)
    || value.foldOrder.length !== missionFaces.length - 1
    || !value.foldOrder.every(isFaceId)) {
    throw transitionError(state, action, 'The prediction must contain each moving face exactly once');
  }
  const movingFaces = value.foldOrder as unknown as readonly FaceId[];
  if (movingFaces.length !== missionFaces.length - 1
    || !sameFaceSet(movingFaces, movingFaceIds)) {
    throw transitionError(state, action, 'The prediction must contain each moving face exactly once');
  }
  if (!isRecord(value.arrowByFace)) {
    throw transitionError(state, action, 'The prediction fold directions are invalid');
  }
  const arrowKeys = Reflect.ownKeys(value.arrowByFace);
  if (arrowKeys.length !== movingFaceIds.length
    || arrowKeys.some((key) => typeof key !== 'string')
    || arrowKeys.some((key) => (
      !isFaceId(key) || key === value.baseFaceId || !movingFaceIds.includes(key)
    ))
    || movingFaceIds.some((faceId) => !Object.prototype.hasOwnProperty.call(value.arrowByFace, faceId))) {
    throw transitionError(state, action, 'The prediction must define one direction for each moving face');
  }
  if (movingFaceIds.some((faceId) => !isFoldDirection(value.arrowByFace[faceId]))) {
    throw transitionError(state, action, 'The prediction fold directions are invalid');
  }
  if (typeof value.submittedAtIso !== 'string' || value.submittedAtIso.trim().length === 0) {
    throw transitionError(state, action, 'The prediction timestamp is required');
  }
  return clonePrediction(value, mission);
};

const validateDiagnosis = (
  state: LearningState,
  action: Extract<LearningAction, { readonly type: 'SUBMIT_DIAGNOSIS' }>,
): DiagnosisSubmission => {
  const value = action.diagnosis;
  if (!value || !DIAGNOSIS_TYPES.includes(value.selectedErrorType)) {
    throw transitionError(state, action, 'The diagnosis type is invalid');
  }
  if (!Array.isArray(value.selectedFaceIds)
    || !value.selectedFaceIds.every(isFaceId)
    || new Set(value.selectedFaceIds).size !== value.selectedFaceIds.length) {
    throw transitionError(state, action, 'The diagnosis faces are invalid');
  }
  if (value.selectedMissingDirection !== undefined
    && !isAxisDirection(value.selectedMissingDirection)) {
    throw transitionError(state, action, 'The missing direction is invalid');
  }
  return cloneDiagnosis(value);
};

const validateEvidence = (
  state: LearningState,
  action: Extract<LearningAction, { readonly type: 'SUBMIT_EVIDENCE' }>,
): EvidenceSubmission => {
  const value = action.evidence;
  if (!value || !Array.isArray(value.selectedTerms)
    || value.selectedTerms.length === 0
    || !value.selectedTerms.every(isGeometryTerm)
    || new Set(value.selectedTerms).size !== value.selectedTerms.length
    || typeof value.completedSentence !== 'string'
    || value.completedSentence.trim().length === 0) {
    throw transitionError(state, action, 'The evidence sentence is incomplete');
  }
  if (value.oppositePair !== undefined
    && (!isFaceId(value.oppositePair.a) || !isFaceId(value.oppositePair.b)
      || value.oppositePair.a === value.oppositePair.b)) {
    throw transitionError(state, action, 'The opposite pair is invalid');
  }
  return cloneEvidence(value);
};

const appendPrediction = (state: LearningState, prediction: PredictionRecord): LearningAttempts => ({
  ...state.attempts,
  predictions: freezeArray([...state.attempts.predictions, prediction]),
});

const appendDiagnosis = (state: LearningState, diagnosis: DiagnosisSubmission): LearningAttempts => ({
  ...state.attempts,
  diagnoses: freezeArray([...state.attempts.diagnoses, diagnosis]),
});

const appendRepair = (state: LearningState, repair: RepairSubmission): LearningAttempts => ({
  ...state.attempts,
  repairs: freezeArray([...state.attempts.repairs, repair]),
});

const appendEvidence = (state: LearningState, evidence: EvidenceSubmission): LearningAttempts => ({
  ...state.attempts,
  evidence: freezeArray([...state.attempts.evidence, evidence]),
});

const diagnosisIsCorrect = (
  mission: MissionDefinition,
  diagnosis: DiagnosisSubmission,
  baseFaceId = mission.baseFaceId,
): boolean => evaluateDiagnosis(mission, diagnosis, baseFaceId).isCorrect;

const assertActiveStage = (
  state: LearningState,
  action: LearningAction,
  allowed: LearningState['stage'],
): void => {
  if (state.stage !== allowed) {
    throw transitionError(state, action, `Action ${action.type} is not allowed during ${state.stage}`);
  }
};

export const learningReducer = (
  state: LearningState,
  action: LearningAction,
): LearningState => {
  switch (action.type) {
    case 'SELECT_MISSION': {
      if (state.stage !== 'intake' && state.stage !== 'complete') {
        throw transitionError(state, action, 'A mission can only be selected at intake or after completion');
      }
      getMissionById(action.missionId);
      return freezeState({
        ...state,
        missionId: action.missionId,
        stage: 'prediction',
        prediction: null,
        foldStepIndex: 0,
        diagnosis: null,
        repair: null,
        evidence: null,
        attempts: emptyAttempts(),
      });
    }
    case 'SUBMIT_PREDICTION': {
      assertActiveStage(state, action, 'prediction');
      assertMissionScope(state, action);
      const prediction = validatePrediction(state, action, missionFor(state, action));
      return freezeState({
        ...state,
        stage: 'folding',
        prediction,
        foldStepIndex: 0,
        attempts: appendPrediction(state, prediction),
      });
    }
    case 'SET_FOLD_STEP': {
      if (state.prediction === null) throw new PredictionRequiredError(action.type, state.stage);
      assertActiveStage(state, action, 'folding');
      assertMissionScope(state, action);
      if (!Number.isInteger(action.stepIndex) || action.stepIndex < 0
        || action.stepIndex > FOLD_STEP_COUNT) {
        throw transitionError(state, action, 'The fold step must be between 0 and 5');
      }
      const mission = missionFor(state, action);
      const nextStage = action.stepIndex === FOLD_STEP_COUNT
        ? (mission.kind === 'opposite' ? 'evidence' : 'diagnosis')
        : 'folding';
      return freezeState({
        ...state,
        stage: nextStage,
        foldStepIndex: action.stepIndex,
      });
    }
    case 'SUBMIT_DIAGNOSIS': {
      assertActiveStage(state, action, 'diagnosis');
      assertMissionScope(state, action);
      const mission = missionFor(state, action);
      if (mission.kind === 'opposite') {
        throw transitionError(state, action, 'This mission has no diagnosis stage');
      }
      const diagnosis = validateDiagnosis(state, action);
      const diagnosisAccepted = diagnosisIsCorrect(mission, diagnosis, state.prediction?.baseFaceId);
      return freezeState({
        ...state,
        stage: diagnosisAccepted
          ? (mission.kind === 'tracking' ? 'evidence' : 'repair')
          : 'diagnosis',
        diagnosis,
        attempts: appendDiagnosis(state, diagnosis),
      });
    }
    case 'SUBMIT_REPAIR': {
      assertActiveStage(state, action, 'repair');
      assertMissionScope(state, action);
      const mission = missionFor(state, action);
      if (mission.kind !== 'collision' && mission.kind !== 'repair') {
        throw transitionError(state, action, 'This mission has no repair stage');
      }
      if (state.prediction === null) {
        throw transitionError(state, action, 'A prediction is required before repair');
      }
      let verified;
      try {
        verified = verifyRepairSubmission(mission.net, state.prediction.baseFaceId, action.repair);
      } catch (error) {
        if (error instanceof RepairValidationError) {
          throw transitionError(state, action, error.message);
        }
        throw error;
      }
      const repair = cloneRepair(verified.submission);
      return freezeState({
        ...state,
        stage: repair.accepted === true ? 'evidence' : 'repair',
        repair,
        attempts: appendRepair(state, repair),
      });
    }
    case 'SUBMIT_EVIDENCE': {
      assertActiveStage(state, action, 'evidence');
      assertMissionScope(state, action);
      const evidence = validateEvidence(state, action);
      return freezeState({
        ...state,
        stage: 'evidence',
        evidence,
        attempts: appendEvidence(state, evidence),
      });
    }
    case 'COMPLETE_MISSION': {
      if (state.missionId === null) throw transitionError(state, action, 'A mission must be selected first');
      if (action.missionId !== undefined && action.missionId !== state.missionId) {
        throw new StaleLearningActionError(action.type, state.stage);
      }
      if (state.stage === 'complete') return state;
      assertActiveStage(state, action, 'evidence');
      if (state.evidence === null) {
        throw transitionError(state, action, 'Evidence is required before completion');
      }
      const completedMissionIds = state.completedMissionIds.includes(state.missionId)
        ? state.completedMissionIds
        : [...state.completedMissionIds, state.missionId];
      return freezeState({ ...state, stage: 'complete', completedMissionIds });
    }
    case 'RETURN_TO_FOLD_STEP': {
      if (state.prediction === null) throw new PredictionRequiredError(action.type, state.stage);
      assertMissionScope(state, action);
      if (state.stage !== 'diagnosis' && state.stage !== 'repair' && state.stage !== 'evidence') {
        throw transitionError(state, action, 'The fold review can only reopen a completed fold');
      }
      const stepIndex = action.stepIndex ?? 0;
      if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= FOLD_STEP_COUNT) {
        throw transitionError(state, action, 'The fold review step must be between 0 and 4');
      }
      return freezeState({
        ...state,
        stage: 'folding',
        foldStepIndex: stepIndex,
        diagnosis: null,
        repair: null,
        evidence: null,
      });
    }
    case 'SET_STORAGE_OPT_IN':
      return freezeState({ ...state, storageOptIn: action.enabled });
    case 'RESET_MISSION':
      return freezeState({
        ...createInitialLearningState(),
        storageOptIn: state.storageOptIn,
        completedMissionIds: state.completedMissionIds,
      });
  }
};
