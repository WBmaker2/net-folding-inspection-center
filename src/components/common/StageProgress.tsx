export interface StageProgressProps {
  readonly current: number;
  readonly total: number;
  readonly label: string;
}

const progressPercent = (current: number, total: number): number => {
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
};

export function StageProgress({ current, total, label }: StageProgressProps): React.JSX.Element {
  const percent = progressPercent(current, total);
  return (
    <nav className="stage-progress" aria-label="학습 진행" data-progress={percent}>
      <span className="stage-progress-copy">{current} / {total} · {label}</span>
      <span className="stage-progress-track" aria-hidden="true">
        <span className="stage-progress-fill" style={{ transform: `scaleX(${percent / 100})` }} />
      </span>
    </nav>
  );
}
