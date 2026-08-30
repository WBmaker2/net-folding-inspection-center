import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialLearningState, learningReducer } from '../../src/domain/learning/reducer';
import {
  createSessionProgressStore,
  PROGRESS_STORAGE_KEY,
  sanitizePersistedProgress,
  toPersistedProgress,
} from '../../src/domain/learning/storage';
import { useLearningController } from '../../src/app/useLearningController';
import { moveFace } from '../../src/domain/learning/repair';
import { getMissionById } from '../../src/content/missions/catalog';

class ThrowingStorage implements Storage {
  get length(): number { return 0; }
  clear(): void { throw new Error('clear'); }
  getItem(): string | null { throw new Error('get'); }
  key(): string | null { return null; }
  removeItem(): void { throw new Error('remove'); }
  setItem(): void { throw new Error('set'); }
}

describe('storage failure and controller lifecycle boundaries', () => {
  afterEach(cleanup);

  it('contains Storage get/set/remove errors without throwing', () => {
    const store = createSessionProgressStore(new ThrowingStorage());
    expect(store.load()).toBeNull();
    const state = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    expect(store.save(toPersistedProgress(state))).toBe(false);
    expect(store.clear()).toBe(false);
  });

  it('clears malformed injected payloads before starting fresh', () => {
    const clear = vi.fn();
    const { result } = renderHook(() => useLearningController({
      store: { load: () => ({ broken: true }) as never, save: vi.fn(), clear },
    }));
    expect(result.current.state.stage).toBe('intake');
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('clears semantically stale injected payloads before starting fresh', () => {
    const clear = vi.fn();
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    const stale = { ...toPersistedProgress(selected), stage: 'complete' } as never;
    const { result } = renderHook(() => useLearningController({
      store: { load: () => stale, save: vi.fn(), clear },
    }));
    expect(result.current.state.stage).toBe('intake');
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('reports a failed save and returns the checkbox state to off', async () => {
    const clear = vi.fn(() => true);
    const save = vi.fn(() => false);
    const store = { load: () => null, save, clear };
    const { result } = renderHook(() => useLearningController({ store }), { wrapper: StrictMode });
    expect(save).not.toHaveBeenCalled();
    act(() => result.current.dispatch({ type: 'SET_STORAGE_OPT_IN', enabled: true }));
    await waitFor(() => expect(result.current.state.storageOptIn).toBe(false));
    expect(result.current.persistenceNotice).toBeNull();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('clears a stale persistence notice after a later successful save', async () => {
    const clear = vi.fn(() => false);
    const save = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const store = { load: () => null, save, clear };
    const { result } = renderHook(() => useLearningController({ store }));
    act(() => result.current.dispatch({ type: 'SET_STORAGE_OPT_IN', enabled: true }));
    await waitFor(() => expect(result.current.persistenceNotice).toContain('해제하지 못했습니다'));
    expect(result.current.persistenceNotice).toBe('진행 저장을 해제하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.');
    clear.mockReturnValue(true);
    act(() => result.current.dispatch({ type: 'SET_STORAGE_OPT_IN', enabled: true }));
    await waitFor(() => expect(result.current.persistenceNotice).toBeNull());
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('does not write on a StrictMode mount or when state identity is unchanged', () => {
    const save = vi.fn();
    const store = { load: () => null, save, clear: vi.fn() };
    const { result } = renderHook(() => useLearningController({ store }), { wrapper: StrictMode });
    expect(save).not.toHaveBeenCalled();
    const initial = result.current.state;
    act(() => result.current.dispatch({ type: 'SET_STORAGE_OPT_IN', enabled: false }));
    expect(result.current.state).not.toBe(initial);
    expect(save).not.toHaveBeenCalled();
  });

  it('atomically rehydrates a newly injected store without copying the old state', async () => {
    const stateA = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    const stateB = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-opposite-01',
    });
    const saveA = vi.fn();
    const saveB = vi.fn();
    const storeA = {
      load: () => toPersistedProgress(stateA), save: saveA, clear: vi.fn(),
    };
    const storeB = {
      load: () => toPersistedProgress(stateB), save: saveB, clear: vi.fn(),
    };
    let activeStore = storeA;
    const { result, rerender } = renderHook(() => useLearningController({ store: activeStore }));
    activeStore = storeB;
    rerender();
    await waitFor(() => expect(result.current.state.missionId).toBe('cube-opposite-01'));
    expect(result.current.state.stage).toBe('prediction');
    expect(result.current.restoredFromStore).toBe(true);
    expect(result.current.persistenceNotice).toBe('저장한 진행을 불러왔습니다.');
    expect(saveB).not.toHaveBeenCalled();
    expect(saveA).not.toHaveBeenCalled();
  });

  it('keeps the app key targeted when session save fails', () => {
    const storage = new ThrowingStorage();
    const store = createSessionProgressStore(storage);
    expect(store.clear()).toBe(false);
    expect(PROGRESS_STORAGE_KEY).toBe('nfic.progress.v1');
  });

  it('does not perform adapter cleanup after an atomic session save failure', () => {
    const removeItem = vi.fn();
    const storage = {
      get length() { return 0; },
      clear: vi.fn(),
      getItem: () => null,
      key: () => null,
      removeItem,
      setItem: () => { throw new Error('quota'); },
    } as unknown as Storage;
    const store = createSessionProgressStore(storage);
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    expect(store.save(toPersistedProgress(selected))).toBe(false);
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('rejects non-canonical, impossible, and PII timestamp strings at both boundaries', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    const prediction = {
      baseFaceId: 'F1' as const,
      predictedTopFaceId: 'F3' as const,
      foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'] as const,
      arrowByFace: { F2: 'north' as const, F3: 'north' as const, F5: 'west' as const, F6: 'east' as const, F4: 'south' as const },
      submittedAtIso: '학생 이름',
    };
    expect(() => learningReducer(selected, { type: 'SUBMIT_PREDICTION', prediction })).toThrow();
    const valid = learningReducer(selected, {
      type: 'SUBMIT_PREDICTION', prediction: { ...prediction, submittedAtIso: '2026-08-26T00:00:00.000Z' },
    });
    const persisted = toPersistedProgress(valid);
    for (const timestamp of ['2026-02-30T00:00:00.000Z', '2026-08-26T00:00:00+00:00']) {
      expect(sanitizePersistedProgress({
        ...persisted,
        prediction: { ...persisted.prediction!, submittedAtIso: timestamp },
      })).toBeNull();
    }

    const collision = getMissionById('cube-collision-01');
    const collisionSelected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: collision.id,
    });
    const collisionPredicted = learningReducer(collisionSelected, {
      type: 'SUBMIT_PREDICTION', prediction: {
        ...prediction,
        submittedAtIso: '2026-08-26T00:00:00.000Z',
      },
    });
    const collisionFolded = learningReducer(collisionPredicted, { type: 'SET_FOLD_STEP', stepIndex: 5 });
    const diagnosed = learningReducer(collisionFolded, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: { selectedErrorType: 'overlap', selectedFaceIds: ['F2', 'F6'], selectedMissingDirection: '+x' },
    });
    expect(() => learningReducer(diagnosed, {
      type: 'SUBMIT_REPAIR',
      repair: {
        faceId: 'F6', target: { x: 2, y: 1 }, accepted: true,
        candidate: moveFace(collision.net, 'F6', { x: 2, y: 1 }), submittedAtIso: '학생 이름',
      },
    })).toThrow();
  });
});
