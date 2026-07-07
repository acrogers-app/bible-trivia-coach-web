'use client';

import { useEffect } from 'react';
import { initDurableBackup } from '../lib/durableBackup';

// Native-app glue. Renders nothing; no-op on the web.
export default function CapacitorBridge() {
  useEffect(() => {
    initDurableBackup();
  }, []);
  return null;
}
