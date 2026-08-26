import { AppShell } from './app/AppShell';

export function App(): React.JSX.Element {
  return (
    <AppShell>
      <section className="welcome-card" aria-labelledby="app-title">
        <p className="eyebrow">수학 · 공간 추론</p>
        <h1 id="app-title">전개도 포장 검수소</h1>
        <p className="intro-copy">예측한 뒤 한 면씩 접어 보세요.</p>
        <p className="model-note">
          이곳의 접기는 실제 종이의 두께와 탄성을 재현하지 않는 기하 모형입니다.
        </p>
      </section>
    </AppShell>
  );
}
