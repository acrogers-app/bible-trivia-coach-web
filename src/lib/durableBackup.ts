/**
 * Storage safety net for the native app.
 *
 * All progress (streak, XP, bests, name) lives in localStorage, which iOS
 * can evict from a WKWebView under storage pressure. On native platforms
 * this module mirrors every `btc_*` key into Capacitor Preferences (backed
 * by UserDefaults / SharedPreferences, which survive eviction) as a single
 * JSON snapshot, and restores the snapshot if localStorage ever comes up
 * empty. No-op on the web.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const SNAPSHOT_KEY = 'btc_localstorage_snapshot';

function collectBtcKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('btc_')) {
        const value = window.localStorage.getItem(key);
        if (value !== null) out[key] = value;
      }
    }
  } catch {
    // ignore
  }
  return out;
}

export async function backupNow(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const snapshot = collectBtcKeys();
    if (Object.keys(snapshot).length === 0) return;
    await Preferences.set({
      key: SNAPSHOT_KEY,
      value: JSON.stringify(snapshot),
    });
  } catch {
    // ignore
  }
}

async function restoreIfEvicted(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    if (Object.keys(collectBtcKeys()).length > 0) return false;
    const { value } = await Preferences.get({ key: SNAPSHOT_KEY });
    if (!value) return false;
    const snapshot = JSON.parse(value) as Record<string, string>;
    let restored = 0;
    for (const [key, val] of Object.entries(snapshot)) {
      if (typeof val === 'string' && key.startsWith('btc_')) {
        window.localStorage.setItem(key, val);
        restored++;
      }
    }
    return restored > 0;
  } catch {
    return false;
  }
}

export function initDurableBackup(): void {
  if (!Capacitor.isNativePlatform()) return;

  void restoreIfEvicted().then((restored) => {
    if (restored) {
      // Pages read localStorage in state initializers, so reload once to
      // pick up the recovered progress.
      window.location.reload();
      return;
    }
    void backupNow();
  });

  window.addEventListener('pagehide', () => {
    void backupNow();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void backupNow();
  });
}
