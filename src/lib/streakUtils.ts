// Shared day-key + gentle streak helpers used by the Play and Read pages.

const STREAK_KEY = 'btc_streak';
const STREAK_LAST_DATE_KEY = 'btc_streak_last_date';
const STREAK_BEST_KEY = 'btc_best_streak';

export function getDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayKey(): string {
  return getDayKey(new Date());
}

// Any daily activity (quiz or reading) keeps the streak alive.
// A gap quietly starts a fresh day one — no shaming.
export function updateStreakForToday() {
  if (typeof window === 'undefined') return;
  try {
    const today = getTodayKey();
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = getDayKey(d);

    const lastDate = window.localStorage.getItem(STREAK_LAST_DATE_KEY);
    if (lastDate === today) return;

    const raw = window.localStorage.getItem(STREAK_KEY);
    const current = raw ? Number(raw) || 0 : 0;
    const next = lastDate === yesterday ? current + 1 : 1;

    window.localStorage.setItem(STREAK_KEY, String(next));
    window.localStorage.setItem(STREAK_LAST_DATE_KEY, today);

    const rawBest = window.localStorage.getItem(STREAK_BEST_KEY);
    const best = rawBest ? Number(rawBest) || 0 : 0;
    if (next > best) {
      window.localStorage.setItem(STREAK_BEST_KEY, String(next));
    }
  } catch {
    // ignore
  }
}

// Current + best streak for display. Never used to scold — a lapsed
// streak simply reads as day one again.
export function getStreakInfo(): { current: number; best: number } {
  if (typeof window === 'undefined') return { current: 0, best: 0 };
  try {
    const current = Number(window.localStorage.getItem(STREAK_KEY)) || 0;
    const best = Number(window.localStorage.getItem(STREAK_BEST_KEY)) || 0;
    return { current, best: Math.max(best, current) };
  } catch {
    return { current: 0, best: 0 };
  }
}
