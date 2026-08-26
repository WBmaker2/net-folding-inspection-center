import { evaluateDecorationOrientation } from '../../domain/net/decoration';
import {
  createFoldSequence,
  getOppositePairs,
} from '../../domain/net/foldEngine';
import { validateCubeNet } from '../../domain/net/validateCubeNet';
import type { FaceId, NetDefinition } from '../../domain/net/types';
import type { MissionDefinition, RepairMove } from '../../domain/learning/types';

const replaceFace = (net: NetDefinition, move: RepairMove): NetDefinition => Object.freeze({
  faces: Object.freeze(net.faces.map((face) => face.id === move.faceId
    ? Object.freeze({ ...face, grid: Object.freeze({ ...move.to }) })
    : face)),
});

const samePair = (
  left: readonly [FaceId, FaceId],
  right: readonly [FaceId, FaceId],
): boolean => left[0] === right[0] && left[1] === right[1];

export const validateMissionGeometry = (
  mission: MissionDefinition,
  path: string,
  fail: (path: string, reason: string) => never,
): void => {
  const validation = validateCubeNet(mission.net, mission.baseFaceId);
  try {
    createFoldSequence(mission.net, mission.baseFaceId, mission.suggestedFoldOrder);
  } catch {
    fail(`${path}.suggestedFoldOrder`, 'does not describe a valid progressive fold sequence');
  }

  if (mission.kind === 'tracking') {
    const topFaceId = mission.answer.topFaceId;
    const oppositePairs = mission.answer.oppositePairs;
    const target = mission.answer.decorationTarget;
    if (topFaceId === undefined || !validation.frames.has(topFaceId)) {
      fail(`${path}.answer.topFaceId`, 'must identify a face in the computed frames');
    }
    if (oppositePairs === undefined || JSON.stringify(oppositePairs) !== JSON.stringify(
      getOppositePairs(validation.frames),
    )) {
      fail(`${path}.answer.oppositePairs`, 'does not match the computed opposite pairs');
    }
    if (target === undefined) {
      fail(`${path}.answer.decorationTarget`, 'is required for tracking missions');
    }
    const targetFace = mission.net.faces.find((face) => face.id === target.faceId);
    const targetFrame = targetFace === undefined ? undefined : validation.frames.get(targetFace.id);
    if (targetFace === undefined || targetFrame === undefined || !evaluateDecorationOrientation(
      targetFace,
      targetFrame,
      target.targetWorldUp,
    ).matchesTarget) {
      fail(`${path}.answer.decorationTarget`, 'does not match the computed decoration orientation');
    }
    return;
  }

  if (mission.kind === 'opposite') {
    const pair = mission.answer.oppositePair;
    if (pair === undefined || !validation.oppositePairs.some(
      (candidate) => candidate.a === pair.a && candidate.b === pair.b,
    )) {
      fail(`${path}.answer.oppositePair`, 'does not match a computed opposite pair');
    }
    return;
  }

  if (mission.kind === 'collision') {
    const pair = mission.answer.collisionPair;
    if (pair === undefined || !validation.collisions.some(
      (candidate) => samePair(candidate.faceIds, pair),
    )) {
      fail(`${path}.answer.collisionPair`, 'does not match a computed collision');
    }
    if (mission.answer.missingDirection === undefined
      || !validation.missingNormals.includes(mission.answer.missingDirection)) {
      fail(`${path}.answer.missingDirection`, 'is not a computed missing direction');
    }
    return;
  }

  const move = mission.answer.repairMove;
  if (move === undefined) {
    fail(`${path}.answer.repairMove`, 'is required for repair missions');
  }
  const originalFace = mission.net.faces.find((face) => face.id === move.faceId);
  if (originalFace === undefined) {
    fail(`${path}.answer.repairMove.faceId`, 'must identify a face in the net');
  }
  if (originalFace.grid.x !== move.from.x || originalFace.grid.y !== move.from.y) {
    fail(`${path}.answer.repairMove.from`, 'does not match the original face coordinate');
  }
  if (mission.net.faces.some((face) => face.id !== move.faceId
    && face.grid.x === move.to.x && face.grid.y === move.to.y)) {
    fail(`${path}.answer.repairMove.to`, 'is occupied by another face');
  }
  if (!validateCubeNet(replaceFace(mission.net, move), mission.baseFaceId).isValid) {
    fail(`${path}.answer.repairMove.to`, 'does not produce a valid cube net');
  }
};
