'use client';

import { useSyncExternalStore, type CSSProperties } from 'react';
import { useIsAndroidNative, useIsIosNative } from '../../lib/iap';
import SafetyContactForm from './SafetyContactForm';

/** The Child Safety page on the website, where the contact form lives. */
export const WEBSITE_SAFETY_URL = 'https://biblestudy.webeuseful.com/safety';

/**
 * "Questions?" body. On the website: the contact form. In the iPhone and Android apps the form
 * is not shown and nothing is sent from the app; a link opens the website's Child Safety page
 * in the device's browser (Capacitor hands target="_blank" links to the system browser).
 *
 * Nothing renders until hydration has finished: the page is prerendered without knowing the
 * platform, so rendering the form by default would put it in the apps' static HTML and show
 * it briefly before the switch to the link.
 */
const noSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

export default function SafetyContact({ textStyle }: { textStyle: CSSProperties }) {
  const ios = useIsIosNative();
  const android = useIsAndroidNative();
  const hydrated = useHydrated();

  if (!hydrated) return null;

  if (ios || android) {
    return (
      <p style={textStyle}>
        To send us a question or concern, use the contact form on our website.
        It opens in your browser:{' '}
        <a href={WEBSITE_SAFETY_URL} target="_blank" rel="noopener noreferrer">
          Child Safety page on biblestudy.webeuseful.com
        </a>
        .
      </p>
    );
  }

  return (
    <>
      <p style={textStyle}>
        Send us a question or concern using the form below. If you include
        an email address, we can reply.
      </p>
      <SafetyContactForm />
    </>
  );
}
