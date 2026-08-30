import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
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

  it('shows the exact model boundary and leaves optional saving unchecked by default', () => {
    render(<App />);
    expect(screen.getByText(
      '이 가상 접기는 면의 연결 관계를 보여 주는 기하 모형이며 실제 종이의 두께·휘어짐·포장 강도·안전성을 보장하지 않습니다.',
      { exact: true },
    )).toBeVisible();
    expect(screen.getByLabelText('이 탭에서 새로고침 후에도 진행 저장')).not.toBeChecked();
  });

  it('shows stage progress and lets a learner return to mission selection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '면 위치 추적 1 미션 선택' }));

    expect(screen.getByText('2 / 6 · 예측')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '미션 다시 고르기' }));
    expect(screen.getByRole('heading', { name: '검수 접수' })).toBeVisible();
    expect(screen.queryByText('2 / 6 · 예측')).not.toBeInTheDocument();
  });

  it('shows the shorter progress path for an opposite-face mission', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '맞은편 면 찾기 1 미션 선택' }));

    expect(screen.getByText('2 / 5 · 예측')).toBeVisible();
    expect(screen.queryByText('2 / 6 · 예측')).not.toBeInTheDocument();
  });

  it('shows the repair path before diagnosis and evidence for a collision mission', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '겹침 경보 1 미션 선택' }));

    expect(screen.getByText('2 / 7 · 예측')).toBeVisible();
  });
});
