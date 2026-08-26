import { describe, expect, it } from 'vitest';
import {
  getMissionById,
  loadMissionCatalog,
  parseMissionCatalog,
  MissionCatalogValidationError,
} from '../../src/content/missions/catalog';
import { evaluateDecorationOrientation } from '../../src/domain/net/decoration';
import { getOppositePairs } from '../../src/domain/net/foldEngine';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';
import type { FaceId, FaceDefinition, NetDefinition } from '../../src/domain/net/types';

const faceIds: readonly FaceId[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

const coordinateKey = (x: number, y: number): string => `${x},${y}`;

const moveFace = (
  net: NetDefinition,
  faceId: FaceId,
  target: { readonly x: number; readonly y: number },
): NetDefinition => ({
  faces: net.faces.map((face) => face.id === faceId
    ? { ...face, grid: { x: target.x, y: target.y } }
    : face),
});

describe('mission catalog', () => {
  it('loads the eight missions in the prescribed order with progressive hints', () => {
    const catalog = loadMissionCatalog();

    expect(catalog.map((mission) => mission.id)).toEqual([
      'cube-track-01', 'cube-track-02',
      'cube-opposite-01', 'cube-opposite-02',
      'cube-collision-01', 'cube-collision-02',
      'cube-repair-01', 'cube-repair-02',
    ]);
    expect(catalog.map((mission) => mission.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(catalog.every((mission) => mission.hints.length === 3)).toBe(true);
    expect(catalog.filter((mission) => mission.kind === 'repair')).toHaveLength(2);
    expect(catalog.every((mission) => mission.baseFaceId === 'F1')).toBe(true);
  });

  it('recomputes every stored answer from the net geometry', () => {
    for (const mission of loadMissionCatalog()) {
      const validation = validateCubeNet(mission.net, mission.baseFaceId);
      const answer = mission.answer;

      if (mission.kind === 'tracking') {
        expect(answer.topFaceId).toBeDefined();
        expect(validation.frames.get(answer.topFaceId ?? 'F1')).toBeDefined();
        expect(getOppositePairs(validation.frames)).toEqual(answer.oppositePairs);
        if (answer.decorationTarget !== undefined) {
          const decorationFace = mission.net.faces.find(
            (face) => face.id === answer.decorationTarget?.faceId,
          );
          const frame = decorationFace === undefined
            ? undefined
            : validation.frames.get(decorationFace.id);
          expect(decorationFace).toBeDefined();
          expect(frame).toBeDefined();
          if (decorationFace !== undefined && frame !== undefined) {
            expect(evaluateDecorationOrientation(
              decorationFace,
              frame,
              answer.decorationTarget.targetWorldUp,
            ).matchesTarget).toBe(true);
          }
        }
      }

      if (mission.kind === 'opposite') {
        expect(validation.oppositePairs).toContainEqual(answer.oppositePair);
      }

      if (mission.kind === 'collision') {
        expect(validation.reason).toBe('overlap');
        expect(validation.collisions.map((collision) => collision.faceIds)).toContainEqual(
          answer.collisionPair,
        );
        expect(validation.missingNormals).toContain(answer.missingDirection);
      }

      if (mission.kind === 'repair') {
        const move = answer.repairMove;
        expect(move).toBeDefined();
        if (move !== undefined) {
          const repaired = moveFace(mission.net, move.faceId, move.to);
          expect(move.from).toEqual(
            mission.net.faces.find((face) => face.id === move.faceId)?.grid,
          );
          expect(validateCubeNet(repaired, mission.baseFaceId).isValid).toBe(true);
        }
      }
    }
  });

  it('keeps the fixed visual identity and avoids duplicate symbols in every net', () => {
    const expected = {
      F1: { colorToken: 'blue', symbol: 'circle' },
      F2: { colorToken: 'yellow', symbol: 'triangle' },
      F3: { colorToken: 'green', symbol: 'square' },
      F4: { colorToken: 'coral', symbol: 'star' },
      F5: { colorToken: 'purple', symbol: 'diamond' },
      F6: { colorToken: 'teal', symbol: 'cross' },
    } as const;

    for (const mission of loadMissionCatalog()) {
      expect(mission.net.faces.map((face) => face.id).sort()).toEqual([...faceIds].sort());
      expect(new Set(mission.net.faces.map((face) => face.symbol)).size).toBe(6);
      for (const face of mission.net.faces) {
        expect(face).toMatchObject(expected[face.id]);
      }
    }
  });

  it('contains the two declared decoration orientation targets', () => {
    const track01 = getMissionById('cube-track-01');
    const track02 = getMissionById('cube-track-02');

    expect(track01.answer.decorationTarget).toEqual({ faceId: 'F3', targetWorldUp: '+y' });
    expect(track02.answer.decorationTarget).toEqual({ faceId: 'F4', targetWorldUp: '-y' });
  });

  it('keeps hints, sentence frames, and vocabulary focused on geometry without competition', () => {
    const unsafe = /(점수|순위|빠르게|속도|타이머|경쟁|포장.*(강도|안전)|안전.*보장)/u;
    const expectedFocus = ['shared-edge', 'fold-path', 'compare-candidates'];

    for (const mission of loadMissionCatalog()) {
      expect(mission.hints.map((hint) => hint.level)).toEqual([1, 2, 3]);
      expect(mission.hints.map((hint) => hint.focus)).toEqual(expectedFocus);
      expect(mission.hints.every((hint) => !unsafe.test(hint.text))).toBe(true);
      expect(unsafe.test(mission.title)).toBe(false);
      expect(unsafe.test(mission.question)).toBe(false);
      expect(unsafe.test(mission.sentenceFrame.template)).toBe(false);
      expect(mission.targetVocabulary.length).toBeGreaterThan(0);
    }
  });

  it('returns one stable mission and reports unknown ids', () => {
    const mission = getMissionById('cube-collision-02');
    expect(mission.id).toBe('cube-collision-02');
    expect(() => getMissionById('unknown' as never)).toThrow(/Unknown mission id/);
  });

  it('rejects malformed untrusted catalog data with a path-specific error', () => {
    const malformed = loadMissionCatalog().map((mission, index) => index === 0
      ? { id: mission.id, kind: mission.kind }
      : mission);

    expect(() => parseMissionCatalog(malformed)).toThrow(MissionCatalogValidationError);
    expect(() => parseMissionCatalog(malformed)).toThrow(/missions\[0\]\.order/);
  });

  it('rejects a malformed net instead of trusting a cast', () => {
    const source = loadMissionCatalog()[0];
    const malformed = loadMissionCatalog().map((mission, index) => index === 0
      ? {
        ...source,
        net: {
          ...source.net,
          faces: source.net.faces.map((face: FaceDefinition, faceIndex: number) => faceIndex === 5
            ? { ...face, symbol: 'circle' }
            : face),
        },
      }
      : mission);

    expect(() => parseMissionCatalog(malformed)).toThrow(/net\.faces\[5\]\.symbol/);
  });

  it('stores the fixed coordinate fixtures, including collision-02 and repair moves', () => {
    const byId = new Map(loadMissionCatalog().map((mission) => [mission.id, mission]));
    expect(byId.get('cube-collision-02')?.net.faces.map((face) => [
      face.id,
      coordinateKey(face.grid.x, face.grid.y),
    ])).toEqual([
      ['F1', '1,2'], ['F2', '1,1'], ['F3', '3,1'],
      ['F4', '1,3'], ['F5', '0,2'], ['F6', '2,1'],
    ]);
    expect(byId.get('cube-collision-02')?.answer).toMatchObject({
      collisionPair: ['F3', 'F4'],
      missingDirection: '-z',
    });
    expect(byId.get('cube-repair-01')?.answer.repairMove).toEqual({
      faceId: 'F6',
      from: { x: 0, y: 1 },
      to: { x: 2, y: 1 },
    });
    expect(byId.get('cube-repair-02')?.answer.repairMove).toEqual({
      faceId: 'F3',
      from: { x: 3, y: 1 },
      to: { x: 1, y: 0 },
    });
  });
});
