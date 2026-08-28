import { getMissionById } from '../../content/missions/catalog';
import { evaluateDiagnosis, validationMatches } from './diagnosis';
import { evaluateRepair } from './repair';
import type { CubeValidationResult } from '../net/validateCubeNet';
import { validateCubeNet } from '../net/validateCubeNet';
import type { FaceId } from '../net/types';
import type { OppositePair } from '../net/foldEngine';
import type {
  DiagnosisSubmission,
  EvidenceSubmission,
  GeometryTerm,
  MissionDefinition,
  MissionId,
  RepairSubmission,
} from './types';

export interface EvidenceSentenceValues {
  readonly firstFace: FaceId;
  readonly secondFace?: FaceId;
  /** The path/cause term (the second select in the screen). */
  readonly term1: GeometryTerm;
  /** The relationship/outcome term (the first select in the screen). */
  readonly term2: GeometryTerm;
}

export interface EvidenceContextInput {
  readonly baseFaceId?: FaceId;
  /** The fold-result validation shown before repair; it is never trusted. */
  readonly validation?: CubeValidationResult;
  readonly diagnosis?: DiagnosisSubmission | null;
  readonly repair?: RepairSubmission | null;
}

export interface EvidenceContext {
  readonly baseFaceId: FaceId;
  readonly validation: CubeValidationResult;
  readonly pairCandidates: readonly OppositePair[];
  readonly collisionPair?: readonly [FaceId, FaceId];
  readonly repairFaceId?: FaceId;
  readonly firstFaceId?: FaceId;
  readonly secondFaceId?: FaceId;
  readonly prerequisitesCorrect: boolean;
}

export interface EvidenceEvaluation {
  readonly isCorrect: boolean;
  readonly sentenceMatches: boolean;
  readonly pairMatches: boolean;
  readonly termsMatch: boolean;
  readonly context: EvidenceContext;
}

const freezeArray = <T>(items: readonly T[]): readonly T[] => Object.freeze([...items]);

export const cloneEvidence = (evidence: EvidenceSubmission): EvidenceSubmission => Object.freeze({
  ...(evidence.oppositePair === undefined ? {} : {
    oppositePair: Object.freeze({ ...evidence.oppositePair }),
  }),
  selectedTerms: freezeArray(evidence.selectedTerms),
  completedSentence: evidence.completedSentence,
});

const isFaceId = (value: unknown): value is FaceId => (
  ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'].includes(value as FaceId)
);

/** Validates and canonicalizes a structured submission before reducer storage. */
export const normalizeEvidenceSubmission = (
  mission: MissionDefinition,
  value: unknown,
  input: EvidenceContextInput = {},
): EvidenceSubmission | null => {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<EvidenceSubmission>;
  if (!Array.isArray(candidate.selectedTerms) || candidate.selectedTerms.length !== 2
    || !candidate.selectedTerms.every((term) => GEOMETRY_TERMS.includes(term as GeometryTerm))
    || new Set(candidate.selectedTerms).size !== candidate.selectedTerms.length
    || typeof candidate.completedSentence !== 'string'
    || candidate.completedSentence.trim().length === 0) return null;
  if (candidate.oppositePair !== undefined
    && (typeof candidate.oppositePair !== 'object' || candidate.oppositePair === null
      || !isFaceId(candidate.oppositePair.a) || !isFaceId(candidate.oppositePair.b)
      || candidate.oppositePair.a === candidate.oppositePair.b)) return null;
  if (candidate.selectedTerms.some((term) => !mission.targetVocabulary.includes(term as GeometryTerm))) return null;
  if (mission.kind === 'collision' && candidate.oppositePair !== undefined) return null;
  if (mission.kind !== 'collision' && candidate.oppositePair === undefined) return null;
  const submission = candidate as EvidenceSubmission;
  const evaluation = evaluateEvidenceSubmission(mission, submission, input);
  const generated = expectedEvidenceSentence(mission, submission, evaluation.context);
  if (!evaluation.pairMatches || generated === null || generated !== submission.completedSentence) return null;
  return cloneEvidence(submission);
};

const GEOMETRY_TERMS: readonly GeometryTerm[] = [
  '맞은편', '모서리', '면', '접는 방향', '겹침', '빈 면',
];

/** Canonical order is [relationship/outcome term2, path/cause term1]. */
export const CANONICAL_EVIDENCE_TERMS: Readonly<Record<MissionId, readonly [GeometryTerm, GeometryTerm]>> = {
  'cube-track-01': ['맞은편', '접는 방향'],
  'cube-track-02': ['맞은편', '접는 방향'],
  'cube-opposite-01': ['맞은편', '접는 방향'],
  'cube-opposite-02': ['맞은편', '면'],
  'cube-collision-01': ['겹침', '면'],
  'cube-collision-02': ['겹침', '면'],
  'cube-repair-01': ['면', '겹침'],
  'cube-repair-02': ['맞은편', '겹침'],
};

export const canonicalEvidenceTermsFor = (
  mission: MissionDefinition,
): readonly [GeometryTerm, GeometryTerm] => CANONICAL_EVIDENCE_TERMS[mission.id];

export interface EvidenceTermOptions {
  readonly relationship: readonly GeometryTerm[];
  readonly path: readonly GeometryTerm[];
}

const EVIDENCE_ROLE_ALTERNATES: Readonly<Record<MissionId, readonly [GeometryTerm, GeometryTerm]>> = {
  'cube-track-01': ['면', '모서리'],
  'cube-track-02': ['면', '모서리'],
  'cube-opposite-01': ['면', '모서리'],
  'cube-opposite-02': ['면', '접는 방향'],
  'cube-collision-01': ['빈 면', '모서리'],
  'cube-collision-02': ['빈 면', '모서리'],
  'cube-repair-01': ['모서리', '빈 면'],
  'cube-repair-02': ['면', '모서리'],
};

/**
 * Keeps the two selects focused on their sentence role while retaining one
 * meaningful distractor for explanation practice.
 */
export const getEvidenceTermOptions = (
  mission: MissionDefinition,
): EvidenceTermOptions => {
  const [relationship, path] = canonicalEvidenceTermsFor(mission);
  const [relationshipAlternate, pathAlternate] = EVIDENCE_ROLE_ALTERNATES[mission.id];
  const optionsFor = (primary: GeometryTerm, alternate: GeometryTerm): readonly GeometryTerm[] => (
    Object.freeze([
      primary,
      ...(alternate !== primary && mission.targetVocabulary.includes(alternate) ? [alternate] : []),
    ])
  );
  return Object.freeze({
    relationship: optionsFor(relationship, relationshipAlternate),
    path: optionsFor(path, pathAlternate),
  });
};

type KoreanParticle = '과' | '와' | '이' | '가' | '을' | '를' | '은' | '는';

const TERM_PARTICLES: Readonly<Record<GeometryTerm, Readonly<Record<KoreanParticle, KoreanParticle>>>> = {
  '맞은편': { 과: '과', 와: '과', 이: '이', 가: '이', 을: '을', 를: '을', 은: '은', 는: '은' },
  '모서리': { 과: '와', 와: '와', 이: '가', 가: '가', 을: '를', 를: '를', 은: '는', 는: '는' },
  '면': { 과: '과', 와: '과', 이: '이', 가: '이', 을: '을', 를: '을', 은: '은', 는: '은' },
  '접는 방향': { 과: '과', 와: '과', 이: '이', 가: '이', 을: '을', 를: '을', 은: '은', 는: '은' },
  '겹침': { 과: '과', 와: '과', 이: '이', 가: '이', 을: '을', 를: '을', 은: '은', 는: '은' },
  '빈 면': { 과: '과', 와: '과', 이: '이', 가: '이', 을: '을', 를: '을', 은: '은', 는: '은' },
};

const applyKoreanParticles = (sentence: string): string => {
  let normalized = sentence;
  const terms = (Object.keys(TERM_PARTICLES) as GeometryTerm[]).sort((left, right) => right.length - left.length);
  for (const term of terms) {
    const replacements = TERM_PARTICLES[term];
    for (const particle of Object.keys(replacements) as KoreanParticle[]) {
      normalized = normalized
        .split(`${term}${particle}`)
        .join(`${term}${replacements[particle]}`);
    }
  }
  return normalized;
};

const faceText = (faceId: FaceId): string => `${Number(faceId.slice(1))}번 면`;
const samePair = (left: OppositePair, right: OppositePair): boolean => (
  (left.a === right.a && left.b === right.b)
  || (left.a === right.b && left.b === right.a)
);
const asPair = (pair: readonly [FaceId, FaceId]): OppositePair => ({
  a: pair[0], b: pair[1],
});
const pairHasFace = (pair: OppositePair, faceId: FaceId): boolean => (
  pair.a === faceId || pair.b === faceId
);

/**
 * Fills only the catalog's allow-listed sentence placeholders. `null` means
 * that a caller supplied an unknown face/term or that the catalog contains an
 * unresolved token; arbitrary learner text can therefore never become an
 * evidence sentence.
 */
export function buildEvidenceSentence(
  mission: MissionDefinition,
  values: EvidenceSentenceValues,
): string | null;
export function buildEvidenceSentence(
  mission: MissionDefinition,
  firstFace: FaceId,
  secondFace: FaceId | undefined,
  term1: GeometryTerm,
  term2: GeometryTerm,
): string | null;
export function buildEvidenceSentence(
  mission: MissionDefinition,
  valuesOrFirst: EvidenceSentenceValues | FaceId,
  secondFace?: FaceId,
  term1?: GeometryTerm,
  term2?: GeometryTerm,
): string | null {
  const values: EvidenceSentenceValues = typeof valuesOrFirst === 'string'
    ? {
      firstFace: valuesOrFirst,
      secondFace,
      term1: term1 as GeometryTerm,
      term2: term2 as GeometryTerm,
    }
    : valuesOrFirst;
  if (!mission || !values || !values.firstFace
    || (values.secondFace !== undefined && !values.secondFace)
    || !GEOMETRY_TERMS.includes(values.term1)
    || !GEOMETRY_TERMS.includes(values.term2)) return null;
  const faceIds = new Set(mission.net.faces.map((face) => face.id));
  if (!faceIds.has(values.firstFace)
    || (values.secondFace !== undefined && !faceIds.has(values.secondFace))) return null;

  const replacements: Readonly<Record<string, string | undefined>> = {
    firstFace: faceText(values.firstFace),
    secondFace: values.secondFace === undefined ? undefined : faceText(values.secondFace),
    term1: values.term1,
    term2: values.term2,
  };
  const declared = mission.sentenceFrame.placeholders;
  const actualTokens = [...mission.sentenceFrame.template.matchAll(/\{([^{}]+)\}/gu)]
    .map((match) => match[1] as string);
  if (actualTokens.some((token) => !declared.includes(token))
    || declared.some((token) => !actualTokens.includes(token))) return null;
  let sentence = mission.sentenceFrame.template;
  for (const token of declared) {
    const replacement = replacements[token];
    if (replacement === undefined) return null;
    sentence = sentence.split(`{${token}}`).join(replacement);
  }
  // Normalize particles for face labels and geometry terms so generated
  // sentences stay natural when a learner tries a distractor.
  sentence = applyKoreanParticles(sentence);
  return /\{[^{}]+\}/u.test(sentence) ? null : sentence;
}

const canonicalPair = (pair: OppositePair): OppositePair => ({ a: pair.a, b: pair.b });

/** Recomputes all face relations from the mission; supplied UI validation is informational. */
export const getEvidenceContext = (
  mission: MissionDefinition,
  input: EvidenceContextInput = {},
): EvidenceContext => {
  const baseFaceId = input.baseFaceId ?? mission.baseFaceId;
  const validation = validateCubeNet(mission.net, baseFaceId);
  const suppliedValidationMatches = input.validation === undefined
    || validationMatches(input.validation, validation);
  const pairCandidates = validation.oppositePairs.map(canonicalPair);
  const diagnosisCorrect = input.diagnosis === undefined || input.diagnosis === null
    ? mission.kind === 'opposite'
    : evaluateDiagnosis(mission, input.diagnosis, baseFaceId).isCorrect;

  if (mission.kind === 'collision') {
    const selectedCollisionPair = input.diagnosis?.selectedFaceIds;
    const collisionPair = selectedCollisionPair?.length === 2
      && isFaceId(selectedCollisionPair[0]) && isFaceId(selectedCollisionPair[1])
      ? [selectedCollisionPair[0], selectedCollisionPair[1]] as const
      : validation.collisions[0]?.faceIds;
    const pairMatchesDiagnosis = collisionPair !== undefined
      && input.diagnosis !== undefined && input.diagnosis !== null
      && evaluateDiagnosis(mission, input.diagnosis, baseFaceId).isCorrect;
    return {
      baseFaceId,
      validation,
      pairCandidates,
      ...(collisionPair === undefined ? {} : { collisionPair }),
      prerequisitesCorrect: suppliedValidationMatches
        && validation.reason === 'overlap' && pairMatchesDiagnosis,
    };
  }
  if (mission.kind === 'repair') {
    const repair = input.repair;
    const repairedValidation = repair?.accepted === true
      ? validateCubeNet(repair.candidate, baseFaceId)
      : undefined;
    const repairedPairs = repairedValidation?.oppositePairs.map(canonicalPair) ?? [];
    const repairFaceId = repair?.accepted === true ? repair.faceId : undefined;
    const repairEvaluation = repair === undefined || repair === null
      ? undefined
      : evaluateRepair(mission.net, repair.candidate, baseFaceId);
    return {
      baseFaceId,
      validation: repairedValidation ?? validation,
      pairCandidates: repairedPairs,
      ...(repairFaceId === undefined ? {} : { repairFaceId }),
      prerequisitesCorrect: suppliedValidationMatches
        && diagnosisCorrect && repairEvaluation?.accepted === true
        && repairedPairs.some((pair) => pairHasFace(pair, baseFaceId)) === true,
    };
  }
  const expectedPair = mission.kind === 'opposite' ? mission.answer.oppositePair : undefined;
  return {
    baseFaceId,
    validation,
    pairCandidates,
    prerequisitesCorrect: suppliedValidationMatches && diagnosisCorrect && validation.isValid
      && (expectedPair === undefined || pairCandidates.some((pair) => samePair(pair, expectedPair))),
  };
};

const pairForSubmission = (
  mission: MissionDefinition,
  submission: EvidenceSubmission,
  context: EvidenceContext,
): OppositePair | undefined => {
  if (mission.kind === 'collision') {
    return context.collisionPair === undefined ? undefined : asPair(context.collisionPair);
  }
  return submission.oppositePair;
};

const expectedPairForMission = (
  mission: MissionDefinition,
  context: EvidenceContext,
): OppositePair | undefined => {
  if (mission.kind === 'opposite') return mission.answer.oppositePair;
  if (mission.kind === 'collision') {
    return context.collisionPair === undefined ? undefined : asPair(context.collisionPair);
  }
  if (mission.kind === 'repair') {
    return context.pairCandidates.find((pair) => pairHasFace(pair, context.baseFaceId));
  }
  return context.pairCandidates.find((pair) => pairHasFace(pair, context.baseFaceId));
};

/** Returns the deterministic expected sentence for a structured submission. */
export const expectedEvidenceSentence = (
  mission: MissionDefinition,
  submission: EvidenceSubmission,
  context: EvidenceContext,
): string | null => {
  const pair = pairForSubmission(mission, submission, context);
  if (pair === undefined) return null;
  const firstFace = mission.kind === 'repair'
    ? context.repairFaceId
    : pair.a;
  const secondFace = mission.kind === 'repair'
    ? context.baseFaceId
    : pair.b;
  if (firstFace === undefined) return null;
  return buildEvidenceSentence(mission, {
    firstFace,
    ...(secondFace === undefined ? {} : { secondFace }),
    term1: submission.selectedTerms[1] as GeometryTerm,
    term2: submission.selectedTerms[0] as GeometryTerm,
  });
};

export const evaluateEvidenceSubmission = (
  mission: MissionDefinition,
  submission: EvidenceSubmission,
  input: EvidenceContextInput = {},
): EvidenceEvaluation => {
  const context = getEvidenceContext(mission, input);
  const pair = pairForSubmission(mission, submission, context);
  const expectedPair = expectedPairForMission(mission, context);
  const pairMatches = mission.kind === 'collision'
    ? submission.oppositePair === undefined
      && expectedPair !== undefined && pair !== undefined
    : submission.oppositePair !== undefined
      && context.pairCandidates.some((candidate) => samePair(candidate, submission.oppositePair!));
  const answerPairMatches = expectedPair !== undefined && pair !== undefined
    && samePair(pair, expectedPair);
  const canonicalTerms = canonicalEvidenceTermsFor(mission);
  const termsMatch = submission.selectedTerms.length === canonicalTerms.length
    && submission.selectedTerms.every((term, index) => term === canonicalTerms[index]);
  const sentence = expectedEvidenceSentence(mission, submission, context);
  return {
    isCorrect: context.prerequisitesCorrect && answerPairMatches && termsMatch
      && sentence !== null && sentence === submission.completedSentence,
    sentenceMatches: sentence !== null && sentence === submission.completedSentence,
    pairMatches,
    termsMatch,
    context,
  };
};

export const evidenceMissionById = (missionId: MissionId): MissionDefinition => getMissionById(missionId);
