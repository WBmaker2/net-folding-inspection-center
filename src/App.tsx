import { useMemo } from 'react';
import { AppShell } from './app/AppShell';
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
import type { FaceId } from './domain/net/types';

export function App(): React.JSX.Element {
  const controller = useLearningController();
  const { state, mission, validation, foldSequence } = controller;
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
          onSelectMission={controller.selectMission}
        />
      );
    }
    if (mission === null) return <p role="alert">미션을 불러오지 못했습니다.</p>;
    if (state.stage === 'prediction') {
      return (
        <PredictionScreen
          mission={mission}
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
          onReview={reviewFold}
          onNextMission={controller.resetMission}
        />
      );
    }
    return <p role="alert">현재 학습 단계를 준비하지 못했습니다.</p>;
  };

  return (
    <AppShell>
      {renderStage()}
    </AppShell>
  );
}

export type { FaceId };
