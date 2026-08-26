import { describe, expect, it } from 'vitest';
import { buildAdjacency } from '../../src/domain/net/adjacency';
import {
  computeFaceFrames,
  createFoldSequence,
  getFoldSnapshot,
  getOppositePairs,
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
    expect(sequence.steps[0]?.startFrame).toBeDefined();
    expect(sequence.steps[0]?.endFrame).toEqual(
      computeFaceFrames(canonicalValidNet, 'F1').frames.get('F2'),
    );

    expect(sequence.snapshots).toHaveLength(6);
    expect(getFoldSnapshot(sequence, 0).settledFaceIds).toEqual(['F1']);
    expect(getFoldSnapshot(sequence, 5).settledFaceIds).toHaveLength(6);
    expect(getFoldSnapshot(sequence, 5).frames).toEqual(
      computeFaceFrames(canonicalValidNet, 'F1').frames,
    );
    expect(getFoldSnapshot(sequence, 0).frames).not.toBe(getFoldSnapshot(sequence, 1).frames);
  });

  it('rejects a requested fold that does not share an edge with settled faces', () => {
    expect(() => createFoldSequence(canonicalValidNet, 'F1', [
      'F3', 'F2', 'F5', 'F6', 'F4',
    ])).toThrowError('F3');
  });
});
