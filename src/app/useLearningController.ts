import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { getMissionById } from '../content/missions/catalog';
import { createFoldSequence } from '../domain/net/foldEngine';
import { validateCubeNet, type CubeValidationResult } from '../domain/net/validateCubeNet';
import {
  createInitialLearningState,
  learningReducer,
} from '../domain/learning/reducer';
import {
  createMemoryProgressStore,
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
}

/**
 * Connects the pure learning reducer to the screen state machine. Geometry is
 * always derived from PredictionRecord.baseFaceId, never from rendered output.
 */
export function useLearningController(
  options: LearningControllerOptions = {},
): LearningController {
  const [state, dispatch] = useReducer(learningReducer, undefined, createInitialLearningState);
  const store = useMemo(
    () => options.store ?? createMemoryProgressStore(),
    [options.store],
  );
  const previousState = useRef<LearningState | null>(null);

  useEffect(() => {
    syncLearningPersistence(previousState.current, state, store);
    previousState.current = state;
  }, [state, store]);

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
  }, []);
  const resetMission = useCallback((): void => {
    dispatch({ type: 'RESET_MISSION' });
  }, []);

  return {
    state,
    mission,
    validation,
    foldSequence,
    dispatch,
    selectMission,
    resetMission,
  };
}
