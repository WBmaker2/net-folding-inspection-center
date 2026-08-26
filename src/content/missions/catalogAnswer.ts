import type { AxisDirection, FaceId, GridPoint, MissionKind } from '../../domain/net/types';
import type {
  CollisionMissionAnswer,
  DecorationTarget,
  MissionAnswer,
  OppositeMissionAnswer,
  RepairMissionAnswer,
  RepairMove,
  TrackingMissionAnswer,
} from '../../domain/learning/types';

type Fail = (path: string, reason: string) => never;
type ParseGridPoint = (value: unknown, path: string) => GridPoint;

const FACE_IDS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'] as const satisfies readonly FaceId[];
const AXIS_DIRECTIONS = ['+x', '-x', '+y', '-y', '+z', '-z'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const recordAt = (value: unknown, path: string, fail: Fail): Record<string, unknown> => {
  if (!isRecord(value)) return fail(path, 'expected an object');
  return value;
};

const required = (record: Record<string, unknown>, key: string, path: string, fail: Fail): unknown => {
  if (!(key in record)) return fail(`${path}.${key}`, 'is required');
  return record[key];
};

const arrayAt = (value: unknown, path: string, fail: Fail): readonly unknown[] => {
  if (!Array.isArray(value)) return fail(path, 'expected an array');
  return value;
};

const oneOf = <T>(value: unknown, choices: readonly T[], path: string, fail: Fail): T => {
  if (!choices.includes(value as T)) {
    return fail(path, `expected one of ${choices.map(String).join(', ')}`);
  }
  return value as T;
};

const faceId = (value: unknown, path: string, fail: Fail): FaceId => (
  oneOf(value, FACE_IDS, path, fail)
);

const axisDirection = (value: unknown, path: string, fail: Fail): AxisDirection => (
  oneOf(value, AXIS_DIRECTIONS, path, fail)
);

const freezeArray = <T>(value: readonly T[]): readonly T[] => Object.freeze([...value]);

const parseOppositePair = (value: unknown, path: string, fail: Fail) => {
  const record = recordAt(value, path, fail);
  const a = faceId(required(record, 'a', path, fail), `${path}.a`, fail);
  const b = faceId(required(record, 'b', path, fail), `${path}.b`, fail);
  if (a === b) return fail(path, 'an opposite pair must contain two different faces');
  return Object.freeze({ a, b });
};

const parseOppositePairs = (value: unknown, path: string, fail: Fail) => {
  const values = arrayAt(value, path, fail);
  if (values.length !== 3) return fail(path, 'expected exactly three opposite pairs');
  return freezeArray(values.map((pair, index) => parseOppositePair(pair, `${path}[${index}]`, fail)));
};

const parseCollisionPair = (
  value: unknown,
  path: string,
  fail: Fail,
): readonly [FaceId, FaceId] => {
  const values = arrayAt(value, path, fail);
  if (values.length !== 2) return fail(path, 'expected exactly two face ids');
  const pair: [FaceId, FaceId] = [
    faceId(values[0], `${path}[0]`, fail),
    faceId(values[1], `${path}[1]`, fail),
  ];
  if (pair[0] === pair[1]) return fail(path, 'a collision pair must contain two different faces');
  return Object.freeze(pair);
};

const parseDecorationTarget = (
  value: unknown,
  path: string,
  fail: Fail,
): DecorationTarget => {
  const record = recordAt(value, path, fail);
  return Object.freeze({
    faceId: faceId(required(record, 'faceId', path, fail), `${path}.faceId`, fail),
    targetWorldUp: axisDirection(
      required(record, 'targetWorldUp', path, fail),
      `${path}.targetWorldUp`,
      fail,
    ),
  });
};

const parseRepairMove = (
  value: unknown,
  path: string,
  fail: Fail,
  parseGridPoint: ParseGridPoint,
): RepairMove => {
  const record = recordAt(value, path, fail);
  return Object.freeze({
    faceId: faceId(required(record, 'faceId', path, fail), `${path}.faceId`, fail),
    from: parseGridPoint(required(record, 'from', path, fail), `${path}.from`),
    to: parseGridPoint(required(record, 'to', path, fail), `${path}.to`),
  });
};

const rejectUnexpectedKeys = (
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  fail: Fail,
): void => {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(`${path}.${key}`, 'is not allowed for this mission kind');
  }
};

export function parseMissionAnswer(
  value: unknown,
  path: string,
  kind: 'tracking',
  fail: Fail,
  parseGridPoint: ParseGridPoint,
): TrackingMissionAnswer;
export function parseMissionAnswer(
  value: unknown,
  path: string,
  kind: 'opposite',
  fail: Fail,
  parseGridPoint: ParseGridPoint,
): OppositeMissionAnswer;
export function parseMissionAnswer(
  value: unknown,
  path: string,
  kind: 'collision',
  fail: Fail,
  parseGridPoint: ParseGridPoint,
): CollisionMissionAnswer;
export function parseMissionAnswer(
  value: unknown,
  path: string,
  kind: 'repair',
  fail: Fail,
  parseGridPoint: ParseGridPoint,
): RepairMissionAnswer;
export function parseMissionAnswer(
  value: unknown,
  path: string,
  kind: MissionKind,
  fail: Fail,
  parseGridPoint: ParseGridPoint,
): MissionAnswer {
  const record = recordAt(value, path, fail);
  if (kind === 'tracking') {
    rejectUnexpectedKeys(record, ['topFaceId', 'oppositePairs', 'decorationTarget'], path, fail);
    const answer: TrackingMissionAnswer = {
      topFaceId: faceId(required(record, 'topFaceId', path, fail), `${path}.topFaceId`, fail),
      oppositePairs: parseOppositePairs(
        required(record, 'oppositePairs', path, fail),
        `${path}.oppositePairs`,
        fail,
      ),
      decorationTarget: parseDecorationTarget(
        required(record, 'decorationTarget', path, fail),
        `${path}.decorationTarget`,
        fail,
      ),
    };
    return Object.freeze(answer);
  }
  if (kind === 'opposite') {
    rejectUnexpectedKeys(record, ['oppositePair'], path, fail);
    const answer: OppositeMissionAnswer = {
      oppositePair: parseOppositePair(
        required(record, 'oppositePair', path, fail),
        `${path}.oppositePair`,
        fail,
      ),
    };
    return Object.freeze(answer);
  }
  if (kind === 'collision') {
    rejectUnexpectedKeys(record, ['collisionPair', 'missingDirection'], path, fail);
    const answer: CollisionMissionAnswer = {
      collisionPair: parseCollisionPair(
        required(record, 'collisionPair', path, fail),
        `${path}.collisionPair`,
        fail,
      ),
      missingDirection: axisDirection(
        required(record, 'missingDirection', path, fail),
        `${path}.missingDirection`,
        fail,
      ),
    };
    return Object.freeze(answer);
  }
  rejectUnexpectedKeys(record, ['repairMove'], path, fail);
  const answer: RepairMissionAnswer = {
    repairMove: parseRepairMove(
      required(record, 'repairMove', path, fail),
      `${path}.repairMove`,
      fail,
      parseGridPoint,
    ),
  };
  return Object.freeze(answer);
}
