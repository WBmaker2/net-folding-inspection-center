import type { FaceDefinition, FaceId } from '../../domain/net/types';

export const colorLabels: Readonly<Record<FaceDefinition['colorToken'], string>> = {
  blue: '파란색',
  yellow: '노란색',
  green: '초록색',
  coral: '산호색',
  purple: '보라색',
  teal: '청록색',
};

export const symbolLabels: Readonly<Record<FaceDefinition['symbol'], string>> = {
  circle: '원형',
  square: '사각형',
  triangle: '삼각형',
  star: '별',
  diamond: '마름모',
  cross: '십자',
};

export const faceNumber = (face: FaceDefinition): number => Number(face.id.slice(1));

/** Internal FaceId values stay in the domain; learners see a numbered face. */
export const faceIdLabel = (faceId: FaceId): string => `${Number(faceId.slice(1))}번 면`;

export const faceAccessibleName = (face: FaceDefinition, positionLabel?: string): string => (
  `${faceNumber(face)}번 면, ${colorLabels[face.colorToken]}, ${symbolLabels[face.symbol]}${
    positionLabel === undefined ? '' : `, ${positionLabel}`
  }`
);
