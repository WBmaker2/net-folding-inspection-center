import type {
  AxisDirection,
  FaceId,
  GridPoint,
  LearningStage,
  NetDefinition,
  PredictionRecord,
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
  readonly from: GridPoint;
  readonly to: GridPoint;
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

/** 오류 원인은 수리 좌표나 정답을 공개하지 않고도 선택할 수 있어야 합니다. */
export type DiagnosisErrorType = 'overlap' | 'missing-face' | 'decoration-direction';

export interface DiagnosisSubmission {
  readonly selectedErrorType: DiagnosisErrorType;
  readonly selectedFaceIds: readonly FaceId[];
  readonly selectedMissingDirection?: AxisDirection;
}

/**
 * 수리 화면이 계산한 후보를 reducer에 전달하는 최소 기록입니다.
 * `accepted`는 화면 밖의 기하 수리 판정기가 계산한 결과이며, 명시적으로
 * `true`일 때만 다음 근거 단계로 진행합니다.
 */
export interface RepairSubmission {
  readonly faceId: FaceId;
  readonly target: GridPoint;
  readonly accepted: boolean;
  /** Candidate is mandatory so persistence and the reducer can recompute acceptance. */
  readonly candidate: NetDefinition;
  readonly submittedAtIso?: string;
}

export interface EvidenceSubmission {
  readonly oppositePair?: OppositePair;
  readonly selectedTerms: readonly GeometryTerm[];
  readonly completedSentence: string;
}

/** Evidence keeps the exact diagnosis/repair attempts that supplied its context. */
export interface EvidenceAttempt extends EvidenceSubmission {
  readonly diagnosisAttemptIndex?: number;
  readonly repairAttemptIndex?: number;
}

export type AchievementStatus = 'confirmed' | 'practicing';

export interface AchievementEvidence {
  readonly prediction: AchievementStatus;
  readonly analysis: AchievementStatus;
  readonly repair: AchievementStatus;
  readonly expression: AchievementStatus;
  readonly isComplete: boolean;
}

/**
 * PredictionRecord 자체가 시도 하나입니다. 별도 점수·정오 필드를 만들지
 * 않으면 첫 오답도 수정 전후 비교에 필요한 원본 그대로 남길 수 있습니다.
 */
export type PredictionAttempt = PredictionRecord;

export interface LearningAttempts {
  readonly predictions: readonly PredictionAttempt[];
  readonly diagnoses: readonly DiagnosisSubmission[];
  readonly repairs: readonly RepairSubmission[];
  readonly evidence: readonly EvidenceAttempt[];
}

/** 저장 시에는 학습 문장을 재생성할 수 있으므로 원문을 보관하지 않습니다. */
export interface PersistedEvidenceSubmission {
  readonly oppositePair?: OppositePair;
  readonly selectedTerms: readonly GeometryTerm[];
  readonly diagnosisAttemptIndex?: number;
  readonly repairAttemptIndex?: number;
}

/** `LearningAttempts`에서 문장 원문을 제거한 저장 전용 구조입니다. */
export interface PersistedLearningAttempts {
  readonly predictions: readonly PredictionAttempt[];
  readonly diagnoses: readonly DiagnosisSubmission[];
  readonly repairs: readonly RepairSubmission[];
  readonly evidence: readonly PersistedEvidenceSubmission[];
}

export type PersistedEvidence = PersistedEvidenceSubmission;

export interface LearningState {
  readonly missionId: MissionId | null;
  readonly stage: LearningStage;
  readonly prediction: PredictionRecord | null;
  readonly foldStepIndex: number;
  readonly diagnosis: DiagnosisSubmission | null;
  readonly repair: RepairSubmission | null;
  readonly evidence: EvidenceSubmission | null;
  readonly attempts: LearningAttempts;
  readonly storageOptIn: boolean;
  readonly completedMissionIds: readonly MissionId[];
}

export type LearningAction =
  | { readonly type: 'SELECT_MISSION'; readonly missionId: MissionId }
  | {
    readonly type: 'SUBMIT_PREDICTION';
    readonly prediction: PredictionRecord;
    readonly missionId?: MissionId;
  }
  | {
    readonly type: 'SET_FOLD_STEP';
    readonly stepIndex: number;
    readonly missionId?: MissionId;
  }
  | {
    readonly type: 'SUBMIT_DIAGNOSIS';
    readonly diagnosis: DiagnosisSubmission;
    readonly missionId?: MissionId;
  }
  | {
    readonly type: 'SUBMIT_REPAIR';
    readonly repair: RepairSubmission;
    readonly missionId?: MissionId;
  }
  | {
    readonly type: 'SUBMIT_EVIDENCE';
    readonly evidence: EvidenceSubmission;
    readonly missionId?: MissionId;
  }
  | { readonly type: 'COMPLETE_MISSION'; readonly missionId?: MissionId }
  | {
    readonly type: 'RETURN_TO_FOLD_STEP';
    readonly stepIndex?: number;
    readonly missionId?: MissionId;
  }
  | { readonly type: 'SET_STORAGE_OPT_IN'; readonly enabled: boolean }
  | { readonly type: 'RESET_MISSION' };

export type CriticalActionId =
  | 'select-mission'
  | 'submit-prediction'
  | 'next-fold'
  | 'submit-diagnosis'
  | 'confirm-repair'
  | 'submit-evidence'
  | 'next-mission';

/** sessionStorage에 기록되는 유일한 schema입니다. 개인정보 필드는 없습니다. */
export interface PersistedProgress {
  readonly version: 1;
  readonly missionId: MissionId | null;
  readonly stage: LearningStage;
  readonly prediction: PredictionRecord | null;
  readonly foldStepIndex: number;
  readonly diagnosis: DiagnosisSubmission | null;
  readonly repair: RepairSubmission | null;
  readonly evidence: PersistedEvidenceSubmission | null;
  readonly attempts: PersistedLearningAttempts;
  readonly completedMissionIds: readonly MissionId[];
}

export interface ProgressStore {
  load(): PersistedProgress | null;
  save(progress: PersistedProgress): boolean | void;
  clear(): boolean | void;
}

export type {
  AxisDirection,
  FaceId,
  FoldDirection,
  GridPoint,
  LearningStage,
  MissionKind,
  NetDefinition,
  PredictionRecord,
} from '../net/types';
