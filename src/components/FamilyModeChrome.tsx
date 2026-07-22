'use client';

import { useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { isFamilyMode, onFamilyModeChanged } from '../lib/familyMode';

/**
 * Renders the Family Mode banner when Family Mode is on, and gates
 * Vercel Analytics: it only mounts when Family Mode is off.
 */
export default function FamilyModeChrome() {
  // Server snapshot is false; the client value takes over on hydration.
  const familyMode = useSyncExternalStore(onFamilyModeChanged, isFamilyMode, () => false);

  if (!familyMode) return <Analytics />;
  return (
    <div className="family-mode-banner">
      👨‍👩‍👧 Family Mode — Child Safe ✓
      <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.9 }}>
        📖 Family Safe Content ✓ — all content is scripture-based · analytics
        and AI features are off in Family Mode
      </div>
    </div>
  );
}
