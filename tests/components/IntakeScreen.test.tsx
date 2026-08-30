import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntakeScreen } from '../../src/screens/IntakeScreen';
import { loadMissionCatalog } from '../../src/content/missions/catalog';

describe('IntakeScreen redesign contract', () => {
  afterEach(cleanup);

  it('leads with the learning outcome and keeps one emphasized CTA for the first mission', () => {
    render(
      <IntakeScreen
        missions={loadMissionCatalog()}
        criticalActionId="select-mission"
        onSelectMission={vi.fn()}
      />,
    );

    expect(screen.getByRole('region', { name: '미션 안내' })).toHaveTextContent('예측하기');
    expect(screen.getByRole('region', { name: '미션 안내' })).toHaveTextContent('한 면씩 접기');
    expect(screen.getByRole('region', { name: '미션 안내' })).toHaveTextContent('근거로 설명하기');
    expect(screen.getByRole('link', { name: /첫 미션부터 시작하기/ })).toHaveAttribute('href', '#mission-group-tracking');
    expect(screen.getAllByText('미션 2개')).toHaveLength(4);

    const buttons = screen.getAllByRole('button', { name: /미션 선택$/u });
    expect(buttons).toHaveLength(8);
    expect(buttons[0]).toHaveClass('primary-action', 'gi-pulse');
    expect(buttons.slice(1).every((button) => !button.classList.contains('gi-pulse'))).toBe(true);
    expect(buttons[0]?.closest('article')).toHaveClass('is-featured');
  });

  it('labels completed missions without changing their action label', () => {
    const missions = loadMissionCatalog();
    render(
      <IntakeScreen
        missions={missions}
        completedMissionIds={[missions[0]!.id]}
        onSelectMission={vi.fn()}
      />,
    );

    const card = screen.getByRole('heading', { name: missions[0]!.title }).closest('article');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText('완료한 미션')).toBeVisible();
    expect(within(card as HTMLElement).getByRole('button', { name: `${missions[0]!.title} 미션 선택` })).toBeVisible();
  });
});
