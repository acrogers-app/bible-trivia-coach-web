/**
 * Answer-tap haptics. Uses Capacitor's Haptics plugin in the native app
 * (navigator.vibrate is a no-op in iOS WKWebView); falls back to the
 * Vibration API on the web. Always fire-and-forget — haptics are a
 * bonus, never a requirement.
 */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export function hapticTap(isCorrect: boolean) {
  try {
    if (Capacitor.isNativePlatform()) {
      const fire = isCorrect
        ? Haptics.impact({ style: ImpactStyle.Light })
        : Haptics.notification({ type: NotificationType.Warning });
      fire.catch(() => {});
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(isCorrect ? 12 : [8, 40, 8]);
    }
  } catch {
    // ignore
  }
}
