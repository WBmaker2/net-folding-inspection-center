import { useEffect, useRef } from 'react';

/** 화면이 열릴 때 제목으로 초점을 옮겨, 스크린 리더의 위치를 알려 줍니다. */
export function useFocusHeading<T extends HTMLElement>(): React.RefObject<T | null> {
  const headingRef = useRef<T>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return headingRef;
}
