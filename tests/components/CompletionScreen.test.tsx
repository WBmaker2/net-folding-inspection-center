import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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
    expect(screen.getByRole('table', { name: '수정 전후 학습 기록' })).toHaveTextContent('비어 있는 방향: 왼쪽 방향');
    expect(screen.getByRole('table', { name: '수정 전후 학습 기록' })).toHaveTextContent('비어 있는 방향: 오른쪽 방향');
    const comparison = screen.getByRole('table', { name: '수정 전후 학습 기록' });
    expect(comparison).not.toHaveTextContent('undefined');
    expect(comparison).not.toHaveTextContent(/\(-?\d+,\s*-?\d+\)/u);
    expect(comparison).toHaveTextContent('2번 면과 6번 면');
  });

  it('compares the first prediction with the corrected current prediction', () => {
    const mission = getMissionById('cube-track-01');
    const firstPrediction = {
      baseFaceId: 'F1' as const,
      predictedTopFaceId: 'F2' as const,
      foldOrder: ['F3', 'F2', 'F5', 'F6', 'F4'] as const,
      arrowByFace: { F2: 'north' as const, F3: 'north' as const, F5: 'west' as const, F6: 'east' as const, F4: 'south' as const },
      submittedAtIso: '2026-08-26T00:00:00.000Z',
    };
    const correctedPrediction = { ...firstPrediction, predictedTopFaceId: 'F3' as const };
    const state: LearningState = {
      missionId: mission.id,
      stage: 'complete',
      prediction: correctedPrediction,
      foldStepIndex: 5,
      diagnosis: { selectedErrorType: 'decoration-direction', selectedFaceIds: ['F3'] },
      repair: null,
      evidence: null,
      attempts: {
        predictions: [firstPrediction, correctedPrediction],
        diagnoses: [], repairs: [], evidence: [],
      },
      storageOptIn: false,
      completedMissionIds: [mission.id],
    };
    render(<CompletionScreen mission={mission} state={state} />);
    const comparison = screen.getByRole('table', { name: '수정 전후 학습 기록' });
    expect(within(comparison).getByRole('row', { name: /예측.*2번 면.*3번 면/u })).toBeVisible();
    expect(comparison).not.toHaveTextContent(/\bF[1-6]\b/u);
  });

  it('labels activities that do not belong to the mission', () => {
    const mission = getMissionById('cube-opposite-01');
    const state: LearningState = {
      missionId: mission.id,
      stage: 'complete',
      prediction: null,
      foldStepIndex: 5,
      diagnosis: null,
      repair: null,
      evidence: null,
      attempts: { predictions: [], diagnoses: [], repairs: [], evidence: [] },
      storageOptIn: false,
      completedMissionIds: [mission.id],
    };
    render(<CompletionScreen mission={mission} state={state} />);
    const achievementTable = screen.getByRole('table', { name: '기하 학습 성취 상태' });
    expect(within(achievementTable).getByRole('row', { name: /수리/u })).toHaveTextContent('이번 미션에는 없음');
    expect(within(achievementTable).getByRole('row', { name: /분석/u })).toHaveTextContent('이번 미션에는 없음');
    expect(within(achievementTable).getByRole('row', { name: /수리/u })).not.toHaveTextContent('확인함');
  });

  it('shows a plain-language takeaway, next step, and mobile comparison hint', () => {
    const mission = getMissionById('cube-collision-01');
    render(<CompletionScreen mission={mission} />);

    expect(screen.getByRole('heading', { name: '배운 점' })).toBeVisible();
    expect(screen.getByText('두 면이 같은 자리에 겹치는지 살펴보는 법을 배웠어요.')).toBeVisible();
    expect(screen.getByRole('heading', { name: '다음에는' })).toBeVisible();
    expect(screen.getByText('다음에는 면을 한 칸씩 옮겨 다시 확인해 보세요.')).toBeVisible();
    expect(screen.getByText('작은 화면에서는 글이 칸 안에서 줄바꿈됩니다.')).toBeVisible();
    expect(screen.getByRole('table', { name: '수정 전후 학습 기록' })).toHaveClass('comparison-table');
  });
});
