import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHANGELOG, type IsoDate } from '../../src/content/changelog';
import { UpdateHistoryDialog } from '../../src/components/common/UpdateHistoryDialog';

const validIsoDate: IsoDate = '2026-08-27';
void validIsoDate;
// @ts-expect-error ISO dates require a four-digit year and two-digit month/day.
const invalidShortDate: IsoDate = '1-1-1';
// @ts-expect-error ISO month is limited to 01 through 12.
const invalidMonth: IsoDate = '2026-13-01';
// @ts-expect-error ISO day is limited to 01 through 31.
const invalidDay: IsoDate = '2026-01-32';
void invalidShortDate;
void invalidMonth;
void invalidDay;

describe('UpdateHistoryDialog', () => {
  afterEach(cleanup);
  it('keeps the two initial records unchanged and appends the actual work record', () => {
    expect(CHANGELOG.slice(0, 2)).toEqual([
      { date: '2026-08-26', category: '설계', summary: '최초 설계 문서 작성' },
      { date: '2026-08-26', category: '개발', summary: '정육면체 미션 8개와 판정·2D 대체 흐름 구현' },
    ]);
    expect(CHANGELOG).toHaveLength(14);
    expect(CHANGELOG[2]).toEqual({ date: '2026-08-27', category: '접근성', summary: '핵심 단계 강조·모션 감소·업데이트 내역 접근성 개선' });
    expect(CHANGELOG[3]).toEqual({ date: '2026-08-27', category: '콘텐츠', summary: '선택형 진행 저장·교육 모형 한계·오프라인 경계 추가' });
    expect(CHANGELOG[4]).toEqual({ date: '2026-08-27', category: '접근성', summary: '모바일·키보드·스크린 리더·2D 완료 흐름 검증' });
    expect(CHANGELOG[5]).toEqual({ date: '2026-08-27', category: '개발', summary: '불가능한 접기 순서 복구·중첩 링크 오프라인 경계 강화' });
    expect(CHANGELOG[6]).toEqual({ date: '2026-08-28', category: '개발', summary: '미션별 성취 상태와 근거 낱말 역할 정합성 개선' });
    expect(CHANGELOG[7]).toEqual({ date: '2026-08-28', category: '접근성', summary: '접기 제목 포커스·어린이용 방향 표현·학습 진행 표시 추가' });
    expect(CHANGELOG[8]).toEqual({ date: '2026-08-28', category: '기하 엔진', summary: '3D 보조 보기의 장면 중심과 읽을 수 있는 확대 계산 개선' });
    expect(CHANGELOG[9]).toEqual({ date: '2026-08-28', category: '콘텐츠', summary: '완료 화면의 배운 점·다음에는 요약과 모바일 비교표 개선' });
    expect(CHANGELOG[10]).toEqual({ date: '2026-08-28', category: '접근성', summary: 'VoiceOver 구현·검증 제외 범위와 자동화 접근성 기준 명시' });
    expect(CHANGELOG[11]).toEqual({ date: '2026-08-29', category: '개발', summary: '학습 목적·단계 진행·미션 카드 위계를 정리하고 접기 조작 표면 개선' });
    expect(CHANGELOG[12]).toEqual({ date: '2026-08-30', category: '개발', summary: '미션별 진행 단계와 수리 화면 표현을 학습자 중심으로 정리' });
    expect(CHANGELOG[13]).toEqual({ date: '2026-08-30', category: '접근성', summary: '모바일 단계 게이트·어린이용 면 이름·진단 방향 비교를 명확하게 개선' });
    expect(Object.isFrozen(CHANGELOG[13])).toBe(true);
    const { unmount } = render(<UpdateHistoryDialog open onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: '업데이트 내역' });
    expect(dialog.querySelectorAll('time')).toHaveLength(14);
    expect(dialog).toHaveTextContent('설계');
    expect(dialog).toHaveTextContent('개발');
    expect(dialog).toHaveTextContent('최초 설계 문서 작성');
    expect(dialog).toHaveTextContent('정육면체 미션 8개와 판정·2D 대체 흐름 구현');
    expect(dialog).toHaveTextContent('핵심 단계 강조·모션 감소·업데이트 내역 접근성 개선');
    expect(dialog).toHaveTextContent('모바일·키보드·스크린 리더·2D 완료 흐름 검증');
    expect(dialog).toHaveTextContent('불가능한 접기 순서 복구·중첩 링크 오프라인 경계 강화');
    expect(dialog).toHaveTextContent('미션별 성취 상태와 근거 낱말 역할 정합성 개선');
    expect(dialog).toHaveTextContent('접기 제목 포커스·어린이용 방향 표현·학습 진행 표시 추가');
    expect(dialog).toHaveTextContent('3D 보조 보기의 장면 중심과 읽을 수 있는 확대 계산 개선');
    expect(dialog).toHaveTextContent('완료 화면의 배운 점·다음에는 요약과 모바일 비교표 개선');
    expect(dialog).toHaveTextContent('VoiceOver 구현·검증 제외 범위와 자동화 접근성 기준 명시');
    expect(dialog).toHaveTextContent('학습 목적·단계 진행·미션 카드 위계를 정리하고 접기 조작 표면 개선');
    expect(dialog).toHaveTextContent('미션별 진행 단계와 수리 화면 표현을 학습자 중심으로 정리');
    expect(dialog.querySelector('time')).toHaveAttribute('dateTime', '2026-08-26');
    unmount();
  });

  it('focuses the title on open, closes on Escape or close, and returns to the opener once', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    function Harness(): React.JSX.Element {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>업데이트 내역 열기</button>
          <UpdateHistoryDialog open={open} onClose={() => { onClose(); setOpen(false); }} />
        </>
      );
    }
    const { container } = render(<Harness />);
    const opener = screen.getByRole('button', { name: '업데이트 내역 열기' });
    const dialogElement = container.querySelector('dialog') as HTMLDialogElement;
    const showModal = vi.fn(function showModal(this: HTMLDialogElement): void { this.setAttribute('open', ''); });
    const close = vi.fn(function close(this: HTMLDialogElement): void { this.removeAttribute('open'); });
    Object.defineProperty(dialogElement, 'showModal', { configurable: true, value: showModal });
    Object.defineProperty(dialogElement, 'close', { configurable: true, value: close });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: '업데이트 내역' });
    expect(showModal).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(dialog.querySelector('h2')).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(opener).toHaveFocus());
    expect(container.querySelector('dialog')).not.toHaveAttribute('open');

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('handles a native cancel event once and restores focus when unmounted open', async () => {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = '외부 열기 버튼';
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();
    const view = render(<UpdateHistoryDialog open onClose={onClose} />);
    const dialog = view.container.querySelector('dialog') as HTMLDialogElement;
    await waitFor(() => expect(dialog.querySelector('h2')).toHaveFocus());
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
