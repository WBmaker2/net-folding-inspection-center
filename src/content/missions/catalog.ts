import collisionMissions from './collision.json';
import oppositeMissions from './opposite.json';
import repairMissions from './repair.json';
import trackingMissions from './tracking.json';
import { parseMissionAnswer } from './catalogAnswer';
import { validateMissionGeometry } from './catalogGeometry';
import type {
  FaceDefinition,
  FaceId,
  GridPoint,
  MissionKind,
  NetDefinition,
} from '../../domain/net/types';
import type {
  ErrorModel,
  GeometryTerm,
  HintFocus,
  HintLevel,
  HintStep,
  MissionDefinition,
  MissionId,
  SentenceFrame,
} from '../../domain/learning/types';

const FACE_IDS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'] as const satisfies readonly FaceId[];
const MISSION_IDS = [
  'cube-track-01', 'cube-track-02',
  'cube-opposite-01', 'cube-opposite-02',
  'cube-collision-01', 'cube-collision-02',
  'cube-repair-01', 'cube-repair-02',
] as const satisfies readonly MissionId[];
const MISSION_KIND_BY_ID: Readonly<Record<MissionId, MissionKind>> = {
  'cube-track-01': 'tracking',
  'cube-track-02': 'tracking',
  'cube-opposite-01': 'opposite',
  'cube-opposite-02': 'opposite',
  'cube-collision-01': 'collision',
  'cube-collision-02': 'collision',
  'cube-repair-01': 'repair',
  'cube-repair-02': 'repair',
};
const MISSION_KINDS = ['tracking', 'opposite', 'collision', 'repair'] as const;
const ERROR_MODELS = ['none', 'overlap', 'missing-face', 'decoration-direction'] as const;
const GEOMETRY_TERMS = ['맞은편', '모서리', '면', '접는 방향', '겹침', '빈 면'] as const;
const HINT_FOCI = ['shared-edge', 'fold-path', 'compare-candidates'] as const;
const HINT_LEVELS = [1, 2, 3] as const;

const FACE_STYLES: Readonly<Record<FaceId, Pick<FaceDefinition, 'colorToken' | 'symbol'>>> = {
  F1: { colorToken: 'blue', symbol: 'circle' },
  F2: { colorToken: 'yellow', symbol: 'square' },
  F3: { colorToken: 'green', symbol: 'triangle' },
  F4: { colorToken: 'coral', symbol: 'star' },
  F5: { colorToken: 'purple', symbol: 'diamond' },
  F6: { colorToken: 'teal', symbol: 'cross' },
};

const unsafeContentPattern = /(점수|순위|빠르게|속도|타이머|경쟁|포장.*(?:강도|안전)|안전.*보장)/u;

export class MissionCatalogValidationError extends Error {
  readonly path: string;

  constructor(path: string, reason: string) {
    super(`Invalid mission catalog at ${path}: ${reason}`);
    this.name = 'MissionCatalogValidationError';
    this.path = path;
  }
}

const fail = (path: string, reason: string): never => {
  throw new MissionCatalogValidationError(path, reason);
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const recordAt = (value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    return fail(path, 'expected an object');
  }
  return value;
};

const required = (record: Record<string, unknown>, key: string, path: string): unknown => {
  if (!(key in record)) {
    return fail(`${path}.${key}`, 'is required');
  }
  return record[key];
};

const nonEmptyString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(path, 'expected a non-empty string');
  }
  return value;
};

const integer = (value: unknown, path: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return fail(path, 'expected a safe integer');
  }
  return value;
};

const oneOf = <T>(
  value: unknown,
  choices: readonly T[],
  path: string,
): T => {
  if (!choices.includes(value as T)) {
    return fail(path, `expected one of ${choices.map(String).join(', ')}`);
  }
  return value as T;
};

const faceId = (value: unknown, path: string): FaceId => oneOf(value, FACE_IDS, path);
const missionId = (value: unknown, path: string): MissionId => oneOf(value, MISSION_IDS, path);
const missionKind = (value: unknown, path: string): MissionKind => (
  oneOf(value, MISSION_KINDS, path)
);
const errorModel = (value: unknown, path: string): ErrorModel => (
  oneOf(value, ERROR_MODELS, path)
);
const geometryTerm = (value: unknown, path: string): GeometryTerm => (
  oneOf(value, GEOMETRY_TERMS, path)
);
const hintFocus = (value: unknown, path: string): HintFocus => oneOf(value, HINT_FOCI, path);
const hintLevel = (value: unknown, path: string): HintLevel => oneOf(value, HINT_LEVELS, path);

const arrayAt = (value: unknown, path: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    return fail(path, 'expected an array');
  }
  return value;
};

const freezeArray = <T>(value: readonly T[]): readonly T[] => Object.freeze([...value]);

const parseGridPoint = (value: unknown, path: string): GridPoint => {
  const record = recordAt(value, path);
  return Object.freeze({
    x: integer(required(record, 'x', path), `${path}.x`),
    y: integer(required(record, 'y', path), `${path}.y`),
  });
};

const parseFace = (value: unknown, path: string): FaceDefinition => {
  const record = recordAt(value, path);
  const id = faceId(required(record, 'id', path), `${path}.id`);
  const expectedStyle = FACE_STYLES[id];
  const colorToken = nonEmptyString(required(record, 'colorToken', path), `${path}.colorToken`);
  const symbol = nonEmptyString(required(record, 'symbol', path), `${path}.symbol`);
  if (colorToken !== expectedStyle.colorToken) {
    return fail(`${path}.colorToken`, `must be ${expectedStyle.colorToken} for ${id}`);
  }
  if (symbol !== expectedStyle.symbol) {
    return fail(`${path}.symbol`, `must be ${expectedStyle.symbol} for ${id}`);
  }
  const quarterTurn = integer(
    required(record, 'decorationQuarterTurn', path),
    `${path}.decorationQuarterTurn`,
  );
  if (quarterTurn < 0 || quarterTurn > 3) {
    return fail(`${path}.decorationQuarterTurn`, 'must be between 0 and 3');
  }
  return Object.freeze({
    id,
    grid: parseGridPoint(required(record, 'grid', path), `${path}.grid`),
    colorToken: expectedStyle.colorToken,
    symbol: expectedStyle.symbol,
    decorationQuarterTurn: quarterTurn as FaceDefinition['decorationQuarterTurn'],
  });
};

const parseNet = (value: unknown, path: string): NetDefinition => {
  const record = recordAt(value, path);
  const values = arrayAt(required(record, 'faces', path), `${path}.faces`);
  if (values.length !== FACE_IDS.length) {
    return fail(`${path}.faces`, `expected exactly ${FACE_IDS.length} faces`);
  }
  const faces = values.map((faceValue, index) => parseFace(faceValue, `${path}.faces[${index}]`));
  const seenIds = new Set<FaceId>();
  const seenCoordinates = new Set<string>();
  faces.forEach((face, index) => {
    const facePath = `${path}.faces[${index}]`;
    if (seenIds.has(face.id)) {
      fail(`${facePath}.id`, `duplicate face id ${face.id}`);
    }
    seenIds.add(face.id);
    const coordinate = `${face.grid.x},${face.grid.y}`;
    if (seenCoordinates.has(coordinate)) {
      fail(`${facePath}.grid`, `duplicate grid point ${coordinate}`);
    }
    seenCoordinates.add(coordinate);
  });
  if (seenIds.size !== FACE_IDS.length) {
    return fail(`${path}.faces`, 'must contain F1 through F6 exactly once');
  }
  return Object.freeze({ faces: freezeArray(faces) });
};

const parseFoldOrder = (value: unknown, path: string, baseFaceId: FaceId): readonly FaceId[] => {
  const values = arrayAt(value, path);
  if (values.length !== FACE_IDS.length - 1) {
    return fail(path, `expected exactly ${FACE_IDS.length - 1} moving faces`);
  }
  const order = values.map((faceValue, index) => faceId(faceValue, `${path}[${index}]`));
  const seen = new Set<FaceId>();
  order.forEach((valueAtIndex, index) => {
    if (valueAtIndex === baseFaceId) {
      fail(`${path}[${index}]`, `must not repeat base face ${baseFaceId}`);
    }
    if (seen.has(valueAtIndex)) {
      fail(`${path}[${index}]`, `duplicate moving face ${valueAtIndex}`);
    }
    seen.add(valueAtIndex);
  });
  return freezeArray(order);
};

const parseHints = (value: unknown, path: string): readonly HintStep[] => {
  const values = arrayAt(value, path);
  if (values.length !== HINT_LEVELS.length) {
    return fail(path, `expected exactly ${HINT_LEVELS.length} hints`);
  }
  const hints = values.map((hintValue, index) => {
    const hintPath = `${path}[${index}]`;
    const record = recordAt(hintValue, hintPath);
    const level = hintLevel(required(record, 'level', hintPath), `${hintPath}.level`);
    if (level !== HINT_LEVELS[index]) {
      return fail(`${hintPath}.level`, `expected progressive level ${HINT_LEVELS[index]}`);
    }
    const focus = hintFocus(required(record, 'focus', hintPath), `${hintPath}.focus`);
    if (focus !== HINT_FOCI[index]) {
      return fail(`${hintPath}.focus`, `expected ${HINT_FOCI[index]} at level ${level}`);
    }
    const text = nonEmptyString(required(record, 'text', hintPath), `${hintPath}.text`);
    if (unsafeContentPattern.test(text)) {
      return fail(`${hintPath}.text`, 'contains a forbidden competition or safety guarantee');
    }
    return Object.freeze({ level, focus, text });
  });
  return freezeArray(hints);
};

const parseSentenceFrame = (value: unknown, path: string): SentenceFrame => {
  const record = recordAt(value, path);
  const template = nonEmptyString(required(record, 'template', path), `${path}.template`);
  if (unsafeContentPattern.test(template)) {
    return fail(`${path}.template`, 'contains a forbidden competition or safety guarantee');
  }
  const placeholders = arrayAt(required(record, 'placeholders', path), `${path}.placeholders`)
    .map((placeholder, index) => nonEmptyString(placeholder, `${path}.placeholders[${index}]`));
  if (placeholders.length === 0) {
    return fail(`${path}.placeholders`, 'must contain at least one placeholder');
  }
  return Object.freeze({ template, placeholders: freezeArray(placeholders) });
};

const parseVocabulary = (value: unknown, path: string): readonly GeometryTerm[] => {
  const values = arrayAt(value, path);
  if (values.length === 0) {
    return fail(path, 'must contain at least one geometry term');
  }
  const terms = values.map((term, index) => geometryTerm(term, `${path}[${index}]`));
  if (new Set(terms).size !== terms.length) {
    return fail(path, 'must not repeat a geometry term');
  }
  return freezeArray(terms);
};

const parseMission = (value: unknown, index: number): MissionDefinition => {
  const path = `missions[${index}]`;
  const record = recordAt(value, path);
  const id = missionId(required(record, 'id', path), `${path}.id`);
  const order = integer(required(record, 'order', path), `${path}.order`);
  if (order < 1) {
    fail(`${path}.order`, 'must be positive');
  }
  const kind = missionKind(required(record, 'kind', path), `${path}.kind`);
  const title = nonEmptyString(required(record, 'title', path), `${path}.title`);
  const question = nonEmptyString(required(record, 'question', path), `${path}.question`);
  if (unsafeContentPattern.test(title) || unsafeContentPattern.test(question)) {
    fail(`${path}.question`, 'contains a forbidden competition or safety guarantee');
  }
  const baseFaceId = faceId(required(record, 'baseFaceId', path), `${path}.baseFaceId`);
  const net = parseNet(required(record, 'net', path), `${path}.net`);
  const suggestedFoldOrder = parseFoldOrder(
    required(record, 'suggestedFoldOrder', path),
    `${path}.suggestedFoldOrder`,
    baseFaceId,
  );
  const parsedErrorModel = errorModel(required(record, 'errorModel', path), `${path}.errorModel`);
  const common = {
    id,
    order,
    title,
    question,
    net,
    baseFaceId,
    suggestedFoldOrder,
    hints: parseHints(required(record, 'hints', path), `${path}.hints`),
    sentenceFrame: parseSentenceFrame(
      required(record, 'sentenceFrame', path),
      `${path}.sentenceFrame`,
    ),
    targetVocabulary: parseVocabulary(
      required(record, 'targetVocabulary', path),
      `${path}.targetVocabulary`,
    ),
  };
  let mission: MissionDefinition;
  if (kind === 'tracking') {
    if (parsedErrorModel !== 'decoration-direction') {
      fail(`${path}.errorModel`, 'tracking missions must use decoration-direction');
    }
    mission = Object.freeze({
      ...common,
      kind,
      errorModel: 'decoration-direction',
      answer: parseMissionAnswer(
        required(record, 'answer', path),
        `${path}.answer`,
        kind,
        fail,
        parseGridPoint,
      ),
    });
  } else if (kind === 'opposite') {
    if (parsedErrorModel !== 'none') {
      fail(`${path}.errorModel`, 'opposite missions must use none');
    }
    mission = Object.freeze({
      ...common,
      kind,
      errorModel: 'none',
      answer: parseMissionAnswer(
        required(record, 'answer', path),
        `${path}.answer`,
        kind,
        fail,
        parseGridPoint,
      ),
    });
  } else if (kind === 'collision') {
    if (parsedErrorModel !== 'overlap') {
      fail(`${path}.errorModel`, 'collision missions must use overlap');
    }
    mission = Object.freeze({
      ...common,
      kind,
      errorModel: 'overlap',
      answer: parseMissionAnswer(
        required(record, 'answer', path),
        `${path}.answer`,
        kind,
        fail,
        parseGridPoint,
      ),
    });
  } else {
    if (parsedErrorModel !== 'overlap') {
      fail(`${path}.errorModel`, 'repair missions must use overlap');
    }
    mission = Object.freeze({
      ...common,
      kind,
      errorModel: 'overlap',
      answer: parseMissionAnswer(
        required(record, 'answer', path),
        `${path}.answer`,
        kind,
        fail,
        parseGridPoint,
      ),
    });
  }
  validateMissionGeometry(mission, path, fail);
  return mission;
};

export const parseMissionCatalog = (value: unknown): readonly MissionDefinition[] => {
  const values = arrayAt(value, 'missions');
  if (values.length !== MISSION_IDS.length) {
    return fail('missions', `expected exactly ${MISSION_IDS.length} missions`);
  }
  const missions = values.map(parseMission);
  const ids = new Set<MissionId>();
  const orders = new Set<number>();
  missions.forEach((mission, index) => {
    const path = `missions[${index}]`;
    if (mission.id !== MISSION_IDS[index]) {
      fail(`${path}.id`, `expected ${MISSION_IDS[index]} at catalog position ${index + 1}`);
    }
    if (mission.kind !== MISSION_KIND_BY_ID[mission.id]) {
      fail(`${path}.kind`, `must be ${MISSION_KIND_BY_ID[mission.id]} for ${mission.id}`);
    }
    if (ids.has(mission.id)) {
      fail(`${path}.id`, `duplicate mission id ${mission.id}`);
    }
    ids.add(mission.id);
    if (orders.has(mission.order)) {
      fail(`${path}.order`, `duplicate mission order ${mission.order}`);
    }
    orders.add(mission.order);
    if (mission.order !== index + 1) {
      fail(`${path}.order`, `expected catalog order ${index + 1}`);
    }
  });
  if (ids.size !== MISSION_IDS.length) {
    return fail('missions', 'must contain all eight declared mission ids');
  }
  return Object.freeze(missions);
};

const importedMissionArrays = (): readonly unknown[] => {
  const files: readonly [unknown, unknown, unknown, unknown] = [
    trackingMissions,
    oppositeMissions,
    collisionMissions,
    repairMissions,
  ];
  const missions: unknown[] = [];
  files.forEach((file, index) => {
    const values = arrayAt(file, `mission-file[${index}]`);
    missions.push(...values);
  });
  return missions;
};

let cachedCatalog: readonly MissionDefinition[] | undefined;

export const loadMissionCatalog = (): readonly MissionDefinition[] => {
  if (cachedCatalog === undefined) {
    cachedCatalog = parseMissionCatalog(importedMissionArrays());
  }
  return cachedCatalog;
};

export const getMissionById = (id: MissionId): MissionDefinition => {
  const mission = loadMissionCatalog().find((candidate) => candidate.id === id);
  if (mission === undefined) {
    throw new Error(`Unknown mission id: ${id}`);
  }
  return mission;
};
