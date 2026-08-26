import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App';

describe('AppShell', () => {
  it('shows the Korean inspection center introduction', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: '전개도 포장 검수소',
        level: 1,
      }),
    ).toBeVisible();
    expect(screen.getByText('예측한 뒤 한 면씩 접어 보세요.')).toBeVisible();
  });
});
