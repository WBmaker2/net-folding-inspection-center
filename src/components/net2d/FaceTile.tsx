import type { Ref } from 'react';
import type { FaceDefinition } from '../../domain/net/types';
import { faceAccessibleName, faceNumber } from './faceLabels';

export interface FaceTileProps {
  readonly face: FaceDefinition;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly tabIndex?: number;
  readonly positionLabel?: string;
  readonly onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
  readonly onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  readonly onClick?: React.MouseEventHandler<HTMLButtonElement>;
  readonly buttonRef?: Ref<HTMLButtonElement>;
}

function FacePattern({ face }: { readonly face: FaceDefinition }): React.JSX.Element {
  const common = { className: `face-pattern face-pattern-${face.colorToken}` };
  switch (face.symbol) {
    case 'circle':
      return <circle {...common} cx="24" cy="24" r="12" />;
    case 'square':
      return <rect {...common} x="12" y="12" width="24" height="24" rx="2" />;
    case 'triangle':
      return <path {...common} d="M24 10 39 37H9Z" />;
    case 'star':
      return <path {...common} d="m24 8 4.8 10.2 11.2 1.4-8.2 7.7 2.1 11-9.9-5.4-9.9 5.4 2.1-11-8.2-7.7 11.2-1.4Z" />;
    case 'diamond':
      return <path {...common} d="m24 8 15 16-15 16L9 24Z" />;
    case 'cross':
      return <path {...common} d="M17 8h14v9h9v14h-9v9H17v-9H8V17h9Z" />;
  }
}

export function FaceTile({
  face,
  selected = false,
  disabled = false,
  tabIndex = 0,
  positionLabel,
  onKeyDown,
  onFocus,
  onClick,
  buttonRef,
}: FaceTileProps): React.JSX.Element {
  const number = faceNumber(face);
  const name = faceAccessibleName(face, positionLabel);

  return (
    <button
      type="button"
      className={`face-tile face-tile-${face.colorToken}${selected ? ' is-selected' : ''}`}
      aria-label={name}
      aria-pressed={selected}
      aria-current={selected ? 'true' : undefined}
      disabled={disabled}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onClick={onClick}
      ref={buttonRef}
      data-face-id={face.id}
      data-grid-x={face.grid.x}
      data-grid-y={face.grid.y}
    >
      <span className="face-tile-number" aria-hidden="true">{number}</span>
      <svg
        className="face-tile-symbol"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <FacePattern face={face} />
      </svg>
    </button>
  );
}
