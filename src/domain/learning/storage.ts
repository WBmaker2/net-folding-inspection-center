import type {
  EvidenceSubmission,
  LearningAttempts,
  LearningState,
  PersistedEvidenceSubmission,
  PersistedLearningAttempts,
  PersistedProgress,
  ProgressStore,
} from './types';
import { getMissionById } from '../../content/missions/catalog';
import { sanitizePersistedProgress } from './storageValidation';
import { evaluateEvidenceSubmission, expectedEvidenceSentence } from './evidence';
import { createInitialLearningState } from './reducer';

export { sanitizePersistedProgress } from './storageValidation';

export const PROGRESS_STORAGE_KEY = 'nfic.progress.v1';
/** Alias kept short for storage adapters that use a generic key name. */
export const PROGRESS_KEY = PROGRESS_STORAGE_KEY;

const cloneProgress = (progress: PersistedProgress): PersistedProgress => {
  const sanitized = sanitizePersistedProgress(progress);
  if (sanitized === null) throw new TypeError('Cannot persist an invalid learning progress payload');
  return sanitized;
};

const toPersistedEvidence = (
  evidence: EvidenceSubmission | null,
): PersistedEvidenceSubmission | null => (
  evidence === null ? null : {
    ...(evidence.oppositePair === undefined ? {} : {
      oppositePair: { ...evidence.oppositePair },
    }),
    selectedTerms: [...evidence.selectedTerms],
  }
);

const toPersistedAttempts = (attempts: LearningAttempts): PersistedLearningAttempts => ({
  predictions: [...attempts.predictions],
  diagnoses: [...attempts.diagnoses],
  repairs: [...attempts.repairs],
  evidence: attempts.evidence
    .map((evidence) => toPersistedEvidence(evidence))
    .filter((evidence): evidence is PersistedEvidenceSubmission => evidence !== null),
});

export const toPersistedProgress = (state: LearningState): PersistedProgress => cloneProgress({
  version: 1,
  missionId: state.missionId,
  stage: state.stage,
  prediction: state.prediction,
  foldStepIndex: state.foldStepIndex,
  diagnosis: state.diagnosis,
  repair: state.repair,
  evidence: toPersistedEvidence(state.evidence),
  attempts: toPersistedAttempts(state.attempts),
  completedMissionIds: [...state.completedMissionIds],
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
      if (progress === null) {
        storage.removeItem(PROGRESS_STORAGE_KEY);
        return null;
      }
      const canonical = JSON.stringify(progress);
      if (raw !== canonical) {
        try {
          storage.setItem(PROGRESS_STORAGE_KEY, canonical);
        } catch {
          try { storage.removeItem(PROGRESS_STORAGE_KEY); } catch { /* unavailable storage */ }
          return null;
        }
      }
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

/** Returns the browser tab store when available, with an in-memory fallback. */
export const createDefaultProgressStore = (): ProgressStore => {
  if (typeof window === 'undefined' || !('sessionStorage' in window)) {
    return createMemoryProgressStore();
  }
  try {
    return createSessionProgressStore(window.sessionStorage);
  } catch {
    return createMemoryProgressStore();
  }
};

const freezeArray = <T>(items: readonly T[]): readonly T[] => Object.freeze([...items]);
const freezeState = (state: LearningState): LearningState => Object.freeze({
  ...state,
  prediction: state.prediction === null ? null : Object.freeze({
    ...state.prediction,
    foldOrder: freezeArray(state.prediction.foldOrder),
    arrowByFace: Object.freeze({ ...state.prediction.arrowByFace }),
  }),
  diagnosis: state.diagnosis === null ? null : Object.freeze({
    ...state.diagnosis,
    selectedFaceIds: freezeArray(state.diagnosis.selectedFaceIds),
  }),
  repair: state.repair === null ? null : Object.freeze({
    ...state.repair,
    target: Object.freeze({ ...state.repair.target }),
    candidate: Object.freeze({
      faces: freezeArray(state.repair.candidate.faces.map((face) => Object.freeze({
        ...face,
        grid: Object.freeze({ ...face.grid }),
      }))),
    }),
  }),
  evidence: state.evidence === null ? null : Object.freeze({
    ...state.evidence,
    ...(state.evidence.oppositePair === undefined ? {} : {
      oppositePair: Object.freeze({ ...state.evidence.oppositePair }),
    }),
    selectedTerms: freezeArray(state.evidence.selectedTerms),
  }),
  attempts: Object.freeze({
    predictions: freezeArray(state.attempts.predictions),
    diagnoses: freezeArray(state.attempts.diagnoses),
    repairs: freezeArray(state.attempts.repairs),
    evidence: freezeArray(state.attempts.evidence),
  }),
  completedMissionIds: freezeArray(state.completedMissionIds),
});

const restoreEvidence = (
  progress: PersistedProgress,
  persisted: PersistedEvidenceSubmission,
  diagnosis: LearningState['diagnosis'],
  repair: LearningState['repair'],
): EvidenceSubmission | null => {
  if (progress.missionId === null || progress.prediction === null) return null;
  const mission = getMissionById(progress.missionId);
  const input = {
    ...(persisted.oppositePair === undefined ? {} : { oppositePair: persisted.oppositePair }),
    selectedTerms: persisted.selectedTerms,
    completedSentence: '',
  };
  const evaluation = evaluateEvidenceSubmission(mission, input, {
    baseFaceId: progress.prediction.baseFaceId,
    diagnosis,
    repair,
  });
  const completedSentence = expectedEvidenceSentence(mission, input, evaluation.context);
  if (completedSentence === null) return null;
  return {
    ...(persisted.oppositePair === undefined ? {} : { oppositePair: { ...persisted.oppositePair } }),
    selectedTerms: [...persisted.selectedTerms],
    completedSentence,
  };
};

/** Rehydrates a validated payload into an immutable LearningState. */
export const rehydratePersistedProgress = (progress: PersistedProgress): LearningState | null => {
  const base = createInitialLearningState();
  const diagnosis = progress.diagnosis === null ? null : {
    ...progress.diagnosis,
    selectedFaceIds: [...progress.diagnosis.selectedFaceIds],
  };
  const repair = progress.repair === null ? null : {
    ...progress.repair,
    target: { ...progress.repair.target },
    candidate: {
      faces: progress.repair.candidate.faces.map((face) => ({ ...face, grid: { ...face.grid } })),
    },
  };
  // Return-to-fold records intentionally clear the current review fields while
  // retaining attempts. Use the latest structured attempt only to regenerate
  // historical sentences; never restore it as the active review state.
  const sentenceDiagnosis = diagnosis ?? progress.attempts.diagnoses.at(-1) ?? null;
  const sentenceRepair = repair ?? progress.attempts.repairs.at(-1) ?? null;
  const evidence = progress.evidence === null
    ? null
    : restoreEvidence(progress, progress.evidence, sentenceDiagnosis, sentenceRepair);
  if (progress.evidence !== null && evidence === null) return null;
  const attemptsEvidence = progress.attempts.evidence.map((item) => restoreEvidence(
    progress,
    item,
    sentenceDiagnosis,
    sentenceRepair,
  ));
  if (attemptsEvidence.some((item) => item === null)) return null;
  return freezeState({
    ...base,
    missionId: progress.missionId,
    stage: progress.stage,
    prediction: progress.prediction === null ? null : {
      ...progress.prediction,
      foldOrder: [...progress.prediction.foldOrder],
      arrowByFace: { ...progress.prediction.arrowByFace },
    },
    foldStepIndex: progress.foldStepIndex,
    diagnosis,
    repair,
    evidence,
    attempts: {
      predictions: progress.attempts.predictions.map((item) => ({
        ...item,
        foldOrder: [...item.foldOrder],
        arrowByFace: { ...item.arrowByFace },
      })),
      diagnoses: progress.attempts.diagnoses.map((item) => ({
        ...item,
        selectedFaceIds: [...item.selectedFaceIds],
      })),
      repairs: progress.attempts.repairs.map((item) => ({
        ...item,
        target: { ...item.target },
        candidate: {
          faces: item.candidate.faces.map((face) => ({ ...face, grid: { ...face.grid } })),
        },
      })),
      evidence: attemptsEvidence as EvidenceSubmission[],
    },
    storageOptIn: true,
    completedMissionIds: [...progress.completedMissionIds],
  });
};

/** Syncs storage at a state edge; false-to-false and null-to-false are no-ops. */
export const syncLearningPersistence = (
  previousState: LearningState | null,
  nextState: LearningState,
  store: ProgressStore,
): void => {
  if (previousState?.storageOptIn === true && nextState.storageOptIn === false) {
    store.clear();
    return;
  }
  if (nextState.storageOptIn === true) store.save(toPersistedProgress(nextState));
};

/** Legacy one-state wrapper; use syncLearningPersistence when detecting opt-out edges. */
export const persistLearningState = (state: LearningState, store: ProgressStore): void => {
  syncLearningPersistence(null, state, store);
};

/** Generic alias for the controller layer's persistence effect. */
export const persistSession = persistLearningState;

export const disablePersistence = (store: ProgressStore): void => { store.clear(); };
