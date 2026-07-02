export type AppFont = 'system' | 'rounded' | 'serif';
export type ColorTheme = 'light' | 'dark' | 'system';
export type ReaderTheme = 'calm' | 'vibrant';

export type AppSettings = {
  colorTheme: ColorTheme;
  // accessibility
  appTextScale: number;       // 0.9–1.3
  appFont: AppFont;
  highContrast: boolean;
  reduceMotion: boolean;

  // reader
  readerTheme: ReaderTheme;   // calm / vibrant
  readerFontSize: number;     // px (14–28)
  readerRate: number;         // 0.7–1.3
  readerVoiceURI: string;     // '' = auto
  readerLang: string;         // e.g. en-US
  readerAutoFollow: boolean;
  readerShowAllVoices: boolean;
  analyticsEnabled: boolean;
};

export const defaultSettings: AppSettings = {
  colorTheme: 'system' as ColorTheme,
  appTextScale: 1.0,
  appFont: 'system',
  highContrast: false,
  reduceMotion: false,

  readerTheme: 'vibrant',
  readerFontSize: 18,
  readerRate: 1.0,
  readerVoiceURI: '',
  readerLang: 'en-US',
  readerAutoFollow: true,
  readerShowAllVoices: false,
  analyticsEnabled: true,
};

const KEY = 'btc:settings:v2';
const EVENT = 'btc:settings-changed';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return defaultSettings;
  const langDefault = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US';

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultSettings, readerLang: langDefault };

    const parsed = JSON.parse(raw);
    const merged: AppSettings = { ...defaultSettings, readerLang: langDefault, ...parsed };

    merged.appTextScale = clamp(merged.appTextScale, 0.9, 1.3);
    merged.readerFontSize = clamp(merged.readerFontSize, 14, 28);
    merged.readerRate = clamp(merged.readerRate, 0.7, 1.3);
    merged.readerTheme = (merged.readerTheme === 'calm' || merged.readerTheme === 'vibrant') ? merged.readerTheme : 'vibrant';

    return merged;
  } catch {
    return { ...defaultSettings, readerLang: langDefault };
  }
}

export function saveSettings(s: AppSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(s));
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

export function onSettingsChanged(fn: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => fn();
  window.addEventListener(EVENT, handler as any);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) fn();
  });
  return () => window.removeEventListener(EVENT, handler as any);
}

export function applySettingsToDocument(s: AppSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Font + scale
  root.style.setProperty('--btc-font-mult', String(clamp(s.appTextScale, 0.9, 1.3)));
  root.style.setProperty('--btc-font-family', fontFamilyFor(s.appFont));

  // Color theme
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = s.colorTheme === 'dark' || (s.colorTheme === 'system' && prefersDark);
  root.setAttribute('data-btc-theme', isDark ? 'dark' : 'light');

  // High contrast (on top of theme)
  if (s.highContrast) root.setAttribute('data-btc-contrast', 'high');
  else root.removeAttribute('data-btc-contrast');

  // Reduce motion
  if (s.reduceMotion) root.setAttribute('data-btc-reduce-motion', '1');
  else root.removeAttribute('data-btc-reduce-motion');

  root.setAttribute('data-btc-reader-theme', s.readerTheme);
}

function fontFamilyFor(f: AppFont): string {
  if (f === 'rounded') {
    return `ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  }
  if (f === 'serif') {
    return `ui-serif, "Iowan Old Style", "Palatino", "Times New Roman", serif`;
  }
  return `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
