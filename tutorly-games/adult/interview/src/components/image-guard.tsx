'use client';

import { useEffect } from 'react';
import { nextImageCandidate } from '@/lib/art';

/**
 * Keeps every portrait and illustration showing, whatever artwork exists.
 *
 * Twenty-odd `<img>` elements draw interviewers (the avatar, the setup dialog,
 * the studio preview, the saved-pack rows, the interview room, the hero art).
 * Those first try the tutor's real picture, and when a file is missing the
 * browser fires an `error` event that does not bubble — so this listens in the
 * CAPTURE phase on `window`, walks the extension chain and finishes on the
 * generated `.svg`, which is always present.
 *
 * One listener, rather than an `onError` on every image: images appear in
 * dialogs and rooms that mount and unmount constantly, and a new screen must not
 * be able to forget the fallback.
 */
export function ImageGuard() {
  useEffect(() => {
    const tried = new WeakMap<HTMLImageElement, string[]>();

    const advance = (img: HTMLImageElement) => {
      const current = img.currentSrc || img.getAttribute('src') || '';
      const attempted = tried.get(img) ?? [];
      const next = nextImageCandidate(current, attempted);
      if (!next || next === current) return;
      tried.set(img, [...attempted, current.split('.').pop()?.toLowerCase() ?? '']);
      img.src = next;
    };

    const onError = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement) advance(target);
    };

    window.addEventListener('error', onError, true);

    // Sweep anything that 404'd before this mounted.
    for (const img of Array.from(document.images)) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) advance(img);
    }

    return () => window.removeEventListener('error', onError, true);
  }, []);

  return null;
}
