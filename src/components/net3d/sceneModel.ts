import type {
  FaceDefinition,
  FaceFrame,
  FaceId,
  FoldSnapshot,
  NetDefinition,
  Vec3,
} from '../../domain/net/types';

export type SceneFaceStatus = 'unsettled' | 'settled' | 'active' | 'collision';

export interface SceneTransform {
  readonly position: readonly [number, number, number];
  /** Euler XYZ radians, derived from right/down/normal in a deterministic way. */
  readonly rotation: readonly [number, number, number];
  /** Quaternion XYZW is supplied as a renderer-neutral alternative to Euler. */
  readonly quaternion: readonly [number, number, number, number];
}

export interface SceneFace {
  readonly id: FaceId;
  readonly grid: FaceDefinition['grid'];
  readonly colorToken: FaceDefinition['colorToken'];
  readonly symbol: FaceDefinition['symbol'];
  readonly decorationQuarterTurn: FaceDefinition['decorationQuarterTurn'];
  readonly decorationRadians: number;
  readonly normal: Vec3;
  readonly right: Vec3;
  readonly down: Vec3;
  readonly frame: FaceFrame;
  readonly transform: SceneTransform;
  readonly status: SceneFaceStatus;
  readonly settled: boolean;
  readonly active: boolean;
  readonly collision: boolean;
}

export type SceneFaceEmphasis = 'full' | 'dim';

export interface SceneFocus {
  readonly singleFaceMode: boolean;
  readonly baseFaceId?: FaceId;
  readonly movingFaceId?: FaceId;
  readonly hingeFaceId?: FaceId;
}

export type SceneShapeKind = FaceDefinition['symbol'];

export interface DecorationShapeDescriptor {
  readonly kind: SceneShapeKind;
  readonly rotationRadians: number;
  readonly points: readonly (readonly [number, number])[];
}

export interface CollisionPatternDescriptor {
  readonly stripeAngles: readonly number[];
  readonly stripeWidth: number;
}

const BASE_NORMAL: Vec3 = [0, 0, 1];
const BASE_RIGHT: Vec3 = [1, 0, 0];
const BASE_DOWN: Vec3 = [0, 1, 0];

const copyVec3 = (value: Vec3): Vec3 => Object.freeze([
  value[0], value[1], value[2],
]) as unknown as Vec3;

const copyFrame = (frame: FaceFrame): FaceFrame => Object.freeze({
  normal: copyVec3(frame.normal),
  right: copyVec3(frame.right),
  down: copyVec3(frame.down),
  center: copyVec3(frame.center),
});

const frameFromFlatPosition = (
  position: readonly [number, number, number],
  baseFrame: FaceFrame,
): FaceFrame => Object.freeze({
  normal: copyVec3(baseFrame.normal),
  right: copyVec3(baseFrame.right),
  down: copyVec3(baseFrame.down),
  // FaceFrame.center is typed as Vec3 for engine compatibility. For a flat
  // preview it intentionally carries the grid-derived world position, which
  // may be outside the integer-unit cube range.
  center: [...position] as Vec3,
});

const quarterTurnRadians = (quarterTurn: FaceDefinition['decorationQuarterTurn']): number => (
  quarterTurn * Math.PI / 2
);

const regularPolygon = (count: number, radius: number, phase = 0): readonly (readonly [number, number])[] => (
  Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze([
    radius * Math.cos(phase + index * Math.PI * 2 / count),
    radius * Math.sin(phase + index * Math.PI * 2 / count),
  ] as [number, number])))
);

const starPoints = (): readonly (readonly [number, number])[] => (
  Object.freeze(Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? 0.29 : 0.13;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    return Object.freeze([radius * Math.cos(angle), radius * Math.sin(angle)] as [number, number]);
  }))
);

const crossPoints = (): readonly (readonly [number, number])[] => Object.freeze([
  [-0.1, -0.3], [0.1, -0.3], [0.1, -0.1], [0.3, -0.1],
  [0.3, 0.1], [0.1, 0.1], [0.1, 0.3], [-0.1, 0.3],
  [-0.1, 0.1], [-0.3, 0.1], [-0.3, -0.1], [-0.1, -0.1],
] as readonly (readonly [number, number])[]);

export const getDecorationShapeDescriptor = (
  face: Pick<FaceDefinition, 'symbol' | 'decorationQuarterTurn'>,
): DecorationShapeDescriptor => {
  const points: Readonly<Record<SceneShapeKind, readonly (readonly [number, number])[]>> = {
    circle: regularPolygon(20, 0.27),
    square: regularPolygon(4, 0.25, Math.PI / 4),
    triangle: regularPolygon(3, 0.29, -Math.PI / 2),
    star: starPoints(),
    diamond: regularPolygon(4, 0.29),
    cross: crossPoints(),
  };
  return Object.freeze({
    kind: face.symbol,
    rotationRadians: quarterTurnRadians(face.decorationQuarterTurn),
    points: points[face.symbol],
  });
};

export const getCollisionPatternDescriptor = (): CollisionPatternDescriptor => Object.freeze({
  stripeAngles: Object.freeze([Math.PI / 4, -Math.PI / 4]),
  stripeWidth: 0.045,
});

export const getSceneFaceEmphasis = (
  faceId: FaceId,
  collision: boolean,
  focus: SceneFocus,
): SceneFaceEmphasis => {
  if (!focus.singleFaceMode || collision) return 'full';
  return faceId === focus.baseFaceId
    || faceId === focus.movingFaceId
    || faceId === focus.hingeFaceId
    ? 'full'
    : 'dim';
};

const matrixToQuaternion = (
  right: Vec3,
  down: Vec3,
  normal: Vec3,
): readonly [number, number, number, number] => {
  // The columns are the local x/y/z axes in world coordinates.
  const m00 = right[0]; const m01 = down[0]; const m02 = normal[0];
  const m10 = right[1]; const m11 = down[1]; const m12 = normal[1];
  const m20 = right[2]; const m21 = down[2]; const m22 = normal[2];
  const trace = m00 + m11 + m22;
  let quaternion: readonly [number, number, number, number];
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    quaternion = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    quaternion = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    quaternion = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    quaternion = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
  return Object.freeze(quaternion);
};

const quaternionToEuler = (
  quaternion: readonly [number, number, number, number],
): readonly [number, number, number] => {
  const [x, y, z, w] = quaternion;
  const sinPitch = 2 * (w * y - z * x);
  const pitch = Math.asin(Math.max(-1, Math.min(1, sinPitch)));
  return Object.freeze([
    Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)),
    pitch,
    Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)),
  ]);
};

export const transformFromFrame = (
  frame: FaceFrame,
  position: readonly [number, number, number] = frame.center,
): SceneTransform => {
  const quaternion = matrixToQuaternion(frame.right, frame.down, frame.normal);
  return Object.freeze({
    position: Object.freeze([...position]) as readonly [number, number, number],
    rotation: quaternionToEuler(quaternion),
    quaternion,
  });
};

const vectorKey = (value: Vec3): string => value.join(',');

/**
 * Makes renderer data from one snapshot. It deliberately does not import or
 * invoke a fold/validation engine: settled frames in the snapshot are the
 * only source of settled transforms.
 */
export function buildSceneFaces(
  snapshot: FoldSnapshot,
  net: NetDefinition,
): readonly SceneFace[] {
  const settledIds = new Set(snapshot.settledFaceIds);
  const activeId = snapshot.stepIndex > 0
    ? snapshot.settledFaceIds[snapshot.settledFaceIds.length - 1]
    : undefined;
  const baseFace = net.faces.find((face) => face.id === snapshot.settledFaceIds[0]) ?? net.faces[0];
  const baseFrame = snapshot.frames.get(snapshot.settledFaceIds[0] ?? '') ?? {
    normal: BASE_NORMAL,
    right: BASE_RIGHT,
    down: BASE_DOWN,
    center: [0, 0, 1] as Vec3,
  };
  const baseGrid = baseFace?.grid ?? { x: 0, y: 0 };
  const settledNormals = new Map<string, number>();
  for (const faceId of settledIds) {
    const frame = snapshot.frames.get(faceId);
    if (frame !== undefined) {
      const key = vectorKey(frame.normal);
      settledNormals.set(key, (settledNormals.get(key) ?? 0) + 1);
    }
  }

  const faceById = new Map(net.faces.map((face) => [face.id, face]));
  const orderedFaceIds = [
    ...snapshot.frames.keys(),
    ...net.faces
      .map((face) => face.id)
      .filter((faceId) => !snapshot.frames.has(faceId)),
  ];

  return Object.freeze(orderedFaceIds.flatMap((faceId) => {
    const face = faceById.get(faceId);
    if (face === undefined) return [];
    const settled = settledIds.has(face.id);
    const sourceFrame = settled ? snapshot.frames.get(face.id) : undefined;
    const flatPosition: readonly [number, number, number] = [
      baseFrame.center[0]
        + (face.grid.x - baseGrid.x) * baseFrame.right[0]
        + (face.grid.y - baseGrid.y) * baseFrame.down[0],
      baseFrame.center[1]
        + (face.grid.x - baseGrid.x) * baseFrame.right[1]
        + (face.grid.y - baseGrid.y) * baseFrame.down[1],
      baseFrame.center[2]
        + (face.grid.x - baseGrid.x) * baseFrame.right[2]
        + (face.grid.y - baseGrid.y) * baseFrame.down[2],
    ];
    const frame = sourceFrame === undefined
      ? frameFromFlatPosition(flatPosition, baseFrame)
      : copyFrame(sourceFrame);
    const position: readonly [number, number, number] = sourceFrame === undefined
      ? flatPosition
      : [frame.center[0], frame.center[1], frame.center[2]];
    const collision = sourceFrame !== undefined
      && (settledNormals.get(vectorKey(sourceFrame.normal)) ?? 0) > 1;
    const active = settled && face.id === activeId;
    const status: SceneFaceStatus = collision
      ? 'collision'
      : active
        ? 'active'
        : settled
          ? 'settled'
          : 'unsettled';
    return [Object.freeze({
      id: face.id,
      grid: Object.freeze({ x: face.grid.x, y: face.grid.y }),
      colorToken: face.colorToken,
      symbol: face.symbol,
      decorationQuarterTurn: face.decorationQuarterTurn,
      decorationRadians: quarterTurnRadians(face.decorationQuarterTurn),
      normal: frame.normal,
      right: frame.right,
      down: frame.down,
      frame,
      transform: transformFromFrame(frame, position),
      status,
      settled,
      active,
      collision,
    })];
  }));
}
