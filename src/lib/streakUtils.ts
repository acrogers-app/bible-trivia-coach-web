// Shared day-key + gentle streak helpers used by the Play and Read pages.

const STREAK_KEY = 'btc_streak';
const STREAK_LAST_DATE_KEY = 'btc_streak_last_date';

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
  } catch {
    // ignore
  }
}
