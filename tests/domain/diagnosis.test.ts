import { describe, expect, it } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';
import { validationMatches } from '../../src/domain/learning/diagnosis';

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
});
