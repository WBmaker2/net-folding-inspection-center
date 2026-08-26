import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getMissionById } from '../../src/content/missions/catalog';
import type { PredictionRecord } from '../../src/domain/net/types';
import { FoldingScreen } from '../../src/screens/FoldingScreen';

afterEach(cleanup);

const mission = getMissionById('cube-track-01');
const prediction: PredictionRecord = {
  baseFaceId: 'F1',
  predictedTopFaceId: 'F3',
  foldOrder: ['F2', 'F3', 'F4', 'F5', 'F6'],
  arrowByFace: {
    F2: 'north', F3: 'east', F4: 'south', F5: 'west', F6: 'north',
  },
  submittedAtIso: '2026-08-26T00:00:00.000Z',
};

const renderFolding = (props: Partial<React.ComponentProps<typeof FoldingScreen>> = {}) => (
  render(<FoldingScreen mission={mission} prediction={prediction} {...props} />)
);

describe('FoldingScreen', () => {
  it('reveals one fold at a time and keeps previous/next at the boundaries', async () => {
    const user = userEvent.setup();
    renderFolding();

    expect(screen.getByText('0 / 5면 접힘')).toBeVisible();
    expect(screen.getByRole('button', { name: '이전 접기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음 면 접기' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '다음 면 접기' }));
    expect(screen.getByText('1 / 5면 접힘')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('2번 면이 기준면의 위쪽 모서리를 따라 접혔습니다.');

    await user.click(screen.getByRole('button', { name: '이전 접기' }));
    expect(screen.getByText('0 / 5면 접힘')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('접기 전 상태로 돌아왔습니다.');
    await user.click(screen.getByRole('button', { name: '이전 접기' }));
    expect(screen.getByText('0 / 5면 접힘')).toBeVisible();
  });

  it('uses one native range for the same step state and completes through 2D only', async () => {
    const onComplete = vi.fn();
    const onStepChange = vi.fn();
    renderFolding({ onComplete, onStepChange });

    const range = screen.getByRole('slider', { name: '접기 단계' });
    expect(range).toHaveAttribute('min', '0');
    expect(range).toHaveAttribute('max', '5');
    range.focus();
    fireEvent.change(range, { target: { value: '5' } });
    expect(screen.getByText('5 / 5면 접힘')).toBeVisible();
    expect(range).toHaveValue('5');
    expect(onStepChange).toHaveBeenLastCalledWith(5);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    const table = screen.getByRole('table', { name: '완성된 면 관계' });
    expect(table).toBeVisible();
    expect(table).toHaveTextContent('맞은편');
    expect(table).not.toHaveTextContent('아직 접지 않음');
    expect(screen.getByRole('button', { name: '다음 면 접기' })).toBeDisabled();
  });

  it('does not leak final direction or opposite answers before the row is settled', async () => {
    const user = userEvent.setup();
    renderFolding();
    const table = screen.getByRole('table', { name: '완성된 면 관계' });
    expect(within(table).getAllByText('아직 접지 않음')).toHaveLength(16);
    expect(within(table).queryByRole('columnheader', { name: '맞은편' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음 면 접기' }));
    expect(within(table).getByRole('row', { name: /3번 면/ })).toHaveTextContent('아직 접지 않음');
    expect(within(table).getByRole('row', { name: /2번 면/ })).toHaveTextContent('위쪽 면');
  });

  it('emphasizes only the current moving and hinge faces in one-face view while base stays marked', async () => {
    const user = userEvent.setup();
    renderFolding();
    await user.click(screen.getByRole('button', { name: '다음 면 접기' }));
    await user.click(screen.getByRole('checkbox', { name: '한 면씩 보기' }));
    const table = screen.getByRole('table', { name: '완성된 면 관계' });
    expect(within(table).getByRole('row', { name: /1번 면/ })).toHaveClass('is-base');
    expect(within(table).getByRole('row', { name: /2번 면/ })).toHaveClass('is-focused');
    expect(within(table).getByRole('row', { name: /3번 면/ })).not.toHaveClass('is-focused');
  });

  it('connects model limits to the fold status and controls', () => {
    renderFolding();
    const note = screen.getByText(/실제 종이의 두께·휘어짐/);
    expect(note).toHaveAttribute('id', 'folding-model-boundary');
    expect(screen.getByRole('region', { name: '한 면씩 접기' })).toHaveAttribute(
      'aria-describedby',
      'folding-model-boundary',
    );
    expect(screen.getByRole('slider', { name: '접기 단계' })).toHaveAttribute(
      'aria-describedby',
      'folding-model-boundary',
    );
  });

  it('marks reduced-motion mode and still changes to the completed snapshot immediately', async () => {
    const user = userEvent.setup();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as typeof window.matchMedia;
    try {
      const { container } = renderFolding();
      expect(container.querySelector('[data-motion-mode="instant"]')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '다음 면 접기' }));
      expect(screen.getByText('1 / 5면 접힘')).toBeVisible();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
