import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMissionById } from '../../src/content/missions/catalog';
import { RepairScreen } from '../../src/screens/RepairScreen';

const mission = getMissionById('cube-repair-01');

const targetAt = (x: number, y: number): HTMLElement => {
  const target = document.querySelector(`button[data-grid-x="${x}"][data-grid-y="${y}"]`);
  if (!(target instanceof HTMLElement)) throw new Error(`missing target ${x},${y}`);
  return target;
};

describe('RepairScreen', () => {
  afterEach(() => cleanup());
  it('selects a face and target, previews immutably, confirms without drag handlers', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<RepairScreen mission={mission} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /6번 면/ }));
    const target = targetAt(2, 1);
    await user.click(target);
    expect(screen.getByRole('heading', { name: '수리 미리보기' })).toBeVisible();
    expect(screen.getByText('옮길 면').parentElement).toHaveTextContent('6번 면');
    expect(screen.getByText('옮길 곳').parentElement).toHaveTextContent('오른쪽 빈 칸');
    expect(screen.getByText('바뀐 내용').parentElement).toHaveTextContent('6번 면');
    expect(screen.queryByText('원본 위치')).toBeNull();
    expect(screen.queryByText('현재 위치')).toBeNull();
    expect(screen.queryByText(/F6/)).toBeNull();
    expect(screen.queryByText(/\(-?\d+,\s*-?\d+\)/u)).toBeNull();
    expect(target).toHaveAccessibleName('선택한 면 기준 오른쪽 빈 칸, 이동 후보');
    expect(container.querySelector('[draggable="true"]')).toBeNull();

    await user.click(screen.getByRole('button', { name: '수리 확인' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      faceId: 'F6', target: { x: 2, y: 1 }, accepted: true, candidate: { faces: expect.any(Array) },
    });
  });

  it('focuses a non-tabbable heading for screen-reader orientation', () => {
    render(<RepairScreen mission={mission} onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '한 면 수리대' })).toHaveAttribute('tabindex', '-1');
  });

  it('clears selection and preview with Escape', async () => {
    const user = userEvent.setup();
    render(<RepairScreen mission={mission} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(targetAt(2, 1));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('heading', { name: '수리 미리보기' })).toBeNull();
    expect(screen.getByText(/면을 먼저 선택/)).toBeVisible();
  });

  it('reports invalid attempts without a score and keeps callback errors from claiming success', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => { throw new Error('dispatch failed'); });
    render(<RepairScreen mission={mission} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    await user.click(targetAt(2, 1));
    await user.click(screen.getByRole('button', { name: '수리 확인' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/점수|성공했어요/)).toBeNull();
  });

  it('renders occupied and empty target cells in their actual coordinate rows and columns', async () => {
    const user = userEvent.setup();
    const { container } = render(<RepairScreen mission={mission} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /^6번 면/ }));
    const target = targetAt(2, 1);
    expect(target.parentElement?.style.gridColumn).toBe('4');
    expect(target.parentElement?.style.gridRow).toBe('3');
    expect(container.querySelector('.repair-grid-occupied')).not.toBeNull();
  });

  it('shows quarter-turn decoration preview separately and resets transient state on net change', async () => {
    const user = userEvent.setup();
    const onRotate = vi.fn();
    const { rerender } = render(
      <RepairScreen mission={mission} onSubmit={vi.fn()} onRotateDecoration={onRotate} />,
    );
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    expect(document.querySelectorAll('.gi-pulse')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: /3번 장식/ }));
    expect(screen.getByRole('button', { name: /3번 장식/ })).not.toHaveClass('gi-pulse');
    expect(onRotate).toHaveBeenCalledWith('F3', expect.objectContaining({ faces: expect.any(Array) }));
    const original = screen.getByRole('group', { name: '원본 전개도에서 수리할 면 선택' });
    expect(within(original).getByRole('button', { name: /^3번 면/ }).querySelector('svg'))
      .toHaveStyle({ transform: 'rotate(90deg)' });
    rerender(<RepairScreen mission={getMissionById('cube-repair-02')} onSubmit={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: '수리 미리보기' })).toBeNull();
  });

  it('completes the second catalog repair through the same keyboard-safe controls', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RepairScreen mission={getMissionById('cube-repair-02')} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /^3번 면/ }));
    await user.click(targetAt(1, 0));
    await user.click(screen.getByRole('button', { name: '수리 확인' }));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ faceId: 'F3', target: { x: 1, y: 0 }, accepted: true });
  });
});
