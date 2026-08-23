'use client';

import { useEffect } from 'react';
import { initDurableBackup } from '../lib/durableBackup';
import { syncDailyNudge } from '../lib/dailyNudge';
import { initIapEntitlement } from '../lib/iap';

// Native-app glue. Renders nothing; no-op on the web.
export default function CapacitorBridge() {
  useEffect(() => {
    initDurableBackup();
    void syncDailyNudge();
    // iOS only: if the user already owns Pro (reinstall / new device / Ask-to-Buy
    // approval), reconcile the local entitlement. No-op on web.
    void initIapEntitlement();
  }, []);
  return null;
}
