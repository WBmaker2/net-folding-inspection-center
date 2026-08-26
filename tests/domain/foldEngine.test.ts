import { describe, expect, it } from 'vitest';
import { buildAdjacency } from '../../src/domain/net/adjacency';
import {
  computeFaceFrames,
  createFoldSequence,
  getFoldSnapshot,
  getOppositePairs,
  InvalidFoldOrderError,
} from '../../src/domain/net/foldEngine';
import type { FaceDefinition, FaceFrame, NetDefinition } from '../../src/domain/net/types';

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

describe('cube fold frame propagation', () => {
  it('starts at the prescribed base frame and propagates integer frames by edge direction', () => {
    const computation = computeFaceFrames(canonicalValidNet, 'F1');

    expect(computation.frames.get('F1')).toEqual({
      normal: [0, 0, 1],
      right: [1, 0, 0],
      down: [0, 1, 0],
      center: [0, 0, 1],
    });
    expect(computation.frames.get('F2')).toEqual({
      normal: [0, -1, 0],
      right: [1, 0, 0],
      down: [0, 0, 1],
      center: [0, -1, 0],
    });
    expect(computation.frames.get('F3')).toEqual({
      normal: [0, 0, -1],
      right: [1, 0, 0],
      down: [0, -1, 0],
      center: [0, 0, -1],
    });
    expect(computation.frames.get('F5')).toEqual({
      normal: [-1, 0, 0],
      right: [0, 0, 1],
      down: [0, 1, 0],
      center: [-1, 0, 0],
    });
    expect(computation.frames.get('F6')).toEqual({
      normal: [1, 0, 0],
      right: [0, 0, -1],
      down: [0, 1, 0],
      center: [1, 0, 0],
    });
    expect(computation.parentEdgeByFace.get('F2')).toEqual({
      faceId: 'F1',
      neighborFaceId: 'F2',
      direction: 'north',
    });
    expect(computation.frameConflicts).toEqual([]);
  });

  it('records one deterministic conflict for a cycle that folds inconsistently', () => {
    const cycle = net(
      face('F1', 0, 0),
      face('F2', 1, 0),
      face('F3', 1, 1),
      face('F4', 0, 1),
    );
    const computation = computeFaceFrames(cycle, 'F1');

    expect(computation.frames.size).toBe(4);
    expect(computation.frameConflicts).toHaveLength(1);
    expect(computation.frameConflicts[0]?.faceId).toBe('F3');
  });

  it('returns opposite pairs in stable face-id order', () => {
    const frames = new Map([
      ['F1', { normal: [0, 0, 1], right: [1, 0, 0], down: [0, 1, 0], center: [0, 0, 1] }],
      ['F2', { normal: [1, 0, 0], right: [0, 0, -1], down: [0, 1, 0], center: [1, 0, 0] }],
      ['F3', { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, 1, 0], center: [0, 0, -1] }],
      ['F4', { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, 1, 0], center: [-1, 0, 0] }],
      ['F5', { normal: [0, 1, 0], right: [0, 0, -1], down: [0, 0, 1], center: [0, 1, 0] }],
      ['F6', { normal: [0, -1, 0], right: [0, 0, -1], down: [0, 0, -1], center: [0, -1, 0] }],
    ] as [FaceDefinition['id'], FaceFrame][]);

    expect(getOppositePairs(frames)).toEqual([
      { a: 'F1', b: 'F3' },
      { a: 'F2', b: 'F4' },
      { a: 'F5', b: 'F6' },
    ]);
  });

  it('uses the same adjacency direction contract as the grid graph', () => {
    const adjacency = buildAdjacency(canonicalValidNet);
    expect(adjacency.get('F1')).toEqual([
      { faceId: 'F1', neighborFaceId: 'F2', direction: 'north' },
      { faceId: 'F1', neighborFaceId: 'F6', direction: 'east' },
      { faceId: 'F1', neighborFaceId: 'F4', direction: 'south' },
      { faceId: 'F1', neighborFaceId: 'F5', direction: 'west' },
    ]);
  });

  it('creates a deterministic five-fold sequence and immutable snapshots', () => {
    const sequence = createFoldSequence(canonicalValidNet, 'F1', [
      'F2', 'F3', 'F5', 'F6', 'F4',
    ]);

    expect(sequence.steps.map((step) => step.movingFaceId)).toEqual([
      'F2', 'F3', 'F5', 'F6', 'F4',
    ]);
    expect(sequence.steps[0]).toMatchObject({
      index: 1,
      movingFaceId: 'F2',
      hingeFaceId: 'F1',
      direction: 'north',
      angleDegrees: 90,
    });
    expect(sequence.snapshots).toHaveLength(6);
    expect(getFoldSnapshot(sequence, 0).settledFaceIds).toEqual(['F1']);
    expect(getFoldSnapshot(sequence, 5).settledFaceIds).toHaveLength(6);
    expect([...getFoldSnapshot(sequence, 5).frames.entries()]).toEqual(
      [...computeFaceFrames(canonicalValidNet, 'F1').frames.entries()],
    );
    expect(getFoldSnapshot(sequence, 0).frames).not.toBe(getFoldSnapshot(sequence, 1).frames);
    expect(sequence.snapshots.map((snapshot) => snapshot.settledFaceIds.length)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(Object.isFrozen(sequence.snapshots)).toBe(true);
    expect(Object.isFrozen(getFoldSnapshot(sequence, 1).frames)).toBe(true);
    expect(() => Map.prototype.set.call(getFoldSnapshot(sequence, 1).frames, 'F6', {
      normal: [0, 0, 1], right: [1, 0, 0], down: [0, 1, 0], center: [0, 0, 1],
    })).toThrow(TypeError);
  });

  it('rejects a requested fold that does not share an edge with settled faces', () => {
    expect(() => createFoldSequence(canonicalValidNet, 'F1', [
      'F3', 'F2', 'F5', 'F6', 'F4',
    ] as const)).toThrow(InvalidFoldOrderError);
  });

  it.each([
    { label: 'empty', order: [] as const },
    { label: 'short', order: ['F2', 'F3', 'F5', 'F6'] as const },
    { label: 'long', order: ['F2', 'F3', 'F5', 'F6', 'F4', 'F1'] as const },
  ])('rejects a requested fold order with length ($label)', ({ order }) => {
    expect(() => createFoldSequence(canonicalValidNet, 'F1', order))
      .toThrow(InvalidFoldOrderError);
  });

  it.each([
    { label: 'duplicate', order: ['F2', 'F2', 'F3', 'F5', 'F6'] as const },
    { label: 'base reappearance', order: ['F2', 'F1', 'F3', 'F5', 'F6'] as const },
  ])('rejects duplicate or reappearing base faces: $label', ({ order }) => {
    expect(() => createFoldSequence(canonicalValidNet, 'F1', order))
      .toThrow(InvalidFoldOrderError);
  });

  it('chooses a settled hinge whose proposal matches the authoritative final frame', () => {
    const sequence = createFoldSequence(collisionNet, 'F1', [
      'F2', 'F5', 'F6', 'F3', 'F4',
    ]);

    expect(sequence.steps[2]).toMatchObject({
      movingFaceId: 'F6',
      hingeFaceId: 'F5',
      direction: 'north',
    });
  });

  it('rejects a cyclic step when no settled hinge can produce the final frame', () => {
    expect(() => createFoldSequence(collisionNet, 'F1', [
      'F2', 'F6', 'F5', 'F3', 'F4',
    ])).toThrow(InvalidFoldOrderError);
  });

  it.each([-1, 1.5, 6])('rejects fold snapshot index %s', (stepIndex) => {
    const sequence = createFoldSequence(canonicalValidNet, 'F1', [
      'F2', 'F3', 'F5', 'F6', 'F4',
    ]);
    expect(() => getFoldSnapshot(sequence, stepIndex)).toThrow(RangeError);
  });
});
