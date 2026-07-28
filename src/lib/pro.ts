// Bible Coach Pro — account-less one-time unlock ($2.99).
// The app has no accounts (device-local by design), so entitlement is stored
// locally after a verified Stripe purchase. Purchase integrity is enforced
// server-side (Stripe session must be `paid` — see /api/checkout/verify);
// this local flag only mirrors that result to gate the UI.
import { useSyncExternalStore } from "react";

const KEY = "btc-pro";

export function isPro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setPro(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
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
