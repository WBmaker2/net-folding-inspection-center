import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getMissionById } from '../../src/content/missions/catalog';
import { getEvidenceContext, expectedEvidenceSentence } from '../../src/domain/learning/evidence';
import { moveFace } from '../../src/domain/learning/repair';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';
import type { RepairMissionDefinition } from '../../src/domain/learning/types';
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

  it('pulses one critical button at a time and guards repeated callbacks', async () => {
    const user = userEvent.setup();
    const mission = getMissionById('cube-opposite-01');
    const onSubmit = vi.fn();
    const onComplete = vi.fn();
    render(<EvidenceScreen mission={mission} onSubmit={onSubmit} onComplete={onComplete} />);
    await user.click(screen.getByRole('button', { name: '1번 면' }));
    await user.click(screen.getByRole('button', { name: '3번 면' }));
    await user.selectOptions(screen.getByLabelText('첫 번째 기하 낱말'), '맞은편');
    await user.selectOptions(screen.getByLabelText('두 번째 기하 낱말'), '접는 방향');
    expect(document.querySelectorAll('.gi-pulse')).toHaveLength(1);
    await user.dblClick(screen.getByRole('button', { name: '근거 확인' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('.gi-pulse')).toHaveLength(1);
    await user.dblClick(screen.getByRole('button', { name: '미션 완료 확인' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('.gi-pulse')).toHaveLength(0);
    expect(screen.getByRole('button', { name: '미션 완료 확인' })).toBeDisabled();
  });

  it('does not submit when the supplied validation is stale', async () => {
    const user = userEvent.setup();
    const mission = getMissionById('cube-opposite-01');
    const stale = { ...validateCubeNet(mission.net, 'F1'), missingNormals: ['+x'] } as ReturnType<typeof validateCubeNet>;
    const onSubmit = vi.fn();
    render(<EvidenceScreen mission={mission} validation={stale} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: '1번 면' }));
    await user.click(screen.getByRole('button', { name: '3번 면' }));
    await user.selectOptions(screen.getByLabelText('첫 번째 기하 낱말'), '맞은편');
    await user.selectOptions(screen.getByLabelText('두 번째 기하 낱말'), '접는 방향');
    await user.click(screen.getByRole('button', { name: '근거 확인' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('검사 결과를 확인할 수 없어');
  });

  it('uses the base face as repair-02 relation subject in preview', async () => {
    const user = userEvent.setup();
    const mission = getMissionById('cube-repair-02') as RepairMissionDefinition;
    const validation = validateCubeNet(mission.net, mission.baseFaceId);
    const diagnosis = {
      selectedErrorType: 'overlap' as const,
      selectedFaceIds: [...validation.collisions[0]!.faceIds],
      selectedMissingDirection: validation.missingNormals[0],
    };
    const repair = {
      faceId: mission.answer.repairMove.faceId,
      target: mission.answer.repairMove.to,
      accepted: true,
      candidate: moveFace(mission.net, mission.answer.repairMove.faceId, mission.answer.repairMove.to),
    };
    const context = getEvidenceContext(mission, { validation, diagnosis, repair });
    const pair = context.pairCandidates.find((candidate) => (
      candidate.a === context.baseFaceId || candidate.b === context.baseFaceId
    ))!;
    const expected = expectedEvidenceSentence(mission, {
      oppositePair: pair,
      selectedTerms: ['맞은편', '겹침'],
      completedSentence: '',
    }, context)!;
    const onSubmit = vi.fn();
    render(<EvidenceScreen mission={mission} validation={validation} diagnosis={diagnosis} repair={repair} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: '1번 면' }));
    await user.click(screen.getByRole('button', { name: '3번 면' }));
    await user.selectOptions(screen.getByLabelText('첫 번째 기하 낱말'), '맞은편');
    await user.selectOptions(screen.getByLabelText('두 번째 기하 낱말'), '겹침');
    expect(expected).toBe('3번 면을 옮기면 겹침이 사라지고 1번 면의 맞은편 관계를 확인할 수 있습니다.');
    expect(screen.getByText(expected)).toBeVisible();
    expect(screen.queryByText(/3번 면의 맞은편/u)).not.toBeInTheDocument();
  });
});
