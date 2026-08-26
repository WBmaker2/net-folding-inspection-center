import type {
  EvidenceAttempt,
  LearningState,
  PredictionAttempt,
  RepairSubmission,
} from './types';

const freezeArray = <T>(items: readonly T[]): readonly T[] => Object.freeze([...items]);

const freezePrediction = (prediction: PredictionAttempt): PredictionAttempt => Object.freeze({
  ...prediction,
  foldOrder: freezeArray(prediction.foldOrder),
  arrowByFace: Object.freeze({ ...prediction.arrowByFace }),
});

const freezeDiagnosis = (diagnosis: LearningState['diagnosis']): LearningState['diagnosis'] => (
  diagnosis === null ? null : Object.freeze({
    ...diagnosis,
    selectedFaceIds: freezeArray(diagnosis.selectedFaceIds),
  })
);

const freezeRepair = (repair: RepairSubmission | null): RepairSubmission | null => (
  repair === null ? null : Object.freeze({
    ...repair,
    target: Object.freeze({ ...repair.target }),
    candidate: Object.freeze({
      faces: freezeArray(repair.candidate.faces.map((face) => Object.freeze({
        ...face,
        grid: Object.freeze({ ...face.grid }),
      }))),
    }),
  })
);

const freezeEvidence = <T extends LearningState['evidence'] | EvidenceAttempt>(
  evidence: T,
): T => {
  if (evidence === null) return null as T;
  return Object.freeze({
    ...evidence,
    ...(evidence.oppositePair === undefined ? {} : {
      oppositePair: Object.freeze({ ...evidence.oppositePair }),
    }),
    selectedTerms: freezeArray(evidence.selectedTerms),
  }) as unknown as T;
};

/** Clones and recursively freezes every restored branch before it reaches React. */
export const freezeRestoredState = (state: LearningState): LearningState => Object.freeze({
  ...state,
  prediction: state.prediction === null ? null : freezePrediction(state.prediction),
  diagnosis: freezeDiagnosis(state.diagnosis),
  repair: freezeRepair(state.repair),
  evidence: freezeEvidence(state.evidence),
  attempts: Object.freeze({
    predictions: freezeArray(state.attempts.predictions.map(freezePrediction)),
    diagnoses: freezeArray(state.attempts.diagnoses.map((diagnosis) => freezeDiagnosis(diagnosis)!)),
    repairs: freezeArray(state.attempts.repairs.map(freezeRepair) as RepairSubmission[]),
    evidence: freezeArray(state.attempts.evidence.map((evidence) => freezeEvidence(evidence))),
  }),
  completedMissionIds: freezeArray(state.completedMissionIds),
});
