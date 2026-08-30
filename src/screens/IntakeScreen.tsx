import type { MissionDefinition, MissionId } from '../domain/learning/types';
import type { CriticalActionId } from '../domain/learning/types';
import { PrimaryAction } from '../components/common/PrimaryAction';
import '../styles/layout.css';

export interface IntakeScreenProps {
  readonly missions: readonly MissionDefinition[];
  readonly completedMissionIds?: readonly MissionId[];
  readonly criticalActionId?: CriticalActionId;
  readonly onSelectMission: (missionId: MissionId) => void;
}

const kindLabels = {
  tracking: '면 위치 추적',
  opposite: '맞은편 면 찾기',
  collision: '겹침 경보',
  repair: '한 면 수리',
} as const;

const kindDescriptions = {
  tracking: '한 면씩 접으며 어디에 놓이는지 예상해요.',
  opposite: '접힘 경로를 따라 맞은편 면을 찾아요.',
  collision: '겹친 면과 빈 방향을 찾아요.',
  repair: '한 면을 옮겨 전개도를 고쳐요.',
} as const;

const kindOrder = ['tracking', 'opposite', 'collision', 'repair'] as const;

/** The second mission in each reviewed pair is deterministically the challenge. */
const difficultyFor = (mission: MissionDefinition, missions: readonly MissionDefinition[]): '기본' | '도전' => {
  const sameKind = missions.filter((candidate) => candidate.kind === mission.kind);
  return sameKind.findIndex((candidate) => candidate.id === mission.id) === 1 ? '도전' : '기본';
};

export function IntakeScreen({
  missions,
  completedMissionIds = [],
  criticalActionId,
  onSelectMission,
}: IntakeScreenProps): React.JSX.Element {
  const completed = new Set(completedMissionIds);
  const criticalMissionId = missions[0]?.id;
  return (
    <section className="intake-screen" aria-labelledby="intake-title">
      <section className="mission-hero" aria-label="미션 안내">
        <div className="mission-hero-copy">
          <p className="eyebrow">검수 접수 · 전개도 관찰</p>
          <h1 id="intake-title">검수 접수</h1>
          <p className="intro-copy">미션을 하나 골라 기준면과 접는 순서를 먼저 예측해 보세요.</p>
          <p className="intro-copy">예측한 뒤 한 면씩 접어 보세요.</p>
          <a className="mission-hero-start-link" href="#mission-group-tracking">
            첫 미션부터 시작하기 <span aria-hidden="true">↓</span>
          </a>
          <ol className="learning-outcomes" aria-label="이번 활동에서 해 볼 일">
            <li><span className="outcome-number" aria-hidden="true">01</span><strong>예측하기</strong><span>기준면과 접는 순서 고르기</span></li>
            <li><span className="outcome-number" aria-hidden="true">02</span><strong>한 면씩 접기</strong><span>한 면씩 움직임 확인하기</span></li>
            <li><span className="outcome-number" aria-hidden="true">03</span><strong>근거로 설명하기</strong><span>면과 모서리 근거 말하기</span></li>
          </ol>
        </div>
        <aside className="model-note-card">
          <p className="model-note-label">가상 접기 안내</p>
          <p className="model-note">
            이 가상 접기는 면의 연결 관계를 보여 주는 기하 모형이며 실제 종이의 두께·휘어짐·포장 강도·안전성을 보장하지 않습니다.
          </p>
        </aside>
      </section>

      <div className="mission-groups">
        {kindOrder.map((kind) => {
          const group = missions.filter((mission) => mission.kind === kind);
          return (
            <section
              className="mission-group"
              id={kind === 'tracking' ? 'mission-group-tracking' : undefined}
              key={kind}
              aria-labelledby={`mission-group-${kind}`}
            >
              <div className="mission-group-heading">
                <div>
                  <p className="mission-group-kicker">검수 단계 {kindOrder.indexOf(kind) + 1}</p>
                  <h2 id={`mission-group-${kind}`}>{kindLabels[kind]}</h2>
                </div>
                <div className="mission-group-meta">
                  <span>{kindDescriptions[kind]}</span>
                  <strong>미션 {group.length}개</strong>
                </div>
              </div>
              <div className="mission-list">
                {group.map((mission) => {
                  const isCompleted = completed.has(mission.id);
                  return (
                    <article className={`mission-card${mission.id === criticalMissionId ? ' is-featured' : ''}`} key={mission.id}>
                      <div className="mission-card-copy">
                        <div className="mission-card-header">
                          <p className="mission-difficulty">{difficultyFor(mission, missions)}</p>
                          <span className={`mission-status-badge ${isCompleted ? 'is-complete' : ''}`}>
                            {isCompleted ? '완료' : '새 미션'}
                          </span>
                        </div>
                        <h3>{mission.title}</h3>
                        <p>{mission.question}</p>
                        <p className="mission-status" role="status" data-completed={isCompleted}>
                          {isCompleted ? '완료한 미션' : '아직 시작하지 않음'}
                        </p>
                      </div>
                      <PrimaryAction
                        actionId="select-mission"
                        criticalActionId={criticalActionId}
                        isPrimary={mission.id === criticalMissionId}
                        className="mission-select-button"
                        onClick={() => onSelectMission(mission.id)}
                      >
                        {mission.title} 미션 선택
                      </PrimaryAction>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
