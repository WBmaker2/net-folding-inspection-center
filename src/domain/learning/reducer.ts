import { getMissionById } from '../../content/missions/catalog';
import { validateCubeNet } from '../net/validateCubeNet';
import type {
  AxisDirection,
  FaceId,
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

const clonePrediction = (prediction: PredictionRecord): PredictionRecord => Object.freeze({
  baseFaceId: prediction.baseFaceId,
  predictedTopFaceId: prediction.predictedTopFaceId,
  foldOrder: freezeArray(prediction.foldOrder),
  arrowByFace: Object.freeze({ ...prediction.arrowByFace }),
  submittedAtIso: prediction.submittedAtIso,
});

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
  ...(repair.accepted === undefined ? {} : { accepted: repair.accepted }),
  ...(repair.submittedAtIso === undefined ? {} : { submittedAtIso: repair.submittedAtIso }),
  ...(repair.candidate === undefined ? {} : {
    candidate: Object.freeze({
      faces: freezeArray(repair.candidate.faces.map((face) => Object.freeze({
        ...face,
        grid: freezePoint(face.grid),
      }))),
    }),
  }),
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
  if (value.baseFaceId !== mission.baseFaceId) {
    throw transitionError(state, action, 'The prediction base face does not match this mission');
  }
  const missionFaces = mission.net.faces.map((face) => face.id);
  if (!Array.isArray(value.foldOrder)
    || value.foldOrder.length !== missionFaces.length - 1
    || !value.foldOrder.every(isFaceId)) {
    throw transitionError(state, action, 'The prediction must contain each moving face exactly once');
  }
  const movingFaces = value.foldOrder as unknown as readonly FaceId[];
  if (movingFaces.length !== missionFaces.length - 1
    || !sameFaceSet(movingFaces, missionFaces.filter((faceId) => faceId !== mission.baseFaceId))) {
    throw transitionError(state, action, 'The prediction must contain each moving face exactly once');
  }
  if (!isFaceId(value.predictedTopFaceId)) {
    throw transitionError(state, action, 'The predicted top face is not a face in the cube net');
  }
  if (value.arrowByFace === null || typeof value.arrowByFace !== 'object') {
    throw transitionError(state, action, 'The prediction fold directions are invalid');
  }
  if (typeof value.submittedAtIso !== 'string' || value.submittedAtIso.trim().length === 0) {
    throw transitionError(state, action, 'The prediction timestamp is required');
  }
  return clonePrediction(value);
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

const validateRepair = (
  state: LearningState,
  action: Extract<LearningAction, { readonly type: 'SUBMIT_REPAIR' }>,
): RepairSubmission => {
  const value = action.repair;
  if (!value || !isFaceId(value.faceId) || !value.target
    || !Number.isSafeInteger(value.target.x) || !Number.isSafeInteger(value.target.y)) {
    throw transitionError(state, action, 'The repair move is invalid');
  }
  if (value.accepted !== undefined && typeof value.accepted !== 'boolean') {
    throw transitionError(state, action, 'The repair result is invalid');
  }
  if (value.candidate !== undefined
    && (!value.candidate || !Array.isArray(value.candidate.faces)
      || value.candidate.faces.some((face) => (
        !face || !face.grid || !isFaceId(face.id) || !Number.isSafeInteger(face.grid.x)
        || !Number.isSafeInteger(face.grid.y)
      )))) {
    throw transitionError(state, action, 'The repair candidate is invalid');
  }
  return cloneRepair(value);
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
): boolean => {
  if (diagnosis.selectedErrorType !== mission.errorModel) return false;
  if (mission.kind !== 'collision' && mission.kind !== 'repair') return false;
  const expectedFaces = expectedCollisionFaces(mission);
  if (!sameFaceSet(diagnosis.selectedFaceIds, expectedFaces)) return false;
  if (diagnosis.selectedMissingDirection === undefined) return true;
  const validation = validateCubeNet(mission.net, mission.baseFaceId);
  const expectedDirection = mission.kind === 'collision'
    ? mission.answer.missingDirection
    : validation.missingNormals[0];
  return diagnosis.selectedMissingDirection === expectedDirection;
};

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
        ? (mission.kind === 'collision' || mission.kind === 'repair' ? 'diagnosis' : 'evidence')
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
      if (mission.kind !== 'collision' && mission.kind !== 'repair') {
        throw transitionError(state, action, 'This mission has no diagnosis stage');
      }
      const diagnosis = validateDiagnosis(state, action);
      return freezeState({
        ...state,
        stage: diagnosisIsCorrect(mission, diagnosis) ? 'repair' : 'diagnosis',
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
      const repair = validateRepair(state, action);
      return freezeState({
        ...state,
        stage: repair.accepted === false ? 'repair' : 'evidence',
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
      if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex > FOLD_STEP_COUNT) {
        throw transitionError(state, action, 'The fold review step must be between 0 and 5');
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
