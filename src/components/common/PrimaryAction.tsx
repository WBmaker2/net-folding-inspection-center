import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { CriticalActionId } from '../../domain/learning/types';

export interface PrimaryActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly actionId: CriticalActionId;
  readonly criticalActionId?: CriticalActionId;
  /** Set false when this identity is shared by several choices. */
  readonly isPrimary?: boolean;
  /** An action that is not currently actionable must never be emphasized. */
  readonly available?: boolean;
}

export const PrimaryAction = forwardRef<HTMLButtonElement, PrimaryActionProps>(function PrimaryAction(
  {
    actionId,
    criticalActionId,
    isPrimary = true,
    available = true,
    className,
    disabled,
    ...buttonProps
  },
  ref,
) {
  const ariaDisabled = buttonProps['aria-disabled'];
  const shouldPulse = isPrimary
    && available
    && !disabled
    && !buttonProps.hidden
    && ariaDisabled !== true
    && ariaDisabled !== 'true'
    && criticalActionId !== undefined
    && actionId === criticalActionId;
  const classes = ['primary-action', className, shouldPulse ? 'gi-pulse' : undefined]
    .filter(Boolean)
    .join(' ') || undefined;
  return <button ref={ref} {...buttonProps} type={buttonProps.type ?? 'button'} className={classes} disabled={disabled} />;
});

PrimaryAction.displayName = 'PrimaryAction';
