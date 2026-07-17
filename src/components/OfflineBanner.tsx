'use client';

import { useEffect, useState } from 'react';
import { flushAnalyticsOutbox } from '../lib/analytics';

/**
 * Fixed, non-intrusive banner shown while the device is offline.
 * All quiz progress lives in localStorage, so offline play is safe —
 * this just reassures the user. Also triggers a replay of any queued
 * analytics events on app start and whenever connectivity returns.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const handleOnline = () => {
      update();
      flushAnalyticsOutbox();
    };

    update();
    // App start: replay any analytics queued while offline last session.
    flushAnalyticsOutbox();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 1100,
        paddingTop: 'env(safe-area-inset-top)',
        background: 'var(--btc-offline-bg, #1e293b)', // slate-800
        color: 'var(--btc-offline-fg, #f8fafc)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '7px 12px',
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#fbbf24', // amber-400
            flexShrink: 0,
          }}
        />
        You&rsquo;re offline — your progress is saved on this device
      </div>
    </div>
  );
}
