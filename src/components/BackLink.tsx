'use client';

import { useRouter } from 'next/navigation';

/**
 * "Back" control for pages that have no bottom nav (Privacy, Child Safety).
 * In the Capacitor shell these pages are reached by in-app navigation, so
 * history.back() returns to Settings or the landing page; with no history
 * (direct open on the web) it goes home. Client-side only: a full page load
 * of an extensionless path serves the landing page inside the app.
 */
export default function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.push('/');
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 44,
        padding: '0 4px',
        marginBottom: 6,
        border: 'none',
        background: 'none',
        color: 'var(--btc-accent)',
        fontSize: 'var(--btc-body-size)',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      ← Back
    </button>
  );
}
