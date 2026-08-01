// Bible Coach Pro — account-less one-time unlock ($2.99).
// The app has no accounts (device-local by design), so entitlement is stored
// locally after a verified Stripe purchase. Purchase integrity is enforced
// server-side (Stripe session must be `paid` — see /api/checkout/verify);
// this local flag only mirrors that result to gate the UI.
import { useSyncExternalStore } from "react";

const KEY = "btc-pro";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10; // 10 years

// Cookie mirrors localStorage as a second, independent store: if either
// survives (e.g. selective storage clearing), Pro stays unlocked.
function cookiePro(): boolean {
  try {
    return document.cookie.split("; ").includes(`${KEY}=1`);
  } catch {
    return false;
  }
}

export function isPro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(KEY) === "1") return true;
  } catch {
    /* fall through to cookie */
  }
  return cookiePro();
}

export function setPro(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = on
      ? `${KEY}=1; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`
      : `${KEY}=; max-age=0; path=/`;
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event("btc-pro-change"));
  } catch {
    /* ignore */
  }
}

function subscribe(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("btc-pro-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("btc-pro-change", handler);
    window.removeEventListener("storage", handler);
  };
}

/** React hook: re-renders when Pro entitlement changes. */
export function useIsPro(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isPro(),
    () => false, // SSR: never Pro on the server
  );
}
