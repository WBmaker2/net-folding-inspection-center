import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getMissionById } from '../../src/content/missions/catalog';
import type { LearningState } from '../../src/domain/learning/types';
import { CompletionScreen } from '../../src/screens/CompletionScreen';

afterEach(cleanup);

describe('CompletionScreen', () => {
  it('shows first wrong and final collision empty-direction evidence', () => {
    const mission = getMissionById('cube-collision-01');
    const prediction = {
      baseFaceId: 'F1' as const,
      predictedTopFaceId: 'F3' as const,
      foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'] as const,
      arrowByFace: { F2: 'north' as const, F3: 'north' as const, F5: 'west' as const, F6: 'east' as const, F4: 'south' as const },
      submittedAtIso: '2026-08-26T00:00:00.000Z',
    };
    const wrong = { selectedErrorType: 'overlap' as const, selectedFaceIds: ['F2', 'F6'] as const, selectedMissingDirection: '-x' as const };
    const right = { ...wrong, selectedMissingDirection: '+x' as const };
    const state: LearningState = {
      missionId: mission.id,
      stage: 'complete',
      prediction,
      foldStepIndex: 5,
      diagnosis: right,
      repair: null,
      evidence: null,
      attempts: { predictions: [prediction], diagnoses: [wrong, right], repairs: [], evidence: [] },
      storageOptIn: false,
      completedMissionIds: [mission.id],
    };
    render(<CompletionScreen mission={mission} state={state} />);
    expect(screen.getByRole('table', { name: '수정 전후 학습 기록' })).toHaveTextContent('비어 있는 방향: -x');
    expect(screen.getByRole('table', { name: '수정 전후 학습 기록' })).toHaveTextContent('비어 있는 방향: +x');
    expect(screen.getByRole('table', { name: '수정 전후 학습 기록' })).not.toHaveTextContent('undefined');
  });
});
