// iOS in-app purchase (StoreKit 2, via @capgo/native-purchases).
//
// Bible Coach Pro is a one-time non-consumable unlock. On the web this stays a
// Stripe purchase (see src/lib/pro.ts + /api/checkout). Inside the iOS app,
// Apple requires the unlock to go through StoreKit — so on iOS the "Unlock Pro"
// buttons call purchasePro() here instead of Stripe. Either path ends the same
// way: setPro(true), which the whole app already reads via useIsPro().
//
// Every export is a hard no-op off iOS-native, so importing this module on the
// web (or during SSR/static export) is safe.
import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { NativePurchases } from "@capgo/native-purchases";
import { isPro, setPro } from "./pro";

/** Non-consumable product id — matches the live ASC app com.acrogers.bibletriviacoach. */
export const IAP_PRODUCT_ID = "com.acrogers.bibletriviacoach.pro";

export function isIosNative(): boolean {
  try {
    return Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * React hook: true only inside the native iOS app. Uses useSyncExternalStore
 * (never subscribes) so it renders false on the server / during static export
 * and the real value on the client — no hydration mismatch, and no
 * set-state-in-effect (which this repo's lint forbids).
 */
export function useIsIosNative(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => isIosNative(),
    () => false,
  );
}

/** Localized StoreKit price string (e.g. "$2.99"), or null off iOS / on error. */
export async function getProPriceString(): Promise<string | null> {
  if (!isIosNative()) return null;
  try {
    const { product } = await NativePurchases.getProduct({
      productIdentifier: IAP_PRODUCT_ID,
    });
    return product?.priceString ?? null;
  } catch {
    return null;
  }
}

/**
 * Start the StoreKit purchase for Pro. On a completed purchase, grants the
 * local entitlement (setPro(true)) — the same flag the Stripe path sets.
 *
 * Returns true if Pro is unlocked afterward. A user cancellation resolves to
 * false (not an error); genuine failures re-throw so the UI can show an error.
 */
/** Watchdog so a hung native call can never strand the UI on "loading" forever. */
const PURCHASE_TIMEOUT_MS = 120_000;

export async function purchasePro(): Promise<boolean> {
  if (!isIosNative()) return false;
  try {
    const tx = await Promise.race([
      NativePurchases.purchaseProduct({
        productIdentifier: IAP_PRODUCT_ID,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("purchase timed out")), PURCHASE_TIMEOUT_MS),
      ),
    ]);
    // The native layer only resolves for a VERIFIED transaction of the
    // requested product — a resolved call IS a completed purchase. Unlock on
    // any resolved transaction rather than gating on one payload field, so a
    // payload-shape difference can never swallow a paid purchase (2.1(b)).
    if (tx?.productIdentifier === IAP_PRODUCT_ID || tx?.transactionId) {
      setPro(true);
      return true;
    }
    // Belt-and-braces: reconcile against current entitlements.
    return await ownsProEntitlement();
  } catch (e) {
    // StoreKit surfaces user-cancel as a thrown error too — treat as non-fatal.
    const msg = String((e as Error)?.message ?? e).toLowerCase();
    if (msg.includes("cancel")) return false;
    // The sheet may have completed even if the bridge errored afterward —
    // check entitlements before surfacing the failure.
    if (await ownsProEntitlement()) return true;
    throw e;
  }
}

/** True (and unlocks) if StoreKit's current entitlements include Pro. */
async function ownsProEntitlement(): Promise<boolean> {
  try {
    const { purchases } = await NativePurchases.getPurchases({
      onlyCurrentEntitlements: true,
    });
    const owned = (purchases ?? []).some(
      (p) => p.productIdentifier === IAP_PRODUCT_ID,
    );
    if (owned) setPro(true);
    return owned || isPro();
  } catch {
    return isPro();
  }
}

/**
 * Restore a previous Pro purchase (Apple requires a restore path for
 * non-consumables). Returns true if Pro is unlocked afterward.
 */
export async function restorePro(): Promise<boolean> {
  if (!isIosNative()) return isPro();
  try {
    await NativePurchases.restorePurchases();
    const { purchases } = await NativePurchases.getPurchases({
      onlyCurrentEntitlements: true,
    });
    const owned = (purchases ?? []).some(
      (p) => p.productIdentifier === IAP_PRODUCT_ID,
    );
    if (owned) setPro(true);
    return owned || isPro();
  } catch {
    return isPro();
  }
}

/**
 * Launch-time reconciliation (iOS only): if the user already owns Pro (e.g.
 * reinstall, new device, or an Ask-to-Buy approval), make sure the local flag
 * is set. Also listens for StoreKit transaction updates for the same reason.
 * Safe to call unconditionally; no-op off iOS.
 */
export async function initIapEntitlement(): Promise<void> {
  if (!isIosNative()) return;
  try {
    await NativePurchases.addListener("transactionUpdated", (tx) => {
      if (tx?.productIdentifier === IAP_PRODUCT_ID) setPro(true);
    });
  } catch {
    /* listener unsupported on this OS version — ignore */
  }
  try {
    const { purchases } = await NativePurchases.getPurchases({
      onlyCurrentEntitlements: true,
    });
    if (
      (purchases ?? []).some((p) => p.productIdentifier === IAP_PRODUCT_ID)
    ) {
      setPro(true);
    }
  } catch {
    /* offline / no entitlements — leave local state as-is */
  }
}
