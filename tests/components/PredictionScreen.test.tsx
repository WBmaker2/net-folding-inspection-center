import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getMissionById } from '../../src/content/missions/catalog';
import { PredictionScreen } from '../../src/screens/PredictionScreen';
import type { PredictionRecord } from '../../src/domain/net/types';

afterEach(cleanup);

describe('PredictionScreen', () => {
  it('selects a base face with the keyboard and keeps incomplete predictions blocked', async () => {
    const user = userEvent.setup();
    const mission = getMissionById('cube-track-01');

    render(<PredictionScreen mission={mission} onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '예측판' })).toHaveFocus();
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

    render(<PredictionScreen mission={mission} onSubmit={vi.fn()} />);

    expect(within(screen.getByRole('group', { name: '기준면 선택 전개도' }))
      .getByRole('button', { name: /2번 면, 노란색, 사각형/ })).toBeVisible();
    expect(within(screen.getByRole('group', { name: '예상 윗면 선택 전개도' }))
      .getByRole('button', { name: /3번 면, 초록색, 삼각형/ })).toBeVisible();
    expect(within(screen.getByRole('group', { name: '기준면 선택 전개도' }))
      .getByRole('img', { name: '2번 면 사각형 무늬' })).toBeVisible();
  });

  it('submits only after base, top, all five faces, and exact directions are selected', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(prediction: PredictionRecord) => void>();
    const mission = getMissionById('cube-track-01');

    render(<PredictionScreen mission={mission} onSubmit={onSubmit} />);

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
    });
  });
});
