import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { useLearningController } from '../../src/app/useLearningController';
import { loadMissionCatalog } from '../../src/content/missions/catalog';
import { buildEvidenceSentence } from '../../src/domain/learning/evidence';
import { createFoldSequence } from '../../src/domain/net/foldEngine';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';

const missionButton = (title: string): HTMLElement => (
  screen.getByRole('button', { name: `${title} 미션 선택` })
);

const repairTargetAt = (x: number, y: number): HTMLElement => {
  const target = document.querySelector(`button[data-grid-x="${x}"][data-grid-y="${y}"]`);
  if (!(target instanceof HTMLElement)) throw new Error(`missing repair target ${x},${y}`);
  return target;
};

const choosePrediction = async (
  user: ReturnType<typeof userEvent.setup>,
  topFace: number,
  order: readonly number[] = [2, 3, 5, 6, 4],
): Promise<void> => {
  const baseGrid = screen.getByRole('group', { name: '기준면 선택 전개도' });
  await user.click(within(baseGrid).getByRole('button', { name: /^1번 면/ }));
  const topGrid = screen.getByRole('group', { name: '예상 윗면 선택 전개도' });
  await user.click(within(topGrid).getByRole('button', { name: new RegExp(`^${topFace}번 면`) }));
  for (const face of order) {
    await user.click(screen.getByRole('button', { name: `접는 순서에 ${face}번 면 추가` }));
  }
  for (const face of order) {
    await user.click(screen.getByRole('button', { name: `${face}번 면의 북쪽 방향 ↑` }));
  }
  expectOnePulse('예측을 남기고 접기실로');
  await user.click(screen.getByRole('button', { name: '예측을 남기고 접기실로' }));
};

const finishFolding = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  for (let step = 0; step < 5; step += 1) {
    const next = screen.queryByRole('button', { name: '다음 면 접기' });
    if (next === null) return;
    await user.click(next);
  }
};

const chooseTerms = async (
  user: ReturnType<typeof userEvent.setup>,
  first: string,
  second: string,
): Promise<void> => {
  await user.selectOptions(screen.getByLabelText('관계를 나타내는 낱말'), first);
  await user.selectOptions(screen.getByLabelText('까닭을 나타내는 낱말'), second);
};

const expectPredictionLocked = (container: HTMLElement): void => {
  expect(container.querySelector('canvas')).toBeNull();
  expect(screen.queryByRole('table', { name: '완성된 면 관계' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: '접기 3D 보조 보기' })).not.toBeInTheDocument();
};

const expectOnePulse = (buttonName: string | RegExp): void => {
  expect(document.querySelectorAll('.gi-pulse')).toHaveLength(1);
  expect(screen.getByRole('button', { name: buttonName })).toHaveClass('gi-pulse');
};

describe('Task 13 integrated learner flow', () => {
  afterEach(cleanup);
  it('starts at an eight-mission intake grouped by kind without result or packaging controls', () => {
    const { container } = render(<App />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: '검수 접수' })).toBeVisible();
    expectPredictionLocked(container);
    expect(screen.getAllByRole('button', { name: /미션 선택$/ })).toHaveLength(8);
    expectOnePulse(/면 위치 추적 1 미션 선택/);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
    expect(screen.queryByText(/점수|순위|타이머|치수|꾸미|공유/u)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /정답|결과|공유|꾸미|치수/u })).not.toBeInTheDocument();
  });

  it('completes the tracking path only after prediction, five folds, direction diagnosis, and canonical evidence', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(missionButton('면 위치 추적 1'));
    expect(screen.getByRole('heading', { name: '예측판' })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expectPredictionLocked(container);
    expect(within(screen.getByRole('main')).queryByText(/검사 결과|겹치|진단|수리|근거/u)).not.toBeInTheDocument();
    await choosePrediction(user, 3);
    expectOnePulse('다음 면 접기');
    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole('button', { name: '다음 면 접기' }));
    }
    expect(
      container.querySelector('canvas')
      ?? screen.queryByText(/3D 보기를 사용할 수 없어 2D 관계 보기를 유지합니다./u),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '다음 면 접기' }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: '접힌 결과 진단하기' })).toBeVisible();
    await user.click(screen.getByLabelText('무늬 방향이 달라요'));
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    expectOnePulse('진단 확인');
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(screen.getByRole('heading', { name: '근거 문장 만들기' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^1번 면/ }));
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    await chooseTerms(user, '맞은편', '접는 방향');
    expectOnePulse('근거 확인');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    expectOnePulse('미션 완료 확인');
    await user.click(screen.getByRole('button', { name: '미션 완료 확인' }));
    expect(screen.getByRole('heading', { name: '검수 완료' })).toBeVisible();
    expectOnePulse('다음 미션');
  });

  it('recovers from an impossible fold order and accepts a corrected prediction', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(missionButton('면 위치 추적 1'));
    await choosePrediction(user, 3, [3, 2, 5, 6, 4]);
    expect(screen.getByRole('alert')).toHaveTextContent('이 예측한 순서로는 접기 단계를 만들 수 없습니다.');
    expect(screen.queryByText(/정답 순서|F3.*F2/u)).not.toBeInTheDocument();
    expectOnePulse('예측판으로 돌아가 다시 고르기');
    await user.click(screen.getByRole('button', { name: '예측판으로 돌아가 다시 고르기' }));
    expect(screen.getByRole('heading', { name: '예측판' })).toBeVisible();
    await choosePrediction(user, 3);
    expect(screen.getByRole('heading', { name: '한 면씩 접기' })).toBeVisible();
    for (let step = 0; step < 5; step += 1) {
      await user.click(screen.getByRole('button', { name: '다음 면 접기' }));
    }
    expect(screen.getByRole('heading', { name: '접힌 결과 진단하기' })).toBeVisible();
  });

  it('completes the opposite path without exposing diagnosis', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(missionButton('맞은편 면 찾기 1'));
    expectPredictionLocked(container);
    await choosePrediction(user, 3);
    expectOnePulse('다음 면 접기');
    expect(screen.getByRole('button', { name: '업데이트 내역' })).not.toHaveClass('gi-pulse');
    const frontView = screen.queryByRole('button', { name: '정면에서 보기' });
    if (frontView !== null) expect(frontView).not.toHaveClass('gi-pulse');
    await finishFolding(user);
    expect(screen.queryByRole('heading', { name: '접힌 결과 진단하기' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '근거 문장 만들기' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^1번 면/ }));
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    await chooseTerms(user, '맞은편', '접는 방향');
    expectOnePulse('근거 확인');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    expectOnePulse('미션 완료 확인');
    await user.click(screen.getByRole('button', { name: '미션 완료 확인' }));
    expect(screen.getByRole('heading', { name: '검수 완료' })).toBeVisible();
    expectOnePulse('다음 미션');
    expect(screen.getByRole('button', { name: '접기 결과 다시 보기' })).not.toHaveClass('gi-pulse');
  });

  it('completes collision through diagnosis and one-face repair using canonical collision terms', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(missionButton('겹침 경보 1'));
    expectPredictionLocked(container);
    expect(screen.queryByText(/전개도 검사|겹침 후보/u)).not.toBeInTheDocument();
    await choosePrediction(user, 3);
    await finishFolding(user);
    await user.click(screen.getByLabelText('두 면이 같은 자리에 겹쳐요'));
    await user.click(screen.getByRole('button', { name: /^2번 면/ }));
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(screen.getByLabelText('오른쪽 방향'));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(screen.getByRole('heading', { name: '한 면 수리대' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /장식만 한 번 돌리기/u })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(repairTargetAt(2, 1));
    expectOnePulse('수리 확인');
    await user.click(screen.getByRole('button', { name: '수리 확인' }));
    await user.click(screen.getByRole('button', { name: /^2번 면/ }));
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await chooseTerms(user, '겹침', '면');
    expectOnePulse('근거 확인');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    expectOnePulse('미션 완료 확인');
    await user.click(screen.getByRole('button', { name: '미션 완료 확인' }));
    expect(screen.getByRole('heading', { name: '검수 완료' })).toBeVisible();
  });

  it('completes the repair mission and allows returning to fold review without losing attempts', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(missionButton('한 면 수리 1'));
    expectPredictionLocked(container);
    await choosePrediction(user, 3);
    await finishFolding(user);
    await user.click(screen.getByLabelText('두 면이 같은 자리에 겹쳐요'));
    await user.click(screen.getByRole('button', { name: /^2번 면/ }));
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(screen.getByLabelText('오른쪽 방향'));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(screen.queryByRole('button', { name: /장식만 한 번 돌리기/u })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(repairTargetAt(2, 1));
    await user.click(screen.getByRole('button', { name: '수리 확인' }));
    await user.click(screen.getByRole('button', { name: /^1번 면/ }));
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    await chooseTerms(user, '면', '겹침');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    await user.click(screen.getByRole('button', { name: '미션 완료 확인' }));
    await user.click(screen.getByRole('button', { name: '접기 결과 다시 보기' }));
    expect(screen.getByRole('heading', { name: '한 면씩 접기' })).toBeVisible();
    expect(screen.getByText(/4 \/ 5면 접힘/)).toBeVisible();
    expect(screen.queryByRole('heading', { name: '검수 완료' })).not.toBeInTheDocument();

    await finishFolding(user);
    await user.click(screen.getByLabelText('두 면이 같은 자리에 겹쳐요'));
    await user.click(screen.getByRole('button', { name: /^2번 면/ }));
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(screen.getByLabelText('오른쪽 방향'));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(repairTargetAt(2, 1));
    await user.click(screen.getByRole('button', { name: '수리 확인' }));
    await user.click(screen.getByRole('button', { name: /^1번 면/ }));
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    await chooseTerms(user, '면', '겹침');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    await user.click(screen.getByRole('button', { name: '미션 완료 확인' }));
    expect(screen.getByRole('heading', { name: '검수 완료' })).toBeVisible();
    const comparison = screen.getByRole('table', { name: '수정 전후 학습 기록' });
    expect(within(comparison).getByRole('row', { name: /예측.*3번 면.*3번 면/u })).toBeVisible();
    expect(comparison).not.toHaveTextContent(/\bF[1-6]\b/u);

    await user.click(screen.getByRole('button', { name: '다음 미션' }));
    const completedCard = screen.getByRole('heading', { name: '한 면 수리 1' }).closest('article');
    expect(completedCard).not.toBeNull();
    expect(within(completedCard as HTMLElement).getByText('완료한 미션')).toBeVisible();
    await user.click(missionButton('맞은편 면 찾기 1'));
    expect(screen.getByRole('heading', { name: '예측판' })).toBeVisible();
    expect(screen.getByText('기준면: 아직 선택하지 않음')).toBeVisible();
    expect(screen.getByText('기준면을 고르면 이 단계가 열려요.')).toBeVisible();
    expect(screen.getByText('예상 윗면: 아직 선택하지 않음')).not.toBeVisible();
    expect(within(screen.getByRole('list', { name: '예측한 접는 순서' })).queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: '한 면 수리대' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '검수 완료' })).not.toBeInTheDocument();
  });

  it('catalogs the remaining four missions and derives geometry from each mission base', () => {
    const catalog = loadMissionCatalog();
    expect(catalog).toHaveLength(8);
    for (const mission of catalog) {
      const validation = validateCubeNet(mission.net, mission.baseFaceId);
      expect(validation.frames.size).toBe(6);
      expect(() => createFoldSequence(
        mission.net,
        mission.baseFaceId,
        mission.suggestedFoldOrder,
      )).not.toThrow();
    }
    expect(catalog.slice(4).map((mission) => mission.id)).toEqual([
      'cube-collision-01', 'cube-collision-02', 'cube-repair-01', 'cube-repair-02',
    ]);
  });

  it('keeps progress in memory by default and syncs only after explicit opt-in', async () => {
    const save = vi.fn();
    const clear = vi.fn();
    const store = { load: () => null, save, clear };
    const { result } = renderHook(() => useLearningController({ store }));
    expect(save).not.toHaveBeenCalled();
    act(() => result.current.dispatch({ type: 'SET_STORAGE_OPT_IN', enabled: true }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    act(() => result.current.dispatch({ type: 'SET_STORAGE_OPT_IN', enabled: false }));
    await waitFor(() => expect(clear).toHaveBeenCalledTimes(1));
  });

  it('clears current attempts when controller resets or selects another mission', () => {
    const mission = loadMissionCatalog()[0]!;
    const sentence = buildEvidenceSentence(mission, {
      firstFace: 'F1',
      secondFace: 'F3',
      term1: '접는 방향',
      term2: '맞은편',
    });
    expect(sentence).not.toBeNull();
    const prediction = {
      baseFaceId: 'F1' as const,
      predictedTopFaceId: 'F3' as const,
      foldOrder: ['F2', 'F3', 'F5', 'F6', 'F4'] as const,
      arrowByFace: { F2: 'north', F3: 'north', F5: 'west', F6: 'east', F4: 'south' } as const,
      submittedAtIso: '2026-08-26T00:00:00.000Z',
    };
    const { result } = renderHook(() => useLearningController());
    act(() => {
      result.current.selectMission(mission.id);
      result.current.dispatch({ type: 'SUBMIT_PREDICTION', prediction });
      result.current.dispatch({ type: 'SET_FOLD_STEP', stepIndex: 5 });
      result.current.dispatch({
        type: 'SUBMIT_DIAGNOSIS',
        diagnosis: { selectedErrorType: 'decoration-direction', selectedFaceIds: ['F3'] },
      });
      result.current.dispatch({
        type: 'SUBMIT_EVIDENCE',
        evidence: {
          oppositePair: { a: 'F1', b: 'F3' },
          selectedTerms: ['맞은편', '접는 방향'],
          completedSentence: sentence!,
        },
      });
      result.current.dispatch({ type: 'COMPLETE_MISSION' });
    });
    expect(result.current.state.completedMissionIds).toEqual([mission.id]);
    act(() => result.current.resetMission());
    expect(result.current.state.completedMissionIds).toEqual([mission.id]);
    expect(result.current.state.attempts).toEqual({ predictions: [], diagnoses: [], repairs: [], evidence: [] });
    act(() => result.current.selectMission('cube-opposite-01'));
    expect(result.current.state.missionId).toBe('cube-opposite-01');
    expect(result.current.state.attempts).toEqual({ predictions: [], diagnoses: [], repairs: [], evidence: [] });
  });
});
