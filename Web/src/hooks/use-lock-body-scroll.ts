import { useEffect } from 'react';

/**
 * Lock the document body scroll while `locked` is true.
 * Also preserves the scrollbar gap by applying equivalent padding-right to the body.
 */
export default function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;

    // Measure scrollbar width
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = originalOverflow || '';
      body.style.paddingRight = originalPaddingRight || '';
    };
  }, [locked]);
}
