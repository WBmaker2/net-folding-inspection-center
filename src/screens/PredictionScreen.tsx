import { useMemo, useState } from 'react';
import { NetGrid } from '../components/net2d/NetGrid';
import { faceNumber } from '../components/net2d/FaceTile';
import { useFocusHeading } from '../hooks/useFocusHeading';
import '../styles/net2d.css';
import type { MissionDefinition } from '../domain/learning/types';
import type { FaceId, FoldDirection, PredictionRecord } from '../domain/net/types';

export interface PredictionScreenProps {
  readonly mission: MissionDefinition;
  readonly onSubmit: (prediction: PredictionRecord) => void;
}

const directions: readonly { value: FoldDirection; label: string; glyph: string }[] = [
  { value: 'north', label: '북쪽', glyph: '↑' },
  { value: 'east', label: '동쪽', glyph: '→' },
  { value: 'south', label: '남쪽', glyph: '↓' },
  { value: 'west', label: '서쪽', glyph: '←' },
];

const faceIdsExcept = (mission: MissionDefinition, baseFaceId: FaceId | null): readonly FaceId[] => (
  mission.net.faces
    .map((face) => face.id)
    .filter((faceId) => faceId !== (baseFaceId ?? mission.baseFaceId))
);

export function PredictionScreen({ mission, onSubmit }: PredictionScreenProps): React.JSX.Element {
  const headingRef = useFocusHeading<HTMLHeadingElement>();
  const [baseFaceId, setBaseFaceId] = useState<FaceId | null>(null);
  const [predictedTopFaceId, setPredictedTopFaceId] = useState<FaceId | null>(null);
  const [foldOrder, setFoldOrder] = useState<FaceId[]>([]);
  const [arrowByFace, setArrowByFace] = useState<Partial<Record<FaceId, FoldDirection>>>({});
  const [submitted, setSubmitted] = useState(false);

  const movingFaceIds = useMemo(
    () => faceIdsExcept(mission, baseFaceId),
    [mission, baseFaceId],
  );
  const faceById = useMemo(
    () => new Map(mission.net.faces.map((face) => [face.id, face] as const)),
    [mission.net.faces],
  );
  const isComplete = baseFaceId !== null
    && predictedTopFaceId !== null
    && foldOrder.length === 5
    && new Set(foldOrder).size === 5
    && movingFaceIds.every((faceId) => foldOrder.includes(faceId) && arrowByFace[faceId] !== undefined);

  const selectBase = (faceId: FaceId): void => {
    setBaseFaceId(faceId);
    setPredictedTopFaceId(null);
    setFoldOrder([]);
    setArrowByFace({});
    setSubmitted(false);
  };

  const selectTop = (faceId: FaceId): void => {
    if (faceId !== baseFaceId) setPredictedTopFaceId(faceId);
  };

  const addFaceToOrder = (faceId: FaceId): void => {
    if (baseFaceId === null || faceId === baseFaceId || foldOrder.includes(faceId)) return;
    setFoldOrder((previous) => previous.length >= 5 ? previous : [...previous, faceId]);
    setSubmitted(false);
  };

  const removeFaceFromOrder = (faceId: FaceId): void => {
    setFoldOrder((previous) => previous.filter((candidate) => candidate !== faceId));
    setArrowByFace((previous) => {
      const next = { ...previous };
      delete next[faceId];
      return next;
    });
    setSubmitted(false);
  };

  const setDirection = (faceId: FaceId, direction: FoldDirection): void => {
    setArrowByFace((previous) => ({ ...previous, [faceId]: direction }));
    setSubmitted(false);
  };

  const submit = (): void => {
    if (!isComplete || baseFaceId === null || predictedTopFaceId === null) return;
    const prediction: PredictionRecord = {
      baseFaceId,
      predictedTopFaceId,
      foldOrder: [...foldOrder],
      arrowByFace: Object.fromEntries(
        movingFaceIds.map((faceId) => [faceId, arrowByFace[faceId]]),
      ) as PredictionRecord['arrowByFace'],
      submittedAtIso: new Date().toISOString(),
    };
    setSubmitted(true);
    onSubmit(prediction);
  };

  return (
    <section className="prediction-screen" aria-labelledby="prediction-title">
      <p className="eyebrow">예측 · 공간 추론</p>
      <h1 id="prediction-title" ref={headingRef} tabIndex={-1}>예측판</h1>
      <p className="prediction-question">{mission.question}</p>
      <p className="model-note">
        접기는 실제 종이의 두께나 탄성을 재현하지 않는 기하 모형입니다.
      </p>

      <section className="prediction-step" aria-labelledby="base-title">
        <h2 id="base-title">1. 기준면을 골라 보세요</h2>
        <NetGrid
          net={mission.net}
          mode="select-base"
          selectedFaceId={baseFaceId}
          onFaceSelect={selectBase}
          label="기준면 선택 전개도"
        />
        <p className="selection-summary" aria-live="polite">
          기준면: {baseFaceId === null ? '아직 선택하지 않음' : `${faceNumber(faceById.get(baseFaceId)!)}번 면`}
        </p>
      </section>

      <section className="prediction-step" aria-labelledby="top-title">
        <h2 id="top-title">2. 예상 윗면을 골라 보세요</h2>
        <NetGrid
          net={mission.net}
          mode="select-move-target"
          selectedFaceId={predictedTopFaceId}
          onFaceSelect={selectTop}
          label="예상 윗면 선택 전개도"
        />
        <p className="selection-summary" aria-live="polite">
          예상 윗면: {predictedTopFaceId === null ? '아직 선택하지 않음' : `${faceNumber(faceById.get(predictedTopFaceId)!)}번 면`}
        </p>
      </section>

      <section className="prediction-step" aria-labelledby="order-title">
        <h2 id="order-title">3. 다섯 면이 접히는 순서를 정해 보세요</h2>
        <div className="face-order-options" aria-label="접는 순서에 넣을 면">
          {movingFaceIds.map((faceId) => {
            const number = faceNumber(faceById.get(faceId)!);
            const included = foldOrder.includes(faceId);
            return (
              <button
                type="button"
                key={faceId}
                className="order-face-button"
                disabled={baseFaceId === null || included || foldOrder.length >= 5}
                onClick={() => addFaceToOrder(faceId)}
              >
                {included ? `${number}번 면 순서에 들어 있음` : `접는 순서에 ${number}번 면 추가`}
              </button>
            );
          })}
        </div>
        <ol className="prediction-order-list" aria-label="예측한 접는 순서">
          {foldOrder.map((faceId, index) => {
            const number = faceNumber(faceById.get(faceId)!);
            return (
              <li key={faceId}>
                <span>{index + 1}번째: {number}번 면</span>
                <button type="button" onClick={() => removeFaceFromOrder(faceId)}>
                  {number}번 면 순서에서 빼기
                </button>
              </li>
            );
          })}
        </ol>
        {foldOrder.length !== 5 && (
          <p className="field-error" role="alert">기준면을 제외한 면 5개를 순서대로 넣어 주세요.</p>
        )}
      </section>

      <section className="prediction-step" aria-labelledby="direction-title">
        <h2 id="direction-title">4. 각 면의 유효한 접는 방향을 표시해 보세요</h2>
        {foldOrder.length === 0 && (
          <p className="field-help">순서에 면을 넣으면 북쪽·동쪽·남쪽·서쪽 방향을 고를 수 있습니다.</p>
        )}
        <div className="direction-list">
          {foldOrder.map((faceId) => {
            const number = faceNumber(faceById.get(faceId)!);
            return (
              <fieldset key={faceId} className="direction-fieldset">
                <legend>{number}번 면의 접는 방향</legend>
                <div className="direction-options">
                  {directions.map((direction) => (
                    <button
                      type="button"
                      key={direction.value}
                      className={arrowByFace[faceId] === direction.value ? 'is-selected' : undefined}
                      aria-pressed={arrowByFace[faceId] === direction.value}
                      data-fold-direction={direction.value}
                      onClick={() => setDirection(faceId, direction.value)}
                    >
                      {number}번 면의 {direction.label} 방향 {direction.glyph}
                    </button>
                  ))}
                </div>
                {arrowByFace[faceId] === undefined && (
                  <p className="field-error" role="alert">{number}번 면의 접는 방향을 골라 주세요.</p>
                )}
              </fieldset>
            );
          })}
        </div>
      </section>

      <p className="field-error" role="alert" hidden={!submitted}>
        예측을 기록했습니다. 이제 접기실에서 한 면씩 확인해 보세요.
      </p>
      <button
        type="button"
        className="prediction-submit"
        disabled={!isComplete}
        onClick={submit}
      >
        예측을 남기고 접기실로
      </button>
    </section>
  );
}
