import { useCallback, useMemo, useRef, useState } from 'react';
import type { FaceId, FaceDefinition, NetDefinition } from '../../domain/net/types';
import { FaceTile, faceAccessibleName } from './FaceTile';

export type NetGridMode = 'inspect' | 'select-base' | 'select-move-target';

export interface NetGridProps {
  readonly net: NetDefinition;
  readonly mode: NetGridMode;
  readonly selectedFaceId?: FaceId | null;
  /** 선택된 타일과 무관하게 위치를 설명할 기준면입니다. */
  readonly referenceFaceId?: FaceId | null;
  readonly onFaceSelect?: (faceId: FaceId) => void;
  readonly label: string;
}

const directionVectors = {
  ArrowUp: { primary: 'y', sign: -1 },
  ArrowDown: { primary: 'y', sign: 1 },
  ArrowLeft: { primary: 'x', sign: -1 },
  ArrowRight: { primary: 'x', sign: 1 },
} as const;

const nearestInDirection = (
  current: FaceDefinition,
  faces: readonly FaceDefinition[],
  key: keyof typeof directionVectors,
): FaceDefinition | undefined => {
  const vector = directionVectors[key];
  const candidates = faces.filter((face) => {
    const delta = vector.primary === 'x'
      ? face.grid.x - current.grid.x
      : face.grid.y - current.grid.y;
    return delta * vector.sign > 0;
  });
  return candidates.sort((left, right) => {
    const leftPrimary = vector.primary === 'x'
      ? Math.abs(left.grid.x - current.grid.x)
      : Math.abs(left.grid.y - current.grid.y);
    const rightPrimary = vector.primary === 'x'
      ? Math.abs(right.grid.x - current.grid.x)
      : Math.abs(right.grid.y - current.grid.y);
    const leftSecondary = vector.primary === 'x'
      ? Math.abs(left.grid.y - current.grid.y)
      : Math.abs(left.grid.x - current.grid.x);
    const rightSecondary = vector.primary === 'x'
      ? Math.abs(right.grid.y - current.grid.y)
      : Math.abs(right.grid.x - current.grid.x);
    return leftPrimary - rightPrimary || leftSecondary - rightSecondary;
  })[0];
};

const positionLabel = (
  face: FaceDefinition,
  selectedFace: FaceDefinition | undefined,
): string | undefined => {
  if (selectedFace === undefined || face.id === selectedFace.id) return undefined;
  const dx = face.grid.x - selectedFace.grid.x;
  const dy = face.grid.y - selectedFace.grid.y;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx < 0 ? '기준면 왼쪽' : '기준면 오른쪽';
  if (dy !== 0) return dy < 0 ? '기준면 위쪽' : '기준면 아래쪽';
  return '기준면과 같은 줄';
};

export function NetGrid({
  net,
  mode,
  selectedFaceId = null,
  referenceFaceId = null,
  onFaceSelect,
  label,
}: NetGridProps): React.JSX.Element {
  const firstFaceId = net.faces[0]?.id;
  const [focusedFaceId, setFocusedFaceId] = useState<FaceId | undefined>(firstFaceId);
  const buttonRefs = useRef<Partial<Record<FaceId, HTMLButtonElement | null>>>({});
  const selectedFace = useMemo(
    () => net.faces.find((face) => face.id === (referenceFaceId ?? selectedFaceId)),
    [net.faces, referenceFaceId, selectedFaceId],
  );
  const gridBounds = useMemo(() => {
    const xs = net.faces.map((face) => face.grid.x);
    const ys = net.faces.map((face) => face.grid.y);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      columns: Math.max(...xs) - Math.min(...xs) + 1,
      rows: Math.max(...ys) - Math.min(...ys) + 1,
    };
  }, [net.faces]);

  const moveFocus = useCallback((face: FaceDefinition, key: keyof typeof directionVectors) => {
    const next = nearestInDirection(face, net.faces, key);
    if (next === undefined) return;
    setFocusedFaceId(next.id);
    buttonRefs.current[next.id]?.focus();
  }, [net.faces]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, face: FaceDefinition) => {
    if (event.key in directionVectors) {
      event.preventDefault();
      moveFocus(face, event.key as keyof typeof directionVectors);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && onFaceSelect !== undefined) {
      event.preventDefault();
      onFaceSelect(face.id);
    }
  }, [moveFocus, onFaceSelect]);

  return (
    <div className="net-grid-wrap">
      <div
        className={`net-grid net-grid-${mode}`}
        role="group"
        aria-label={label}
        data-mode={mode}
        style={{
          gridTemplateColumns: `repeat(${gridBounds.columns}, minmax(3.5rem, 1fr))`,
          gridTemplateRows: `repeat(${gridBounds.rows}, minmax(3.5rem, 1fr))`,
        }}
      >
        {net.faces.map((face) => {
          const isSelected = face.id === selectedFaceId;
          const faceLabel = positionLabel(face, selectedFace);
          return (
            <div
              className="net-grid-cell"
              key={face.id}
              style={{
                gridColumn: face.grid.x - gridBounds.minX + 1,
                gridRow: face.grid.y - gridBounds.minY + 1,
              }}
            >
              <FaceTile
                face={face}
                selected={isSelected}
                positionLabel={faceLabel}
                tabIndex={focusedFaceId === face.id ? 0 : -1}
                onFocus={() => setFocusedFaceId(face.id)}
                onKeyDown={(event) => handleKeyDown(event, face)}
                onClick={() => onFaceSelect?.(face.id)}
                buttonRef={(element) => {
                  buttonRefs.current[face.id] = element;
                }}
              />
              <span className="sr-only">{faceAccessibleName(face, faceLabel)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
