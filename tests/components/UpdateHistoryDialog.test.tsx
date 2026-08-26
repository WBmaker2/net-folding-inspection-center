import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHANGELOG } from '../../src/content/changelog';
import { UpdateHistoryDialog } from '../../src/components/common/UpdateHistoryDialog';

describe('UpdateHistoryDialog', () => {
  afterEach(cleanup);
  it('keeps the two initial records unchanged and appends the actual work record', () => {
    expect(CHANGELOG.slice(0, 2)).toEqual([
      { date: '2026-08-26', category: '설계', summary: '최초 설계 문서 작성' },
      { date: '2026-08-26', category: '개발', summary: '정육면체 미션 8개와 판정·2D 대체 흐름 구현' },
    ]);
    expect(CHANGELOG).toHaveLength(3);
    expect(CHANGELOG[2]).toEqual({ date: '2026-08-27', category: '접근성', summary: '핵심 단계 강조·모션 감소·업데이트 내역 접근성 개선' });
    const { unmount } = render(<UpdateHistoryDialog open onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: '업데이트 내역' });
    expect(dialog.querySelectorAll('time')).toHaveLength(3);
    expect(dialog).toHaveTextContent('설계');
    expect(dialog).toHaveTextContent('개발');
    expect(dialog).toHaveTextContent('최초 설계 문서 작성');
    expect(dialog).toHaveTextContent('정육면체 미션 8개와 판정·2D 대체 흐름 구현');
    expect(dialog).toHaveTextContent('핵심 단계 강조·모션 감소·업데이트 내역 접근성 개선');
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
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: '업데이트 내역' });
    await waitFor(() => expect(dialog.querySelector('h2')).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(opener).toHaveFocus());
    expect(container.querySelector('dialog')).not.toHaveAttribute('open');

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
