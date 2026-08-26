import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getMissionById, loadMissionCatalog } from '../../src/content/missions/catalog';
import { NetGrid } from '../../src/components/net2d/NetGrid';
import { PredictionScreen } from '../../src/screens/PredictionScreen';
import type { FaceDefinition, PredictionRecord } from '../../src/domain/net/types';

afterEach(cleanup);

const gridTestFace = (
  id: FaceDefinition['id'],
  x: number,
  y: number,
): FaceDefinition => ({
  id,
  grid: { x, y },
  colorToken: 'blue',
  symbol: 'circle',
  decorationQuarterTurn: 0,
});

describe('PredictionScreen', () => {
  it('selects a base face with the keyboard and keeps incomplete predictions blocked', async () => {
    const user = userEvent.setup();
    const mission = getMissionById('cube-track-01');

    render(<PredictionScreen mission={mission} onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '예측판' })).toHaveFocus();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    await user.click(within(screen.getByRole('group', { name: '기준면 선택 전개도' }))
      .getByRole('button', { name: /1번 면, 파란색, 원형/ }));
    await user.keyboard('{ArrowUp}{Enter}');

    expect(screen.getByText('기준면: 2번 면')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '접는 순서에 3번 면 추가' }));
    expect(screen.getByRole('list', { name: '예측한 접는 순서' })).toHaveTextContent('3번 면');
    expect(screen.getByRole('button', { name: '예측을 남기고 접기실로' })).toBeDisabled();
  });

  it('exposes face number, color, symbol, and position in accessible names', () => {
    const mission = getMissionById('cube-track-01');

    const { container } = render(<PredictionScreen mission={mission} onSubmit={vi.fn()} />);

    expect(within(screen.getByRole('group', { name: '기준면 선택 전개도' }))
      .getByRole('button', { name: /2번 면, 노란색, 사각형/ })).toBeVisible();
    expect(within(screen.getByRole('group', { name: '예상 윗면 선택 전개도' }))
      .getByRole('button', { name: /3번 면, 초록색, 삼각형/ })).toBeVisible();
    expect(container.querySelector('.net-grid-select-base svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('submits only after base, top, all five faces, and exact directions are selected', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(prediction: PredictionRecord) => void>();
    const mission = getMissionById('cube-track-01');

    const timestamp = '2026-08-26T00:00:00.000Z';
    render(<PredictionScreen mission={mission} onSubmit={onSubmit} now={() => timestamp} />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons.find((button) => button.textContent?.includes('1')) as HTMLElement);
    await user.click(within(screen.getByRole('group', { name: '예상 윗면 선택 전개도' }))
      .getByRole('button', { name: /3번 면.*초록색.*삼각형/ }));

    for (const faceId of ['F2', 'F3', 'F4', 'F5', 'F6']) {
      await user.click(screen.getByRole('button', { name: new RegExp(`접는 순서에 ${Number(faceId.slice(1))}번 면 추가`) }));
      await user.click(screen.getByRole('button', { name: new RegExp(`${Number(faceId.slice(1))}번 면.*북쪽 방향`) }));
    }

    const submit = screen.getByRole('button', { name: '예측을 남기고 접기실로' });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      baseFaceId: 'F1',
      predictedTopFaceId: 'F3',
      foldOrder: ['F2', 'F3', 'F4', 'F5', 'F6'],
      arrowByFace: {
        F2: 'north', F3: 'north', F4: 'north', F5: 'north', F6: 'north',
      },
      submittedAtIso: timestamp,
    });
    expect(screen.getByRole('status')).toHaveTextContent('예측을 기록했습니다');
  });

  it('creates the same prediction record with mouse and keyboard input', async () => {
    const timestamp = '2026-08-26T00:00:00.000Z';
    const complete = async (mode: 'mouse' | 'keyboard'): Promise<PredictionRecord> => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<(prediction: PredictionRecord) => void>();
      const activate = async (button: HTMLElement): Promise<void> => {
        if (mode === 'mouse') await user.click(button);
        else {
          button.focus();
          await user.keyboard('{Enter}');
        }
      };
      render(<PredictionScreen mission={getMissionById('cube-track-01')} onSubmit={onSubmit} now={() => timestamp} />);
      await activate(within(screen.getByRole('group', { name: '기준면 선택 전개도' }))
        .getByRole('button', { name: /1번 면, 파란색, 원형/ }));
      await activate(within(screen.getByRole('group', { name: '예상 윗면 선택 전개도' }))
        .getByRole('button', { name: /3번 면, 초록색, 삼각형/ }));
      for (const number of [2, 3, 4, 5, 6]) {
        await activate(screen.getByRole('button', { name: `접는 순서에 ${number}번 면 추가` }));
        await activate(screen.getByRole('button', { name: new RegExp(`${number}번 면의 북쪽 방향`) }));
      }
      await activate(screen.getByRole('button', { name: '예측을 남기고 접기실로' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
      return onSubmit.mock.calls[0]?.[0] as PredictionRecord;
    };

    const mouseRecord = await complete('mouse');
    cleanup();
    const keyboardRecord = await complete('keyboard');
    expect(keyboardRecord).toEqual(mouseRecord);
  });

  it('does not show success when the submit callback throws', async () => {
    const user = userEvent.setup();
    const mission = getMissionById('cube-track-01');
    const onSubmit = vi.fn(() => { throw new Error('dispatch failed'); });
    render(<PredictionScreen mission={mission} onSubmit={onSubmit} />);

    await user.click(within(screen.getByRole('group', { name: '기준면 선택 전개도' }))
      .getByRole('button', { name: /1번 면, 파란색, 원형/ }));
    await user.click(within(screen.getByRole('group', { name: '예상 윗면 선택 전개도' }))
      .getByRole('button', { name: /3번 면.*초록색.*삼각형/ }));
    for (const faceId of ['F2', 'F3', 'F4', 'F5', 'F6']) {
      const number = Number(faceId.slice(1));
      await user.click(screen.getByRole('button', { name: `접는 순서에 ${number}번 면 추가` }));
      await user.click(screen.getByRole('button', { name: new RegExp(`${number}번 면.*북쪽 방향`) }));
    }

    const errorHandler = (event: ErrorEvent): void => event.preventDefault();
    window.addEventListener('error', errorHandler);
    await user.click(screen.getByRole('button', { name: '예측을 남기고 접기실로' }));
    window.removeEventListener('error', errorHandler);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('chooses the squared-distance nearest face and keeps focus when there is no candidate', async () => {
    const user = userEvent.setup();
    const net = {
      faces: [
        gridTestFace('F1', 0, 0),
        gridTestFace('F2', 2, 0),
        gridTestFace('F3', 1, 1),
        gridTestFace('F4', -1, 0),
        gridTestFace('F5', 0, 1),
        gridTestFace('F6', 0, -1),
      ],
    } as const;
    render(<NetGrid net={net} mode="inspect" label="거리 테스트 전개도" />);
    const group = screen.getByRole('group', { name: '거리 테스트 전개도' });
    const f1 = within(group).getByRole('button', { name: /1번 면/ });
    f1.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toHaveAttribute('data-face-id', 'F3');
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toHaveAttribute('data-face-id', 'F1');
  });

  it('uses face id as a deterministic tie-break and selects once for Enter or Space', async () => {
    const user = userEvent.setup();
    const net = {
      faces: [
        gridTestFace('F1', 0, 0),
        gridTestFace('F2', 1, -1),
        gridTestFace('F3', 1, 1),
        gridTestFace('F4', -1, 0),
        gridTestFace('F5', 0, 1),
        gridTestFace('F6', 0, -1),
      ],
    } as const;
    const onFaceSelect = vi.fn();
    render(<NetGrid net={net} mode="select-base" onFaceSelect={onFaceSelect} label="선택 테스트 전개도" />);
    const group = screen.getByRole('group', { name: '선택 테스트 전개도' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1);
    const f1 = within(group).getByRole('button', { name: /1번 면/ });
    f1.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toHaveAttribute('data-face-id', 'F2');
    await user.keyboard('{Enter}');
    expect(onFaceSelect).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(onFaceSelect).toHaveBeenCalledTimes(2);
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1);
  });

  it('reaches all six faces on every mission net with arrow keys', async () => {
    const user = userEvent.setup();
    for (const mission of loadMissionCatalog()) {
      const { unmount } = render(
        <NetGrid net={mission.net} mode="inspect" label={`${mission.id} 키보드 전개도`} />,
      );
      const group = screen.getByRole('group', { name: `${mission.id} 키보드 전개도` });
      const buttons = within(group).getAllByRole('button');
      const byId = new Map(buttons.map((button) => [button.dataset.faceId, button]));
      const firstId = buttons[0]?.dataset.faceId;
      const reached = new Set<string>(firstId === undefined ? [] : [firstId]);
      const pending = firstId === undefined ? [] : [firstId];
      while (pending.length > 0) {
        const currentId = pending.shift();
        const current = currentId === undefined ? undefined : byId.get(currentId);
        if (current === undefined) continue;
        current.focus();
        for (const key of ['{ArrowUp}', '{ArrowDown}', '{ArrowLeft}', '{ArrowRight}']) {
          await user.keyboard(key);
          const nextId = (document.activeElement as HTMLElement).dataset.faceId;
          if (nextId !== undefined && !reached.has(nextId)) {
            reached.add(nextId);
            pending.push(nextId);
          }
          current.focus();
        }
      }
      expect(reached.size, mission.id).toBe(6);
      unmount();
    }
  });
});
