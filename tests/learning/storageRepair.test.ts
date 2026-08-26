import { describe, expect, it } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import { moveFace } from '../../src/domain/learning/repair';
import { createInitialLearningState, learningReducer } from '../../src/domain/learning/reducer';
import { sanitizePersistedProgress, toPersistedProgress } from '../../src/domain/learning/storage';

const prediction = {
  baseFaceId: 'F1' as const, predictedTopFaceId: 'F3' as const,
  foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'] as const,
  arrowByFace: { F2: 'north' as const, F3: 'north' as const, F5: 'west' as const, F6: 'east' as const, F4: 'south' as const },
  submittedAtIso: '2026-08-26T00:00:00.000Z',
};

const validProgress = () => {
  const selected = learningReducer(createInitialLearningState(), { type: 'SELECT_MISSION', missionId: 'cube-collision-01' });
  const predicted = learningReducer(selected, { type: 'SUBMIT_PREDICTION', prediction });
  const folded = learningReducer(predicted, { type: 'SET_FOLD_STEP', stepIndex: 5 });
  const diagnosed = learningReducer(folded, {
    type: 'SUBMIT_DIAGNOSIS',
    diagnosis: { selectedErrorType: 'overlap', selectedFaceIds: ['F2', 'F6'], selectedMissingDirection: '+x' },
  });
  const repaired = learningReducer(diagnosed, {
    type: 'SUBMIT_REPAIR',
    repair: { faceId: 'F6', target: { x: 2, y: 1 }, accepted: true, candidate: moveFace(getMissionById('cube-collision-01').net, 'F6', { x: 2, y: 1 }) },
  });
  return toPersistedProgress(repaired);
};

describe('repair persistence authority', () => {
  it('rejects forged accepted flags and metadata-only candidate repairs', () => {
    const valid = validProgress();
    expect(sanitizePersistedProgress({ ...valid, repair: { ...valid.repair!, accepted: false } })).toBeNull();
    const metadataOnly = { ...valid.repair!.candidate, faces: valid.repair!.candidate.faces.map((face) => face.id === 'F6' ? { ...face, decorationQuarterTurn: 1 } : face) };
    expect(sanitizePersistedProgress({ ...valid, repair: { ...valid.repair!, accepted: false, candidate: metadataOnly } })).toBeNull();
  });
});
