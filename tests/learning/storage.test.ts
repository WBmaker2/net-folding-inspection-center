import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryProgressStore,
  createSessionProgressStore,
  disablePersistence,
  persistLearningState,
  PROGRESS_STORAGE_KEY,
  sanitizePersistedProgress,
  toPersistedProgress,
} from '../../src/domain/learning/storage';
import { createInitialLearningState, learningReducer } from '../../src/domain/learning/reducer';
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

describe('progress storage', () => {
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
    expect(saved).toMatchObject({ version: 1, missionId: 'cube-track-01' });
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

  it('loads only the allowlisted progress shape and drops unknown personal fields', () => {
    const storage = new FakeStorage();
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      version: 1,
      missionId: 'cube-track-01',
      stage: 'evidence',
      prediction,
      foldStepIndex: 5,
      diagnosis: null,
      repair: null,
      evidence: { selectedTerms: ['모서리', '겹침'] },
      attempts: {
        predictions: [prediction], diagnoses: [], repairs: [],
        evidence: [{ selectedTerms: ['모서리', '겹침'] }],
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

  it('strips the completed sentence from current and attempted evidence', () => {
    const folded = learningReducer(progressedState(), {
      type: 'SET_FOLD_STEP',
      stepIndex: 5,
    });
    const evidenced = learningReducer(folded, {
      type: 'SUBMIT_EVIDENCE',
      evidence: {
        selectedTerms: ['면', '접는 방향'],
        completedSentence: 'Ada 학생 ada@example.test의 문장 원문',
      },
    });

    const persisted = toPersistedProgress(evidenced);
    const serialized = JSON.stringify(persisted);
    expect(serialized).not.toMatch(/Ada|ada@example|원문|completedSentence/u);
    expect(persisted.evidence).toEqual({ selectedTerms: ['면', '접는 방향'] });
    expect(persisted.attempts.evidence).toEqual([{ selectedTerms: ['면', '접는 방향'] }]);
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

  it('rejects persisted states that cannot be reached by the reducer', () => {
    const valid = toPersistedProgress(progressedState());
    const collisionSelected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION',
      missionId: 'cube-collision-01',
    });
    const collisionFolded = learningReducer(collisionSelected, {
      type: 'SUBMIT_PREDICTION',
      prediction,
    });
    const collisionDiagnosed = learningReducer(
      learningReducer(collisionFolded, { type: 'SET_FOLD_STEP', stepIndex: 5 }),
      {
        type: 'SUBMIT_DIAGNOSIS',
        diagnosis: {
          selectedErrorType: 'overlap',
          selectedFaceIds: ['F2', 'F6'],
          selectedMissingDirection: '+x',
        },
      },
    );
    const validRepair = toPersistedProgress(collisionDiagnosed);

    expect(sanitizePersistedProgress({ ...valid, missionId: null })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      prediction: { ...prediction, baseFaceId: 'F2' },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      prediction: { ...prediction, foldOrder: ['F2', 'F3', 'F5', 'F6', 'F6'] },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      stage: 'repair',
      diagnosis: null,
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      stage: 'complete',
      evidence: null,
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      stage: 'prediction',
      prediction,
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      stage: 'evidence',
      foldStepIndex: 5,
      prediction: null,
      evidence: { selectedTerms: ['모서리'] },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      stage: 'repair',
      foldStepIndex: 5,
      diagnosis: {
        selectedErrorType: 'overlap',
        selectedFaceIds: ['F2', 'F6'],
        selectedMissingDirection: '+x',
      },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...validRepair,
      repair: { faceId: 'F6', target: { x: 2, y: 1 } },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...validRepair,
      repair: { faceId: 'F6', target: { x: 2, y: 1 }, accepted: true },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      stage: 'complete',
      foldStepIndex: 5,
      evidence: { selectedTerms: ['모서리'] },
    })).toBeNull();
  });
});
