import { describe, expect, it } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import {
  enumerateRepairTargets,
  evaluateRepair,
  moveFace,
  rotateFaceDecoration,
} from '../../src/domain/learning/repair';

const collision = getMissionById('cube-collision-01').net;
const collisionTwo = getMissionById('cube-collision-02').net;

describe('repair geometry', () => {
  it('accepts each catalog repair without mutating or sharing mutable data', () => {
    const first = moveFace(collision, 'F6', { x: 2, y: 1 });
    const second = moveFace(collisionTwo, 'F3', { x: 1, y: 0 });

    expect(evaluateRepair(collision, first, 'F1')).toMatchObject({
      changedFaceIds: ['F6'], isSingleFaceMove: true, remainsConnected: true, accepted: true,
    });
    expect(evaluateRepair(collisionTwo, second, 'F1')).toMatchObject({
      changedFaceIds: ['F3'], isSingleFaceMove: true, remainsConnected: true, accepted: true,
    });
    expect(collision.faces.find((face) => face.id === 'F6')?.grid).toEqual({ x: 0, y: 1 });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.faces)).toBe(true);
    expect(Object.isFrozen(first.faces[0])).toBe(true);
    expect(Object.isFrozen(first.faces[0]?.grid)).toBe(true);
    expect(first.faces[0]).not.toBe(collision.faces[0]);
  });

  it('accepts a non-canonical valid minimum move when one exists', () => {
    const targets = enumerateRepairTargets(collision, 'F6');
    const accepted = targets
      .map((target) => evaluateRepair(collision, moveFace(collision, 'F6', target), 'F1'))
      .filter((evaluation) => evaluation.accepted);
    expect(accepted.length).toBeGreaterThan(0);
    expect(accepted.some((evaluation) => evaluation.changedFaceIds[0] === 'F6')).toBe(true);
  });

  it('rejects two-face, metadata-only, disconnected, duplicate, and invalid-base changes', () => {
    const repaired = moveFace(collision, 'F6', { x: 2, y: 1 });
    const twoFace = {
      faces: repaired.faces.map((face) => face.id === 'F5'
        ? { ...face, grid: { x: -1, y: 2 } } : face),
    };
    const metadataOnly = {
      faces: collision.faces.map((face) => face.id === 'F6'
        ? { ...face, decorationQuarterTurn: 1 as const } : face),
    };
    const disconnected = moveFace(collision, 'F6', { x: 8, y: 8 });
    const duplicate = { faces: collision.faces.map((face) => face.id === 'F6'
      ? { ...face, grid: { x: 1, y: 1 } } : face) };

    expect(evaluateRepair(collision, twoFace, 'F1').accepted).toBe(false);
    expect(evaluateRepair(collision, metadataOnly, 'F1').accepted).toBe(false);
    expect(evaluateRepair(collision, disconnected, 'F1').remainsConnected).toBe(false);
    expect(evaluateRepair(collision, duplicate, 'F1').accepted).toBe(false);
    expect(evaluateRepair(collision, repaired, 'F9' as never).accepted).toBe(false);
  });

  it('enumerates only deterministic empty boundary targets that preserve connectivity', () => {
    const first = enumerateRepairTargets(collision, 'F6');
    const reversed = enumerateRepairTargets({ faces: [...collision.faces].reverse() }, 'F6');
    expect(first).toEqual(reversed);
    expect(first).toContainEqual({ x: 2, y: 1 });
    expect(first.some((point) => point.x === 0 && point.y === 1)).toBe(false);
    expect(new Set(first.map((point) => `${point.x},${point.y}`)).size).toBe(first.length);
    expect(first.every((point) => evaluateRepair(collision, moveFace(collision, 'F6', point), 'F1').remainsConnected)).toBe(true);
  });

  it('rotates decoration independently by exactly one quarter turn', () => {
    const rotated = rotateFaceDecoration(collision, 'F3');
    expect(rotated.faces.find((face) => face.id === 'F3')?.decorationQuarterTurn).toBe(1);
    expect(evaluateRepair(collision, rotated, 'F1').accepted).toBe(false);
    expect(collision.faces.find((face) => face.id === 'F3')?.decorationQuarterTurn).toBe(0);
  });
});
