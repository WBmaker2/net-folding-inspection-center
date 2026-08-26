import { describe, expect, it } from 'vitest';
import { loadMissionCatalog } from '../../src/content/missions/catalog';
import {
  buildEvidenceSentence,
  CANONICAL_EVIDENCE_TERMS,
  evaluateEvidenceSubmission,
  getEvidenceContext,
  normalizeEvidenceSubmission,
} from '../../src/domain/learning/evidence';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';
import { moveFace } from '../../src/domain/learning/repair';
import type { RepairMissionDefinition } from '../../src/domain/learning/types';

describe('evidence sentence authority', () => {
  it('fills every catalog sentence frame without unresolved tokens', () => {
    for (const mission of loadMissionCatalog()) {
      const sentence = buildEvidenceSentence(mission, {
        firstFace: 'F1',
        secondFace: 'F3',
        term1: '접는 방향',
        term2: mission.kind === 'collision' ? '겹침' : '맞은편',
      });
      expect(sentence).not.toBeNull();
      expect(sentence).not.toMatch(/\{[^}]+\}/u);
    }
  });

  it('uses conceptual first-select relationship and second-select path order', () => {
    const mission = loadMissionCatalog().find((item) => item.id === 'cube-opposite-01')!;
    expect(buildEvidenceSentence(mission, {
      firstFace: 'F1', secondFace: 'F3', term1: '접는 방향', term2: '맞은편',
    })).toBe('1번 면과 3번 면은 접는 방향을 따라가면 서로 맞은편이 됩니다.');
  });

  it('rejects unresolved and arbitrary values', () => {
    const mission = loadMissionCatalog()[0]!;
    expect(buildEvidenceSentence(mission, {
      firstFace: 'F1', secondFace: 'F3', term1: '접는 방향', term2: '낯선 낱말' as never,
    })).toBeNull();
    expect(buildEvidenceSentence({
      ...mission,
      sentenceFrame: { template: '{firstFace} {madeUp}', placeholders: ['firstFace', 'madeUp'] },
    }, { firstFace: 'F1', secondFace: 'F3', term1: '접는 방향', term2: '맞은편' })).toBeNull();
  });

  it('uses the catalog-specific ordered pair for every mission', () => {
    const missions = loadMissionCatalog();
    expect(Object.keys(CANONICAL_EVIDENCE_TERMS)).toHaveLength(8);
    for (const mission of missions) {
      const [term2, term1] = CANONICAL_EVIDENCE_TERMS[mission.id];
      const sentence = buildEvidenceSentence(mission, {
        firstFace: 'F1', secondFace: 'F3', term1, term2,
      });
      expect(sentence, mission.id).not.toBeNull();
      expect(mission.targetVocabulary).toContain(term1);
      expect(mission.targetVocabulary).toContain(term2);
    }
  });

  it('evaluates the canonical pair and terms as correct for all eight missions', () => {
    for (const mission of loadMissionCatalog()) {
      const validation = validateCubeNet(mission.net, mission.baseFaceId);
      const diagnosis = mission.kind === 'tracking'
        ? { selectedErrorType: 'decoration-direction' as const, selectedFaceIds: [mission.answer.decorationTarget.faceId] }
        : mission.kind === 'collision' || mission.kind === 'repair'
          ? {
            selectedErrorType: 'overlap' as const,
            selectedFaceIds: [...(validation.collisions[0]?.faceIds ?? ['F1', 'F2'])],
            selectedMissingDirection: validation.missingNormals[0],
          }
          : null;
      const repair = mission.kind === 'repair'
        ? {
          faceId: mission.answer.repairMove.faceId,
          target: mission.answer.repairMove.to,
          accepted: true,
          candidate: moveFace(mission.net, mission.answer.repairMove.faceId, mission.answer.repairMove.to),
        }
        : null;
      const context = getEvidenceContext(mission, { diagnosis, repair, validation });
      const pair = mission.kind === 'collision'
        ? context.collisionPair === undefined ? undefined : { a: context.collisionPair[0], b: context.collisionPair[1] }
        : mission.kind === 'opposite' ? mission.answer.oppositePair
          : context.pairCandidates.find((candidate) => candidate.a === context.baseFaceId || candidate.b === context.baseFaceId);
      expect(pair, mission.id).toBeDefined();
      const canonical = CANONICAL_EVIDENCE_TERMS[mission.id];
      const secondFace = pair === undefined ? undefined : mission.kind === 'repair'
        ? pair.a === context.baseFaceId ? pair.b : pair.a
        : pair.b;
      const firstFace = mission.kind === 'repair' ? context.repairFaceId : pair?.a;
      const completedSentence = firstFace === undefined || pair === undefined
        ? ''
        : buildEvidenceSentence(mission, {
          firstFace,
          ...(secondFace === undefined ? {} : { secondFace }),
          term1: canonical[1], term2: canonical[0],
        }) ?? '';
      const submission = {
        ...(mission.kind === 'collision' || pair === undefined ? {} : { oppositePair: pair }),
        selectedTerms: canonical,
        completedSentence,
      };
      expect(evaluateEvidenceSubmission(mission, submission, { diagnosis, repair, validation }).isCorrect, mission.id).toBe(true);
    }
  });

  it('keeps a generated wrong vocabulary attempt but never calls it correct', () => {
    const mission = loadMissionCatalog().find((item) => item.id === 'cube-opposite-01')!;
    const validation = validateCubeNet(mission.net, mission.baseFaceId);
    const pair = mission.answer.oppositePair!;
    const wrongTerms = ['면', '모서리'] as const;
    const submission = {
      oppositePair: pair,
      selectedTerms: wrongTerms,
      completedSentence: buildEvidenceSentence(mission, {
        firstFace: pair.a, secondFace: pair.b, term1: wrongTerms[1], term2: wrongTerms[0],
      })!,
    };
    expect(evaluateEvidenceSubmission(mission, submission, { validation }).isCorrect).toBe(false);
    expect(normalizeEvidenceSubmission(mission, submission, { validation })).not.toBeNull();
    const canonical = CANONICAL_EVIDENCE_TERMS[mission.id];
    expect(evaluateEvidenceSubmission(mission, {
      oppositePair: pair,
      selectedTerms: canonical,
      completedSentence: buildEvidenceSentence(mission, {
        firstFace: pair.a, secondFace: pair.b, term1: canonical[1], term2: canonical[0],
      })!,
    }, { validation }).isCorrect).toBe(true);
  });

  it('fails closed for stale or throwing supplied validation maps', () => {
    const mission = loadMissionCatalog().find((item) => item.id === 'cube-opposite-01')!;
    const valid = validateCubeNet(mission.net, mission.baseFaceId);
    const stale = { ...valid, missingNormals: ['+x'] } as typeof valid;
    expect(getEvidenceContext(mission, { validation: stale }).prerequisitesCorrect).toBe(false);
    const throwing = {
      ...valid,
      frames: {
        size: 6,
        get: () => { throw new Error('forged'); },
        entries: () => { throw new Error('forged'); },
      },
    } as unknown as typeof valid;
    expect(getEvidenceContext(mission, { validation: throwing }).prerequisitesCorrect).toBe(false);
  });

  it('treats EvidenceScreen validation as pre-repair while recomputing repaired evidence', () => {
    const mission = loadMissionCatalog().find((item) => item.id === 'cube-repair-01')!;
    const repairAnswer = (mission as RepairMissionDefinition).answer.repairMove;
    const initialValidation = validateCubeNet(mission.net, mission.baseFaceId);
    const diagnosis = {
      selectedErrorType: 'overlap' as const,
      selectedFaceIds: [...initialValidation.collisions[0]!.faceIds],
      selectedMissingDirection: initialValidation.missingNormals[0],
    };
    const repair = {
      faceId: repairAnswer.faceId,
      target: repairAnswer.to,
      accepted: true,
      candidate: moveFace(mission.net, repairAnswer.faceId, repairAnswer.to),
    };
    expect(getEvidenceContext(mission, { validation: initialValidation, diagnosis, repair }).prerequisitesCorrect).toBe(true);
    expect(getEvidenceContext(mission, {
      validation: { ...initialValidation, missingNormals: ['+z'] }, diagnosis, repair,
    }).prerequisitesCorrect).toBe(false);
  });
});
