import { describe, expect, it } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import { buildEvidenceSentence } from '../../src/domain/learning/evidence';
import { createInitialLearningState, learningReducer } from '../../src/domain/learning/reducer';
import {
  rehydratePersistedProgress,
  toPersistedProgress,
} from '../../src/domain/learning/storage';
import { moveFace } from '../../src/domain/learning/repair';

const prediction = {
  baseFaceId: 'F1' as const,
  predictedTopFaceId: 'F3' as const,
  foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'] as const,
  arrowByFace: { F2: 'north' as const, F3: 'north' as const, F5: 'west' as const, F6: 'east' as const, F4: 'south' as const },
  submittedAtIso: '2026-08-26T00:00:00.000Z',
};

const collisionEvidenceState = () => {
  const selected = learningReducer(createInitialLearningState(), {
    type: 'SELECT_MISSION', missionId: 'cube-collision-01',
  });
  const predicted = learningReducer(selected, { type: 'SUBMIT_PREDICTION', prediction });
  const folded = learningReducer(predicted, { type: 'SET_FOLD_STEP', stepIndex: 5 });
  const diagnosed = learningReducer(folded, {
    type: 'SUBMIT_DIAGNOSIS',
    diagnosis: { selectedErrorType: 'overlap', selectedFaceIds: ['F2', 'F6'], selectedMissingDirection: '+x' },
  });
  const repaired = learningReducer(diagnosed, {
    type: 'SUBMIT_REPAIR',
    repair: {
      faceId: 'F6', target: { x: 2, y: 1 }, accepted: true,
      candidate: moveFace(getMissionById('cube-collision-01').net, 'F6', { x: 2, y: 1 }),
    },
  });
  return learningReducer(repaired, {
    type: 'SUBMIT_EVIDENCE',
    evidence: {
      selectedTerms: ['겹침', '면'],
      completedSentence: buildEvidenceSentence(getMissionById('cube-collision-01'), {
        firstFace: 'F2', secondFace: 'F6', term1: '면', term2: '겹침',
      })!,
    },
  });
};

describe('persisted state rehydration', () => {
  it('restores geometry state and enables the save choice', () => {
    const selected = learningReducer(createInitialLearningState(), {
      type: 'SELECT_MISSION', missionId: 'cube-track-01',
    });
    const folding = learningReducer(selected, { type: 'SUBMIT_PREDICTION', prediction });
    const restored = rehydratePersistedProgress(toPersistedProgress(folding));
    expect(restored).toMatchObject({ stage: 'folding', foldStepIndex: 0, storageOptIn: true });
    expect(restored?.prediction?.baseFaceId).toBe('F1');
  });

  it('regenerates evidence sentences and preserves return-to-fold attempts', () => {
    const evidenced = collisionEvidenceState();
    const restoredEvidence = rehydratePersistedProgress(toPersistedProgress(evidenced));
    expect(restoredEvidence?.evidence?.completedSentence).toBe(evidenced.evidence?.completedSentence);
    expect(JSON.stringify(restoredEvidence)).not.toMatch(/이름|학번|이메일|free.?text/u);

    const returned = learningReducer(evidenced, { type: 'RETURN_TO_FOLD_STEP', stepIndex: 2 });
    const restoredReturned = rehydratePersistedProgress(toPersistedProgress(returned));
    expect(restoredReturned).toMatchObject({ stage: 'folding', foldStepIndex: 2, diagnosis: null, repair: null });
    expect(restoredReturned?.attempts.evidence[0]?.completedSentence)
      .toBe(evidenced.attempts.evidence[0]?.completedSentence);
    expect(Object.isFrozen(restoredReturned?.attempts.evidence[0])).toBe(true);
    expect(Object.isFrozen(restoredReturned?.attempts.evidence[0]?.selectedTerms)).toBe(true);
    expect(Object.isFrozen(restoredReturned?.attempts.repairs[0])).toBe(true);
    expect(Object.isFrozen(restoredReturned?.attempts.repairs[0]?.target)).toBe(true);
    expect(Object.isFrozen(restoredReturned?.attempts.repairs[0]?.candidate)).toBe(true);
    expect(Object.isFrozen(restoredReturned?.attempts.repairs[0]?.candidate.faces)).toBe(true);
    expect(Object.isFrozen(restoredReturned?.attempts.repairs[0]?.candidate.faces[0]?.grid)).toBe(true);
    expect(() => {
      (restoredReturned!.attempts.repairs[0]!.target as { x: number }).x = 99;
    }).toThrow();
    expect(restoredReturned?.attempts.repairs[0]?.target.x).toBe(2);

    const wrongAfterReturn = learningReducer(
      learningReducer(returned, { type: 'SET_FOLD_STEP', stepIndex: 5 }),
      { type: 'SUBMIT_DIAGNOSIS', diagnosis: { selectedErrorType: 'overlap', selectedFaceIds: ['F1'] } },
    );
    const restoredHistory = rehydratePersistedProgress(toPersistedProgress(wrongAfterReturn));
    expect(restoredHistory?.attempts.evidence[0]?.completedSentence)
      .toBe(evidenced.attempts.evidence[0]?.completedSentence);
  });
});
