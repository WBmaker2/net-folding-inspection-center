import { useMemo, useState } from 'react';
import { getAchievementEvidence } from '../domain/learning/selectors';
import { evaluateEvidenceSubmission } from '../domain/learning/evidence';
import { evaluateDiagnosis } from '../domain/learning/diagnosis';
import type {
  AchievementEvidence,
  AchievementStatus,
  EvidenceSubmission,
  LearningAttempts,
  LearningState,
  MissionDefinition,
  PredictionAttempt,
  DiagnosisSubmission,
  RepairSubmission,
} from '../domain/learning/types';
import { directionLabel } from '../domain/net/directionLabels';
import { validateCubeNet } from '../domain/net/validateCubeNet';
import { useFocusHeading } from '../hooks/useFocusHeading';
import { PrimaryAction } from '../components/common/PrimaryAction';
import type { CriticalActionId } from '../domain/learning/types';
import '../styles/evidence.css';

export interface CompletionScreenProps {
  readonly mission: MissionDefinition;
  readonly state?: LearningState;
  readonly achievement?: AchievementEvidence;
  readonly attempts?: LearningAttempts;
  readonly prediction?: PredictionAttempt | null;
  readonly onNextMission?: () => void;
  readonly onReview?: () => void;
  readonly onNext?: () => void;
  readonly criticalActionId?: CriticalActionId;
}

const statusText = (value: AchievementStatus): string => {
  if (value === 'confirmed') return '확인함';
  if (value === 'not-applicable') return '이번 미션에는 없음';
  return '연습 중';
};

const pairText = (pair: { readonly a: string; readonly b: string } | undefined): string => (
  pair === undefined ? '아직 선택하지 않음' : `${pair.a}·${pair.b}`
);
const diagnosisText = (value: DiagnosisSubmission | undefined): string => (
  value === undefined ? '아직 시도하지 않음' : `${value.selectedErrorType} · ${value.selectedFaceIds.join('·') || '면 없음'}${value.selectedMissingDirection === undefined ? '' : ` · 비어 있는 방향: ${directionLabel(value.selectedMissingDirection)}`}`
);
const repairText = (value: RepairSubmission | undefined): string => (
  value === undefined ? '아직 시도하지 않음' : `${value.faceId} → (${value.target.x}, ${value.target.y})${value.accepted ? ' · 수용됨' : ' · 다시 살펴봄'}`
);
const evidenceText = (value: EvidenceSubmission | undefined): string => (
  value === undefined ? '아직 시도하지 않음' : `${pairText(value.oppositePair)} · ${value.selectedTerms.join(' · ')}`
);

const learningTakeaway = (mission: MissionDefinition): string => {
  if (mission.kind === 'tracking') return '접은 뒤 무늬 방향이 같은지 비교하는 법을 배웠어요.';
  if (mission.kind === 'opposite') return '모서리를 따라 접어 맞은편 면을 찾는 법을 배웠어요.';
  if (mission.kind === 'repair') return '겹친 면을 한 칸 옮겨 다시 확인하는 법을 배웠어요.';
  return '두 면이 같은 자리에 겹치는지 살펴보는 법을 배웠어요.';
};

const nextStepText = (mission: MissionDefinition): string => {
  if (mission.kind === 'tracking') return '다음에는 무늬가 향하는 방향을 한 번 더 확인해 보세요.';
  if (mission.kind === 'opposite') return '다음에는 다른 면을 기준으로도 맞은편을 찾아 보세요.';
  if (mission.kind === 'repair') return '다음에는 옮긴 면이 빈 자리를 채우는지 다시 살펴보세요.';
  return '다음에는 면을 한 칸씩 옮겨 다시 확인해 보세요.';
};

export function CompletionScreen({
  mission,
  state,
  achievement,
  attempts,
  prediction,
  onNextMission,
  onReview,
  onNext,
  criticalActionId,
}: CompletionScreenProps): React.JSX.Element {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const [callbackError, setCallbackError] = useState('');
  const effectiveAttempts = attempts ?? state?.attempts;
  const effectiveState = state ?? {
    missionId: mission.id,
    stage: 'complete' as const,
    prediction: prediction ?? null,
    foldStepIndex: 5,
    diagnosis: effectiveAttempts?.diagnoses.at(-1) ?? null,
    repair: effectiveAttempts?.repairs.at(-1) ?? null,
    evidence: effectiveAttempts?.evidence.at(-1) ?? null,
    attempts: effectiveAttempts ?? { predictions: [], diagnoses: [], repairs: [], evidence: [] },
    storageOptIn: false,
    completedMissionIds: [mission.id],
  };
  const evidence = achievement ?? getAchievementEvidence(effectiveState, mission);
  const actualPairs = useMemo(() => {
    const base = effectiveState.prediction?.baseFaceId ?? mission.baseFaceId;
    return validateCubeNet(mission.net, base).oppositePairs;
  }, [effectiveState.prediction?.baseFaceId, mission]);
  const firstPrediction = effectiveAttempts?.predictions[0];
  const firstWrongDiagnosis = effectiveAttempts?.diagnoses.find((item) => (
    !evaluateDiagnosis(mission, item, effectiveState.prediction?.baseFaceId).isCorrect
  ));
  const firstWrongRepair = effectiveAttempts?.repairs.find((item) => item.accepted === false);
  const firstWrongEvidence = effectiveAttempts?.evidence.find((item) => !evaluateEvidenceSubmission(
    mission,
    item,
    {
      baseFaceId: effectiveState.prediction?.baseFaceId,
      diagnosis: effectiveState.diagnosis,
      repair: effectiveState.repair,
    },
  ).isCorrect);
  const finalEvidence = effectiveAttempts?.evidence.at(-1);
  const finalDiagnosis = effectiveAttempts?.diagnoses.at(-1);
  const finalRepair = effectiveAttempts?.repairs.at(-1);

  const runCallback = (callback: (() => void) | undefined): void => {
    if (callback === undefined) return;
    try {
      callback();
      setCallbackError('');
    } catch {
      setCallbackError('다음 단계 기록에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <section className="completion-screen" aria-labelledby="completion-title">
      <p className="eyebrow">검수표 · 성취 증거</p>
      <h1 id="completion-title" ref={headingRef} tabIndex={-1}>검수 완료</h1>
      <p>맞고 틀린 점수 대신, 무엇을 확인했고 무엇을 더 연습할지 살펴봅니다.</p>

      <table className="achievement-table">
        <caption>기하 학습 성취 상태</caption>
        <thead><tr><th scope="col">항목</th><th scope="col">상태</th></tr></thead>
        <tbody>
          <tr><th scope="row">예측</th><td>{statusText(evidence.prediction)}</td></tr>
          <tr><th scope="row">분석</th><td>{statusText(evidence.analysis)}</td></tr>
          <tr><th scope="row">수리</th><td>{statusText(evidence.repair)}</td></tr>
          <tr><th scope="row">표현</th><td>{statusText(evidence.expression)}</td></tr>
        </tbody>
      </table>
      <p className="completion-status" role="status">
        {evidence.isComplete ? '필요한 근거를 모두 확인했습니다.' : '일부 근거는 연습 중입니다.'}
      </p>

      <section className="learning-summary" aria-label="배운 점과 다음에는">
        <h2>배운 점</h2>
        <p className="learning-takeaway">{learningTakeaway(mission)}</p>
        <h2>다음에는</h2>
        <p className="next-step">{nextStepText(mission)}</p>
      </section>

      <section className="completion-comparison" aria-labelledby="comparison-title">
        <h2 id="comparison-title">처음 생각과 마지막 확인 비교</h2>
        <p className="comparison-hint" role="note">작은 화면에서는 글이 칸 안에서 줄바꿈됩니다.</p>
        <table className="comparison-table">
          <caption>수정 전후 학습 기록</caption>
          <thead><tr><th scope="col">확인 항목</th><th scope="col">처음 또는 첫 오답</th><th scope="col">마지막 기록</th></tr></thead>
          <tbody>
            <tr>
              <th scope="row">예측</th>
              <td>{firstPrediction?.predictedTopFaceId ?? '아직 시도하지 않음'}</td>
              <td>{effectiveState.prediction?.predictedTopFaceId ?? '아직 시도하지 않음'}</td>
            </tr>
            <tr>
              <th scope="row">실제 면 관계</th>
              <td colSpan={2}>{actualPairs.map(pairText).join(', ') || '확인할 관계 없음'}</td>
            </tr>
            <tr>
              <th scope="row">분석</th>
              <td>{diagnosisText(firstWrongDiagnosis)}</td>
              <td>{diagnosisText(finalDiagnosis)}</td>
            </tr>
            <tr>
              <th scope="row">수리</th>
              <td>{repairText(firstWrongRepair)}</td>
              <td>{repairText(finalRepair)}</td>
            </tr>
            <tr>
              <th scope="row">근거 표현</th>
              <td>{evidenceText(firstWrongEvidence)}</td>
              <td>{evidenceText(finalEvidence)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="completion-actions">
        {onReview !== undefined && <button type="button" onClick={() => runCallback(onReview)}>접기 결과 다시 보기</button>}
        {(onNextMission ?? onNext) !== undefined && (
          <PrimaryAction
            actionId="next-mission"
            criticalActionId={criticalActionId}
            onClick={() => runCallback(onNextMission ?? onNext)}
          >
            다음 미션
          </PrimaryAction>
        )}
      </div>
      {callbackError && <p className="field-error" role="alert">{callbackError}</p>}
    </section>
  );
}
