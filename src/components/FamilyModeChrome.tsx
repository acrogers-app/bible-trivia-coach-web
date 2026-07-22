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
  return <div className="family-mode-banner">👨‍👩‍👧 Family Mode — Child Safe ✓</div>;
}
