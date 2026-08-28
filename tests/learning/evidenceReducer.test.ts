import { describe, expect, it } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import { buildEvidenceSentence, getEvidenceContext } from '../../src/domain/learning/evidence';
import { createInitialLearningState, learningReducer } from '../../src/domain/learning/reducer';
import { moveFace } from '../../src/domain/learning/repair';
import { toPersistedProgress, sanitizePersistedProgress } from '../../src/domain/learning/storage';
import { getAchievementEvidence } from '../../src/domain/learning/selectors';
import type { MissionDefinition } from '../../src/domain/learning/types';

const prediction = {
  baseFaceId: 'F1' as const,
  predictedTopFaceId: 'F3' as const,
  foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'] as const,
  arrowByFace: { F2: 'north' as const, F3: 'north' as const, F5: 'west' as const, F6: 'east' as const, F4: 'south' as const },
  submittedAtIso: '2026-08-26T00:00:00.000Z',
};

const ready = (missionId: MissionDefinition['id']) => {
  const mission = getMissionById(missionId);
  let state = learningReducer(createInitialLearningState(), { type: 'SELECT_MISSION', missionId });
  state = learningReducer(state, { type: 'SUBMIT_PREDICTION', prediction });
  state = learningReducer(state, { type: 'SET_FOLD_STEP', stepIndex: 5 });
  if (mission.kind === 'tracking') {
    state = learningReducer(state, { type: 'SUBMIT_DIAGNOSIS', diagnosis: { selectedErrorType: 'decoration-direction', selectedFaceIds: [mission.answer.decorationTarget.faceId] } });
  } else if (mission.kind === 'collision' || mission.kind === 'repair') {
    const pair = mission.kind === 'collision' ? mission.answer.collisionPair : ['F2', 'F6'] as const;
    state = learningReducer(state, { type: 'SUBMIT_DIAGNOSIS', diagnosis: { selectedErrorType: 'overlap', selectedFaceIds: [...pair], selectedMissingDirection: mission.kind === 'collision' ? mission.answer.missingDirection : '+x' } });
    const target = mission.kind === 'collision' ? { faceId: 'F6' as const, target: { x: 2, y: 1 } } : { faceId: mission.answer.repairMove.faceId, target: mission.answer.repairMove.to };
    state = learningReducer(state, { type: 'SUBMIT_REPAIR', repair: { ...target, accepted: true, candidate: moveFace(mission.net, target.faceId, target.target) } });
  }
  return { mission, state };
};

describe('evidence reducer authority', () => {
  it('keeps a valid context for all four mission kinds', () => {
    for (const missionId of ['cube-track-01', 'cube-opposite-01', 'cube-collision-01', 'cube-repair-01'] as const) {
      const { mission, state } = ready(missionId);
      const context = getEvidenceContext(mission, {
        baseFaceId: state.prediction?.baseFaceId,
        diagnosis: state.diagnosis,
        repair: state.repair,
      });
      expect(context.prerequisitesCorrect, missionId).toBe(true);
    }
  });

  it('marks non-required repair as not applicable instead of confirmed', () => {
    const { mission, state } = ready('cube-opposite-01');
    const evidence = getAchievementEvidence(state, mission);
    expect(evidence).toEqual({ prediction: 'confirmed', analysis: 'not-applicable', repair: 'not-applicable', expression: 'practicing', isComplete: false });
  });

  it('accepts generated evidence and rejects forged sentence text', () => {
    const { mission, state } = ready('cube-opposite-01');
    const context = getEvidenceContext(mission, { baseFaceId: 'F1' });
    const pair = mission.answer.oppositePair!;
    const evidence = { oppositePair: pair, selectedTerms: ['맞은편', '접는 방향'] as const, completedSentence: buildEvidenceSentence(mission, { firstFace: pair.a, secondFace: pair.b, term1: '접는 방향', term2: '맞은편' })! };
    const next = learningReducer(state, { type: 'SUBMIT_EVIDENCE', evidence });
    expect(next.attempts.evidence).toHaveLength(1);
    expect(() => learningReducer(next, { type: 'COMPLETE_MISSION' })).not.toThrow();
    const complete = learningReducer(next, { type: 'COMPLETE_MISSION' });
    expect(sanitizePersistedProgress(toPersistedProgress(complete))).not.toBeNull();
    expect(context.pairCandidates).toContainEqual(pair);
  });

  it('preserves wrong structured attempts while blocking completion', () => {
    const { mission, state } = ready('cube-opposite-01');
    const wrongPair = { a: 'F2' as const, b: 'F4' as const };
    const evidence = { oppositePair: wrongPair, selectedTerms: ['맞은편', '접는 방향'] as const, completedSentence: buildEvidenceSentence(mission, { firstFace: wrongPair.a, secondFace: wrongPair.b, term1: '접는 방향', term2: '맞은편' })! };
    const next = learningReducer(state, { type: 'SUBMIT_EVIDENCE', evidence });
    expect(next.attempts.evidence).toHaveLength(1);
    expect(() => learningReducer(next, { type: 'COMPLETE_MISSION' })).toThrow();
  });
});
