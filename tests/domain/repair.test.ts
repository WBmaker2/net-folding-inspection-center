import { describe, expect, it } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import {
  enumerateRepairTargets,
  evaluateRepair,
  moveFace,
  rotateFaceDecoration,
} from '../../src/domain/learning/repair';
import { verifyRepairSubmission, RepairValidationError } from '../../src/domain/learning/repairValidation';

const collision = getMissionById('cube-collision-01').net;
const collisionTwo = getMissionById('cube-collision-02').net;

describe('repair geometry', () => {
  it('exhaustively checks every face candidate for both repair missions', () => {
    const missions = [getMissionById('cube-repair-01'), getMissionById('cube-repair-02')];
    const acceptedKeys = new Set<string>();
    missions.forEach((mission) => {
      if (mission.kind !== 'repair') return;
      const acceptedForMission: string[] = [];
      mission.net.faces.forEach((face) => {
        enumerateRepairTargets(mission.net, face.id).forEach((target) => {
          const evaluation = evaluateRepair(mission.net, moveFace(mission.net, face.id, target), 'F1');
          if (evaluation.accepted) acceptedForMission.push(`${face.id}:${target.x},${target.y}`);
        });
      });
      const answer = mission.answer.repairMove;
      const canonical = `${answer.faceId}:${answer.to.x},${answer.to.y}`;
      expect(acceptedForMission).toContain(canonical);
      acceptedForMission.forEach((key) => acceptedKeys.add(`${mission.id}:${key}`));
    });
    expect(acceptedKeys.size).toBeGreaterThan(2);
    expect(acceptedKeys).toContain('cube-repair-01:F5:2,0');
  });

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

  it('rejects malformed runtime nets without throwing from evaluation', () => {
    const malformed: readonly unknown[] = [
      null,
      {},
      { faces: [] },
      { faces: collision.faces.map((face) => ({ ...face, id: 'F9' })) },
      { faces: collision.faces.map((face) => ({ ...face, grid: null })) },
      { faces: collision.faces.map((face) => ({ ...face, colorToken: 'pink' })) },
      { faces: collision.faces.map((face) => ({ ...face, symbol: 'hexagon' })) },
      { faces: collision.faces.map((face) => ({ ...face, decorationQuarterTurn: 4 })) },
      { faces: collision.faces.map((face, index) => index === 1 ? { ...face, id: 'F1' } : face) },
    ];
    malformed.forEach((net) => {
      expect(() => evaluateRepair(collision, net as never, 'F1')).not.toThrow();
      expect(evaluateRepair(collision, net as never, 'F1').accepted).toBe(false);
      expect(() => moveFace(net as never, 'F1', { x: 9, y: 9 })).toThrow(TypeError);
      expect(() => rotateFaceDecoration(net as never, 'F1')).toThrow(TypeError);
      expect(() => enumerateRepairTargets(net as never, 'F1')).toThrow(TypeError);
    });
    expect(() => evaluateRepair(null as never, collision, 'F1')).not.toThrow();
    expect(evaluateRepair(null as never, collision, 'F1').accepted).toBe(false);
  });

  it('canonicalizes strict reducer candidates and rejects forged flags', () => {
    const moved = moveFace(collision, 'F6', { x: 2, y: 1 });
    const withExtras = {
      ...moved,
      forgedTop: true,
      faces: moved.faces.map((face) => ({ ...face, forgedFace: 'drop-me' })),
    };
    const verified = verifyRepairSubmission(collision, 'F1', {
      faceId: 'F6', target: { x: 2, y: 1 }, accepted: true, candidate: withExtras,
    });
    expect(verified.evaluation.accepted).toBe(true);
    expect('forgedTop' in (verified.submission.candidate as object)).toBe(false);
    expect('forgedFace' in (verified.submission.candidate.faces[0] as object)).toBe(false);
    expect(() => verifyRepairSubmission(collision, 'F1', {
      faceId: 'F6', target: { x: 2, y: 1 }, accepted: false, candidate: moved,
    })).toThrow(RepairValidationError);
  });
});
