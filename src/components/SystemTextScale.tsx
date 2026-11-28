'use client';

import { useSystemTextScale } from '../lib/learn/textScale';

/**
 * Puts the iPhone/iPad system text size (Dynamic Type) on <html> as --learn-dt, the same
 * ratio Learn uses, so other screens can opt in with
 * `calc(<px> * var(--btc-font-mult, 1) * var(--learn-dt, 1))`.
 * So far: quiz question, answers and feedback, and the Read passage, which use the
 * half-strength --learn-dt-head so long text still fits a phone. Renders nothing.
 */
export default function SystemTextScale() {
  useSystemTextScale();
  return null;
}
