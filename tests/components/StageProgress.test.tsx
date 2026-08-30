import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StageProgress } from '../../src/components/common/StageProgress';

describe('StageProgress', () => {
  afterEach(cleanup);

  it('exposes the current stage as text and a non-visual progress proportion', () => {
    render(<StageProgress current={3} total={6} label="접기" />);

    const progress = screen.getByRole('navigation', { name: '학습 진행' });
    expect(progress).toHaveTextContent('3 / 6 · 접기');
    expect(progress).toHaveAttribute('data-progress', '50');
    const track = progress.querySelector('[aria-hidden="true"]');
    expect(track).not.toBeNull();
    expect(track?.querySelector('.stage-progress-fill')).toHaveStyle({ transform: 'scaleX(0.5)' });
  });

  it('clamps invalid stage values without exposing a broken percentage', () => {
    render(<StageProgress current={9} total={0} label="완료" />);

    const progress = screen.getByRole('navigation', { name: '학습 진행' });
    expect(progress).toHaveTextContent('9 / 0 · 완료');
    expect(progress).toHaveAttribute('data-progress', '0');
  });
});
