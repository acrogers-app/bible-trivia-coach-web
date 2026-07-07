'use client';

import { useEffect } from 'react';
import { initDurableBackup } from '../lib/durableBackup';
import { syncDailyNudge } from '../lib/dailyNudge';

// Native-app glue. Renders nothing; no-op on the web.
export default function CapacitorBridge() {
  useEffect(() => {
    initDurableBackup();
    void syncDailyNudge();
  }, []);
  return null;
}
