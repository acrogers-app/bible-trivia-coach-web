/**
 * Daily challenge reminder (daily-challenge-nudge) for the native app.
 *
 * One gentle local notification at 8:00 each morning — opt-in via
 * Settings, never more than one a day, and the copy stays warm and
 * guilt-free per the coach voice. No-op on the web (browser
 * notifications are a different, pushier beast we deliberately avoid).
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { loadSettings } from './appSettings';

const NUDGE_ID = 20261;

const NUDGE_BODIES = [
  'Today’s 5 questions are ready — just a few gentle minutes in God’s Word. 🕯️',
  'A fresh reading and a short quiz are waiting whenever you’re ready. 📖',
  'One small step in Scripture today? Your coach is cheering for you. 🙌',
];

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function enableDailyNudge(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== 'granted') return false;

    // Rotate copy by day-of-year so the reminder doesn't go stale
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
        86400000,
    );
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NUDGE_ID,
          title: 'Bible Trivia Coach',
          body: NUDGE_BODIES[dayOfYear % NUDGE_BODIES.length],
          schedule: { on: { hour: 8, minute: 0 }, allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export async function disableDailyNudge(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NUDGE_ID }] });
  } catch {
    // ignore
  }
}

// Re-assert the schedule on app start: keeps the rotating copy fresh and
// recovers the schedule after OS cleanups, without re-prompting (only
// schedules if permission is already granted).
export async function syncDailyNudge(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const settings = loadSettings();
    if (!settings.dailyReminderEnabled) {
      await disableDailyNudge();
      return;
    }
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') {
      await enableDailyNudge();
    }
  } catch {
    // ignore
  }
}
