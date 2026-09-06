'use client';

import { useSyncExternalStore } from 'react';
import { isFamilyMode, onFamilyModeChanged } from '../lib/familyMode';

/**
 * Renders the Family Mode banner when Family Mode is on. Vercel Analytics was
 * removed 2026-09-06 (Allen: no data collection without an immediate use), so
 * outside Family Mode this renders nothing.
 */
export default function FamilyModeChrome() {
  // Server snapshot is false; the client value takes over on hydration.
  const familyMode = useSyncExternalStore(onFamilyModeChanged, isFamilyMode, () => false);

  if (!familyMode) return null;
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
