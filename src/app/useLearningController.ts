import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getMissionById } from '../content/missions/catalog';
import { createFoldSequence } from '../domain/net/foldEngine';
import { validateCubeNet, type CubeValidationResult } from '../domain/net/validateCubeNet';
import {
  createInitialLearningState,
  learningReducer,
} from '../domain/learning/reducer';
import {
  createDefaultProgressStore,
  migratePersistedProgress,
  rehydratePersistedProgress,
  syncLearningPersistence,
} from '../domain/learning/storage';
import type {
  LearningAction,
  LearningState,
  MissionDefinition,
  MissionId,
  ProgressStore,
} from '../domain/learning/types';
import type { FoldSequence } from '../domain/net/types';

export interface LearningControllerOptions {
  /** A store may be injected by a host or a persistence-focused test. */
  readonly store?: ProgressStore;
}

export interface LearningController {
  readonly state: LearningState;
  readonly mission: MissionDefinition | null;
  readonly validation: CubeValidationResult | null;
  readonly foldSequence: FoldSequence | null;
  readonly dispatch: React.Dispatch<LearningAction>;
  readonly selectMission: (missionId: MissionId) => void;
  readonly resetMission: () => void;
  readonly restoredFromStore: boolean;
  readonly persistenceNotice: string | null;
}

interface ControllerRehydrateAction {
  readonly type: 'REHYDRATE_CONTROLLER_STATE';
  readonly state: LearningState;
}

type ControllerAction = LearningAction | ControllerRehydrateAction;

const controllerReducer = (
  state: LearningState,
  action: ControllerAction,
): LearningState => action.type === 'REHYDRATE_CONTROLLER_STATE'
  ? action.state
  : learningReducer(state, action);

const loadProgress = (
  store: ProgressStore,
): { readonly state: LearningState; readonly restored: boolean } => {
  let raw: ReturnType<ProgressStore['load']> = null;
  try {
    raw = store.load();
    const sanitized = raw === null ? null : migratePersistedProgress(raw);
    const restored = sanitized === null ? null : rehydratePersistedProgress(sanitized);
    if (restored !== null) return { state: restored, restored: true };
    if (raw !== null) store.clear();
  } catch {
    if (raw !== null) {
      try { store.clear(); } catch { /* best-effort cleanup */ }
    }
    // Storage and malformed host injections fail closed to a fresh session.
  }
  return { state: createInitialLearningState(), restored: false };
};

/**
 * Connects the pure learning reducer to the screen state machine. Geometry is
 * always derived from PredictionRecord.baseFaceId, never from rendered output.
 */
export function useLearningController(
  options: LearningControllerOptions = {},
): LearningController {
  const store = useMemo(
    () => options.store ?? createDefaultProgressStore(),
    [options.store],
  );
  const [initialLoad] = useState(() => loadProgress(store));
  const [state, dispatchInternal] = useReducer(controllerReducer, initialLoad.state);
  const dispatch = dispatchInternal as React.Dispatch<LearningAction>;
  const previousState = useRef<LearningState>(initialLoad.state);
  const currentStore = useRef<ProgressStore>(store);
  const replacementPending = useRef(false);
  const replacementState = useRef<LearningState | null>(null);
  const [restoredFromStore, setRestoredFromStore] = useState(initialLoad.restored);
  const [persistenceNotice, setPersistenceNotice] = useState<string | null>(null);

  useEffect(() => {
    if (currentStore.current === store) return;
    const nextLoad = loadProgress(store);
    currentStore.current = store;
    previousState.current = nextLoad.state;
    replacementPending.current = true;
    replacementState.current = nextLoad.state;
    setRestoredFromStore(nextLoad.restored);
    setPersistenceNotice(nextLoad.restored ? '저장한 진행을 불러왔습니다.' : null);
    dispatchInternal({ type: 'REHYDRATE_CONTROLLER_STATE', state: nextLoad.state });
  }, [store]);

  useEffect(() => {
    if (currentStore.current !== store) return;
    if (replacementPending.current) {
      if (state !== replacementState.current) return;
      replacementPending.current = false;
      replacementState.current = null;
      previousState.current = state;
      return;
    }
    const result = syncLearningPersistence(previousState.current, state, store);
    previousState.current = state;
    if (result?.ok === false) {
      setPersistenceNotice(result.operation === 'save'
        ? '진행을 저장하지 못했습니다. 저장 선택을 해제했습니다.'
        : '진행 저장을 해제하지 못했습니다. 저장소 상태를 확인해 주세요.');
      if (result.operation === 'save' && state.storageOptIn) {
        dispatch({ type: 'SET_STORAGE_OPT_IN', enabled: false });
      }
    } else if (result?.ok === true) {
      setPersistenceNotice(null);
    }
  }, [dispatch, state, store]);

  const mission = useMemo(
    () => state.missionId === null ? null : getMissionById(state.missionId),
    [state.missionId],
  );
  const validation = useMemo(() => {
    if (mission === null || state.prediction === null) return null;
    return validateCubeNet(mission.net, state.prediction.baseFaceId);
  }, [mission, state.prediction]);
  const foldSequence = useMemo(() => {
    if (mission === null || state.prediction === null) return null;
    try {
      return createFoldSequence(
        mission.net,
        state.prediction.baseFaceId,
        state.prediction.foldOrder,
      );
    } catch {
      return null;
    }
  }, [mission, state.prediction]);

  const selectMission = useCallback((missionId: MissionId): void => {
    dispatch({ type: 'SELECT_MISSION', missionId });
  }, [dispatch]);
  const resetMission = useCallback((): void => {
    dispatch({ type: 'RESET_MISSION' });
  }, [dispatch]);

  return {
    state,
    mission,
    validation,
    foldSequence,
    dispatch,
    selectMission,
    resetMission,
    restoredFromStore,
    persistenceNotice,
  };
}
