import type { CriticalActionId, LearningState } from './types';

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

