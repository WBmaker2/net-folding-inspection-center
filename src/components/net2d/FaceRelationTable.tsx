import { getOppositePairs } from '../../domain/net/foldEngine';
import type { FaceFrame, FaceId } from '../../domain/net/types';

export interface FaceRelationTableProps {
  readonly frames: ReadonlyMap<FaceId, FaceFrame>;
  readonly baseFaceId: FaceId;
  readonly settledFaceIds?: readonly FaceId[];
  readonly finalFrames?: ReadonlyMap<FaceId, FaceFrame>;
  readonly singleFaceMode?: boolean;
  readonly movingFaceId?: FaceId;
  readonly hingeFaceId?: FaceId;
  readonly basePinned?: boolean;
}

const faceNumber = (faceId: FaceId): string => `${Number(faceId.slice(1))}번 면`;
const normalLabels: Readonly<Record<string, string>> = {
  '1,0,0': '오른쪽 면', '-1,0,0': '왼쪽 면',
  '0,1,0': '아래쪽 면', '0,-1,0': '위쪽 면',
  '0,0,1': '기준면', '0,0,-1': '맞은편 면',
};

const frameDirection = (frame: FaceFrame | undefined): string => (
  frame === undefined ? '아직 접지 않음' : normalLabels[frame.normal.join(',')] ?? '방향 확인 중'
);

export function FaceRelationTable({
  frames,
  baseFaceId,
  settledFaceIds,
  finalFrames = frames,
  singleFaceMode = false,
  movingFaceId,
  hingeFaceId,
  basePinned = true,
}: FaceRelationTableProps): React.JSX.Element {
  const settled = settledFaceIds === undefined
    ? new Set(frames.keys())
    : new Set(settledFaceIds);
  const final = settledFaceIds === undefined || settled.size === finalFrames.size;
  const faceIds = [...finalFrames.keys()].sort((left, right) => Number(left.slice(1)) - Number(right.slice(1)));
  const opposites = final ? getOppositePairs(finalFrames) : [];
  const oppositeByFace = new Map<FaceId, FaceId>();
  opposites.forEach(({ a, b }) => {
    oppositeByFace.set(a, b);
    oppositeByFace.set(b, a);
  });

  return (
    <table className="face-relation-table" aria-label="완성된 면 관계">
      <caption>완성된 면 관계</caption>
      <thead>
        <tr><th scope="col">면</th><th scope="col">현재 상태</th><th scope="col">최종 방향</th><th scope="col">맞은편</th></tr>
      </thead>
      <tbody>
        {faceIds.map((faceId) => {
          const isSettled = settled.has(faceId);
          const isFocus = singleFaceMode && (faceId === movingFaceId || faceId === hingeFaceId);
          const rowClass = [
            faceId === baseFaceId && basePinned ? 'is-base' : '',
            isFocus ? 'is-focused' : '',
            isSettled ? 'is-settled' : 'is-unsettled',
          ].filter(Boolean).join(' ');
          const direction = isSettled ? frameDirection(frames.get(faceId)) : '아직 접지 않음';
          const opposite = final ? oppositeByFace.get(faceId) : undefined;
          return (
            <tr className={rowClass} key={faceId} data-face-id={faceId}>
              <th scope="row">{faceNumber(faceId)}</th>
              <td>{isSettled ? (faceId === baseFaceId ? '기준면 고정' : '접힘 확인') : '아직 접지 않음'}</td>
              <td>{direction}</td>
              <td>{opposite === undefined ? '아직 접지 않음' : faceNumber(opposite)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
