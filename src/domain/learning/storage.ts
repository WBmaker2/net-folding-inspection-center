import type {
  AxisDirection,
  DiagnosisSubmission,
  EvidenceSubmission,
  FaceId,
  FoldDirection,
  GridPoint,
  LearningAttempts,
  LearningState,
  MissionId,
  PersistedProgress,
  PredictionRecord,
  ProgressStore,
  RepairSubmission,
} from './types';

export const PROGRESS_STORAGE_KEY = 'nfic.progress.v1';
/** Alias kept short for storage adapters that use a generic key name. */
export const PROGRESS_KEY = PROGRESS_STORAGE_KEY;

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

const sanitizePrediction = (value: unknown): PredictionRecord | null => {
  if (!isRecord(value) || !isFaceId(value.baseFaceId) || !isFaceId(value.predictedTopFaceId)
    || !Array.isArray(value.foldOrder) || value.foldOrder.length !== 5
    || !value.foldOrder.every(isFaceId) || !uniqueFaces(value.foldOrder)
    || !isRecord(value.arrowByFace) || typeof value.submittedAtIso !== 'string'
    || value.submittedAtIso.trim().length === 0) return null;
  const arrowByFace: Partial<Record<FaceId, FoldDirection>> = {};
  for (const faceId of FACE_IDS) {
    const direction = value.arrowByFace[faceId];
    if (direction !== undefined && !isFoldDirection(direction)) return null;
    if (direction !== undefined) arrowByFace[faceId] = direction;
  }
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
  if (value.accepted !== undefined && typeof value.accepted !== 'boolean') return null;
  if (value.submittedAtIso !== undefined && typeof value.submittedAtIso !== 'string') return null;
  let repair: RepairSubmission = {
    faceId: value.faceId,
    target: { x: value.target.x, y: value.target.y },
    ...(value.accepted === undefined ? {} : { accepted: value.accepted }),
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

const sanitizeEvidence = (value: unknown): EvidenceSubmission | null => {
  if (!isRecord(value) || !Array.isArray(value.selectedTerms) || value.selectedTerms.length === 0
    || !value.selectedTerms.every(isGeometryTerm)
    || new Set(value.selectedTerms).size !== value.selectedTerms.length
    || typeof value.completedSentence !== 'string'
    || value.completedSentence.trim().length === 0) return null;
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
    completedSentence: value.completedSentence,
  };
};

const sanitizeAttempts = (value: unknown): LearningAttempts | null => {
  if (!isRecord(value) || !Array.isArray(value.predictions) || !Array.isArray(value.diagnoses)
    || !Array.isArray(value.repairs) || !Array.isArray(value.evidence)) return null;
  const predictions = value.predictions.map(sanitizePrediction);
  const diagnoses = value.diagnoses.map(sanitizeDiagnosis);
  const repairs = value.repairs.map(sanitizeRepair);
  const evidence = value.evidence.map(sanitizeEvidence);
  if ([...predictions, ...diagnoses, ...repairs, ...evidence].some((item) => item === null)) return null;
  return {
    predictions: predictions as PredictionRecord[],
    diagnoses: diagnoses as DiagnosisSubmission[],
    repairs: repairs as RepairSubmission[],
    evidence: evidence as EvidenceSubmission[],
  };
};

/** Rebuilds persisted data from an allowlist, dropping unknown/personal fields. */
export const sanitizePersistedProgress = (value: unknown): PersistedProgress | null => {
  const foldStepIndex = isRecord(value) ? value.foldStepIndex : undefined;
  if (!isRecord(value) || value.version !== 1
    || (value.missionId !== null && !isMissionId(value.missionId))
    || !isStage(value.stage) || typeof foldStepIndex !== 'number'
    || !Number.isInteger(foldStepIndex)
    || foldStepIndex < 0 || foldStepIndex > 5
    || (value.prediction !== null && sanitizePrediction(value.prediction) === null)
    || (value.diagnosis !== null && sanitizeDiagnosis(value.diagnosis) === null)
    || (value.repair !== null && sanitizeRepair(value.repair) === null)
    || (value.evidence !== null && sanitizeEvidence(value.evidence) === null)
    || sanitizeAttempts(value.attempts) === null
    || !Array.isArray(value.completedMissionIds)
    || !value.completedMissionIds.every(isMissionId)) return null;
  const completedMissionIds = value.completedMissionIds as MissionId[];
  if (new Set(completedMissionIds).size !== completedMissionIds.length) return null;
  const attempts = sanitizeAttempts(value.attempts);
  if (attempts === null) return null;
  return {
    version: 1,
    missionId: value.missionId,
    stage: value.stage,
    prediction: value.prediction === null ? null : sanitizePrediction(value.prediction),
    foldStepIndex,
    diagnosis: value.diagnosis === null ? null : sanitizeDiagnosis(value.diagnosis),
    repair: value.repair === null ? null : sanitizeRepair(value.repair),
    evidence: value.evidence === null ? null : sanitizeEvidence(value.evidence),
    attempts,
    completedMissionIds: [...completedMissionIds],
  };
};

const cloneProgress = (progress: PersistedProgress): PersistedProgress => {
  const sanitized = sanitizePersistedProgress(progress);
  if (sanitized === null) throw new TypeError('Cannot persist an invalid learning progress payload');
  return sanitized;
};

export const toPersistedProgress = (state: LearningState): PersistedProgress => cloneProgress({
  version: 1,
  missionId: state.missionId,
  stage: state.stage,
  prediction: state.prediction,
  foldStepIndex: state.foldStepIndex,
  diagnosis: state.diagnosis,
  repair: state.repair,
  evidence: state.evidence,
  attempts: state.attempts,
  completedMissionIds: state.completedMissionIds,
});

export const createMemoryProgressStore = (): ProgressStore => {
  let current: PersistedProgress | null = null;
  return {
    load: () => (current === null ? null : cloneProgress(current)),
    save: (progress) => { current = cloneProgress(progress); },
    clear: () => { current = null; },
  };
};

export const createSessionProgressStore = (storage: Storage): ProgressStore => ({
  load: () => {
    let raw: string | null;
    try {
      raw = storage.getItem(PROGRESS_STORAGE_KEY);
    } catch {
      return null;
    }
    if (raw === null) return null;
    try {
      const progress = sanitizePersistedProgress(JSON.parse(raw) as unknown);
      if (progress === null) storage.removeItem(PROGRESS_STORAGE_KEY);
      return progress;
    } catch {
      try { storage.removeItem(PROGRESS_STORAGE_KEY); } catch { /* unavailable storage */ }
      return null;
    }
  },
  save: (progress) => {
    const payload = cloneProgress(progress);
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
  },
  clear: () => { storage.removeItem(PROGRESS_STORAGE_KEY); },
});

/** Writes only after explicit opt-in; opting out removes the existing tab record. */
export const persistLearningState = (state: LearningState, store: ProgressStore): void => {
  if (!state.storageOptIn) {
    store.clear();
    return;
  }
  store.save(toPersistedProgress(state));
};

/** Generic alias for the controller layer's persistence effect. */
export const persistSession = persistLearningState;

export const disablePersistence = (store: ProgressStore): void => { store.clear(); };
