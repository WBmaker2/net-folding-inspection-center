import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import { RepairScreen } from '../../src/screens/RepairScreen';

const mission = getMissionById('cube-repair-01');

describe('RepairScreen', () => {
  afterEach(() => cleanup());
  it('selects a face and target, previews immutably, confirms without drag handlers', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<RepairScreen mission={mission} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /6번 면/ }));
    const target = screen.getByRole('button', { name: /이동 후보.*2.*1/ });
    await user.click(target);
    expect(screen.getByRole('heading', { name: '수리 미리보기' })).toBeVisible();
    expect(screen.getByText('원본 위치').parentElement).toHaveTextContent('(0, 1)');
    expect(screen.getByText('현재 위치').parentElement).toHaveTextContent('(2, 1)');
    expect(container.querySelector('[draggable="true"]')).toBeNull();

    await user.click(screen.getByRole('button', { name: '수리 확인' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      faceId: 'F6', target: { x: 2, y: 1 }, accepted: true, candidate: { faces: expect.any(Array) },
    });
  });

  it('clears selection and preview with Escape', async () => {
    const user = userEvent.setup();
    render(<RepairScreen mission={mission} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(screen.getByRole('button', { name: /이동 후보.*2.*1/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('heading', { name: '수리 미리보기' })).toBeNull();
    expect(screen.getByText(/면을 먼저 선택/)).toBeVisible();
  });

  it('reports invalid attempts without a score and keeps callback errors from claiming success', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => { throw new Error('dispatch failed'); });
    render(<RepairScreen mission={mission} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(screen.getByRole('button', { name: /이동 후보.*2.*1/ }));
    await user.click(screen.getByRole('button', { name: '수리 확인' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/점수|성공했어요/)).toBeNull();
  });
});
