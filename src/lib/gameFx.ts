// Game-feel helpers for v1.2.0 — Bible nicknames/avatars, difficulty paths,
// version-gated "What's New", and the (very) subtle timer tick.
// Everything here is device-local: no player data ever leaves the device.

export const APP_VERSION = '1.2.4';

// localStorage as an external store (for useSyncExternalStore — the repo's
// lint forbids reading localStorage into state inside effects).
const LS_EVENT = 'btc:ls-changed';

export function readLS(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(LS_EVENT));
  } catch {}
}

export function removeLS(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(LS_EVENT));
  } catch {}
}

export function subscribeLS(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => fn();
  window.addEventListener(LS_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(LS_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
export const VERSION_SEEN_KEY = 'bible-version-seen';
export const FAMILY_SAFETY_SEEN_KEY = 'bible-family-safety-seen';
export const PLAYER_NAME_KEY = 'bible-player-name';

/** Bible character nicknames for Family Night — no real names needed. */
export const BIBLE_NAMES: { name: string; avatar: string }[] = [
  { name: 'David', avatar: '👑' },
  { name: 'Esther', avatar: '👸' },
  { name: 'Noah', avatar: '⛵' },
  { name: 'Ruth', avatar: '🌾' },
  { name: 'Daniel', avatar: '🦁' },
  { name: 'Mary', avatar: '🌹' },
  { name: 'Joseph', avatar: '🧥' },
  { name: 'Deborah', avatar: '⚖️' },
  { name: 'Elijah', avatar: '🔥' },
  { name: 'Lydia', avatar: '🧵' },
  { name: 'Moses', avatar: '🌊' },
  { name: 'Miriam', avatar: '🥁' },
  { name: 'Solomon', avatar: '🏛️' },
  { name: 'Priscilla', avatar: '📜' },
  { name: 'Joshua', avatar: '🎺' },
  { name: 'Phoebe', avatar: '✉️' },
  { name: 'Jonah', avatar: '🐋' },
  { name: 'Martha', avatar: '🍞' },
  { name: 'Samuel', avatar: '🕯️' },
  { name: 'Tabitha', avatar: '🧶' },
];

const FALLBACK_AVATARS = ['⭐', '🕊️', '🌿', '🐑', '🎵', '🌈'];

/** Avatar for a player name: exact Bible-name match, else stable fallback. */
export function avatarFor(name: string): string {
  const hit = BIBLE_NAMES.find(
    (b) => b.name.toLowerCase() === name.trim().toLowerCase(),
  );
  if (hit) return hit.avatar;
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK_AVATARS[h % FALLBACK_AVATARS.length];
}

export function randomBibleName(exclude: string[] = []): string {
  const taken = new Set(exclude.map((n) => n.toLowerCase()));
  const free = BIBLE_NAMES.filter((b) => !taken.has(b.name.toLowerCase()));
  const pool = free.length ? free : BIBLE_NAMES;
  return pool[Math.floor(Math.random() * pool.length)].name;
}

// ---- Difficulty paths (progression; device-local) ----

export type PathKey = 'beginner' | 'disciple' | 'prophet' | 'apostle';

export const PATHS: {
  key: PathKey;
  label: string;
  emoji: string;
  level: 'easy' | 'medium' | 'hard';
  count: number;
  desc: string;
}[] = [
  { key: 'beginner', label: 'Beginner', emoji: '📖', level: 'easy', count: 10, desc: 'Easy questions' },
  { key: 'disciple', label: 'Disciple', emoji: '✝️', level: 'medium', count: 10, desc: 'Medium questions' },
  { key: 'prophet', label: 'Prophet', emoji: '🔥', level: 'hard', count: 10, desc: 'Hard questions' },
  { key: 'apostle', label: 'Apostle', emoji: '👑', level: 'hard', count: 15, desc: 'Expert — longer, all hard' },
];

const PATH_PROGRESS_KEY = 'btc-difficulty-progress';
const PATH_PASS_PERCENT = 70;

export type PathProgress = Partial<
  Record<PathKey, { completed: boolean; bestPercent: number }>
>;

export function loadPathProgress(): PathProgress {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PATH_PROGRESS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as PathProgress)
      : {};
  } catch {
    return {};
  }
}

export function recordPathResult(key: PathKey, correct: number, total: number) {
  if (typeof window === 'undefined' || total <= 0) return;
  const percent = Math.round((correct / total) * 100);
  const progress = loadPathProgress();
  const prev = progress[key];
  progress[key] = {
    completed: (prev?.completed ?? false) || percent >= PATH_PASS_PERCENT,
    bestPercent: Math.max(prev?.bestPercent ?? 0, percent),
  };
  writeLS(PATH_PROGRESS_KEY, JSON.stringify(progress));
}

export function parsePathProgress(raw: string | null): PathProgress {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as PathProgress)
      : {};
  } catch {
    return {};
  }
}

export const PATH_PROGRESS_LS_KEY = PATH_PROGRESS_KEY;

/** A path is unlocked when the previous path was completed (≥70%). */
export function isPathUnlocked(key: PathKey, progress: PathProgress): boolean {
  const idx = PATHS.findIndex((p) => p.key === key);
  if (idx <= 0) return true;
  return progress[PATHS[idx - 1].key]?.completed === true;
}

export function pathForQuizTitle(title: string): PathKey | null {
  const m = title.match(/^Path: (Beginner|Disciple|Prophet|Apostle)$/);
  return m ? (m[1].toLowerCase() as PathKey) : null;
}

// ---- Subtle countdown tick (WebAudio; fails silently everywhere) ----

let audioCtx: AudioContext | null = null;

export function playTick() {
  if (typeof window === 'undefined') return;
  try {
    type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.03, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.09);
  } catch {}
}
