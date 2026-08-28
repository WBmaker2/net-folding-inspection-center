import type { ReactNode } from 'react';
import { useState } from 'react';
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
      <header className="site-header">
        <div className="shell-width header-content">
          <span className="service-mark" aria-hidden="true">
            ◇
          </span>
          <div className="header-meta">
            <p className="service-label">전개도 포장 검수소</p>
            {stageMeta !== undefined && (
              <p className="stage-progress" aria-label="학습 진행">
                {stageMeta.current} / {stageMeta.total} · {stageMeta.label}
              </p>
            )}
          </div>
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
          <p>천천히 접고, 모서리와 면의 관계를 살펴보세요.</p>
          <div className="progress-storage-control">
            <label>
              <input
                type="checkbox"
                checked={storageOptIn}
                onChange={(event) => onStorageOptInChange(event.target.checked)}
              />
              이 탭에서 새로고침 후에도 진행 저장
            </label>
            <small>선택한 진행만 이 탭의 sessionStorage에 저장되며, 탭을 닫으면 사라집니다.</small>
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
      </footer>
      <UpdateHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
