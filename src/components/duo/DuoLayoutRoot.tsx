'use client';

import { useDuoSplit } from '../../lib/duoLayout';

/**
 * Starts the iPhone Duo fold listener for every screen (lib/duoLayout sets data-duo-fold and the
 * --duo-fold-* variables on <html>), so one-column screens that never ask for a split layout
 * still keep clear of an active fold. Renders nothing.
 */
export default function DuoLayoutRoot() {
  useDuoSplit();
  return null;
}
