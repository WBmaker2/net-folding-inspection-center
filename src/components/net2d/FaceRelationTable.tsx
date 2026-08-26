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

const oppositeNormalKey = (frame: FaceFrame): string => (
  `${-frame.normal[0]},${-frame.normal[1]},${-frame.normal[2]}`
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
  const final = settledFaceIds === undefined || settledFaceIds.length >= finalFrames.size;
  const faceIds = [...finalFrames.keys()].sort((left, right) => Number(left.slice(1)) - Number(right.slice(1)));
  const normalBuckets = new Map<string, FaceId[]>();
  for (const [faceId, frame] of frames) {
    const bucket = normalBuckets.get(frame.normal.join(',')) ?? [];
    bucket.push(faceId);
    normalBuckets.set(frame.normal.join(','), bucket);
  }

  return (
    <table className="face-relation-table" aria-label="완성된 면 관계">
      <caption>완성된 면 관계</caption>
      <thead>
        <tr><th scope="col">면</th><th scope="col">현재 상태</th><th scope="col">최종 방향</th><th scope="col">맞은편</th></tr>
      </thead>
      <tbody>
        {faceIds.map((faceId) => {
          const frame = frames.get(faceId);
          const isSettled = frame !== undefined;
          const isFocus = singleFaceMode && (faceId === movingFaceId || faceId === hingeFaceId);
          const rowClass = [
            faceId === baseFaceId && basePinned ? 'is-base' : '',
            isFocus ? 'is-focused' : '',
            isSettled ? 'is-settled' : 'is-unsettled',
          ].filter(Boolean).join(' ');
          const ownBucket = frame === undefined ? [] : normalBuckets.get(frame.normal.join(',')) ?? [];
          const oppositeBucket = frame === undefined ? [] : normalBuckets.get(oppositeNormalKey(frame)) ?? [];
          const hasDuplicateNormal = ownBucket.length > 1 || oppositeBucket.length > 1;
          const direction = isSettled
            ? (hasDuplicateNormal ? '겹침 확인 필요' : frameDirection(frame))
            : '아직 접지 않음';
          const relation = !isSettled
            ? '아직 접지 않음'
            : hasDuplicateNormal
              ? '겹침 확인 필요'
              : oppositeBucket.length === 0
                ? (final ? '맞은편 관계 없음' : '아직 확인되지 않음')
                : faceNumber(oppositeBucket[0]!);
          return (
            <tr className={rowClass} key={faceId} data-face-id={faceId}>
              <th scope="row">{faceNumber(faceId)}</th>
              <td>{isSettled ? (faceId === baseFaceId ? '기준면 고정' : '접힘 확인') : '아직 접지 않음'}</td>
              <td>{direction}</td>
              <td>{relation}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
