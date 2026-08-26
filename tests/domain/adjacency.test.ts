import { describe, expect, it } from 'vitest';
import {
  DuplicateGridPointError,
  buildAdjacency,
  isConnectedNet,
} from '../../src/domain/net/adjacency';
import { addVec3, gridKey, negateVec3, vec3Key } from '../../src/domain/net/vectors';
import type { FaceDefinition, NetDefinition } from '../../src/domain/net/types';

const face = (id: FaceDefinition['id'], x: number, y: number): FaceDefinition => ({
  id,
  grid: { x, y },
  colorToken: 'blue',
  symbol: 'circle',
  decorationQuarterTurn: 0,
});

const net = (...faces: FaceDefinition[]): NetDefinition => ({ faces });

describe('integer vectors', () => {
  it('adds, negates, and keys integer vectors and grid points', () => {
    expect(addVec3([1, 0, -1], [-1, 1, 0])).toEqual([0, 1, -1]);
    expect(negateVec3([1, 0, -1])).toEqual([-1, 0, 1]);
    expect(vec3Key([1, 0, -1])).toBe('1,0,-1');
    expect(gridKey({ x: -2, y: 4 })).toBe('-2,4');
  });

  it('accepts a legal orthogonal sum and rejects same-axis overflow', () => {
    expect(addVec3([1, 0, 0], [0, 1, 0])).toEqual([1, 1, 0]);
    expect(() => addVec3([1, 0, 0], [1, 0, 0])).toThrow(
      new RangeError('Vec3 component sum must be between -1 and 1; received 2'),
    );
  });
});

describe('grid adjacency', () => {
  it('builds deterministic north/east/south/west neighbors', () => {
    const validNet = net(
      face('F1', 0, 0),
      face('F2', 0, -1),
      face('F3', 1, -1),
      face('F4', 0, 1),
      face('F5', -1, 0),
      face('F6', 4, 4),
    );

    expect(buildAdjacency(validNet).get('F1')).toEqual([
      { faceId: 'F1', neighborFaceId: 'F2', direction: 'north' },
      { faceId: 'F1', neighborFaceId: 'F4', direction: 'south' },
      { faceId: 'F1', neighborFaceId: 'F5', direction: 'west' },
    ]);
  });

  it('does not connect diagonal or distant faces', () => {
    const adjacency = buildAdjacency(
      net(face('F1', 0, 0), face('F2', 1, 1), face('F3', 2, 0)),
    );

    expect(adjacency.get('F1')).toEqual([]);
    expect(adjacency.get('F2')).toEqual([]);
    expect(adjacency.get('F3')).toEqual([]);
  });

  it('keeps isolated faces in the map', () => {
    const adjacency = buildAdjacency(net(face('F1', 0, 0), face('F2', 1, 0)));

    expect(adjacency.get('F1')).toEqual([
      { faceId: 'F1', neighborFaceId: 'F2', direction: 'east' },
    ]);
    expect(adjacency.get('F2')).toEqual([
      { faceId: 'F2', neighborFaceId: 'F1', direction: 'west' },
    ]);
  });

  it('throws a domain error for duplicate grid points', () => {
    expect(() => buildAdjacency(net(face('F1', 0, 0), face('F2', 0, 0)))).toThrow(
      DuplicateGridPointError,
    );
  });

  it('recognizes connected and empty nets', () => {
    expect(isConnectedNet(net(face('F1', 0, 0), face('F2', 1, 0), face('F3', 1, 1)))).toBe(true);
    expect(isConnectedNet(net())).toBe(true);
  });

  it('rejects a disconnected net', () => {
    expect(isConnectedNet(net(face('F1', 0, 0), face('F2', 1, 0), face('F3', 4, 4)))).toBe(false);
  });
});
