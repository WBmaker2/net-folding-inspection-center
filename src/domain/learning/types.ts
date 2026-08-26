import type {
  AxisDirection,
  FaceId,
  MissionKind,
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

/**
 * Answers use the vocabulary of the geometry engines while keeping fields
 * optional at the common boundary. The catalog parser makes the fields for a
 * particular mission kind mandatory before returning a MissionDefinition.
 */
export interface MissionAnswer {
  readonly topFaceId?: FaceId;
  readonly oppositePairs?: readonly OppositePair[];
  readonly oppositePair?: OppositePair;
  readonly collisionPair?: readonly [FaceId, FaceId];
  readonly missingDirection?: AxisDirection;
  readonly decorationTarget?: DecorationTarget;
  readonly repairMove?: RepairMove;
}

export interface MissionDefinition {
  readonly id: MissionId;
  readonly order: number;
  readonly kind: MissionKind;
  readonly title: string;
  readonly question: string;
  readonly net: NetDefinition;
  readonly baseFaceId: FaceId;
  readonly suggestedFoldOrder: readonly FaceId[];
  readonly errorModel: ErrorModel;
  readonly answer: MissionAnswer;
  readonly hints: readonly HintStep[];
  readonly sentenceFrame: SentenceFrame;
  readonly targetVocabulary: readonly GeometryTerm[];
}

export type { AxisDirection, FaceId, MissionKind, NetDefinition } from '../net/types';
