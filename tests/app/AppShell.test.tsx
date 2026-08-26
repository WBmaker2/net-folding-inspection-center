import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App';

const layoutStyles = readFileSync(
  'src/styles/layout.css',
  'utf8',
);

describe('AppShell', () => {
  it('shows the Korean inspection center introduction', () => {
    render(<App />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: '검수 접수', level: 1 })).toBeVisible();
    expect(screen.getByText('예측한 뒤 한 면씩 접어 보세요.')).toBeVisible();
  });

  it('keeps update history at the bottom-right on narrow screens', () => {
    expect(layoutStyles).toMatch(
      /\.update-history\s*\{\s*align-self:\s*flex-end;\s*\}/,
    );
    expect(layoutStyles).toContain(
      'padding-bottom: max(0.75rem, env(safe-area-inset-bottom));',
    );
  });
});
