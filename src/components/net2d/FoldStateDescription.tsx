import type { FoldDirection, FoldSnapshot, FoldStep } from '../../domain/net/types';

const directionLabels: Readonly<Record<FoldDirection, string>> = {
  north: '위쪽',
  east: '오른쪽',
  south: '아래쪽',
  west: '왼쪽',
};

const faceNumber = (faceId: string): string => `${Number(faceId.slice(1))}번 면`;

const inferredDirection = (snapshot: FoldSnapshot): FoldDirection => {
  const movingFaceId = snapshot.settledFaceIds.at(-1);
  const frame = movingFaceId === undefined ? undefined : snapshot.frames.get(movingFaceId);
  if (frame?.normal[0] === 1) return 'east';
  if (frame?.normal[0] === -1) return 'west';
  if (frame?.normal[1] === 1) return 'south';
  return 'north';
};

export function describeFoldSnapshot(snapshot: FoldSnapshot, step?: FoldStep): string {
  if (snapshot.stepIndex === 0) return '접기 전 상태로 돌아왔습니다.';
  const movingFaceId = step?.movingFaceId ?? snapshot.settledFaceIds.at(-1);
  if (movingFaceId === undefined) return '접힌 면이 없습니다.';
  const hinge = step?.hingeFaceId;
  const hingeLabel = hinge === undefined || hinge === snapshot.settledFaceIds[0]
    ? '기준면'
    : faceNumber(hinge);
  const direction = step?.direction ?? inferredDirection(snapshot);
  return `${faceNumber(movingFaceId)}이 ${hingeLabel}의 ${directionLabels[direction]} 모서리를 따라 접혔습니다.`;
}
