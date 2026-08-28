import { describe, expect, it } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';
import { validationMatches } from '../../src/domain/learning/diagnosis';
import { createFoldSequence } from '../../src/domain/net/foldEngine';
import { axisLabel, directionLabel } from '../../src/domain/net/directionLabels';

const mission = getMissionById('cube-collision-01');
const expected = validateCubeNet(mission.net, 'F1');

describe('validationMatches', () => {
  it('compares every authoritative field exactly and deterministically', () => {
    expect(validationMatches(expected, expected)).toBe(true);
    expect(validationMatches({ ...expected, isValid: !expected.isValid }, expected)).toBe(false);
    expect(validationMatches({ ...expected, reason: 'valid' }, expected)).toBe(false);
    expect(validationMatches({ ...expected, missingNormals: [...expected.missingNormals, '-x'] }, expected)).toBe(false);
    expect(validationMatches({ ...expected, collisions: [...expected.collisions].slice(0, -1) }, expected)).toBe(false);
    expect(validationMatches({ ...expected, oppositePairs: [...expected.oppositePairs].slice(0, -1) }, expected)).toBe(false);
    expect(validationMatches({ ...expected, oppositePairs: [...expected.oppositePairs, expected.oppositePairs[0]] }, expected)).toBe(false);
    const firstPair = expected.oppositePairs[0]!;
    expect(validationMatches({
      ...expected,
      oppositePairs: [{ a: firstPair.b, b: firstPair.a }, ...expected.oppositePairs.slice(1)],
    }, expected)).toBe(false);
    const sequence = createFoldSequence(mission.net, 'F1', mission.suggestedFoldOrder);
    expect(validationMatches({ ...expected, frames: sequence.frames }, expected)).toBe(true);
  });

  it.each([
    null,
    {},
    { ...expected, oppositePairs: null },
    { ...expected, oppositePairs: {} },
    { ...expected, oppositePairs: [{ a: 'F7', b: 'F1' }] },
    { ...expected, oppositePairs: [{ a: 'F1', b: 'F1' }] },
    { ...expected, collisions: [{ faceIds: ['F1'], normal: [0, 0, 1] }] },
    { ...expected, collisions: [{ faceIds: ['F1', 'F2'], normal: [0, 0] }] },
    { ...expected, missingNormals: ['sideways'] },
    { ...expected, frames: new Map([['F1', {}]]) },
    { ...expected, frames: new Map([['F7', expected.frames.get('F1')]]) },
  ] as readonly unknown[])('returns false without throwing for malformed input %#', (provided) => {
    expect(() => validationMatches(provided, expected)).not.toThrow();
    expect(validationMatches(provided, expected)).toBe(false);
  });

  it.each([
    {
      size: 7,
      entries: () => expected.frames.entries(),
      get: (faceId: string) => expected.frames.get(faceId as never),
    },
    {
      size: 6,
      entries: () => [
        ...expected.frames.entries(),
        ...expected.frames.entries(),
      ][Symbol.iterator](),
      get: (faceId: string) => expected.frames.get(faceId as never),
    },
    {
      size: 6,
      entries: () => [['F1', expected.frames.get('F1')] as const][Symbol.iterator](),
      get: (faceId: string) => expected.frames.get(faceId as never),
    },
    {
      size: 6,
      entries: () => [['F7', expected.frames.get('F1')] as const][Symbol.iterator](),
      get: (faceId: string) => expected.frames.get(faceId as never),
    },
    {
      size: 6,
      entries: () => [...expected.frames.entries()][Symbol.iterator](),
      get: () => expected.frames.get('F1'),
    },
    {
      size: 6,
      entries: () => ({ next: () => ({ done: false, value: ['F1', expected.frames.get('F1')] }) }),
      get: (faceId: string) => expected.frames.get(faceId as never),
    },
    {
      size: 6,
      get get(): never { throw new Error('get getter failed'); },
      entries: () => [...expected.frames.entries()][Symbol.iterator](),
    },
    {
      size: 6,
      get entries(): never { throw new Error('entries getter failed'); },
      get: (faceId: string) => expected.frames.get(faceId as never),
    },
  ] as readonly unknown[])('rejects forged map boundaries without leaking exceptions %#', (frames) => {
    const provided = { ...expected, frames };
    expect(() => validationMatches(provided, expected)).not.toThrow();
    expect(validationMatches(provided, expected)).toBe(false);
  });
});

describe('learner-facing direction labels', () => {
  it('maps renderer-neutral axes without changing the stored enum values', () => {
    expect((['+x', '-x', '+y', '-y', '+z', '-z'] as const).map(axisLabel)).toEqual([
      '오른쪽', '왼쪽', '위', '아래', '앞', '뒤',
    ]);
    expect(directionLabel('+x')).toBe('오른쪽 방향');
    expect(directionLabel(undefined)).toBe('확인할 수 없음');
  });
});
