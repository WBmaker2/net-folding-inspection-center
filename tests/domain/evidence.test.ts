import { describe, expect, it } from 'vitest';
import { loadMissionCatalog } from '../../src/content/missions/catalog';
import { buildEvidenceSentence } from '../../src/domain/learning/evidence';

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
});
