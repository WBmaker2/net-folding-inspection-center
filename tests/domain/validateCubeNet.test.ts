import { describe, expect, it } from 'vitest';
import { cubeNetInspector, validateCubeNet } from '../../src/domain/net/validateCubeNet';
import type { FaceDefinition, NetDefinition } from '../../src/domain/net/types';
import { generateFreeHexominoes, transformNet } from '../helpers/generateFreeHexominoes';

const face = (id: FaceDefinition['id'], x: number, y: number): FaceDefinition => ({
  id,
  grid: { x, y },
  colorToken: 'blue',
  symbol: 'circle',
  decorationQuarterTurn: 0,
});

const net = (...faces: FaceDefinition[]): NetDefinition => ({ faces });

const canonicalValidNet = net(
  face('F1', 1, 2),
  face('F2', 1, 1),
  face('F3', 1, 0),
  face('F4', 1, 3),
  face('F5', 0, 2),
  face('F6', 2, 2),
);

const collisionNet = net(
  face('F1', 1, 2),
  face('F2', 1, 1),
  face('F3', 1, 0),
  face('F4', 1, 3),
  face('F5', 0, 2),
  face('F6', 0, 1),
);

describe('cube-net validation', () => {
  it('accepts a canonical net and reports its three opposite pairs', () => {
    const result = validateCubeNet(canonicalValidNet, 'F1');

    expect(result.isValid).toBe(true);
    expect(result.reason).toBe('valid');
    expect(result.oppositePairs).toEqual([
      { a: 'F1', b: 'F3' },
      { a: 'F2', b: 'F4' },
      { a: 'F5', b: 'F6' },
    ]);
    expect(result.missingNormals).toEqual([]);
    expect(cubeNetInspector.inspect(canonicalValidNet, 'F1')).toEqual(result);
  });

  it('reports the collision before a simultaneous frame conflict', () => {
    const result = validateCubeNet(collisionNet, 'F1');

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('overlap');
    expect(result.collisions).toEqual([
      { faceIds: ['F2', 'F6'], normal: [0, -1, 0] },
    ]);
    expect(result.collisions).toContainEqual({ faceIds: ['F2', 'F6'], normal: [0, -1, 0] });
    expect(result.missingNormals).toContain('+x');
  });

  it('classifies face-count and connectivity failures before geometry failures', () => {
    const fiveFaces = net(
      face('F1', 0, 0), face('F2', 1, 0), face('F3', 2, 0), face('F4', 3, 0), face('F5', 4, 0),
    );
    const disconnected = net(
      face('F1', 0, 0), face('F2', 1, 0), face('F3', 2, 0),
      face('F4', 10, 10), face('F5', 11, 10), face('F6', 12, 10),
    );

    expect(validateCubeNet(fiveFaces, 'F1').reason).toBe('invalid-face-count');
    expect(validateCubeNet(disconnected, 'F1').reason).toBe('disconnected');
  });

  it('exhaustively finds exactly the eleven cube nets among the 35 free hexominoes', () => {
    const all = generateFreeHexominoes();

    expect(all).toHaveLength(35);
    expect(all.filter((candidate) => validateCubeNet(candidate, 'F1').isValid)).toHaveLength(11);
  });

  it('preserves classification under translations, rotations, and reflections', () => {
    for (const candidate of generateFreeHexominoes()) {
      const expected = validateCubeNet(candidate, 'F1').isValid;
      for (const reflected of [false, true]) {
        for (const rotation of [0, 1, 2, 3] as const) {
          const transformed = transformNet(candidate, rotation, reflected, { x: 17, y: -23 });
          expect(validateCubeNet(transformed, 'F1').isValid).toBe(expected);
        }
      }
    }
  });

  it('exposes all six axis directions for a valid net', () => {
    const result = validateCubeNet(canonicalValidNet, 'F1');
    expect(result.frames.size).toBe(6);
    expect(result.missingNormals).toEqual([]);
  });
});
