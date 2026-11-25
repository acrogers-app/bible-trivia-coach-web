'use client';

// Learn text follows two settings: the app's own "App text size" (--btc-font-mult, 0.9–1.3)
// and, on iPhone/iPad, the system text size (Settings → Accessibility → Display & Text Size
// → Larger Text, i.e. Dynamic Type). WebKit exposes the system size through the
// `-apple-system-body` font, which is 17px at the default size. We measure it and store the
// ratio in --learn-dt on the Learn frame. Elsewhere (no such font) --learn-dt stays 1.

import { useEffect, type RefObject } from 'react';

const DEFAULT_BODY_PX = 17;
const MIN = 0.85;
const MAX = 3.2; // largest accessibility size is ~53px, about 3.1x

/** Font size in px at the default settings, scaled by the app and system text sizes. */
export function fs(px: number): string {
  return `calc(${px}px * var(--btc-font-mult, 1) * var(--learn-dt, 1))`;
}

/** Body text: the inherited size (already follows the app text size), times the system size. */
export const BODY_FS = 'calc(1em * var(--learn-dt, 1))';

export function systemTextRatio(): number {
  if (typeof document === 'undefined') return 1;
  try {
    if (!CSS.supports('font', '-apple-system-body')) return 1;
    const probe = document.createElement('span');
    probe.style.cssText = 'font: -apple-system-body; position: absolute; visibility: hidden;';
    probe.textContent = 'x';
    document.body.appendChild(probe);
    const px = parseFloat(getComputedStyle(probe).fontSize);
    probe.remove();
    if (!Number.isFinite(px) || px <= 0) return 1;
    return Math.min(MAX, Math.max(MIN, px / DEFAULT_BODY_PX));
  } catch {
    return 1;
  }
}

/** Headings grow half as much as body text (as iOS titles do), so a title stays a few lines. */
export function headingRatio(r: number): number {
  return 1 + (r - 1) * 0.5;
}

/** Keeps --learn-dt on `ref` in step with the system text size (re-read on return to the app). */
export function useSystemTextScale(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const apply = () => {
      const r = systemTextRatio();
      ref.current?.style.setProperty('--learn-dt', String(r));
      ref.current?.style.setProperty('--learn-dt-head', String(headingRatio(r)));
    };
    apply();
    const onVisible = () => { if (document.visibilityState === 'visible') apply(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [ref]);
}
