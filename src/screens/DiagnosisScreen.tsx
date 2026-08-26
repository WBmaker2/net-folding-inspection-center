import { useMemo, useState } from 'react';
import { faceAccessibleName, faceNumber } from '../components/net2d/faceLabels';
import { firstSharedNormalStep, evaluateDiagnosis } from '../domain/learning/diagnosis';
import type { DiagnosisSubmission, MissionDefinition } from '../domain/learning/types';
import type {
  AxisDirection,
  DecorationOrientationResult,
  FaceId,
  FoldSequence,
} from '../domain/net/types';
import type { CubeValidationResult } from '../domain/net/validateCubeNet';
import { useFocusHeading } from '../hooks/useFocusHeading';
import '../styles/net2d.css';

export interface DiagnosisScreenProps {
  readonly mission: MissionDefinition;
  readonly baseFaceId?: FaceId;
  readonly validation: CubeValidationResult;
  readonly decoration?: DecorationOrientationResult;
  readonly decorationResult?: DecorationOrientationResult;
  readonly foldSequence?: FoldSequence;
  readonly sequence?: FoldSequence;
  readonly onSubmit: (diagnosis: DiagnosisSubmission) => void;
  readonly onReturnToFoldStep?: (stepIndex: number) => void;
  readonly onReviewFoldStep?: (stepIndex: number) => void;
}

const AXES: readonly { readonly value: AxisDirection; readonly label: string }[] = [
  { value: '+x', label: '+x 방향' },
  { value: '-x', label: '-x 방향' },
  { value: '+y', label: '+y 방향' },
  { value: '-y', label: '-y 방향' },
  { value: '+z', label: '+z 방향' },
  { value: '-z', label: '-z 방향' },
];

const errorChoices = [
  { value: 'overlap' as const, label: '두 면이 같은 자리에 겹쳐요' },
  { value: 'missing-face' as const, label: '빈 면이 생겨요' },
  { value: 'decoration-direction' as const, label: '장식 방향이 달라요' },
];

const validationCopy = (validation: CubeValidationResult): string => {
  if (validation.reason === 'overlap') return '전개도 검사: 같은 공간을 차지하는 면이 있습니다.';
  if (validation.isValid) return '전개도 검사: 여섯 면이 서로 다른 방향에 놓였습니다.';
  return '전개도 검사: 접는 관계를 다시 확인해야 합니다.';
};

const directionLabel = (direction: AxisDirection | undefined): string => direction ?? '확인할 수 없음';

export function DiagnosisScreen({
  mission,
  validation,
  decoration,
  decorationResult,
  foldSequence,
  sequence,
  baseFaceId = mission.baseFaceId,
  onSubmit,
  onReturnToFoldStep,
  onReviewFoldStep,
}: DiagnosisScreenProps): React.JSX.Element {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const [selectedErrorType, setSelectedErrorType] = useState<DiagnosisSubmission['selectedErrorType'] | null>(null);
  const [selectedFaceIds, setSelectedFaceIds] = useState<FaceId[]>([]);
  const [selectedMissingDirection, setSelectedMissingDirection] = useState<AxisDirection | undefined>();
  const [submitted, setSubmitted] = useState<DiagnosisSubmission | null>(null);
  const [isCorrectResult, setIsCorrectResult] = useState(false);
  const [reviewStep, setReviewStep] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitError, setSubmitError] = useState('');
  const suppliedDecoration = decoration ?? decorationResult;
  const suppliedSequence = foldSequence ?? sequence;

  const faceById = useMemo(
    () => new Map(mission.net.faces.map((face) => [face.id, face] as const)),
    [mission.net.faces],
  );
  const maxFaceCount = selectedErrorType === 'overlap' ? 2 : 1;
  const isComplete = selectedErrorType !== null
    && selectedFaceIds.length === maxFaceCount
    && (selectedErrorType !== 'overlap' || selectedMissingDirection !== undefined);

  const chooseErrorType = (value: DiagnosisSubmission['selectedErrorType']): void => {
    setSelectedErrorType(value);
    setSelectedFaceIds([]);
    setSelectedMissingDirection(undefined);
    setSubmitted(null);
    setIsCorrectResult(false);
    setReviewStep(0);
    setFeedback('');
    setSubmitError('');
  };

  const chooseFace = (faceId: FaceId): void => {
    if (selectedErrorType === null) return;
    setSelectedFaceIds((current) => {
      if (current.includes(faceId)) return current.filter((candidate) => candidate !== faceId);
      if (current.length >= maxFaceCount) return current;
      return [...current, faceId];
    });
    setSubmitted(null);
    setIsCorrectResult(false);
    setReviewStep(0);
    setFeedback('');
    setSubmitError('');
  };

  const submit = (): void => {
    if (!isComplete || selectedErrorType === null) return;
    const diagnosis: DiagnosisSubmission = {
      selectedErrorType,
      selectedFaceIds: [...selectedFaceIds],
      ...(selectedMissingDirection === undefined ? {} : { selectedMissingDirection }),
    };
    setSubmitError('');
    try {
      onSubmit(diagnosis);
    } catch {
      setSubmitError('진단을 기록하지 못했습니다. 같은 선택으로 다시 시도해 주세요.');
      return;
    }
    setSubmitted(diagnosis);
    const rawEvaluation = evaluateDiagnosis(mission, diagnosis, baseFaceId, {
      validation,
      decoration: suppliedDecoration,
    });
    const evaluation = mission.kind === 'tracking' && suppliedDecoration === undefined
      ? { ...rawEvaluation, isCorrect: false }
      : rawEvaluation;
    setIsCorrectResult(evaluation.isCorrect);
    const nextReviewStep = firstSharedNormalStep(suppliedSequence, diagnosis.selectedFaceIds);
    setReviewStep(nextReviewStep);
    if (evaluation.isCorrect && mission.kind === 'tracking' && evaluation.decoration !== undefined) {
      setFeedback(`${faceNumber(faceById.get(mission.answer.decorationTarget.faceId)!)}번 면의 장식이 ${directionLabel(evaluation.decoration.targetWorldUp)} 방향을 향합니다.`);
    } else if (evaluation.isCorrect && evaluation.collisionPair !== undefined) {
      const [first, second] = evaluation.collisionPair;
      setFeedback(
        `${faceNumber(faceById.get(first)!)}번 면과 ${faceNumber(faceById.get(second)!)}번 면이 같은 공간을 차지합니다. 비어 있는 방향은 ${directionLabel(evaluation.missingDirection)}입니다.`,
      );
    } else if (selectedErrorType === 'decoration-direction') {
      const actual = suppliedDecoration?.worldUp;
      const target = suppliedDecoration?.targetWorldUp ?? (mission.kind === 'tracking'
        ? mission.answer.decorationTarget.targetWorldUp
        : undefined);
      setFeedback(
        actual === undefined || target === undefined
          ? '장식 방향 결과가 없어 진단을 확정할 수 없습니다.'
          : `현재 장식 방향은 ${actual}, 목표 방향은 ${target}입니다. 두 방향을 비교해 보세요.`,
      );
    } else {
      setFeedback(
        selectedErrorType === 'overlap' && selectedFaceIds.length === 2
          ? `아직 맞는 원인을 찾지 못했습니다. 선택한 두 면이 처음 같은 법선이 된 ${nextReviewStep}단계를 되돌아보세요.`
          : '아직 맞는 원인을 찾지 못했습니다. 접힌 면과 모서리를 다시 살펴보세요.',
      );
    }
  };

  return (
    <section className="diagnosis-screen" aria-labelledby="diagnosis-title">
      <p className="eyebrow">진단 · 근거 찾기</p>
      <h1 id="diagnosis-title" ref={headingRef} tabIndex={-1}>접힌 결과 진단하기</h1>
      <p className="diagnosis-intro">오류 유형을 고른 뒤, 관련 면과 필요한 빈 방향을 차례로 선택해 보세요.</p>

      <section className="diagnosis-validation-panel" aria-label="전개도 유효성 검사">
        <h2>전개도 유효성</h2>
        <p>{validationCopy(validation)}</p>
        {validation.collisions.length > 0 && <p>겹침 후보가 있어 면의 법선 방향을 비교합니다.</p>}
      </section>

      <fieldset className="diagnosis-fieldset">
        <legend>1. 어떤 오류인가요?</legend>
        {errorChoices.map((choice) => (
          <label key={choice.value} className="diagnosis-radio-label">
            <input
              type="radio"
              name="diagnosis-error-type"
              value={choice.value}
              checked={selectedErrorType === choice.value}
              onChange={() => chooseErrorType(choice.value)}
            />
            {choice.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="diagnosis-fieldset">
        <legend>2. 관련된 면을 골라 보세요 ({selectedErrorType === 'overlap' ? '두 개' : '한 개'})</legend>
        <div className="diagnosis-face-options" aria-label="진단할 면 선택">
          {mission.net.faces.map((face) => {
            const selected = selectedFaceIds.includes(face.id);
            return (
              <button
                type="button"
                key={face.id}
                className={`diagnosis-face-button ${selected ? 'is-selected' : ''}`}
                aria-pressed={selected}
                disabled={selectedErrorType === null}
                onClick={() => chooseFace(face.id)}
              >
                {faceAccessibleName(face)}{selected ? ' · 선택됨' : ''}
              </button>
            );
          })}
        </div>
      </fieldset>

      {selectedErrorType === 'overlap' && (
        <fieldset className="diagnosis-fieldset">
          <legend>3. 비어 있는 축 방향을 골라 보세요</legend>
          <div className="diagnosis-axis-options">
            {AXES.map((axis) => (
              <label key={axis.value} className="diagnosis-radio-label">
                <input
                  type="radio"
                  name="missing-direction"
                  value={axis.value}
                  checked={selectedMissingDirection === axis.value}
                  onChange={() => {
                    setSelectedMissingDirection(axis.value);
                    setSubmitted(null);
                    setIsCorrectResult(false);
                    setReviewStep(0);
                    setFeedback('');
                  }}
                />
                {axis.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {selectedErrorType !== null && !isComplete && (
        <p className="field-error" role="alert">
          {selectedFaceIds.length < maxFaceCount
            ? `관련 면을 ${maxFaceCount}개 골라 주세요.`
            : '비어 있는 축 방향을 골라 주세요.'}
        </p>
      )}
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
      {feedback && <p className="field-success diagnosis-feedback" role="status">{feedback}</p>}

      {submitted !== null && !isCorrectResult && (
        <button
          type="button"
          className="diagnosis-review-button"
          onClick={() => {
            onReturnToFoldStep?.(reviewStep);
            onReviewFoldStep?.(reviewStep);
          }}
        >
          접기 단계 되돌아보기
        </button>
      )}
      <button
        type="button"
        className="diagnosis-submit"
        disabled={!isComplete}
        onClick={submit}
      >
        진단 확인
      </button>
    </section>
  );
}
