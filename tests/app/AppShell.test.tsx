import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../src/App';

const layoutStyles = readFileSync(
  'src/styles/layout.css',
  'utf8',
);
const componentStyles = readFileSync(
  'src/styles/components.css',
  'utf8',
);

describe('AppShell', () => {
  afterEach(cleanup);
  it('shows the Korean inspection center introduction', () => {
    render(<App />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: '검수 접수', level: 1 })).toBeVisible();
    expect(screen.getByText('예측한 뒤 한 면씩 접어 보세요.')).toBeVisible();
  });

  it('keeps update history at the bottom-right on narrow screens', () => {
    expect(layoutStyles).toContain(
      'padding-bottom: max(0.75rem, env(safe-area-inset-bottom));',
    );
    expect(componentStyles).toContain('.update-history-trigger {');
    expect(componentStyles).toContain('right: calc(env(safe-area-inset-right) + 16px);');
    expect(componentStyles).toContain('bottom: calc(env(safe-area-inset-bottom) + 16px);');
    expect(componentStyles).toContain('@media (max-width: 520px)');
    expect(componentStyles).toContain('position: static;');
  });

  it('keeps the mobile update trigger in the footer flow', () => {
    render(<App />);
    const trigger = screen.getByRole('button', { name: '업데이트 내역' });
    expect(trigger.closest('footer')).not.toBeNull();
  });
});
