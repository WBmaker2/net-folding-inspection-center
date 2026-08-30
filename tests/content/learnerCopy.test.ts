import { describe, expect, it } from 'vitest';
import { formatFaceReferences } from '../../src/content/learnerCopy';

describe('learner copy formatters', () => {
  it('turns catalog face ids into numbered face language without changing other words', () => {
    expect(formatFaceReferences('F1을 기준으로 F3을 살펴보세요.')).toBe('1번 면을 기준으로 3번 면을 살펴보세요.');
    expect(formatFaceReferences('F6·F2 관계')).toBe('6번 면·2번 면 관계');
    expect(formatFaceReferences('면 10과 F7')).toBe('면 10과 F7');
  });
});
