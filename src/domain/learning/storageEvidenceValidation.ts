import { evaluateDiagnosis } from './diagnosis';
import { evaluateEvidenceSubmission, expectedEvidenceSentence } from './evidence';
import { evaluateRepair } from './repair';
import type {
  MissionDefinition,
  PersistedLearningAttempts,
  PredictionRecord,
} from './types';

const repairMatchesMission = (
  mission: MissionDefinition,
  repair: PersistedLearningAttempts['repairs'][number],
  baseFaceId: PredictionRecord['baseFaceId'],
): boolean => {
  try {
    const evaluation = evaluateRepair(mission.net, repair.candidate, baseFaceId);
    const changed = evaluation.isSingleFaceMove && evaluation.changedFaceIds.length === 1
      && evaluation.changedFaceIds[0] === repair.faceId;
    const face = repair.candidate.faces.find((item) => item.id === repair.faceId);
    return changed && face !== undefined && face.grid.x === repair.target.x
      && face.grid.y === repair.target.y && repair.accepted === evaluation.accepted;
  } catch {
    return false;
  }
};

/** Validates each sentence against the diagnosis/repair attempt it references. */
export const evidenceAttemptsAreValid = (
  mission: MissionDefinition,
  prediction: PredictionRecord,
  attempts: PersistedLearningAttempts,
): boolean => attempts.evidence.every((persistedEvidence) => {
  const diagnosisRequired = mission.kind !== 'opposite';
  const repairRequired = mission.kind === 'collision' || mission.kind === 'repair';
  const diagnosisIndexValid = persistedEvidence.diagnosisAttemptIndex !== undefined
    && persistedEvidence.diagnosisAttemptIndex < attempts.diagnoses.length;
  const repairIndexValid = persistedEvidence.repairAttemptIndex !== undefined
    && persistedEvidence.repairAttemptIndex < attempts.repairs.length;
  if (diagnosisRequired !== diagnosisIndexValid || repairRequired !== repairIndexValid
    || (!diagnosisRequired && persistedEvidence.diagnosisAttemptIndex !== undefined)
    || (!repairRequired && persistedEvidence.repairAttemptIndex !== undefined)) return false;
  const diagnosis = persistedEvidence.diagnosisAttemptIndex === undefined
    ? null : attempts.diagnoses[persistedEvidence.diagnosisAttemptIndex] ?? null;
  const repair = persistedEvidence.repairAttemptIndex === undefined
    ? null : attempts.repairs[persistedEvidence.repairAttemptIndex] ?? null;
  const evidence = {
    ...(persistedEvidence.oppositePair === undefined ? {} : { oppositePair: persistedEvidence.oppositePair }),
    selectedTerms: persistedEvidence.selectedTerms,
    completedSentence: '',
  };
  const evaluation = evaluateEvidenceSubmission(mission, evidence, {
    baseFaceId: prediction.baseFaceId, diagnosis, repair,
  });
  const contextIsAppropriate = mission.kind === 'opposite'
    ? diagnosis === null && repair === null
    : diagnosis !== null && evaluateDiagnosis(mission, diagnosis, prediction.baseFaceId).isCorrect
      && ((mission.kind !== 'collision' && mission.kind !== 'repair')
        || (repair !== null && repair.accepted && repairMatchesMission(mission, repair, prediction.baseFaceId)));
  const termsAreStructured = evidence.selectedTerms.length === 2
    && new Set(evidence.selectedTerms).size === 2
    && evidence.selectedTerms.every((term) => mission.targetVocabulary.includes(term));
  return expectedEvidenceSentence(mission, evidence, evaluation.context) !== null
    && termsAreStructured && evaluation.pairMatches && contextIsAppropriate;
});
