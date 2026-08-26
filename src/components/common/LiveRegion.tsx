export interface LiveRegionProps {
  readonly children: React.ReactNode;
  readonly id?: string;
  readonly className?: string;
}

/** 한 상태 변화는 하나의 polite 영역에서만 읽도록 고정합니다. */
export function LiveRegion({ children, id, className = 'sr-only' }: LiveRegionProps): React.JSX.Element {
  return (
    <p
      id={id}
      className={className}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
    </p>
  );
}
