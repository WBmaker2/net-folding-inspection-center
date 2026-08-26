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
      <p className="eyebrow">검수 접수 · 전개도 관찰</p>
      <h1 id="intake-title">검수 접수</h1>
      <p className="intro-copy">미션을 하나 골라 기준면과 접는 순서를 먼저 예측해 보세요.</p>
      <p className="intro-copy">예측한 뒤 한 면씩 접어 보세요.</p>
      <p className="model-note">
        이 활동은 실제 종이의 두께·탄성·포장 강도를 재현하지 않는 기하 모형입니다.
      </p>

      <div className="mission-groups">
        {kindOrder.map((kind) => {
          const group = missions.filter((mission) => mission.kind === kind);
          return (
            <section className="mission-group" key={kind} aria-labelledby={`mission-group-${kind}`}>
              <h2 id={`mission-group-${kind}`}>{kindLabels[kind]}</h2>
              <div className="mission-list">
                {group.map((mission) => {
                  const isCompleted = completed.has(mission.id);
                  return (
                    <article className="mission-card" key={mission.id}>
                      <div className="mission-card-copy">
                        <p className="mission-difficulty">{difficultyFor(mission, missions)}</p>
                        <h3>{mission.title}</h3>
                        <p>{mission.question}</p>
                        <p className="mission-status" role="status">
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
