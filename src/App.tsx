import { useMemo } from 'react';
import { AppShell } from './app/AppShell';
import type { AppStageMeta } from './app/AppShell';
import { useLearningController } from './app/useLearningController';
import { loadMissionCatalog } from './content/missions/catalog';
import { evaluateDecorationOrientation } from './domain/net/decoration';
import { CompletionScreen } from './screens/CompletionScreen';
import { DiagnosisScreen } from './screens/DiagnosisScreen';
import { EvidenceScreen } from './screens/EvidenceScreen';
import { FoldingScreen } from './screens/FoldingScreen';
import { IntakeScreen } from './screens/IntakeScreen';
import { PredictionScreen } from './screens/PredictionScreen';
import { RepairScreen } from './screens/RepairScreen';
import { getCriticalActionId } from './domain/learning/selectors';
import type { FaceId, LearningStage, MissionKind } from './domain/net/types';

const STAGE_LABELS: Readonly<Record<LearningStage, string>> = {
  intake: '미션 고르기',
  prediction: '예측',
  folding: '접기',
  diagnosis: '진단',
  repair: '수리',
  evidence: '근거',
  complete: '완료',
};

const STAGE_PATHS: Readonly<Record<MissionKind, readonly LearningStage[]>> = {
  tracking: ['intake', 'prediction', 'folding', 'diagnosis', 'evidence', 'complete'],
  opposite: ['intake', 'prediction', 'folding', 'evidence', 'complete'],
  collision: ['intake', 'prediction', 'folding', 'diagnosis', 'repair', 'evidence', 'complete'],
  repair: ['intake', 'prediction', 'folding', 'diagnosis', 'repair', 'evidence', 'complete'],
};

/** 미션을 고르기 전에는 가장 긴 경로를 기준으로 안내합니다. */
const INITIAL_STAGE_PATH = STAGE_PATHS.collision;

function getStageMeta(stage: LearningStage, missionKind?: MissionKind): AppStageMeta {
  const path = missionKind === undefined ? INITIAL_STAGE_PATH : STAGE_PATHS[missionKind];
  const stageIndex = path.indexOf(stage);
  return {
    current: stageIndex < 0 ? 1 : stageIndex + 1,
    total: path.length,
    label: STAGE_LABELS[stage],
    canReselect: stage !== 'intake',
  };
}

export function App(): React.JSX.Element {
  const controller = useLearningController();
  const { state, mission, validation, foldSequence } = controller;
  const criticalActionId = getCriticalActionId(state);
  const missions = useMemo(() => loadMissionCatalog(), []);
  const decoration = useMemo(() => {
    if (mission?.kind !== 'tracking' || validation === null) return undefined;
    const target = mission.answer.decorationTarget;
    const face = mission.net.faces.find((candidate) => candidate.id === target.faceId);
    const frame = validation.frames.get(target.faceId);
    return face === undefined || frame === undefined
      ? undefined
      : evaluateDecorationOrientation(face, frame, target.targetWorldUp);
  }, [mission, validation]);

  const reviewFold = (): void => {
    controller.dispatch({
      type: 'RETURN_TO_FOLD_STEP',
      stepIndex: 4,
      ...(state.missionId === null ? {} : { missionId: state.missionId }),
    });
  };

  const renderStage = (): React.JSX.Element => {
    if (state.stage === 'intake') {
      return (
        <IntakeScreen
          missions={missions}
          completedMissionIds={state.completedMissionIds}
          criticalActionId={criticalActionId}
          onSelectMission={controller.selectMission}
        />
      );
    }
    if (mission === null) return <p role="alert">미션을 불러오지 못했습니다.</p>;
    if (state.stage === 'prediction') {
      return (
        <PredictionScreen
          mission={mission}
          criticalActionId={criticalActionId}
          onSubmit={(prediction) => controller.dispatch({
            type: 'SUBMIT_PREDICTION',
            prediction,
            missionId: mission.id,
          })}
        />
      );
    }
    if (state.stage === 'folding' && state.prediction !== null) {
      return (
        <FoldingScreen
          mission={mission}
          prediction={state.prediction}
          validation={validation ?? undefined}
          initialStepIndex={state.foldStepIndex}
          criticalActionId={criticalActionId}
          onReturnToPrediction={() => controller.dispatch({
            type: 'RETURN_TO_PREDICTION',
            missionId: mission.id,
          })}
          onStepChange={(stepIndex) => controller.dispatch({
            type: 'SET_FOLD_STEP',
            stepIndex,
            missionId: mission.id,
          })}
        />
      );
    }
    if (state.stage === 'diagnosis' && validation !== null && state.prediction !== null) {
      return (
        <DiagnosisScreen
          mission={mission}
          baseFaceId={state.prediction.baseFaceId}
          validation={validation}
          decoration={decoration}
          foldSequence={foldSequence ?? undefined}
          criticalActionId={criticalActionId}
          onSubmit={(diagnosis) => controller.dispatch({
            type: 'SUBMIT_DIAGNOSIS',
            diagnosis,
            missionId: mission.id,
          })}
          onReturnToFoldStep={(stepIndex) => controller.dispatch({
            type: 'RETURN_TO_FOLD_STEP',
            stepIndex,
            missionId: mission.id,
          })}
        />
      );
    }
    if (state.stage === 'repair' && state.prediction !== null) {
      return (
        <RepairScreen
          mission={mission}
          baseFaceId={state.prediction.baseFaceId}
          showDecorationRotation={false}
          criticalActionId={criticalActionId}
          onSubmit={(repair) => controller.dispatch({
            type: 'SUBMIT_REPAIR',
            repair,
            missionId: mission.id,
          })}
        />
      );
    }
    if (state.stage === 'evidence' && state.prediction !== null) {
      return (
        <EvidenceScreen
          mission={mission}
          baseFaceId={state.prediction.baseFaceId}
          validation={validation ?? undefined}
          diagnosis={state.diagnosis}
          repair={state.repair}
          foldSequence={foldSequence ?? undefined}
          criticalActionId={criticalActionId}
          onSubmit={(evidence) => controller.dispatch({
            type: 'SUBMIT_EVIDENCE',
            evidence,
            missionId: mission.id,
          })}
          onCompleteMission={() => controller.dispatch({
            type: 'COMPLETE_MISSION',
            missionId: mission.id,
          })}
        />
      );
    }
    if (state.stage === 'complete') {
      return (
        <CompletionScreen
          mission={mission}
          state={state}
          criticalActionId={criticalActionId}
          onReview={reviewFold}
          onNextMission={controller.resetMission}
        />
      );
    }
    return <p role="alert">현재 학습 단계를 준비하지 못했습니다.</p>;
  };

  return (
    <AppShell
      storageOptIn={state.storageOptIn}
      restoredFromStore={controller.restoredFromStore}
      persistenceNotice={controller.persistenceNotice}
      stageMeta={getStageMeta(state.stage, mission?.kind)}
      onReselectMission={state.stage === 'intake' ? undefined : controller.resetMission}
      onStorageOptInChange={(enabled) => controller.dispatch({
        type: 'SET_STORAGE_OPT_IN',
        enabled,
      })}
    >
      {renderStage()}
    </AppShell>
  );
}

export type { FaceId };
