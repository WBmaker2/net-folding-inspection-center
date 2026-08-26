import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryProgressStore,
  createSessionProgressStore,
  persistLearningState,
  PROGRESS_STORAGE_KEY,
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
    const setItem = vi.spyOn(storage, 'setItem');
    const store = createSessionProgressStore(storage);

    expect(setItem).not.toHaveBeenCalled();
    persistLearningState(progressedState(), store);
    expect(setItem).not.toHaveBeenCalled();
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
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
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('loads only the allowlisted progress shape and drops unknown personal fields', () => {
    const storage = new FakeStorage();
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      version: 1,
      missionId: 'cube-track-01',
      stage: 'folding',
      prediction,
      foldStepIndex: 1,
      diagnosis: null,
      repair: null,
      evidence: null,
      attempts: { predictions: [prediction], diagnoses: [], repairs: [], evidence: [] },
      completedMissionIds: [],
      studentName: 'Ada',
      email: 'ada@example.test',
      freeText: 'do not retain',
    }));

    const loaded = createSessionProgressStore(storage).load();
    expect(loaded).not.toBeNull();
    expect(JSON.stringify(loaded)).not.toMatch(/Ada|example|retain|studentName|email|freeText/u);
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
  });
});
