'use client';

import { useSyncExternalStore } from 'react';
import { getThemePref, setThemePref } from '../lib/theme';
import { subscribeLS } from '../lib/gameFx';
import { isFamilyMode, onFamilyModeChanged } from '../lib/familyMode';

const LIGHT_MQ = '(prefers-color-scheme: light)';

// Effective theme = manual pref if set, else live system preference.
// Subscribes to both localStorage (Settings picker / this button) and the
// system media query, so the icon always reflects what's on screen.
function subscribe(fn: () => void): () => void {
  const unsubLS = subscribeLS(fn);
  const mql = window.matchMedia(LIGHT_MQ);
  mql.addEventListener('change', fn);
  return () => {
    unsubLS();
    mql.removeEventListener('change', fn);
  };
}

function getEffectiveTheme(): 'light' | 'dark' {
  const pref = getThemePref();
  if (pref !== 'system') return pref;
  return window.matchMedia(LIGHT_MQ).matches ? 'light' : 'dark';
}

/**
 * Floating ☀️/🌙 button, fixed top-right on every screen (mounted in the
 * root layout). Shows the mode it will switch TO. Tapping pins an explicit
 * light/dark choice; the Settings Appearance card can return to System.
 */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getEffectiveTheme, () => 'dark' as const);
  const familyMode = useSyncExternalStore(onFamilyModeChanged, isFamilyMode, () => false);
  const next = theme === 'light' ? 'dark' : 'light';
  return (
    <button
      type="button"
      className={`theme-toggle${familyMode ? ' below-family-banner' : ''}`}
      onClick={() => setThemePref(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {next === 'light' ? '☀️' : '🌙'}
    </button>
  );
}
