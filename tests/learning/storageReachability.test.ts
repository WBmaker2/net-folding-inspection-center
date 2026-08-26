import { describe, expect, it } from 'vitest';
import { createInitialLearningState, learningReducer } from '../../src/domain/learning/reducer';
import { sanitizePersistedProgress, toPersistedProgress } from '../../src/domain/learning/storage';
import type { PredictionRecord } from '../../src/domain/net/types';

const prediction: PredictionRecord = {
  baseFaceId: 'F1',
  predictedTopFaceId: 'F3',
  foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'],
  arrowByFace: { F2: 'north', F3: 'north', F5: 'west', F6: 'east', F4: 'south' },
  submittedAtIso: '2026-08-26T00:00:00.000Z',
};

const collisionState = () => {
  const selected = learningReducer(createInitialLearningState(), {
    type: 'SELECT_MISSION', missionId: 'cube-collision-01',
  });
  const predicted = learningReducer(selected, { type: 'SUBMIT_PREDICTION', prediction });
  return learningReducer(predicted, { type: 'SET_FOLD_STEP', stepIndex: 5 });
};

describe('persisted reachability', () => {
  it('accepts the tracking diagnosis gate before persisted evidence', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    const predicted = learningReducer(selected, { type: 'SUBMIT_PREDICTION', prediction });
    const folded = learningReducer(predicted, { type: 'SET_FOLD_STEP', stepIndex: 5 });
    expect(folded.stage).toBe('diagnosis');
    const diagnosed = learningReducer(folded, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: { selectedErrorType: 'decoration-direction', selectedFaceIds: ['F3'] },
    });
    expect(diagnosed.stage).toBe('evidence');
    expect(sanitizePersistedProgress(toPersistedProgress(diagnosed))).not.toBeNull();
  });

  it('rejects states that cannot be reached by the reducer', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    const valid = toPersistedProgress(learningReducer(selected, {
      type: 'SUBMIT_PREDICTION', prediction,
    }));
    const diagnosed = learningReducer(collisionState(), {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: {
        selectedErrorType: 'overlap',
        selectedFaceIds: ['F2', 'F6'],
        selectedMissingDirection: '+x',
      },
    });
    const validRepair = toPersistedProgress(diagnosed);

    expect(sanitizePersistedProgress({ ...valid, missionId: null })).toBeNull();
    expect(sanitizePersistedProgress({ ...valid, prediction: { ...prediction, baseFaceId: 'F2' } })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid,
      prediction: { ...prediction, foldOrder: ['F2', 'F3', 'F5', 'F6', 'F6'] },
    })).toBeNull();
    expect(sanitizePersistedProgress({ ...valid, stage: 'repair', diagnosis: null })).toBeNull();
    expect(sanitizePersistedProgress({ ...valid, stage: 'complete', evidence: null })).toBeNull();
    expect(sanitizePersistedProgress({ ...valid, stage: 'prediction', prediction })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid, stage: 'evidence', foldStepIndex: 5, prediction: null,
      evidence: { selectedTerms: ['모서리'] },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid, stage: 'repair', foldStepIndex: 5,
      diagnosis: { selectedErrorType: 'overlap', selectedFaceIds: ['F2', 'F6'], selectedMissingDirection: '+x' },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...validRepair, repair: { faceId: 'F6', target: { x: 2, y: 1 } },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...validRepair, repair: { faceId: 'F6', target: { x: 2, y: 1 }, accepted: true },
    })).toBeNull();
    expect(sanitizePersistedProgress({
      ...valid, stage: 'complete', foldStepIndex: 5, evidence: { selectedTerms: ['모서리'] },
    })).toBeNull();
  });
});
