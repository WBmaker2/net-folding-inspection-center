import type { ReactNode } from 'react';
import { useState } from 'react';
import { StageProgress } from '../components/common/StageProgress';
import { UpdateHistoryDialog } from '../components/common/UpdateHistoryDialog';

export interface AppStageMeta {
  readonly current: number;
  readonly total: number;
  readonly label: string;
  readonly canReselect: boolean;
}

export interface AppShellProps {
  readonly children: ReactNode;
  readonly storageOptIn: boolean;
  readonly onStorageOptInChange: (enabled: boolean) => void;
  readonly restoredFromStore?: boolean;
  readonly persistenceNotice?: string | null;
  readonly stageMeta?: AppStageMeta;
  readonly onReselectMission?: () => void;
}

export function AppShell({
  children,
  storageOptIn,
  onStorageOptInChange,
  restoredFromStore = false,
  persistenceNotice = null,
  stageMeta,
  onReselectMission,
}: AppShellProps): React.JSX.Element {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <header className="site-header">
        <div className="shell-width header-content">
          <div className="brand-lockup">
            <span className="service-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" focusable="false">
                <path d="M16 3 29 16 16 29 3 16Z" />
                <path d="M16 9 23 16 16 23 9 16Z" />
              </svg>
            </span>
            <div className="header-meta">
              <p className="service-label">전개도 포장 검수소</p>
              <p className="service-tagline">면과 모서리의 관계를 천천히 살펴봐요</p>
            </div>
          </div>
          {stageMeta !== undefined && <StageProgress {...stageMeta} />}
          {stageMeta?.canReselect && onReselectMission !== undefined && (
            <button type="button" className="reselect-mission-button" onClick={onReselectMission}>
              미션 다시 고르기
            </button>
          )}
        </div>
      </header>
      <main id="main-content" className="shell-width main-content">
        {children}
      </main>
      <footer className="site-footer">
        <div className="shell-width footer-content">
          <p className="footer-message">
            <span className="footer-message-mark" aria-hidden="true">
              <svg viewBox="0 0 20 20" focusable="false">
                <path d="M10 1.5 12 8l6.5 2-6.5 2-2 6.5L8 12l-6.5-2L8 8Z" />
              </svg>
            </span>
            <span>천천히 접고, 모서리와 면의 관계를 살펴보세요.</span>
          </p>
          <div className="footer-tools">
            <div className="progress-storage-control">
              <label>
                <input
                  type="checkbox"
                  checked={storageOptIn}
                  onChange={(event) => onStorageOptInChange(event.target.checked)}
                />
                이 탭에서 새로고침 후에도 진행 저장
              </label>
              <small>선택한 진행만 이 탭에 잠시 저장되며, 탭을 닫으면 사라집니다.</small>
            </div>
            {restoredFromStore ? (
              <p className="restore-notice" role="status" aria-live="polite">
                저장한 진행을 불러왔습니다.
              </p>
            ) : null}
            {persistenceNotice === null ? null : (
              <p className="restore-notice" role="status" aria-live="polite">{persistenceNotice}</p>
            )}
            <button
              type="button"
              className="update-history-trigger"
              aria-haspopup="dialog"
              onClick={() => setHistoryOpen(true)}
            >
              업데이트 내역
            </button>
          </div>
        </div>
      </footer>
      <UpdateHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
