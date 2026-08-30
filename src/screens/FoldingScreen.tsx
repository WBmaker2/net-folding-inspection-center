import { useMemo, useState } from 'react';
import { createFoldSequence, getFoldSnapshot } from '../domain/net/foldEngine';
import type { CubeValidationResult } from '../domain/net/validateCubeNet';
import type { MissionDefinition } from '../domain/learning/types';
import type { PredictionRecord } from '../domain/net/types';
import { LiveRegion } from '../components/common/LiveRegion';
import { FaceRelationTable } from '../components/net2d/FaceRelationTable';
import { describeFoldSnapshot } from '../components/net2d/FoldStateDescription';
import { CubeFoldViewer } from '../components/net3d/CubeFoldViewer';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useFocusHeading } from '../hooks/useFocusHeading';
import { PrimaryAction } from '../components/common/PrimaryAction';
import type { CriticalActionId } from '../domain/learning/types';
import '../styles/net2d.css';

export interface FoldingScreenProps {
  readonly mission: MissionDefinition;
  readonly prediction: PredictionRecord;
  /** 접기 권위가 아닌 별도 검수 결과를 받는 확장 지점입니다. */
  readonly validation?: CubeValidationResult;
  readonly initialStepIndex?: number;
  readonly onStepChange?: (stepIndex: number) => void;
  readonly onComplete?: () => void;
  readonly onContinue?: () => void;
  readonly onReturnToPrediction?: () => void;
  readonly criticalActionId?: CriticalActionId;
}

const clampStep = (value: number): number => Math.max(0, Math.min(5, Math.trunc(value)));

type SequenceResult =
  | { readonly sequence: ReturnType<typeof createFoldSequence> }
  | { readonly error: string };

export function FoldingScreen({
  mission,
  prediction,
  validation,
  initialStepIndex = 0,
  onStepChange,
  onComplete,
  onContinue,
  onReturnToPrediction,
  criticalActionId,
}: FoldingScreenProps): React.JSX.Element {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const reducedMotion = usePrefersReducedMotion();
  const [stepIndex, setStepIndex] = useState(() => clampStep(initialStepIndex));
  const [singleFaceMode, setSingleFaceMode] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const sequenceResult: SequenceResult = useMemo(() => {
    try {
      return { sequence: createFoldSequence(mission.net, prediction.baseFaceId, prediction.foldOrder) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : '접는 순서를 읽을 수 없습니다.' };
    }
  }, [mission.net, prediction.baseFaceId, prediction.foldOrder]);

  const setFoldStep = (requestedStep: number): void => {
    if (!('sequence' in sequenceResult)) return;
    const nextStep = clampStep(requestedStep);
    if (nextStep === stepIndex) return;
    setStepIndex(nextStep);
    setLiveMessage(describeFoldSnapshot(
      getFoldSnapshot(sequenceResult.sequence, nextStep),
      nextStep === 0 ? undefined : sequenceResult.sequence.steps[nextStep - 1],
    ));
    onStepChange?.(nextStep);
    if (nextStep === 5) {
      onComplete?.();
      onContinue?.();
    }
  };

  const resetFold = (): void => setFoldStep(0);

  if (!('sequence' in sequenceResult)) {
    return (
      <section
        className="folding-screen"
        aria-labelledby="folding-title"
        aria-describedby="folding-model-boundary"
      >
        <p className="eyebrow">접기실 · 3D 보조 보기와 관계 표</p>
        <h1 id="folding-title" ref={headingRef} tabIndex={-1}>한 면씩 접기</h1>
        <p className="field-error" role="alert">이 예측한 순서로는 접기 단계를 만들 수 없습니다.</p>
        <PrimaryAction
          actionId="return-to-prediction"
          criticalActionId={criticalActionId}
          onClick={onReturnToPrediction}
        >
          예측판으로 돌아가 다시 고르기
        </PrimaryAction>
        <p className="model-note" id="folding-model-boundary">
          이 가상 접기는 면의 연결 관계를 보여 주는 기하 모형이며 실제 종이의 두께·휘어짐·포장 강도·안전성을 보장하지 않습니다.
        </p>
      </section>
    );
  }

  const { sequence } = sequenceResult;
  const snapshot = getFoldSnapshot(sequence, Math.min(stepIndex, sequence.snapshots.length - 1));
  const currentStep = stepIndex === 0 ? undefined : sequence.steps[stepIndex - 1];
  const movingFaceId = currentStep?.movingFaceId;
  const hingeFaceId = currentStep?.hingeFaceId;

  return (
    <section
      className={`folding-screen ${reducedMotion ? 'is-reduced-motion' : 'is-motion-enabled'}`}
      aria-labelledby="folding-title"
      aria-describedby="folding-model-boundary"
      data-motion-mode={reducedMotion ? 'instant' : 'smooth'}
      data-validation-reason={validation?.reason ?? 'not-provided'}
    >
      <p className="eyebrow">접기실 · 3D 보조 보기와 관계 표</p>
      <h1 id="folding-title" ref={headingRef} tabIndex={-1}>한 면씩 접기</h1>
      <p className="folding-intro">예측한 접는 순서를 따라 면과 모서리의 관계를 확인해 보세요.</p>
      <p className="folding-view-help">3D 보조 보기에서는 모양을 보고, 관계 표에서는 면 이름과 방향을 확인해 보세요.</p>
      <p className="model-note" id="folding-model-boundary">
        이 가상 접기는 면의 연결 관계를 보여 주는 기하 모형이며 실제 종이의 두께·휘어짐·포장 강도·안전성을 보장하지 않습니다.
      </p>

      <div className="fold-control-card" role="group" aria-label="접기 조작" aria-describedby="folding-model-boundary">
        <div className="fold-control-header">
          <p className="fold-control-kicker">지금 확인할 것</p>
          <div className="folding-state" aria-label="접기 상태" aria-describedby="folding-model-boundary">
            <strong>{stepIndex} / 5면 접힘</strong>
            <LiveRegion>{liveMessage}</LiveRegion>
          </div>
          <p className="fold-control-help">막대를 움직이거나 버튼을 눌러 한 면씩 이동하며, 표에서 관계를 확인해 보세요.</p>
        </div>

        <div className="folding-controls" aria-label="접기 단계 조절" aria-describedby="folding-model-boundary">
          <button type="button" onClick={() => setFoldStep(stepIndex - 1)} disabled={stepIndex === 0}>
            이전 접기
          </button>
          <label htmlFor="fold-step-range">접기 단계</label>
          <input
            id="fold-step-range"
            type="range"
            min="0"
            max="5"
            step="1"
            value={stepIndex}
            onChange={(event) => setFoldStep(Number(event.target.value))}
            aria-describedby="folding-model-boundary"
          />
          <button
            type="button"
            onClick={resetFold}
            disabled={stepIndex === 0}
          >
            처음부터 다시 보기
          </button>
          <PrimaryAction
            actionId="next-fold"
            criticalActionId={criticalActionId}
            onClick={() => setFoldStep(stepIndex + 1)}
            disabled={stepIndex === 5}
          >
            다음 면 접기
          </PrimaryAction>
        </div>

        <div className="folding-options" aria-label="관계 보기 옵션">
          <label>
            <input
              type="checkbox"
              checked={singleFaceMode}
              onChange={(event) => setSingleFaceMode(event.target.checked)}
            />
            한 면씩 보기
          </label>
        </div>
      </div>

      <div className="learning-board">
        <CubeFoldViewer
          snapshot={snapshot}
          net={mission.net}
          view="front"
          reducedMotion={reducedMotion}
          singleFaceMode={singleFaceMode}
          baseFaceId={prediction.baseFaceId}
          movingFaceId={movingFaceId}
          hingeFaceId={hingeFaceId}
        />

        <FaceRelationTable
          frames={snapshot.frames}
          finalFrames={sequence.frames}
          settledFaceIds={snapshot.settledFaceIds}
          baseFaceId={prediction.baseFaceId}
          singleFaceMode={singleFaceMode}
          movingFaceId={movingFaceId}
          hingeFaceId={hingeFaceId}
          basePinned
        />
      </div>
    </section>
  );
}
