import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PrimaryAction } from '../../src/components/common/PrimaryAction';

describe('PrimaryAction', () => {
  afterEach(cleanup);
  it('preserves native props, caller classes, and ref while marking the current action', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <PrimaryAction
        ref={ref}
        actionId="submit-prediction"
        criticalActionId="submit-prediction"
        className="custom-action"
        aria-label="예측 제출"
        data-testid="submit"
      >
        제출
      </PrimaryAction>,
    );
    const button = screen.getByTestId('submit');
    expect(button).toHaveClass('custom-action', 'gi-pulse');
    expect(button).toHaveAttribute('aria-label', '예측 제출');
    expect(ref.current).toBe(button);
  });

  it('does not pulse disabled, unavailable, or stale actions', () => {
    render(
      <>
        <PrimaryAction actionId="submit-prediction" criticalActionId="submit-prediction" disabled>
          disabled
        </PrimaryAction>
        <PrimaryAction actionId="submit-prediction" criticalActionId="submit-prediction" available={false}>
          unavailable
        </PrimaryAction>
        <PrimaryAction actionId="next-fold" criticalActionId="submit-prediction">
          stale
        </PrimaryAction>
      </>,
    );
    expect(document.querySelectorAll('.gi-pulse')).toHaveLength(0);
  });

  it('does not pulse when a standalone caller omits the selector result', () => {
    render(<PrimaryAction actionId="submit-prediction">제출</PrimaryAction>);
    expect(document.querySelectorAll('.gi-pulse')).toHaveLength(0);
  });
});
