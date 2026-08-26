import type {
  AxisDirection,
  FaceId,
  NetDefinition,
} from '../net/types';
import type { OppositePair } from '../net/foldEngine';

export type MissionId =
  | 'cube-track-01'
  | 'cube-track-02'
  | 'cube-opposite-01'
  | 'cube-opposite-02'
  | 'cube-collision-01'
  | 'cube-collision-02'
  | 'cube-repair-01'
  | 'cube-repair-02';

export type HintLevel = 1 | 2 | 3;

export type HintFocus = 'shared-edge' | 'fold-path' | 'compare-candidates';

export type GeometryTerm = '맞은편' | '모서리' | '면' | '접는 방향' | '겹침' | '빈 면';

export type ErrorModel = 'none' | 'overlap' | 'missing-face' | 'decoration-direction';

export interface HintStep {
  readonly level: HintLevel;
  readonly focus: HintFocus;
  readonly text: string;
}

export interface SentenceFrame {
  readonly template: string;
  readonly placeholders: readonly string[];
}

export interface DecorationTarget {
  readonly faceId: FaceId;
  readonly targetWorldUp: AxisDirection;
}

export interface RepairMove {
  readonly faceId: FaceId;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
}

export interface TrackingMissionAnswer {
  readonly topFaceId: FaceId;
  readonly oppositePairs: readonly OppositePair[];
  readonly decorationTarget: DecorationTarget;
  readonly oppositePair?: never;
  readonly collisionPair?: never;
  readonly missingDirection?: never;
  readonly repairMove?: never;
}

export interface OppositeMissionAnswer {
  readonly oppositePair: OppositePair;
  readonly topFaceId?: never;
  readonly oppositePairs?: never;
  readonly collisionPair?: never;
  readonly missingDirection?: never;
  readonly decorationTarget?: never;
  readonly repairMove?: never;
}

export interface CollisionMissionAnswer {
  readonly collisionPair: readonly [FaceId, FaceId];
  readonly missingDirection: AxisDirection;
  readonly topFaceId?: never;
  readonly oppositePairs?: never;
  readonly oppositePair?: never;
  readonly decorationTarget?: never;
  readonly repairMove?: never;
}

export interface RepairMissionAnswer {
  readonly repairMove: RepairMove;
  readonly topFaceId?: never;
  readonly oppositePairs?: never;
  readonly oppositePair?: never;
  readonly collisionPair?: never;
  readonly missingDirection?: never;
  readonly decorationTarget?: never;
}

export type MissionAnswer =
  | TrackingMissionAnswer
  | OppositeMissionAnswer
  | CollisionMissionAnswer
  | RepairMissionAnswer;

interface MissionDefinitionBase<TAnswer extends MissionAnswer> {
  readonly id: MissionId;
  readonly order: number;
  readonly title: string;
  readonly question: string;
  readonly net: NetDefinition;
  readonly baseFaceId: FaceId;
  readonly suggestedFoldOrder: readonly FaceId[];
  readonly errorModel: ErrorModel;
  readonly answer: TAnswer;
  readonly hints: readonly HintStep[];
  readonly sentenceFrame: SentenceFrame;
  readonly targetVocabulary: readonly GeometryTerm[];
}

export interface TrackingMissionDefinition extends MissionDefinitionBase<TrackingMissionAnswer> {
  readonly kind: 'tracking';
  readonly errorModel: 'decoration-direction';
}

export interface OppositeMissionDefinition extends MissionDefinitionBase<OppositeMissionAnswer> {
  readonly kind: 'opposite';
  readonly errorModel: 'none';
}

export interface CollisionMissionDefinition extends MissionDefinitionBase<CollisionMissionAnswer> {
  readonly kind: 'collision';
  readonly errorModel: 'overlap';
}

export interface RepairMissionDefinition extends MissionDefinitionBase<RepairMissionAnswer> {
  readonly kind: 'repair';
  readonly errorModel: 'overlap';
}

export type MissionDefinition =
  | TrackingMissionDefinition
  | OppositeMissionDefinition
  | CollisionMissionDefinition
  | RepairMissionDefinition;

export type { AxisDirection, FaceId, MissionKind, NetDefinition } from '../net/types';
