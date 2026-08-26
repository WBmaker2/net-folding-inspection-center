import { describe, expect, it } from 'vitest';
import {
  createInitialLearningState,
  InvalidLearningTransitionError,
  learningReducer,
  PredictionRequiredError,
  StaleLearningActionError,
} from '../../src/domain/learning/reducer';
import {
  canRevealFoldResult,
  getCriticalActionId,
} from '../../src/domain/learning/selectors';
import type {
  DiagnosisSubmission,
  EvidenceSubmission,
  PredictionRecord,
  RepairSubmission,
} from '../../src/domain/learning/types';

const prediction: PredictionRecord = {
  baseFaceId: 'F1',
  predictedTopFaceId: 'F3',
  foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'],
  arrowByFace: {
    F2: 'north',
    F3: 'north',
    F5: 'west',
    F6: 'east',
    F4: 'south',
  },
  submittedAtIso: '2026-08-26T00:00:00.000Z',
};

const diagnosis: DiagnosisSubmission = {
  selectedErrorType: 'overlap',
  selectedFaceIds: ['F2', 'F6'],
  selectedMissingDirection: '+x',
};

const repair: RepairSubmission = {
  faceId: 'F6',
  target: { x: 2, y: 1 },
  accepted: true,
};

const evidence: EvidenceSubmission = {
  selectedTerms: ['모서리', '겹침'],
  completedSentence: '두 면은 같은 모서리에서 겹칩니다.',
};

const selectedCollision = () => learningReducer(
  learningReducer(createInitialLearningState(), {
    type: 'SELECT_MISSION',
    missionId: 'cube-collision-01',
  }),
  { type: 'SUBMIT_PREDICTION', prediction },
);

const foldedCollision = () => learningReducer(selectedCollision(), {
  type: 'SET_FOLD_STEP',
  stepIndex: 5,
});

describe('learning reducer', () => {
  it('starts at intake with empty, immutable learning evidence', () => {
    const state = createInitialLearningState();

    expect(state).toMatchObject({
      missionId: null,
      stage: 'intake',
      prediction: null,
      foldStepIndex: 0,
      diagnosis: null,
      repair: null,
      evidence: null,
      storageOptIn: false,
    });
    expect(state.attempts).toEqual({
      predictions: [],
      diagnoses: [],
      repairs: [],
      evidence: [],
    });
    expect(state.completedMissionIds).toEqual([]);
    expect(Object.isFrozen(state.attempts)).toBe(true);
  });

  it('requires a mission and a prediction before any fold result can be revealed', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION',
      missionId: 'cube-track-01',
    });

    expect(selected.stage).toBe('prediction');
    expect(canRevealFoldResult(selected)).toBe(false);
    expect(() => learningReducer(selected, {
      type: 'SET_FOLD_STEP',
      stepIndex: 1,
    })).toThrow(PredictionRequiredError);
  });

  it('records the first prediction without a score and opens folding', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION',
      missionId: 'cube-track-01',
    });
    const predicted = learningReducer(selected, {
      type: 'SUBMIT_PREDICTION',
      prediction,
    });

    expect(predicted.stage).toBe('folding');
    expect(predicted.prediction).toEqual(prediction);
    expect(predicted.attempts.predictions).toHaveLength(1);
    expect(predicted.attempts.predictions[0]).toEqual(prediction);
    expect(JSON.stringify(predicted.attempts.predictions[0])).not.toMatch(/score|점수/u);
    expect(canRevealFoldResult(predicted)).toBe(true);
  });

  it('requires exactly one valid fold direction for every moving face', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION',
      missionId: 'cube-track-01',
    });
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
      expect(() => learningReducer(selected, {
        type: 'SUBMIT_PREDICTION',
        prediction: { ...prediction, arrowByFace } as PredictionRecord,
      })).toThrow(InvalidLearningTransitionError);
    });
  });

  it('advances through five folds and chooses the post-fold branch by mission kind', () => {
    const tracking = learningReducer(
      learningReducer(createInitialLearningState(), {
        type: 'SELECT_MISSION',
        missionId: 'cube-track-01',
      }),
      { type: 'SUBMIT_PREDICTION', prediction },
    );
    const trackingDone = learningReducer(tracking, {
      type: 'SET_FOLD_STEP',
      stepIndex: 5,
    });
    expect(trackingDone.stage).toBe('evidence');

    const collisionDone = foldedCollision();
    expect(collisionDone.stage).toBe('diagnosis');
    expect(collisionDone.foldStepIndex).toBe(5);
    expect(canRevealFoldResult(collisionDone)).toBe(true);
  });

  it('rejects out-of-range and backwards fold actions outside the fold stage', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION',
      missionId: 'cube-track-01',
    });
    const predicted = learningReducer(selected, {
      type: 'SUBMIT_PREDICTION',
      prediction,
    });

    expect(() => learningReducer(predicted, {
      type: 'SET_FOLD_STEP',
      stepIndex: 6,
    })).toThrow(InvalidLearningTransitionError);
    expect(() => learningReducer(predicted, {
      type: 'SET_FOLD_STEP',
      stepIndex: -1,
    })).toThrow(InvalidLearningTransitionError);
  });

  it('keeps a wrong diagnosis as an attempt and only enters repair after the right one', () => {
    const folded = foldedCollision();
    const wrongDiagnosis: DiagnosisSubmission = {
      selectedErrorType: 'missing-face',
      selectedFaceIds: [],
    };
    const reviewing = learningReducer(folded, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: wrongDiagnosis,
    });

    expect(reviewing.stage).toBe('diagnosis');
    expect(reviewing.diagnosis).toEqual(wrongDiagnosis);
    expect(reviewing.attempts.diagnoses).toHaveLength(1);

    const repairedReady = learningReducer(reviewing, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis,
    });
    expect(repairedReady.stage).toBe('repair');
    expect(repairedReady.attempts.diagnoses).toHaveLength(2);
  });

  it('moves to evidence after an accepted repair, then marks one mission complete', () => {
    const diagnosed = learningReducer(foldedCollision(), {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis,
    });
    const repaired = learningReducer(diagnosed, {
      type: 'SUBMIT_REPAIR',
      repair,
    });
    expect(repaired.stage).toBe('evidence');
    expect(repaired.repair).toEqual(repair);

    const evidenced = learningReducer(repaired, {
      type: 'SUBMIT_EVIDENCE',
      evidence,
    });
    expect(evidenced.stage).toBe('evidence');
    expect(evidenced.evidence).toEqual(evidence);

    const completed = learningReducer(evidenced, { type: 'COMPLETE_MISSION' });
    expect(completed.stage).toBe('complete');
    expect(completed.completedMissionIds).toEqual(['cube-collision-01']);
    expect(learningReducer(completed, { type: 'COMPLETE_MISSION' })).toBe(completed);
  });

  it('does not allow a repair without an explicit accepted boolean to bypass repair', () => {
    const diagnosed = learningReducer(foldedCollision(), {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis,
    });
    const rejected = learningReducer(diagnosed, {
      type: 'SUBMIT_REPAIR',
      repair: { ...repair, accepted: false },
    });
    expect(rejected.stage).toBe('repair');

    expect(() => learningReducer(diagnosed, {
      type: 'SUBMIT_REPAIR',
      repair: { faceId: 'F6', target: { x: 2, y: 1 } } as RepairSubmission,
    })).toThrow(InvalidLearningTransitionError);
  });

  it('requires the missing direction as part of a correct collision diagnosis', () => {
    const folded = foldedCollision();
    const withoutDirection = learningReducer(folded, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: {
        selectedErrorType: 'overlap',
        selectedFaceIds: ['F2', 'F6'],
      },
    });
    expect(withoutDirection.stage).toBe('diagnosis');

    const wrongDirection = learningReducer(folded, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: {
        ...diagnosis,
        selectedMissingDirection: '-x',
      },
    });
    expect(wrongDirection.stage).toBe('diagnosis');

    const withDirection = learningReducer(withoutDirection, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis,
    });
    expect(withDirection.stage).toBe('repair');
  });

  it('returns to folding without deleting the original prediction or attempts', () => {
    const diagnosed = learningReducer(foldedCollision(), {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis,
    });
    const returned = learningReducer(diagnosed, {
      type: 'RETURN_TO_FOLD_STEP',
      stepIndex: 2,
    });

    expect(returned.stage).toBe('folding');
    expect(returned.foldStepIndex).toBe(2);
    expect(returned.prediction).toEqual(prediction);
    expect(returned.diagnosis).toBeNull();
    expect(returned.attempts.predictions).toHaveLength(1);
    expect(returned.attempts.diagnoses).toHaveLength(1);
  });

  it('rejects a prediction from another base and stale completion mission', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION',
      missionId: 'cube-track-01',
    });
    expect(() => learningReducer(selected, {
      type: 'SUBMIT_PREDICTION',
      prediction: { ...prediction, baseFaceId: 'F2' },
    })).toThrow(InvalidLearningTransitionError);

    const completed = learningReducer(
      learningReducer(
        learningReducer(
          learningReducer(foldedCollision(), {
            type: 'SUBMIT_DIAGNOSIS', diagnosis,
          }),
          { type: 'SUBMIT_REPAIR', repair },
        ),
        { type: 'SUBMIT_EVIDENCE', evidence },
      ),
      { type: 'COMPLETE_MISSION' },
    );
    expect(() => learningReducer(completed, {
      type: 'COMPLETE_MISSION',
      missionId: 'cube-track-01',
    })).toThrow(StaleLearningActionError);
  });

  it('selects one critical action for each stage', () => {
    const initial = createInitialLearningState();
    expect(getCriticalActionId(initial)).toBe('select-mission');
    const selected = learningReducer(initial, {
      type: 'SELECT_MISSION', missionId: 'cube-collision-01',
    });
    expect(getCriticalActionId(selected)).toBe('submit-prediction');
    const folded = learningReducer(
      learningReducer(selected, { type: 'SUBMIT_PREDICTION', prediction }),
      { type: 'SET_FOLD_STEP', stepIndex: 1 },
    );
    expect(getCriticalActionId(folded)).toBe('next-fold');
    expect(getCriticalActionId({ ...folded, stage: 'diagnosis' })).toBe('submit-diagnosis');
    expect(getCriticalActionId({ ...folded, stage: 'repair' })).toBe('confirm-repair');
    expect(getCriticalActionId({ ...folded, stage: 'evidence' })).toBe('submit-evidence');
    expect(getCriticalActionId({ ...folded, stage: 'complete' })).toBe('next-mission');
  });
});
