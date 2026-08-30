import type { FaceId } from '../domain/net/types';
import { faceIdLabel } from '../components/net2d/faceLabels';

/** Converts catalog FaceId tokens to the language used by the learner UI. */
export const formatFaceReferences = (text: string): string => text.replace(
  /\bF([1-6])\b/gu,
  (_token, number: string) => `${number}번 면`,
);

export const formatFaceId = (faceId: FaceId): string => faceIdLabel(faceId);
