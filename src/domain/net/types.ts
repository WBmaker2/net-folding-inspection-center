export type FaceId = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6';

export type QuarterTurn = 0 | 1 | 2 | 3;

export type AxisDirection = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

export type FoldDirection = 'north' | 'east' | 'south' | 'west';

export type MissionKind = 'tracking' | 'opposite' | 'collision' | 'repair';

export type LearningStage =
  | 'intake'
  | 'prediction'
  | 'folding'
  | 'diagnosis'
  | 'repair'
  | 'evidence'
  | 'complete';

export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

export type IntAxis = -1 | 0 | 1;

export type Vec3 = readonly [IntAxis, IntAxis, IntAxis];

export interface FaceFrame {
  readonly normal: Vec3;
  readonly right: Vec3;
  readonly down: Vec3;
  readonly center: Vec3;
}

export interface FaceDefinition {
  readonly id: FaceId;
  readonly grid: GridPoint;
  readonly colorToken: 'blue' | 'yellow' | 'green' | 'coral' | 'purple' | 'teal';
  readonly symbol: 'circle' | 'triangle' | 'square' | 'star' | 'diamond' | 'cross';
  readonly decorationQuarterTurn: QuarterTurn;
}

export interface NetDefinition {
  readonly faces: readonly FaceDefinition[];
}

export interface PredictionRecord {
  readonly baseFaceId: FaceId;
  readonly predictedTopFaceId: FaceId;
  readonly foldOrder: readonly FaceId[];
  readonly arrowByFace: Readonly<Partial<Record<FaceId, FoldDirection>>>;
  readonly submittedAtIso: string;
}
