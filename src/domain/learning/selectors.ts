import { evaluateDiagnosis } from './diagnosis';
import { evaluateEvidenceSubmission } from './evidence';
import { evaluateRepair } from './repair';
import { validateCubeNet } from '../net/validateCubeNet';
import type {
  AchievementEvidence,
  AchievementStatus,
  CriticalActionId,
  LearningState,
  MissionDefinition,
} from './types';

/** 결과 공개는 예측 기록과 접기 이후 단계가 모두 존재할 때만 허용합니다. */
export const canRevealFoldResult = (state: LearningState): boolean => (
  state.prediction !== null
  && (state.stage === 'folding'
    || state.stage === 'diagnosis'
    || state.stage === 'repair'
    || state.stage === 'evidence'
    || state.stage === 'complete')
);

/** 현재 화면에서 학생이 수행해야 하는 핵심 행동은 항상 하나입니다. */
export const getCriticalActionId = (state: LearningState): CriticalActionId => {
  switch (state.stage) {
    case 'intake':
      return 'select-mission';
    case 'prediction':
      return 'submit-prediction';
    case 'folding':
      return 'next-fold';
    case 'diagnosis':
      return 'submit-diagnosis';
    case 'repair':
      return 'confirm-repair';
    case 'evidence':
      return 'submit-evidence';
    case 'complete':
      return 'next-mission';
  }
};

const status = (confirmed: boolean): AchievementStatus => confirmed ? 'confirmed' : 'practicing';

/**
 * Produces learner-facing evidence states without points, rank, timing, or a
 * numeric grade. Every `confirmed` value is recomputed from mission geometry.
 */
export const getAchievementEvidence = (
  state: LearningState,
  mission: MissionDefinition,
): AchievementEvidence => {
  const baseFaceId = state.prediction?.baseFaceId ?? mission.baseFaceId;
  const validation = validateCubeNet(mission.net, baseFaceId);
  const actualTop = validation.oppositePairs.find((pair) => (
    pair.a === baseFaceId || pair.b === baseFaceId
  ));
  const actualTopFaceId = actualTop === undefined
    ? undefined
    : actualTop.a === baseFaceId ? actualTop.b : actualTop.a;
  const predictionConfirmed = state.prediction !== null
    && actualTopFaceId !== undefined
    && state.prediction.predictedTopFaceId === actualTopFaceId;
  const analysisConfirmed = mission.kind === 'opposite'
    ? true
    : state.diagnosis !== null
      && evaluateDiagnosis(mission, state.diagnosis, baseFaceId).isCorrect;
  const repairConfirmed = mission.kind !== 'collision' && mission.kind !== 'repair'
    ? true
    : state.repair !== null && evaluateRepair(
      mission.net,
      state.repair.candidate,
      baseFaceId,
    ).accepted && state.repair.accepted === true;
  const expressionConfirmed = state.evidence !== null && evaluateEvidenceSubmission(
    mission,
    state.evidence,
    {
      baseFaceId,
      diagnosis: state.diagnosis,
      repair: state.repair,
    },
  ).isCorrect;
  const evidence: AchievementEvidence = {
    prediction: status(predictionConfirmed),
    analysis: status(analysisConfirmed),
    repair: status(repairConfirmed),
    expression: status(expressionConfirmed),
    isComplete: predictionConfirmed && analysisConfirmed && repairConfirmed && expressionConfirmed,
  };
  return Object.freeze(evidence);
};

/** Short alias for screen/controller callers. */
export const selectAchievementEvidence = getAchievementEvidence;
