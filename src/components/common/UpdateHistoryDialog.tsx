import { useEffect, useRef } from 'react';
import { CHANGELOG } from '../../content/changelog';

export interface UpdateHistoryDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function UpdateHistoryDialog({ open, onClose }: UpdateHistoryDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open) {
      if (!wasOpenRef.current) {
        const active = document.activeElement;
        openerRef.current = active instanceof HTMLElement ? active : null;
      }
      wasOpenRef.current = true;
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          try {
            dialog.showModal();
          } catch {
            dialog.setAttribute('open', '');
          }
        } else {
          dialog.setAttribute('open', '');
        }
      }
      titleRef.current?.focus();
      return;
    }
    if (dialog.open) {
      if (typeof dialog.close === 'function') {
        try {
          dialog.close();
        } catch {
          dialog.removeAttribute('open');
        }
      } else {
        dialog.removeAttribute('open');
      }
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener !== null && opener.isConnected) opener.focus();
    }
  }, [open]);

  const closeFromDialog = (event: React.MouseEvent<HTMLDialogElement>): void => {
    if (event.target === event.currentTarget) onClose();
  };

  const closeFromEscape = (event: React.KeyboardEvent<HTMLDialogElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="update-history-dialog"
      aria-labelledby="update-history-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={closeFromDialog}
      onKeyDown={closeFromEscape}
    >
      <div className="update-history-dialog-content">
        <h2 id="update-history-title" ref={titleRef} tabIndex={-1}>업데이트 내역</h2>
        <ol className="update-history-list">
          {CHANGELOG.map((entry) => (
            <li key={`${entry.date}-${entry.category}-${entry.summary}`}>
              <time dateTime={entry.date}>{entry.date}</time>
              <span className="update-history-category">{entry.category}</span>
              <span>{entry.summary}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="update-history-close" onClick={onClose}>닫기</button>
      </div>
    </dialog>
  );
}
