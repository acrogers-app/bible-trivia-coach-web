// Light/dark theme preference (v1.2.1).
//
// How it works: the game CSS defines dark values on :root and light values
// under BOTH `:root[data-theme="light"]` and
// `@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) }`.
// So with NO data-theme attribute the app follows the system live (pure CSS —
// no JS listener needed; iOS appearance changes apply instantly). A manual
// choice pins data-theme and wins over the system.
//
// The attribute is applied pre-paint by an inline script in layout.tsx
// (no flash), and by setThemePref() when the user changes it in Settings.

import { readLS, writeLS, removeLS } from './gameFx';

export type ThemePref = 'system' | 'light' | 'dark';

export const THEME_KEY = 'bible-theme';

export function getThemePref(): ThemePref {
  const raw = readLS(THEME_KEY);
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

export function applyThemePref(pref: ThemePref) {
  if (typeof document === 'undefined') return;
  if (pref === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', pref);
  }
}

export function setThemePref(pref: ThemePref) {
  if (pref === 'system') removeLS(THEME_KEY);
  else writeLS(THEME_KEY, pref);
  applyThemePref(pref);
}
