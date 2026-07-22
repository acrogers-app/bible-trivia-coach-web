/**
 * Family Mode — device-local child-safety switch.
 * When ON: all analytics stop (quiz analytics + Vercel Analytics) and a
 * "Family Mode" banner shows on every page. Turning it OFF requires the
 * 4-digit parental PIN chosen when it was enabled.
 *
 * The PIN is a child-resistant speed bump, not a security boundary — it
 * lives in localStorage with the same trust level as everything else there.
 */

const MODE_KEY = 'bible-coach-family-mode';
const PIN_KEY = 'bible-coach-family-pin';
const EVENT = 'btc:family-mode-changed';

export function isFamilyMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

function hashPin(pin: string): string {
  let h = 5381;
  for (const c of pin) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function enableFamilyMode(pin: string): boolean {
  if (typeof window === 'undefined' || !isValidPin(pin)) return false;
  try {
    localStorage.setItem(PIN_KEY, hashPin(pin));
    localStorage.setItem(MODE_KEY, 'true');
    window.dispatchEvent(new CustomEvent(EVENT));
    return true;
  } catch {
    return false;
  }
}

export function disableFamilyMode(pin: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(PIN_KEY) !== hashPin(pin)) return false;
    localStorage.setItem(MODE_KEY, 'false');
    localStorage.removeItem(PIN_KEY);
    window.dispatchEvent(new CustomEvent(EVENT));
    return true;
  } catch {
    return false;
  }
}

export function onFamilyModeChanged(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler: EventListener = () => fn();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
