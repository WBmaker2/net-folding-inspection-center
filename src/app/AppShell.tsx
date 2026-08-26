import type { ReactNode } from 'react';

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
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
          <details className="update-history">
            <summary>업데이트 내역</summary>
            <div className="update-history-panel">
              <p>
                <time dateTime="2026-08-26">2026-08-26</time> · 설계 · 최초 설계 문서 작성
              </p>
              <p>
                <time dateTime="2026-08-26">2026-08-26</time> · 개발 · 검수소 셸과 실행 기반 추가
              </p>
            </div>
          </details>
        </div>
      </footer>
    </>
  );
}
