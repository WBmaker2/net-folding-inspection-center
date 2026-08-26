import { describe, expect, it } from 'vitest';
import { evaluateDecorationOrientation } from '../../src/domain/net/decoration';
import { computeFaceFrames } from '../../src/domain/net/foldEngine';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';
import type { FaceDefinition, FaceFrame, NetDefinition } from '../../src/domain/net/types';

const face = (
  id: FaceDefinition['id'],
  x: number,
  y: number,
  decorationQuarterTurn: FaceDefinition['decorationQuarterTurn'] = 0,
): FaceDefinition => ({
  id,
  grid: { x, y },
  colorToken: 'blue',
  symbol: 'circle',
  decorationQuarterTurn,
});

const canonicalValidNet = (decorationQuarterTurn = 0): NetDefinition => ({
  faces: [
    face('F1', 1, 2),
    face('F2', 1, 1),
    face('F3', 1, 0, decorationQuarterTurn as FaceDefinition['decorationQuarterTurn']),
    face('F4', 1, 3),
    face('F5', 0, 2),
    face('F6', 2, 2),
  ],
});

describe('decoration orientation checks', () => {
  it('rotates local up in quarter-turn order and compares it with world up', () => {
    const frame: FaceFrame = {
      normal: [0, 0, -1],
      right: [1, 0, 0],
      down: [0, -1, 0],
      center: [0, 0, -1],
    };
    const decoratedFace = face('F3', 1, 0, 1);

    expect(evaluateDecorationOrientation(decoratedFace, frame, '+y')).toEqual({
      worldUp: '+y',
      targetWorldUp: '+y',
      matchesTarget: true,
    });
    expect(evaluateDecorationOrientation(face('F3', 1, 0, 0), frame, '+y').matchesTarget)
      .toBe(false);
  });

  it('keeps cube validity independent from decoration rotation', () => {
    const plain = canonicalValidNet(0);
    const rotated = canonicalValidNet(2);

    expect(validateCubeNet(rotated, 'F1').isValid).toBe(validateCubeNet(plain, 'F1').isValid);
    expect(validateCubeNet(rotated, 'F1').frames).toEqual(
      computeFaceFrames(plain, 'F1').frames,
    );
  });
});
