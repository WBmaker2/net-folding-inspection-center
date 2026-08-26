import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getMissionById } from '../../src/content/missions/catalog';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';
import { EvidenceScreen } from '../../src/screens/EvidenceScreen';

afterEach(cleanup);

describe('EvidenceScreen', () => {
  it('generates the plan sentence from relationship then path selects', async () => {
    const user = userEvent.setup();
    const mission = getMissionById('cube-opposite-01');
    const onSubmit = vi.fn();
    render(<EvidenceScreen mission={mission} validation={validateCubeNet(mission.net, 'F1')} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: '1번 면' }));
    await user.click(screen.getByRole('button', { name: '3번 면' }));
    await user.selectOptions(screen.getByLabelText('첫 번째 기하 낱말'), '맞은편');
    await user.selectOptions(screen.getByLabelText('두 번째 기하 낱말'), '접는 방향');
    expect(screen.getByText('1번 면과 3번 면은 접는 방향을 따라가면 서로 맞은편이 됩니다.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    expect(onSubmit).toHaveBeenCalledWith({
      oppositePair: { a: 'F1', b: 'F3' },
      selectedTerms: ['맞은편', '접는 방향'],
      completedSentence: '1번 면과 3번 면은 접는 방향을 따라가면 서로 맞은편이 됩니다.',
    });
    expect(screen.getByRole('button', { name: '미션 완료 확인' })).toBeInTheDocument();
  });

  it('does not claim callback success when submission throws', async () => {
    const user = userEvent.setup();
    const mission = getMissionById('cube-opposite-01');
    render(<EvidenceScreen mission={mission} onSubmit={() => { throw new Error('no'); }} />);
    await user.click(screen.getByRole('button', { name: '1번 면' }));
    await user.click(screen.getByRole('button', { name: '3번 면' }));
    await user.selectOptions(screen.getByLabelText('첫 번째 기하 낱말'), '맞은편');
    await user.selectOptions(screen.getByLabelText('두 번째 기하 낱말'), '접는 방향');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    expect(screen.getByRole('alert')).toHaveTextContent('기록하지 못했습니다');
    expect(screen.queryByRole('button', { name: '미션 완료 확인' })).not.toBeInTheDocument();
  });
});
