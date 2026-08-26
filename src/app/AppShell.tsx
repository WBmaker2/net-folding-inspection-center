import type { ReactNode } from 'react';
import { useState } from 'react';
import { UpdateHistoryDialog } from '../components/common/UpdateHistoryDialog';

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <>
      <header className="site-header">
        <div className="shell-width header-content">
          <span className="service-mark" aria-hidden="true">
            ◇
          </span>
          <p className="service-label">전개도 포장 검수소</p>
        </div>
      </header>
      <main id="main-content" className="shell-width main-content">
        {children}
      </main>
      <footer className="site-footer">
        <div className="shell-width footer-content">
          <p>천천히 접고, 모서리와 면의 관계를 살펴보세요.</p>
        </div>
      </footer>
      <button
        type="button"
        className="update-history-trigger"
        aria-haspopup="dialog"
        onClick={() => setHistoryOpen(true)}
      >
        업데이트 내역
      </button>
      <UpdateHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
