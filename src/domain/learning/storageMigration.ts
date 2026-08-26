import { getMissionById } from '../../content/missions/catalog';
import { evidenceAttemptsAreValid } from './storageEvidenceValidation';
import {
  sanitizePersistedProgress,
  sanitizePersistedProgressV1,
} from './storageValidation';
import type {
  PersistedEvidenceSubmission,
  PersistedLearningAttempts,
  PersistedProgress,
  PersistedProgressV1,
} from './types';

type LegacyEvidence = PersistedProgressV1['attempts']['evidence'][number];

const sameStructuredEvidence = (
  left: LegacyEvidence | PersistedEvidenceSubmission,
  right: LegacyEvidence | PersistedEvidenceSubmission,
): boolean => (
  JSON.stringify({
    oppositePair: left.oppositePair,
    selectedTerms: left.selectedTerms,
  }) === JSON.stringify({
    oppositePair: right.oppositePair,
    selectedTerms: right.selectedTerms,
  })
);

const candidateEvidenceContexts = (
  progress: PersistedProgressV1,
  evidence: LegacyEvidence,
): PersistedEvidenceSubmission[] => {
  if (progress.missionId === null || progress.prediction === null) return [];
  const mission = getMissionById(progress.missionId);
  const diagnosisIndices: readonly (number | undefined)[] = mission.kind === 'opposite'
    ? [undefined]
    : progress.attempts.diagnoses.map((_item, index) => index);
  const repairIndices: readonly (number | undefined)[] = (
    mission.kind === 'collision' || mission.kind === 'repair'
  )
    ? progress.attempts.repairs.map((_item, index) => index)
    : [undefined];
  const candidates: PersistedEvidenceSubmission[] = [];
  for (const diagnosisAttemptIndex of diagnosisIndices) {
    for (const repairAttemptIndex of repairIndices) {
      const candidate: PersistedEvidenceSubmission = {
        ...(evidence.oppositePair === undefined ? {} : { oppositePair: evidence.oppositePair }),
        selectedTerms: [...evidence.selectedTerms],
        ...(diagnosisAttemptIndex === undefined ? {} : { diagnosisAttemptIndex }),
        ...(repairAttemptIndex === undefined ? {} : { repairAttemptIndex }),
      };
      const attempts: PersistedLearningAttempts = {
        ...progress.attempts,
        evidence: [candidate],
      };
      if (evidenceAttemptsAreValid(mission, progress.prediction, attempts)) {
        candidates.push(candidate);
      }
    }
  }
  return candidates;
};

const migrateEvidence = (
  progress: PersistedProgressV1,
  evidence: LegacyEvidence,
): PersistedEvidenceSubmission | null => {
  const candidates = candidateEvidenceContexts(progress, evidence);
  return candidates.length === 1 ? candidates[0] as PersistedEvidenceSubmission : null;
};

/** Migrates the exact v1 payload without retaining learner-entered sentence text. */
export const migratePersistedProgressV1 = (
  progress: PersistedProgressV1,
): PersistedProgress | null => {
  const migratedEvidence = progress.attempts.evidence.map((evidence) => (
    migrateEvidence(progress, evidence)
  ));
  if (migratedEvidence.some((evidence) => evidence === null)) return null;
  const evidenceAttempts = migratedEvidence as PersistedEvidenceSubmission[];
  const currentEvidence = progress.evidence === null
    ? null
    : (() => {
      const last = evidenceAttempts.at(-1);
      if (last !== undefined) {
        const lastLegacy = progress.attempts.evidence.at(-1);
        if (lastLegacy !== undefined && sameStructuredEvidence(progress.evidence!, lastLegacy)) {
          return last;
        }
      }
      return migrateEvidence(progress, progress.evidence!);
    })();
  if (progress.evidence !== null && currentEvidence === null) return null;
  const candidateProgress = {
    version: 2,
    missionId: progress.missionId,
    stage: progress.stage,
    prediction: progress.prediction,
    foldStepIndex: progress.foldStepIndex,
    diagnosis: progress.diagnosis,
    repair: progress.repair,
    evidence: currentEvidence,
    attempts: {
      predictions: progress.attempts.predictions,
      diagnoses: progress.attempts.diagnoses,
      repairs: progress.attempts.repairs,
      evidence: evidenceAttempts,
    },
    completedMissionIds: progress.completedMissionIds,
  };
  return sanitizePersistedProgress(candidateProgress);
};

/** Accepts current payloads and migrates only explicit historical version 1. */
export const migratePersistedProgress = (value: unknown): PersistedProgress | null => {
  if (typeof value !== 'object' || value === null) return null;
  const version = (value as { readonly version?: unknown }).version;
  if (version === 2) return sanitizePersistedProgress(value);
  if (version !== 1) return null;
  const legacy = sanitizePersistedProgressV1(value);
  return legacy === null ? null : migratePersistedProgressV1(legacy);
};
