import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { useLearningController } from '../../src/app/useLearningController';
import { loadMissionCatalog } from '../../src/content/missions/catalog';
import { createFoldSequence } from '../../src/domain/net/foldEngine';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';

const missionButton = (title: string): HTMLElement => (
  screen.getByRole('button', { name: `${title} 미션 선택` })
);

const choosePrediction = async (user: ReturnType<typeof userEvent.setup>, topFace: number): Promise<void> => {
  const baseGrid = screen.getByRole('group', { name: '기준면 선택 전개도' });
  await user.click(within(baseGrid).getByRole('button', { name: /^1번 면/ }));
  const topGrid = screen.getByRole('group', { name: '예상 윗면 선택 전개도' });
  await user.click(within(topGrid).getByRole('button', { name: new RegExp(`^${topFace}번 면`) }));
  const order = [2, 3, 5, 6, 4];
  for (const face of order) {
    await user.click(screen.getByRole('button', { name: `접는 순서에 ${face}번 면 추가` }));
  }
  for (const face of order) {
    await user.click(screen.getByRole('button', { name: `${face}번 면의 북쪽 방향 ↑` }));
  }
  await user.click(screen.getByRole('button', { name: '예측을 남기고 접기실로' }));
};

const finishFolding = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  for (let step = 0; step < 5; step += 1) {
    await user.click(screen.getByRole('button', { name: '다음 면 접기' }));
  }
};

const chooseTerms = async (
  user: ReturnType<typeof userEvent.setup>,
  first: string,
  second: string,
): Promise<void> => {
  await user.selectOptions(screen.getByLabelText('첫 번째 기하 낱말'), first);
  await user.selectOptions(screen.getByLabelText('두 번째 기하 낱말'), second);
};

describe('Task 13 integrated learner flow', () => {
  afterEach(cleanup);
  it('starts at an eight-mission intake grouped by kind without result or packaging controls', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '검수 접수' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /미션 선택$/ })).toHaveLength(8);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
    expect(screen.queryByText(/점수|순위|타이머|치수|꾸미|공유/u)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /정답|결과|공유|꾸미|치수/u })).not.toBeInTheDocument();
  });

  it('completes the tracking path only after prediction, five folds, direction diagnosis, and canonical evidence', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(missionButton('면 위치 추적 1'));
    expect(screen.getByRole('heading', { name: '예측판' })).toBeVisible();
    expect(screen.queryByText(/검사 결과|겹치|진단|수리|근거/u)).not.toBeInTheDocument();
    await choosePrediction(user, 3);
    await finishFolding(user);
    expect(screen.getByRole('heading', { name: '접힌 결과 진단하기' })).toBeVisible();
    await user.click(screen.getByLabelText('장식 방향을 확인해야 해요'));
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(screen.getByRole('heading', { name: '근거 문장 만들기' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^1번 면/ }));
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    await chooseTerms(user, '맞은편', '접는 방향');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    await user.click(screen.getByRole('button', { name: '미션 완료 확인' }));
    expect(screen.getByRole('heading', { name: '검수 완료' })).toBeVisible();
  });

  it('completes the opposite path without exposing diagnosis', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(missionButton('맞은편 면 찾기 1'));
    await choosePrediction(user, 3);
    await finishFolding(user);
    expect(screen.queryByRole('heading', { name: '접힌 결과 진단하기' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '근거 문장 만들기' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^1번 면/ }));
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    await chooseTerms(user, '맞은편', '접는 방향');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    await user.click(screen.getByRole('button', { name: '미션 완료 확인' }));
    expect(screen.getByRole('heading', { name: '검수 완료' })).toBeVisible();
  });

  it('completes collision through diagnosis and one-face repair using canonical collision terms', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(missionButton('겹침 경보 1'));
    await choosePrediction(user, 3);
    await finishFolding(user);
    await user.click(screen.getByLabelText('두 면이 같은 자리에 겹쳐요'));
    await user.click(screen.getByRole('button', { name: /^2번 면/ }));
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(screen.getByLabelText('+x 방향'));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(screen.getByRole('heading', { name: '한 면 수리대' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(screen.getByRole('button', { name: /빈 칸 \(2, 1\)/ }));
    await user.click(screen.getByRole('button', { name: '수리 확인' }));
    await user.click(screen.getByRole('button', { name: /^2번 면/ }));
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await chooseTerms(user, '겹침', '면');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    await user.click(screen.getByRole('button', { name: '미션 완료 확인' }));
    expect(screen.getByRole('heading', { name: '검수 완료' })).toBeVisible();
  });

  it('completes the repair mission and allows returning to fold review without losing attempts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(missionButton('한 면 수리 1'));
    await choosePrediction(user, 3);
    await finishFolding(user);
    await user.click(screen.getByLabelText('두 면이 같은 자리에 겹쳐요'));
    await user.click(screen.getByRole('button', { name: /^2번 면/ }));
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(screen.getByLabelText('+x 방향'));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(screen.getByRole('button', { name: /빈 칸 \(2, 1\)/ }));
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
});
