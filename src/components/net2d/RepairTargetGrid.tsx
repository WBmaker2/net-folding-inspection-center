import type { GridPoint, NetDefinition } from '../../domain/net/types';
import { FaceTile } from './FaceTile';

export interface RepairTargetGridProps {
  readonly net: NetDefinition;
  readonly targets: readonly GridPoint[];
  readonly selectedTarget?: GridPoint | null;
  readonly onTargetSelect: (target: GridPoint) => void;
  readonly label?: string;
}

const pointKey = (point: GridPoint): string => `${point.x},${point.y}`;
const samePoint = (left: GridPoint, right: GridPoint): boolean => (
  left.x === right.x && left.y === right.y
);

export function RepairTargetGrid({
  net,
  targets,
  selectedTarget = null,
  onTargetSelect,
  label = '이동 후보 격자',
}: RepairTargetGridProps): React.JSX.Element {
  const occupied = new Map(net.faces.map((face) => [pointKey(face.grid), face] as const));
  const targetKeys = new Set(targets.map(pointKey));
  const coordinates = [...net.faces.map((face) => face.grid), ...targets];
  const minX = Math.min(...coordinates.map((point) => point.x));
  const maxX = Math.max(...coordinates.map((point) => point.x));
  const minY = Math.min(...coordinates.map((point) => point.y));
  const maxY = Math.max(...coordinates.map((point) => point.y));
  const cells: React.JSX.Element[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const point = { x, y };
      const key = pointKey(point);
      const face = occupied.get(key);
      const gridPosition = { gridColumn: x - minX + 1, gridRow: y - minY + 1 };
      if (face !== undefined) {
        cells.push(
          <div className="repair-grid-cell repair-grid-occupied" style={gridPosition} key={key}>
            <FaceTile face={face} disabled tabIndex={-1} />
          </div>,
        );
      } else if (targetKeys.has(key)) {
        const selected = selectedTarget !== null && selectedTarget !== undefined
          && samePoint(selectedTarget, point);
        cells.push(
          <div className="repair-grid-cell" style={gridPosition} key={key}>
            <button
              type="button"
              className={`repair-target-cell${selected ? ' is-selected' : ''}`}
              aria-label={`빈 칸 ${pointText(point)}, 선택한 면의 이동 후보`}
              aria-pressed={selected}
              data-grid-x={point.x}
              data-grid-y={point.y}
              onClick={() => onTargetSelect(point)}
            >
              <span aria-hidden="true">빈 칸</span>
              <strong aria-hidden="true">{pointText(point)}</strong>
            </button>
          </div>,
        );
      } else {
        cells.push(<div className="repair-grid-cell repair-grid-empty" style={gridPosition} key={key} aria-hidden="true" />);
      }
    }
  }
  return (
    <div
      className="repair-target-grid"
      role="group"
      aria-label={label}
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, maxX - minX + 1)}, minmax(4rem, 1fr))`,
        gridTemplateRows: `repeat(${Math.max(1, maxY - minY + 1)}, minmax(4rem, 1fr))`,
      }}
    >
      {cells}
    </div>
  );
}

const pointText = (point: GridPoint): string => `(${point.x}, ${point.y})`;
