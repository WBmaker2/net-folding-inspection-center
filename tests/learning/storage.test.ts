import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryProgressStore,
  createSessionProgressStore,
  disablePersistence,
  persistLearningState,
  PROGRESS_STORAGE_KEY,
  sanitizePersistedProgress,
  syncLearningPersistence,
  toPersistedProgress,
} from '../../src/domain/learning/storage';
import { createInitialLearningState, learningReducer } from '../../src/domain/learning/reducer';
import { getMissionById } from '../../src/content/missions/catalog';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';
import { moveFace } from '../../src/domain/learning/repair';
import { buildEvidenceSentence } from '../../src/domain/learning/evidence';
import type { PersistedProgress } from '../../src/domain/learning/types';
const prediction = {
  baseFaceId: 'F1' as const,
  predictedTopFaceId: 'F3' as const,
  foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'] as const,
  arrowByFace: {
    F2: 'north' as const,
    F3: 'north' as const,
    F5: 'west' as const,
    F6: 'east' as const,
    F4: 'south' as const,
  },
  submittedAtIso: '2026-08-26T00:00:00.000Z',
};
const f2BasePrediction = {
  ...prediction,
  baseFaceId: 'F2' as const,
  foldOrder: ['F1', 'F3', 'F5', 'F6', 'F4'] as const,
  arrowByFace: {
    F1: 'south' as const,
    F3: 'north' as const,
    F5: 'west' as const,
    F6: 'east' as const,
    F4: 'south' as const,
  },
};
class FakeStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
const progressedState = () => {
  const selected = learningReducer(createInitialLearningState(), {
    type: 'SELECT_MISSION',
    missionId: 'cube-track-01',
  });
  return learningReducer(selected, {
    type: 'SUBMIT_PREDICTION',
    prediction,
  });
};
const collisionDiagnosis = {
  selectedErrorType: 'overlap' as const,
  selectedFaceIds: ['F2', 'F6'] as const,
  selectedMissingDirection: '+x' as const,
};
const collisionFoldedState = () => learningReducer(
  learningReducer(
    learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION',
      missionId: 'cube-collision-01',
    }),
    { type: 'SUBMIT_PREDICTION', prediction },
  ),
  { type: 'SET_FOLD_STEP', stepIndex: 5 },
);
const collisionRepairState = () => learningReducer(collisionFoldedState(), {
  type: 'SUBMIT_DIAGNOSIS',
  diagnosis: collisionDiagnosis,
});
const collisionEvidenceState = () => learningReducer(
  learningReducer(collisionRepairState(), {
    type: 'SUBMIT_REPAIR',
    repair: {
      faceId: 'F6', target: { x: 2, y: 1 }, accepted: true,
      candidate: moveFace(getMissionById('cube-collision-01').net, 'F6', { x: 2, y: 1 }),
    },
  }),
  {
    type: 'SUBMIT_EVIDENCE',
    evidence: {
      selectedTerms: ['겹침', '면'],
      completedSentence: buildEvidenceSentence(getMissionById('cube-collision-01'), {
        firstFace: 'F2', secondFace: 'F6', term1: '면', term2: '겹침',
      })!,
    },
  },
);
describe('progress storage', () => {
  it('round-trips a prediction whose learner-selected base is F2', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    const state = learningReducer(selected, {
      type: 'SUBMIT_PREDICTION', prediction: f2BasePrediction,
    });
    const store = createMemoryProgressStore();
    store.save(toPersistedProgress(state));
    expect(store.load()?.prediction).toEqual(f2BasePrediction);
    expect(store.load()?.attempts.predictions[0]).toEqual(f2BasePrediction);
  });

  it('round-trips a fully submitted F2-base collision prediction through persisted reachability', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-collision-01',
    });
    const predicted = learningReducer(selected, {
      type: 'SUBMIT_PREDICTION', prediction: f2BasePrediction,
    });
    const folded = learningReducer(predicted, { type: 'SET_FOLD_STEP', stepIndex: 5 });
    const mission = getMissionById('cube-collision-01');
    const missingDirection = validateCubeNet(mission.net, 'F2').missingNormals[0];
    expect(missingDirection).toBeDefined();
    const diagnosed = learningReducer(folded, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: { ...collisionDiagnosis, selectedMissingDirection: missingDirection! },
    });
    const storage = new FakeStorage();
    const store = createSessionProgressStore(storage);
    const persisted = toPersistedProgress(diagnosed);

    store.save(persisted);
    expect(store.load()).toEqual(persisted);
    expect(store.load()?.prediction?.baseFaceId).toBe('F2');
    expect(store.load()?.stage).toBe('repair');
  });
  it('round-trips an alternate-base tracking diagnosis with recomputed decoration authority', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    const predicted = learningReducer(selected, {
      type: 'SUBMIT_PREDICTION', prediction: f2BasePrediction,
    });
    const folded = learningReducer(predicted, { type: 'SET_FOLD_STEP', stepIndex: 5 });
    const diagnosed = learningReducer(folded, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: { selectedErrorType: 'decoration-direction', selectedFaceIds: ['F3'] },
    });
    const persisted = toPersistedProgress(diagnosed);
    expect(persisted.stage).toBe('evidence');
    expect(sanitizePersistedProgress(persisted)).toEqual(persisted);
  });
  it('keeps the default memory store in memory only', () => {
    const store = createMemoryProgressStore();
    const progress = toPersistedProgress(progressedState());

    store.save(progress);
    expect(store.load()).toEqual(progress);
    store.clear();
    expect(store.load()).toBeNull();
  });
  it('does not touch session storage before explicit opt-in', () => {
    const storage = new FakeStorage();
    const store = createSessionProgressStore(storage);

    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ keep: true }));
    const setItem = vi.spyOn(storage, 'setItem');
    persistLearningState(progressedState(), store);
    expect(setItem).not.toHaveBeenCalled();
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBe(JSON.stringify({ keep: true }));
  });
  it('writes one allowlisted payload after opt-in', () => {
    const storage = new FakeStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    const store = createSessionProgressStore(storage);
    const state = { ...progressedState(), storageOptIn: true };

    persistLearningState(state, store);

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(PROGRESS_STORAGE_KEY, expect.any(String));
    const saved = JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(saved).toMatchObject({ version: 2, missionId: 'cube-track-01' });
    expect(JSON.stringify(saved)).not.toMatch(/name|student|email|free.?text|score|점수|이름|학번|이메일/u);
  });
  it('clears the exact key as soon as opt-in is revoked', () => {
    const storage = new FakeStorage();
    const store = createSessionProgressStore(storage);
    const state = { ...progressedState(), storageOptIn: true };

    persistLearningState(state, store);
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).not.toBeNull();
    persistLearningState({ ...state, storageOptIn: false }, store);
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).not.toBeNull();
    disablePersistence(store);
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('syncs persistence transitions and clears only on an explicit true-to-false edge', () => {
    const storage = new FakeStorage();
    const store = createSessionProgressStore(storage);
    const previous = progressedState();
    const optedIn = learningReducer(previous, {
      type: 'SET_STORAGE_OPT_IN',
      enabled: true,
    });
    const optedOut = learningReducer(optedIn, {
      type: 'SET_STORAGE_OPT_IN',
      enabled: false,
    });
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ keep: true }));
    const setItem = vi.spyOn(storage, 'setItem');
    const removeItem = vi.spyOn(storage, 'removeItem');

    syncLearningPersistence(null, previous, store);
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBe(JSON.stringify({ keep: true }));

    syncLearningPersistence(previous, optedIn, store);
    expect(setItem).toHaveBeenCalledTimes(1);
    syncLearningPersistence(optedIn, optedIn, store);
    expect(setItem).toHaveBeenCalledTimes(1);
    syncLearningPersistence(optedIn, optedOut, store);
    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('loads only the allowlisted progress shape and drops unknown personal fields', () => {
    const storage = new FakeStorage();
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      version: 1,
      missionId: 'cube-track-01',
      stage: 'diagnosis',
      prediction,
      foldStepIndex: 5,
      diagnosis: null,
      repair: null,
      evidence: null,
      attempts: {
        predictions: [prediction], diagnoses: [], repairs: [],
        evidence: [],
      },
      completedMissionIds: [],
      studentName: 'Ada',
      email: 'ada@example.test',
      freeText: 'do not retain',
    }));

    const loaded = createSessionProgressStore(storage).load();
    expect(loaded).not.toBeNull();
    expect(JSON.stringify(loaded)).not.toMatch(/Ada|example|retain|studentName|email|freeText/u);
    expect(JSON.stringify(loaded)).not.toMatch(/completedSentence|비밀/u);
  });

  it('returns null and removes malformed or old-version payloads', () => {
    const storage = new FakeStorage();
    const store = createSessionProgressStore(storage);
    const malformed = vi.spyOn(storage, 'removeItem');

    storage.setItem(PROGRESS_STORAGE_KEY, '{not-json');
    expect(store.load()).toBeNull();
    expect(malformed).toHaveBeenCalledWith(PROGRESS_STORAGE_KEY);

    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ version: 2 }));
    expect(store.load()).toBeNull();
  });
  it('does not expose state-only fields in the persisted progress contract', () => {
    const state = progressedState();
    const progress: PersistedProgress = toPersistedProgress(state);

    expect(progress).not.toHaveProperty('storageOptIn');
    expect(progress).not.toHaveProperty('name');
    expect(progress).not.toHaveProperty('studentNumber');
    expect(progress).not.toHaveProperty('email');
    expect(progress).not.toHaveProperty('freeText');
    expect(JSON.stringify(progress)).not.toMatch(/completedSentence/u);
  });

  it('requires an exact moving-face arrow map in current and attempted predictions', () => {
    const valid = toPersistedProgress(progressedState());
    const missingFace = Object.fromEntries(
      Object.entries(prediction.arrowByFace).filter(([faceId]) => faceId !== 'F4'),
    );
    const invalidArrowMaps: readonly unknown[] = [
      { ...prediction.arrowByFace, F1: 'north' },
      missingFace,
      { ...prediction.arrowByFace, F7: 'north' },
      { ...prediction.arrowByFace, F4: 'diagonal' },
    ];

    invalidArrowMaps.forEach((arrowByFace) => {
      const invalidPrediction = { ...prediction, arrowByFace };
      expect(sanitizePersistedProgress({
        ...valid,
        prediction: invalidPrediction,
      })).toBeNull();
      expect(sanitizePersistedProgress({
        ...valid,
        attempts: {
          ...valid.attempts,
          predictions: [invalidPrediction],
        },
      })).toBeNull();
    });
  });

  it('allows prediction-stage history while keeping current review data empty', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION',
      missionId: 'cube-track-01',
    });
    const valid = toPersistedProgress(selected);

    expect(sanitizePersistedProgress(valid)).not.toBeNull();
    expect(sanitizePersistedProgress({ ...valid, prediction })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      attempts: { ...valid.attempts, predictions: [prediction] },
    })).not.toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      diagnosis: {
        selectedErrorType: 'overlap',
        selectedFaceIds: ['F2'],
      },
    })).toBeNull();
  });

  it('requires the current prediction to match the last prediction attempt', () => {
    const valid = toPersistedProgress(progressedState());

    expect(sanitizePersistedProgress({
      ...valid,
      attempts: { ...valid.attempts, predictions: [] },
    })).toBeNull();
    const changedPrediction = { ...prediction, predictedTopFaceId: 'F2' as const };
    expect(sanitizePersistedProgress({
      ...valid,
      attempts: { ...valid.attempts, predictions: [prediction, changedPrediction] },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      prediction: { ...prediction, predictedTopFaceId: 'F2' },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      attempts: {
        ...valid.attempts,
        predictions: [{ ...prediction, predictedTopFaceId: 'F2' }],
      },
    })).toBeNull();
  });

  it('requires current diagnosis and repair records to match their last attempts', () => {
    const diagnosed = toPersistedProgress(collisionRepairState());
    expect(sanitizePersistedProgress(diagnosed)).not.toBeNull();
    expect(sanitizePersistedProgress({
      ...diagnosed,
      diagnosis: { ...collisionDiagnosis, selectedMissingDirection: '-x' },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...diagnosed,
      attempts: {
        ...diagnosed.attempts,
        diagnoses: [{ ...collisionDiagnosis, selectedMissingDirection: '-x' }],
      },
    })).toBeNull();

    const rejectedRepair = learningReducer(collisionRepairState(), {
      type: 'SUBMIT_REPAIR',
      repair: {
        faceId: 'F6', target: { x: 8, y: 8 }, accepted: false,
        candidate: moveFace(getMissionById('cube-collision-01').net, 'F6', { x: 8, y: 8 }),
      },
    });
    const rejected = toPersistedProgress(rejectedRepair);
    expect(sanitizePersistedProgress(rejected)).not.toBeNull();
    expect(sanitizePersistedProgress({
      ...rejected,
      repair: { ...rejected.repair!, target: { x: 3, y: 1 } },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...rejected,
      attempts: {
        ...rejected.attempts,
        repairs: [{ ...rejected.repair!, target: { x: 3, y: 1 } }],
      },
    })).toBeNull();
  });

  it('requires current evidence to match the last evidence attempt', () => {
    const evidenced = toPersistedProgress(collisionEvidenceState());
    expect(sanitizePersistedProgress(evidenced)).not.toBeNull();
    expect(sanitizePersistedProgress({
      ...evidenced,
      evidence: { selectedTerms: ['면'] },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...evidenced,
      attempts: {
        ...evidenced.attempts,
        evidence: [{ selectedTerms: ['면'] }],
      },
    })).toBeNull();
  });


  it('requires complete evidence to have a matching evidence attempt', () => {
    const complete = learningReducer(collisionEvidenceState(), {
      type: 'COMPLETE_MISSION',
    });
    const persisted = toPersistedProgress(complete);
    expect(sanitizePersistedProgress(persisted)).not.toBeNull();
    expect(sanitizePersistedProgress({
      ...persisted,
      attempts: { ...persisted.attempts, evidence: [] },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...persisted,
      evidence: { selectedTerms: ['면'] },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...persisted,
      attempts: {
        ...persisted.attempts,
        evidence: [{ selectedTerms: ['면'] }],
      },
    })).toBeNull();
  });

  it('accepts return-to-fold payloads with cleared current review and preserved attempts', () => {
    const returned = learningReducer(collisionEvidenceState(), {
      type: 'RETURN_TO_FOLD_STEP',
      stepIndex: 2,
    });
    const persisted = toPersistedProgress(returned);

    expect(sanitizePersistedProgress(persisted)).not.toBeNull();
    expect(persisted).toMatchObject({
      stage: 'folding',
      foldStepIndex: 2,
      diagnosis: null,
      repair: null,
      evidence: null,
    });
    expect(persisted.attempts.predictions).toHaveLength(1);
    expect(persisted.attempts.diagnoses).toHaveLength(1);
    expect(persisted.attempts.repairs).toHaveLength(1);
    expect(persisted.attempts.evidence).toHaveLength(1);
  });

  it('strips the completed sentence from current and attempted evidence', () => {
    const evidenced = collisionEvidenceState();
    const persisted = toPersistedProgress(evidenced);
    const injected = {
      ...persisted,
      evidence: { ...persisted.evidence!, completedSentence: 'Ada 학생 ada@example.test의 문장 원문' },
      attempts: {
        ...persisted.attempts,
        evidence: persisted.attempts.evidence.map((item, index) => index === 0
          ? { ...item, completedSentence: 'Ada 학생 ada@example.test의 문장 원문' }
          : item),
      },
    };
    const sanitized = sanitizePersistedProgress(injected)!;
    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toMatch(/Ada|ada@example|원문|completedSentence/u);
    expect(sanitized.evidence).toEqual(persisted.evidence);
    expect(sanitized.attempts.evidence).toEqual(persisted.attempts.evidence);
  });

  it('rewrites a valid payload immediately when unknown fields are present', () => {
    const storage = new FakeStorage();
    const store = createSessionProgressStore(storage);
    const progress = toPersistedProgress(progressedState());
    const raw = JSON.stringify({ ...progress, name: 'Ada', email: 'ada@example.test' });
    storage.setItem(PROGRESS_STORAGE_KEY, raw);
    const setItem = vi.spyOn(storage, 'setItem');

    expect(store.load()).toEqual(progress);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem.mock.calls[0]?.[0]).toBe(PROGRESS_STORAGE_KEY);
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBe(JSON.stringify(progress));
  });

});
