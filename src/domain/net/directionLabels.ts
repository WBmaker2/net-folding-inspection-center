import type { AxisDirection } from './types';

/** Learner-facing names for the renderer-neutral cube directions. */
export const axisLabel = (direction: AxisDirection): string => ({
  '+x': '오른쪽',
  '-x': '왼쪽',
  '+y': '위',
  '-y': '아래',
  '+z': '앞',
  '-z': '뒤',
}[direction]);

export const directionLabel = (direction: AxisDirection | undefined): string => (
  direction === undefined ? '확인할 수 없음' : `${axisLabel(direction)} 방향`
);
