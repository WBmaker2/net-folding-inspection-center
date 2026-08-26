import { describe, expect, it } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import {
  buildEvidenceSentence,
  CANONICAL_EVIDENCE_TERMS,
  getEvidenceContext,
} from '../../src/domain/learning/evidence';
import { createInitialLearningState, learningReducer } from '../../src/domain/learning/reducer';
import { moveFace } from '../../src/domain/learning/repair';
import {
  createSessionProgressStore,
  migratePersistedProgress,
  PROGRESS_STORAGE_KEY,
  rehydratePersistedProgress,
  sanitizePersistedProgress,
  toPersistedProgress,
} from '../../src/domain/learning/storage';
import type { LearningState, MissionId } from '../../src/domain/learning/types';

const prediction = {
  baseFaceId: 'F1' as const,
  predictedTopFaceId: 'F3' as const,
  foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'] as const,
  arrowByFace: { F2: 'north' as const, F3: 'north' as const, F5: 'west' as const, F6: 'east' as const, F4: 'south' as const },
  submittedAtIso: '2026-08-26T00:00:00.000Z',
};

const MISSION_IDS: readonly MissionId[] = [
  'cube-track-01', 'cube-track-02',
  'cube-opposite-01', 'cube-opposite-02',
  'cube-collision-01', 'cube-collision-02',
  'cube-repair-01', 'cube-repair-02',
];

const evidenceState = (missionId: MissionId): LearningState => {
  const mission = getMissionById(missionId);
  let state = learningReducer(createInitialLearningState(), { type: 'SELECT_MISSION', missionId });
  state = learningReducer(state, { type: 'SUBMIT_PREDICTION', prediction });
  state = learningReducer(state, { type: 'SET_FOLD_STEP', stepIndex: 5 });
  if (mission.kind === 'tracking') {
    state = learningReducer(state, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: {
        selectedErrorType: 'decoration-direction',
        selectedFaceIds: [mission.answer.decorationTarget.faceId],
      },
    });
  } else if (mission.kind !== 'opposite') {
    const context = getEvidenceContext(mission, { baseFaceId: 'F1' });
    state = learningReducer(state, {
      type: 'SUBMIT_DIAGNOSIS',
      diagnosis: {
        selectedErrorType: 'overlap',
        selectedFaceIds: [...context.validation.collisions[0]!.faceIds],
        selectedMissingDirection: context.validation.missingNormals[0],
      },
    });
  }
  if (mission.kind === 'collision' || mission.kind === 'repair') {
    const answer = mission.kind === 'repair'
      ? mission.answer.repairMove
      : mission.id === 'cube-collision-01'
        ? { faceId: 'F6' as const, to: { x: 2, y: 1 } }
        : { faceId: 'F3' as const, to: { x: 1, y: 0 } };
    state = learningReducer(state, {
      type: 'SUBMIT_REPAIR',
      repair: {
        faceId: answer.faceId,
        target: answer.to,
        accepted: true,
        candidate: moveFace(mission.net, answer.faceId, answer.to),
      },
    });
  }
  const context = getEvidenceContext(mission, {
    baseFaceId: 'F1', diagnosis: state.diagnosis, repair: state.repair,
  });
  const pair = mission.kind === 'opposite'
    ? mission.answer.oppositePair
    : mission.kind === 'collision'
      ? { a: context.collisionPair![0], b: context.collisionPair![1] }
      : context.pairCandidates.find((candidate) => (
        candidate.a === context.baseFaceId || candidate.b === context.baseFaceId
      ))!;
  const canonical = CANONICAL_EVIDENCE_TERMS[mission.id];
  const firstFace = mission.kind === 'repair' ? context.repairFaceId! : pair.a;
  const secondFace = mission.kind === 'repair' ? context.baseFaceId : pair.b;
  const evidence = {
    ...(mission.kind === 'collision' ? {} : { oppositePair: pair }),
    selectedTerms: canonical,
    completedSentence: buildEvidenceSentence(mission, {
      firstFace, secondFace, term1: canonical[1], term2: canonical[0],
    })!,
  };
  return learningReducer(state, { type: 'SUBMIT_EVIDENCE', evidence });
};

const asLegacyV1 = (state: LearningState): Record<string, unknown> => {
  const current = JSON.parse(JSON.stringify(toPersistedProgress(state))) as {
    version: number;
    evidence: Record<string, unknown> | null;
    attempts: { evidence: Record<string, unknown>[] };
  };
  current.version = 1;
  if (current.evidence) {
    delete current.evidence.diagnosisAttemptIndex;
    delete current.evidence.repairAttemptIndex;
  }
  current.attempts.evidence = current.attempts.evidence.map((evidence: Record<string, unknown>) => {
    const legacy = { ...evidence };
    delete legacy.diagnosisAttemptIndex;
    delete legacy.repairAttemptIndex;
    return legacy;
  });
  return current;
};

const makeStorage = (initialValue: string): Storage => {
  let value = initialValue;
  return {
    get length() { return value === '' ? 0 : 1; },
    clear: () => { value = ''; },
    getItem: () => value === '' ? null : value,
    key: () => null,
    removeItem: () => { value = ''; },
    setItem: (_key: string, nextValue: string) => { value = nextValue; },
  } as Storage;
};

describe('explicit v1 to v2 progress migration', () => {
  it.each(MISSION_IDS)(
    'migrates the old sentence-free %s payload and rewrites canonical v2',
    (missionId) => {
      const legacy = asLegacyV1(evidenceState(missionId));
      const migrated = migratePersistedProgress(legacy);
      expect(migrated).toMatchObject({ version: 2, missionId });
      expect(JSON.stringify(migrated)).not.toMatch(/completedSentence/u);
      if (missionId === 'cube-opposite-01' || missionId === 'cube-opposite-02') {
        expect(migrated?.attempts.evidence[0]).not.toHaveProperty('diagnosisAttemptIndex');
      } else {
        expect(migrated?.attempts.evidence[0]).toHaveProperty('diagnosisAttemptIndex', 0);
      }
      const restored = rehydratePersistedProgress(migrated!);
      expect(restored).not.toBeNull();
      expect(restored?.attempts.evidence[0]?.completedSentence)
        .toBe(evidenceState(missionId).attempts.evidence[0]?.completedSentence);
      const storage = makeStorage(JSON.stringify(legacy));
      const loaded = createSessionProgressStore(storage).load();
      expect(loaded?.version).toBe(2);
      expect(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY) ?? '{}').version).toBe(2);
    },
  );

  it('rewrites a migrated session payload and restores its generated sentence', () => {
    const legacy = asLegacyV1(evidenceState('cube-repair-01'));
    const storage = makeStorage(JSON.stringify(legacy));
    const store = createSessionProgressStore(storage);
    const loaded = store.load()!;
    expect(loaded.version).toBe(2);
    expect(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY) ?? '{}').version).toBe(2);
    expect(rehydratePersistedProgress(loaded)?.evidence?.completedSentence)
      .toBe(evidenceState('cube-repair-01').evidence?.completedSentence);
  });

  it('keeps a repair evidence sentence tied to its original context after a later wrong diagnosis', () => {
    const evidenced = evidenceState('cube-repair-01');
    const returned = learningReducer(evidenced, {
      type: 'RETURN_TO_FOLD_STEP', stepIndex: 2,
    });
    const wrong = learningReducer(
      learningReducer(returned, { type: 'SET_FOLD_STEP', stepIndex: 5 }),
      {
        type: 'SUBMIT_DIAGNOSIS',
        diagnosis: { selectedErrorType: 'overlap', selectedFaceIds: ['F1'] },
      },
    );
    const persisted = toPersistedProgress(wrong);
    const restored = rehydratePersistedProgress(persisted);
    expect(restored?.attempts.evidence[0]?.completedSentence)
      .toBe(evidenced.attempts.evidence[0]?.completedSentence);
    expect(restored?.attempts.evidence[0]?.repairAttemptIndex).toBe(0);
    expect(restored?.attempts.repairs[0]?.faceId).toBe('F6');
    expect(restored?.attempts.repairs[0]?.target).toEqual({ x: 2, y: 1 });
    expect(sanitizePersistedProgress({
      ...persisted,
      attempts: {
        ...persisted.attempts,
        evidence: [{ ...persisted.attempts.evidence[0]!, diagnosisAttemptIndex: 1 }],
      },
    })).toBeNull();
  });
});
