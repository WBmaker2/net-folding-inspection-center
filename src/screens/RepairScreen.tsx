import { useEffect, useMemo, useState } from 'react';
import { NetGrid } from '../components/net2d/NetGrid';
import { RepairTargetGrid } from '../components/net2d/RepairTargetGrid';
import { faceNumber } from '../components/net2d/faceLabels';
import { evaluateRepair, enumerateRepairTargets, moveFace, rotateFaceDecoration, type RepairEvaluation } from '../domain/learning/repair';
import type { RepairSubmission, MissionDefinition } from '../domain/learning/types';
import type { FaceId, GridPoint, NetDefinition } from '../domain/net/types';
import { useFocusHeading } from '../hooks/useFocusHeading';
import '../styles/net2d.css';
import '../styles/repair.css';

export interface RepairScreenProps {
  readonly mission: MissionDefinition;
  readonly baseFaceId?: FaceId;
  /** Optional name used by the controller when the repair starts from a derived net. */
  readonly originalNet?: NetDefinition;
  readonly onSubmit: (repair: RepairSubmission) => void;
  readonly onRotateDecoration?: (faceId: FaceId, net: NetDefinition) => void;
  readonly now?: () => string;
}

const pointText = (point: GridPoint): string => `(${point.x}, ${point.y})`;

const reasonText = (evaluation: RepairEvaluation): string => {
  if (!evaluation.isSingleFaceMove) return '한 면의 위치만 바꾸어야 합니다. 다른 정보는 그대로 두세요.';
  if (!evaluation.remainsConnected) return '옮긴 뒤에도 여섯 면이 하나의 전개도로 이어져야 합니다.';
  if (!evaluation.validation.isValid) {
    if (evaluation.validation.reason === 'overlap') return '접었을 때 두 면이 같은 자리에 겹칩니다.';
    if (evaluation.validation.reason === 'inconsistent-fold') return '접었을 때 여섯 방향이 한 번씩 채워지지 않습니다.';
    return '이 위치에서는 정육면체 전개도가 되지 않습니다.';
  }
  return '이동한 한 면이 연결을 유지하고, 접었을 때 겹치지 않습니다.';
};

interface RepairScreenContentProps extends RepairScreenProps {
  readonly repairNet: NetDefinition;
}

function RepairScreenContent({
  mission,
  baseFaceId,
  repairNet,
  onSubmit,
  onRotateDecoration,
  now = () => new Date().toISOString(),
}: RepairScreenContentProps): React.JSX.Element {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const [decorationPreviewNet, setDecorationPreviewNet] = useState<NetDefinition>(repairNet);
  const [selectedFaceId, setSelectedFaceId] = useState<FaceId | null>(null);
  const [target, setTarget] = useState<GridPoint | null>(null);
  const [evaluation, setEvaluation] = useState<RepairEvaluation | null>(null);
  const [candidateNet, setCandidateNet] = useState<NetDefinition | null>(null);
  const [status, setStatus] = useState('면을 먼저 선택한 뒤, 이동할 빈 칸을 선택하세요.');
  const [callbackError, setCallbackError] = useState(false);

  const targets = useMemo(
    () => selectedFaceId === null ? [] : enumerateRepairTargets(repairNet, selectedFaceId),
    [repairNet, selectedFaceId],
  );

  useEffect(() => {
    const clear = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setSelectedFaceId(null);
        setTarget(null);
        setEvaluation(null);
        setCallbackError(false);
        setStatus('선택과 미리보기를 지웠습니다. 면을 다시 선택하세요.');
      }
    };
    window.addEventListener('keydown', clear);
    return () => window.removeEventListener('keydown', clear);
  }, []);

  const chooseFace = (faceId: FaceId): void => {
    setSelectedFaceId(faceId);
    setTarget(null);
    setEvaluation(null);
    setCandidateNet(null);
    setCallbackError(false);
    setStatus(`${faceNumber(repairNet.faces.find((face) => face.id === faceId) ?? repairNet.faces[0]!)}번 면을 골랐습니다. 이동할 빈 칸을 선택하세요.`);
  };

  const chooseTarget = (nextTarget: GridPoint): void => {
    if (selectedFaceId === null) return;
    const candidate = moveFace(repairNet, selectedFaceId, nextTarget);
    const nextEvaluation = evaluateRepair(repairNet, candidate, baseFaceId ?? mission.baseFaceId);
    setTarget({ x: nextTarget.x, y: nextTarget.y });
    setEvaluation(nextEvaluation);
    setCandidateNet(moveFace(decorationPreviewNet, selectedFaceId, nextTarget));
    setCallbackError(false);
    setStatus(`미리보기: ${pointText(nextTarget)}로 옮겼을 때의 결과를 확인하세요.`);
  };

  const confirm = (): void => {
    if (selectedFaceId === null || target === null || evaluation === null) return;
    const submission: RepairSubmission = {
      faceId: selectedFaceId,
      target: { x: target.x, y: target.y },
      accepted: evaluation.accepted,
      candidate: moveFace(repairNet, selectedFaceId, target),
      submittedAtIso: now(),
    };
    try {
      onSubmit(submission);
      setCallbackError(false);
      setStatus(evaluation.accepted ? '수리 기록을 남겼습니다. 다음 근거를 확인하세요.' : '이 시도도 기록했습니다. 다른 빈 칸을 골라 다시 살펴보세요.');
    } catch {
      setCallbackError(true);
      setStatus('기록에 실패했습니다. 미리보기를 확인한 뒤 다시 시도하세요.');
    }
  };

  const rotate = (): void => {
    if (selectedFaceId === null) return;
    const rotated = rotateFaceDecoration(decorationPreviewNet, selectedFaceId);
    setDecorationPreviewNet(rotated);
    if (target !== null) setCandidateNet(moveFace(rotated, selectedFaceId, target));
    onRotateDecoration?.(selectedFaceId, rotated);
    setStatus('장식 방향만 한 번 돌렸습니다. 장식 회전은 좌표 수리와 별도로 확인합니다.');
  };

  return (
    <section
      className="repair-screen"
      aria-labelledby="repair-title"
    >
      <h1 id="repair-title" ref={headingRef} tabIndex={-1}>한 면 수리대</h1>
      <p className="repair-intro">면 선택 → 이동할 빈 칸 선택 → 미리보기 → 확인 순서로 진행합니다.</p>
      <p className="repair-status" role="status" aria-live="polite">{status}</p>

      <div className="repair-panel">
        <h2>원본 전개도</h2>
        <div className="repair-net-comparison">
          <div>
            <h3>원본</h3>
            <NetGrid
              net={decorationPreviewNet}
              mode="select-move-target"
              selectedFaceId={selectedFaceId}
              onFaceSelect={chooseFace}
              label="원본 전개도에서 수리할 면 선택"
            />
          </div>
          {candidateNet !== null && (
            <div>
              <h3>수리 후보 미리보기</h3>
              <NetGrid net={candidateNet} mode="inspect" label="수리 후보 전개도 미리보기" />
            </div>
          )}
        </div>
        <p className="repair-hint">색뿐 아니라 면 번호와 무늬를 함께 살펴보세요.</p>
      </div>

      <div className="repair-panel">
        <h2>이동할 빈 칸</h2>
        {selectedFaceId === null ? (
          <p>면을 먼저 선택하세요.</p>
        ) : targets.length === 0 ? (
          <p>연결을 유지하는 빈 칸이 없습니다.</p>
        ) : (
          <RepairTargetGrid
            net={decorationPreviewNet}
            targets={targets}
            selectedTarget={target}
            onTargetSelect={chooseTarget}
            label="이동 후보 빈 칸 격자"
          />
        )}
      </div>

      {selectedFaceId !== null && (
        <button type="button" className="repair-rotate-button" onClick={rotate}>
          {faceNumber(repairNet.faces.find((face) => face.id === selectedFaceId)!)}번 장식만 한 번 돌리기
        </button>
      )}

      {evaluation !== null && selectedFaceId !== null && target !== null && (
        <div className="repair-preview" aria-live="polite">
          <h2>수리 미리보기</h2>
          <dl className="repair-coordinate-list">
            <div><dt>선택한 면</dt><dd>{faceNumber(repairNet.faces.find((face) => face.id === selectedFaceId)!)}번</dd></div>
            <div><dt>원본 위치</dt><dd>{pointText(repairNet.faces.find((face) => face.id === selectedFaceId)!.grid)}</dd></div>
            <div><dt>현재 위치</dt><dd>{pointText(target)}</dd></div>
            <div><dt>바뀐 면</dt><dd>{evaluation.changedFaceIds.length === 0 ? '없음' : evaluation.changedFaceIds.join(', ')}</dd></div>
          </dl>
          <p className={evaluation.accepted ? 'repair-valid-reason' : 'repair-invalid-reason'}>
            {reasonText(evaluation)}
          </p>
          {callbackError && <p className="field-error" role="alert">수리 기록을 저장하지 못했습니다.</p>}
          <button type="button" className="repair-confirm-button" onClick={confirm}>
            수리 확인
          </button>
        </div>
      )}
    </section>
  );
}

export function RepairScreen(props: RepairScreenProps): React.JSX.Element {
  const repairNet = props.originalNet ?? props.mission.net;
  const netKey = repairNet.faces
    .map((face) => `${face.id}:${face.grid.x},${face.grid.y}:${face.decorationQuarterTurn}`)
    .join('|');
  return <RepairScreenContent key={netKey} {...props} repairNet={repairNet} />;
}
