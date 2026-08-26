import { useMemo, useState } from 'react';
import { faceNumber } from '../components/net2d/faceLabels';
import {
  buildEvidenceSentence,
  evaluateEvidenceSubmission,
  getEvidenceContext,
} from '../domain/learning/evidence';
import type {
  DiagnosisSubmission,
  EvidenceSubmission,
  GeometryTerm,
  MissionDefinition,
  RepairSubmission,
} from '../domain/learning/types';
import type { CubeValidationResult } from '../domain/net/validateCubeNet';
import type { FaceId, FoldSequence } from '../domain/net/types';
import { useFocusHeading } from '../hooks/useFocusHeading';
import { PrimaryAction } from '../components/common/PrimaryAction';
import type { CriticalActionId } from '../domain/learning/types';
import '../styles/evidence.css';

export interface EvidenceScreenProps {
  readonly mission: MissionDefinition;
  /** Pre-repair fold result; the domain recomputes the repaired result separately. */
  readonly validation?: CubeValidationResult;
  readonly baseFaceId?: FaceId;
  readonly diagnosis?: DiagnosisSubmission | null;
  readonly repair?: RepairSubmission | null;
  readonly foldSequence?: FoldSequence;
  readonly onSubmit: (evidence: EvidenceSubmission) => void;
  readonly onComplete?: () => void;
  readonly onCompletion?: () => void;
  readonly onCompleteMission?: () => void;
  readonly criticalActionId?: CriticalActionId;
}

const terms: readonly GeometryTerm[] = ['맞은편', '모서리', '면', '접는 방향', '겹침', '빈 면'];

export function EvidenceScreen({
  mission,
  validation,
  baseFaceId,
  diagnosis = null,
  repair = null,
  onSubmit,
  onComplete,
  onCompletion,
  onCompleteMission,
  criticalActionId,
}: EvidenceScreenProps): React.JSX.Element {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const [selectedFaces, setSelectedFaces] = useState<FaceId[]>([]);
  const [relationshipTerm, setRelationshipTerm] = useState<GeometryTerm | ''>('');
  const [pathTerm, setPathTerm] = useState<GeometryTerm | ''>('');
  const [submitted, setSubmitted] = useState<EvidenceSubmission | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const context = useMemo(() => getEvidenceContext(mission, {
    baseFaceId,
    validation,
    diagnosis,
    repair,
  }), [baseFaceId, diagnosis, mission, repair, validation]);
  const pairOptions = useMemo(() => {
    if (mission.kind === 'collision' && context.collisionPair !== undefined) {
      return [{ a: context.collisionPair[0], b: context.collisionPair[1] }];
    }
    return context.pairCandidates;
  }, [context.collisionPair, context.pairCandidates, mission.kind]);
  const termOptions = terms.filter((term) => mission.targetVocabulary.includes(term));
  const updateTerm = (setter: (term: GeometryTerm | '') => void, value: GeometryTerm | ''): void => {
    setter(value);
    setSubmitted(null);
    setCompleted(false);
    setSubmitError('');
  };
  const handleTermKeyDown = (
    event: React.KeyboardEvent<HTMLSelectElement>,
    current: GeometryTerm | '',
    setter: (term: GeometryTerm | '') => void,
  ): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const currentIndex = current === '' ? -1 : termOptions.indexOf(current);
    const nextIndex = Math.max(-1, Math.min(
      termOptions.length - 1,
      currentIndex + (event.key === 'ArrowDown' ? 1 : -1),
    ));
    updateTerm(setter, nextIndex < 0 ? '' : termOptions[nextIndex]!);
  };
  const selectedPair = selectedFaces.length === 2
    ? pairOptions.find((pair) => (
      (pair.a === selectedFaces[0] && pair.b === selectedFaces[1])
      || (pair.a === selectedFaces[1] && pair.b === selectedFaces[0])
    ))
    : undefined;
  const selectedTerms: readonly GeometryTerm[] = relationshipTerm !== '' && pathTerm !== ''
    ? [relationshipTerm, pathTerm]
    : [];
  const draft: EvidenceSubmission | null = selectedPair !== undefined && selectedTerms.length === 2
    ? {
      ...(mission.kind === 'collision' ? {} : { oppositePair: { a: selectedPair.a, b: selectedPair.b } }),
      selectedTerms,
      completedSentence: '',
    }
    : null;
  const preview = draft === null ? null : buildEvidenceSentence(mission, {
    firstFace: mission.kind === 'repair' ? context.repairFaceId as FaceId : selectedPair!.a,
    ...(mission.kind === 'repair'
      ? { secondFace: context.baseFaceId }
      : { secondFace: selectedPair!.b }),
    term1: pathTerm as GeometryTerm,
    term2: relationshipTerm as GeometryTerm,
  });
  const isCorrectDraft = draft !== null && preview !== null && evaluateEvidenceSubmission(
    mission,
    { ...draft, completedSentence: preview },
    { baseFaceId, diagnosis, repair },
  ).isCorrect;

  const chooseFace = (faceId: FaceId): void => {
    setSubmitError('');
    setSubmitted(null);
    setCompleted(false);
    setCompleteError('');
    setSelectedFaces((current) => current.includes(faceId)
      ? current.filter((candidate) => candidate !== faceId)
      : current.length >= 2 ? current : [...current, faceId]);
  };

  const submit = (): void => {
    if (draft === null || preview === null || submitted !== null) return;
    if (!context.prerequisitesCorrect) {
      setSubmitError('접기 검사 결과를 확인할 수 없어 근거를 기록하지 않았습니다. 다시 불러와 주세요.');
      return;
    }
    const evidence: EvidenceSubmission = { ...draft, completedSentence: preview };
    try {
      onSubmit(evidence);
      setSubmitted(evidence);
      setCompleted(false);
      setSubmitError('');
    } catch {
      setSubmitError('근거를 기록하지 못했습니다. 선택을 확인한 뒤 다시 시도해 주세요.');
    }
  };

  const complete = (): void => {
    const callback = onCompleteMission ?? onCompletion ?? onComplete;
    if (!isCorrectDraft || submitted === null || completed || callback === undefined) return;
    try {
      callback();
      setCompleted(true);
      setCompleteError('');
    } catch {
      setCompleteError('완료 기록을 저장하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const faceIds = mission.net.faces.map((face) => face.id);
  return (
    <section className="evidence-screen" aria-labelledby="evidence-title">
      <p className="eyebrow">근거 · 말로 설명하기</p>
      <h1 id="evidence-title" ref={headingRef} tabIndex={-1}>근거 문장 만들기</h1>
      <p>면의 관계와 접는 까닭을 골라 짧은 문장으로 설명해 보세요.</p>

      {pairOptions.length > 0 && (
        <fieldset className="evidence-fieldset">
          <legend>1. 관련된 두 면을 골라 보세요</legend>
          <div className="evidence-face-options" aria-label="근거에 사용할 면">
            {faceIds.map((faceId) => (
              <button
                type="button"
                key={faceId}
                className={selectedFaces.includes(faceId) ? 'is-selected' : undefined}
                aria-pressed={selectedFaces.includes(faceId)}
                aria-label={`${faceNumber(mission.net.faces.find((face) => face.id === faceId)!)}번 면`}
                onClick={() => chooseFace(faceId)}
              >
                {faceNumber(mission.net.faces.find((face) => face.id === faceId)!)}번 면
              </button>
            ))}
          </div>
          {selectedPair === undefined && selectedFaces.length > 0 && (
            <p className="field-error" role="alert">실제로 서로 맞닿거나 반대인 두 면을 골라 주세요.</p>
          )}
        </fieldset>
      )}

      <fieldset className="evidence-fieldset">
        <legend>2. 관계나 결과 낱말을 골라 보세요</legend>
        <label htmlFor="evidence-term-relationship">첫 번째 기하 낱말</label>
        <select
          id="evidence-term-relationship"
          value={relationshipTerm}
          onKeyDown={(event) => handleTermKeyDown(event, relationshipTerm, setRelationshipTerm)}
          onChange={(event) => updateTerm(setRelationshipTerm, event.target.value as GeometryTerm)}
        >
          <option value="">고르기</option>
          {termOptions.map((term) => (
            <option value={term} key={term}>{term}</option>
          ))}
        </select>
        <label htmlFor="evidence-term-path">두 번째 기하 낱말</label>
        <select
          id="evidence-term-path"
          value={pathTerm}
          onKeyDown={(event) => handleTermKeyDown(event, pathTerm, setPathTerm)}
          onChange={(event) => updateTerm(setPathTerm, event.target.value as GeometryTerm)}
        >
          <option value="">고르기</option>
          {termOptions.map((term) => (
            <option value={term} key={term}>{term}</option>
          ))}
        </select>
      </fieldset>

      <section className="evidence-preview" aria-label="근거 문장 미리보기" aria-live="polite">
        <h2>문장 미리보기</h2>
        <p>{preview ?? '면 두 개와 기하 낱말 두 개를 고르면 문장이 나타납니다.'}</p>
      </section>
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
      {draft !== null && preview !== null && !isCorrectDraft && (
        <p className="field-error" role="alert">아직 관계가 맞지 않아요. 접힌 결과와 선택한 면을 다시 살펴보세요. 점수는 없습니다.</p>
      )}
      {submitted !== null && (
        <p className="field-success" role="status">근거 시도를 기록했습니다. 필요한 경우 선택을 고쳐 다시 확인할 수 있습니다.</p>
      )}
      <PrimaryAction
        actionId="submit-evidence"
        criticalActionId={criticalActionId}
        isPrimary={submitted === null}
        className="evidence-submit"
        disabled={draft === null || preview === null || submitted !== null}
        onClick={submit}
      >
        근거 확인
      </PrimaryAction>
      {submitted !== null && isCorrectDraft && (
        <PrimaryAction
          actionId="submit-evidence"
          criticalActionId={criticalActionId}
          isPrimary
          className="evidence-complete"
          disabled={completed}
          onClick={complete}
        >
          미션 완료 확인
        </PrimaryAction>
      )}
      {completed && <p className="field-success" role="status">미션 완료를 기록했습니다.</p>}
      {completeError && <p className="field-error" role="alert">{completeError}</p>}
      <p className="evidence-selection-status" role="status">
        {selectedPair === undefined ? '면 관계를 선택 중입니다.' : `${selectedPair.a}·${selectedPair.b} 관계를 골랐습니다.`}
      </p>
    </section>
  );
}
