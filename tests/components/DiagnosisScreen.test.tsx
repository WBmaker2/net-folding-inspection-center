import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getMissionById } from '../../src/content/missions/catalog';
import type { TrackingMissionDefinition } from '../../src/domain/learning/types';
import { evaluateDecorationOrientation } from '../../src/domain/net/decoration';
import { createFoldSequence } from '../../src/domain/net/foldEngine';
import { validateCubeNet } from '../../src/domain/net/validateCubeNet';
import { DiagnosisScreen } from '../../src/screens/DiagnosisScreen';

afterEach(cleanup);

const collisionMission = getMissionById('cube-collision-01');
const trackingMission = getMissionById('cube-track-01') as TrackingMissionDefinition;
const collisionValidation = validateCubeNet(collisionMission.net, 'F1');
const trackingValidation = validateCubeNet(trackingMission.net, 'F1');
const trackingDecoration = evaluateDecorationOrientation(
  trackingMission.net.faces.find((face) => face.id === 'F3')!,
  trackingValidation.frames.get('F3')!,
  trackingMission.answer.decorationTarget.targetWorldUp,
);
const trackingSequence = createFoldSequence(
  trackingMission.net,
  'F1',
  trackingMission.suggestedFoldOrder,
);

describe('DiagnosisScreen', () => {
  it('keeps the three error types separate and requires type, faces, and direction in order', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DiagnosisScreen mission={collisionMission} validation={collisionValidation} onSubmit={onSubmit} />);

    expect(screen.getByRole('heading', { name: '접힌 결과 진단하기' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: '두 면이 같은 자리에 겹쳐요' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '빈 면이 생겨요' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '무늬 방향이 달라요' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '진단 확인' })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: '두 면이 같은 자리에 겹쳐요' }));
    expect(screen.queryByRole('radio', { name: '+x 방향' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /2번 면/ }));
    expect(screen.getByRole('button', { name: '진단 확인' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /6번 면/ }));
    expect(screen.getByRole('button', { name: '진단 확인' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: '오른쪽 방향' }));
    expect(screen.getByRole('button', { name: '진단 확인' })).toBeEnabled();
  });

  it('accepts only the exact collision pair and recomputed missing direction, with no repair coordinates', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DiagnosisScreen mission={collisionMission} validation={collisionValidation} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('radio', { name: '두 면이 같은 자리에 겹쳐요' }));
    await user.click(screen.getByRole('button', { name: /2번 면/ }));
    await user.click(screen.getByRole('button', { name: /6번 면/ }));
    await user.click(screen.getByRole('radio', { name: '오른쪽 방향' }));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));

    expect(onSubmit).toHaveBeenCalledWith({
      selectedErrorType: 'overlap',
      selectedFaceIds: ['F2', 'F6'],
      selectedMissingDirection: '+x',
    });
    expect(screen.getByRole('status')).toHaveTextContent('2번 면과 6번 면이 같은 공간을 차지합니다.');
    expect(screen.getByRole('status')).toHaveTextContent('비어 있는 방향은 오른쪽 방향입니다.');
    expect(screen.getByRole('status')).not.toHaveTextContent('법선');
    expect(screen.queryByText(/옮기면|좌표|x:|y:/u)).not.toBeInTheDocument();
    const visual = screen.getByRole('region', { name: '겹침 진단 시각화' });
    expect(visual).toHaveTextContent('2번 면, 노란색, 사각형');
    expect(visual).toHaveTextContent('6번 면, 청록색, 십자');
    expect(visual).toHaveAccessibleName('겹침 진단 시각화');
    expect(visual).toHaveTextContent('비어 있는 방향 윤곽: 오른쪽 방향');
    expect(visual).not.toHaveTextContent('+x');
  });

  it('preserves wrong attempts and offers the first shared-normal fold step', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onReturn = vi.fn();
    render(
      <DiagnosisScreen
        mission={collisionMission}
        validation={collisionValidation}
        foldSequence={trackingSequence}
        onSubmit={onSubmit}
        onReturnToFoldStep={onReturn}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '두 면이 같은 자리에 겹쳐요' }));
    await user.click(screen.getByRole('button', { name: /1번 면/ }));
    await user.click(screen.getByRole('button', { name: /2번 면/ }));
    await user.click(screen.getByRole('radio', { name: '왼쪽 방향' }));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('같은 방향이 되는 단계가 없어 처음부터 다시 살펴보세요.');
    expect(screen.getByRole('status')).not.toHaveTextContent('법선');
    await user.click(screen.getByRole('button', { name: '접기 단계 되돌아보기' }));
    expect(onReturn).toHaveBeenCalledWith(expect.any(Number));
  });

  it('explains decoration actual and target directions in a separate panel', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DiagnosisScreen
        mission={trackingMission}
        validation={trackingValidation}
        decoration={trackingDecoration}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '무늬 방향이 달라요' }));
    await user.click(screen.getByRole('button', { name: /3번 면/ }));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(screen.getByRole('status')).toHaveTextContent('3번 면의 실제 장식 방향은 위 방향, 목표 방향은 위 방향입니다.');
    expect(screen.getByRole('status')).not.toHaveTextContent('+y');
    expect(screen.getByRole('region', { name: '전개도 유효성 검사' })).toHaveTextContent('전개도 검사');
  });

  it('fails closed when decoration is missing or validation is mismatched, and does not claim callback success', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => { throw new Error('record failed'); });
    render(
      <DiagnosisScreen
        mission={trackingMission}
        validation={trackingValidation}
        decoration={trackingDecoration}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '무늬 방향이 달라요' }));
    await user.click(screen.getByRole('button', { name: /3번 면/ }));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(screen.queryByText(/장식이 .*향합니다/u)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('기록하지 못했습니다');
  });

  it('does not dispatch when tracking decoration context is absent', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DiagnosisScreen mission={trackingMission} validation={trackingValidation} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('radio', { name: '무늬 방향이 달라요' }));
    await user.click(screen.getByRole('button', { name: /3번 면/ }));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('검사 결과를 확인할 수 없어');
  });

  it('rejects a supplied decoration mismatch and malformed validation without dispatching an attempt', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DiagnosisScreen
        mission={trackingMission}
        validation={{ ...trackingValidation, collisions: null } as never}
        decoration={{ ...trackingDecoration, worldUp: '-y' }}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '무늬 방향이 달라요' }));
    await user.click(screen.getByRole('button', { name: /3번 면/ }));
    await user.click(screen.getByRole('button', { name: '진단 확인' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('검사 결과를 확인할 수 없어');
  });
});
