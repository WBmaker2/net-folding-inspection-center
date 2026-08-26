import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const getMediaQuery = (): MediaQueryList | null => (
  typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    ? null
    : window.matchMedia(QUERY)
);

const getSnapshot = (): boolean => getMediaQuery()?.matches ?? false;

const subscribe = (onChange: () => void): (() => void) => {
  const mediaQuery = getMediaQuery();
  if (mediaQuery === null) return () => undefined;
  const listener = (): void => onChange();
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }
  if (typeof mediaQuery.addListener !== 'function') return () => undefined;
  mediaQuery.addListener(listener);
  return () => mediaQuery.removeListener(listener);
};

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
