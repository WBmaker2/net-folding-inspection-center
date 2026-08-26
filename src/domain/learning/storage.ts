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
import { migratePersistedProgress } from './storageMigration';
import { evaluateEvidenceSubmission, expectedEvidenceSentence } from './evidence';
import { createInitialLearningState } from './reducer';
import { freezeRestoredState } from './storageRehydrate';

export { sanitizePersistedProgress, sanitizePersistedProgressV1 } from './storageValidation';
export { migratePersistedProgress, migratePersistedProgressV1 } from './storageMigration';

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
  attempt?: LearningAttempts['evidence'][number],
): PersistedEvidenceSubmission | null => (
  evidence === null ? null : {
    ...(evidence.oppositePair === undefined ? {} : {
      oppositePair: { ...evidence.oppositePair },
    }),
    selectedTerms: [...evidence.selectedTerms],
    ...(attempt?.diagnosisAttemptIndex === undefined ? {} : { diagnosisAttemptIndex: attempt.diagnosisAttemptIndex }),
    ...(attempt?.repairAttemptIndex === undefined ? {} : { repairAttemptIndex: attempt.repairAttemptIndex }),
  }
);

const toPersistedAttempts = (attempts: LearningAttempts): PersistedLearningAttempts => ({
  predictions: [...attempts.predictions],
  diagnoses: [...attempts.diagnoses],
  repairs: [...attempts.repairs],
  evidence: attempts.evidence
    .map((evidence) => toPersistedEvidence(evidence, evidence))
    .filter((evidence): evidence is PersistedEvidenceSubmission => evidence !== null),
});

export const toPersistedProgress = (state: LearningState): PersistedProgress => cloneProgress({
  version: 2,
  missionId: state.missionId,
  stage: state.stage,
  prediction: state.prediction,
  foldStepIndex: state.foldStepIndex,
  diagnosis: state.diagnosis,
  repair: state.repair,
  evidence: toPersistedEvidence(state.evidence, state.attempts.evidence.at(-1)),
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
    const removeInvalidPayload = (): void => {
      try { storage.removeItem(PROGRESS_STORAGE_KEY); } catch { /* unavailable storage */ }
    };
    let progress: PersistedProgress | null;
    try {
      progress = migratePersistedProgress(JSON.parse(raw) as unknown);
    } catch {
      removeInvalidPayload();
      return null;
    }
    if (progress === null) {
      removeInvalidPayload();
      return null;
    }
    const canonical = JSON.stringify(progress);
    if (raw !== canonical) {
      try {
        storage.setItem(PROGRESS_STORAGE_KEY, canonical);
      } catch {
        removeInvalidPayload();
        return null;
      }
    }
    return progress;
  },
  save: (progress) => {
    const payload = cloneProgress(progress);
    try {
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  },
  clear: () => {
    try {
      storage.removeItem(PROGRESS_STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  },
});

/** Returns the browser tab store when available, with an in-memory fallback. */
export const createDefaultProgressStore = (): ProgressStore => {
  if (typeof window === 'undefined' || !('sessionStorage' in window)) {
    return createMemoryProgressStore();
  }
  try {
    const sessionStore = createSessionProgressStore(window.sessionStorage);
    // A read probe does not write or remove anything, but detects blocked storage.
    window.sessionStorage.getItem(PROGRESS_STORAGE_KEY);
    const memoryStore = createMemoryProgressStore();
    let useMemory = false;
    return {
      load: () => {
        if (useMemory) return memoryStore.load();
        try {
          return sessionStore.load();
        } catch {
          useMemory = true;
          return memoryStore.load();
        }
      },
      save: (progress) => {
        if (useMemory) return memoryStore.save(progress);
        const saved = sessionStore.save(progress);
        return saved;
      },
      clear: () => {
        if (useMemory) return memoryStore.clear();
        const cleared = sessionStore.clear();
        if (cleared === false) {
          useMemory = true;
          memoryStore.clear();
        }
        return cleared;
      },
    };
  } catch {
    return createMemoryProgressStore();
  }
};

const restoreEvidence = (
  progress: PersistedProgress,
  persisted: PersistedEvidenceSubmission,
  diagnosis?: LearningState['diagnosis'],
  repair?: LearningState['repair'],
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

const evidenceContextFor = (
  progress: PersistedProgress,
  evidence: PersistedEvidenceSubmission,
): { readonly diagnosis: LearningState['diagnosis']; readonly repair: LearningState['repair'] } | null => {
  const diagnosis = evidence.diagnosisAttemptIndex === undefined
    ? null
    : progress.attempts.diagnoses[evidence.diagnosisAttemptIndex] ?? null;
  const repair = evidence.repairAttemptIndex === undefined
    ? null
    : progress.attempts.repairs[evidence.repairAttemptIndex] ?? null;
  if (evidence.diagnosisAttemptIndex !== undefined && diagnosis === null) return null;
  if (evidence.repairAttemptIndex !== undefined && repair === null) return null;
  return { diagnosis, repair };
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
  const evidence = progress.evidence === null
    ? null
    : (() => {
      const context = evidenceContextFor(progress, progress.evidence);
      return context === null ? null : restoreEvidence(progress, progress.evidence, context.diagnosis, context.repair);
    })();
  if (progress.evidence !== null && evidence === null) return null;
  const attemptsEvidence = progress.attempts.evidence.map((item) => {
    const context = evidenceContextFor(progress, item);
    const restored = context === null
      ? null
      : restoreEvidence(progress, item, context.diagnosis, context.repair);
    return restored === null ? null : {
      ...restored,
      ...(item.diagnosisAttemptIndex === undefined ? {} : {
        diagnosisAttemptIndex: item.diagnosisAttemptIndex,
      }),
      ...(item.repairAttemptIndex === undefined ? {} : {
        repairAttemptIndex: item.repairAttemptIndex,
      }),
    };
  });
  if (attemptsEvidence.some((item) => item === null)) return null;
  return freezeRestoredState({
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
export interface PersistenceSyncResult {
  readonly ok: boolean;
  readonly operation: 'save' | 'clear';
}

export const syncLearningPersistence = (
  previousState: LearningState | null,
  nextState: LearningState,
  store: ProgressStore,
): PersistenceSyncResult | null => {
  if (previousState === nextState) return null;
  if (previousState?.storageOptIn === true && nextState.storageOptIn === false) {
    try {
      return { ok: store.clear() !== false, operation: 'clear' };
    } catch {
      return { ok: false, operation: 'clear' };
    }
  }
  if (nextState.storageOptIn === true) {
    try {
      const ok = store.save(toPersistedProgress(nextState)) !== false;
      return { ok, operation: 'save' };
    } catch {
      return { ok: false, operation: 'save' };
    }
  }
  return null;
};

/** Legacy one-state wrapper; use syncLearningPersistence when detecting opt-out edges. */
export const persistLearningState = (state: LearningState, store: ProgressStore): void => {
  syncLearningPersistence(null, state, store);
};

/** Generic alias for the controller layer's persistence effect. */
export const persistSession = persistLearningState;

export const disablePersistence = (store: ProgressStore): void => { store.clear(); };
