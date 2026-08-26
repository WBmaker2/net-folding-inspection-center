import type {
  EvidenceSubmission,
  LearningAttempts,
  LearningState,
  PersistedEvidenceSubmission,
  PersistedLearningAttempts,
  PersistedProgress,
  ProgressStore,
} from './types';
import { sanitizePersistedProgress } from './storageValidation';

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
