// Patches @capgo/native-purchases (v8.6.x/8.7.x) so StoreKit 2 purchases use
// purchase(confirmIn:options:) on iOS 18.2+.
//
// WHY (App Review rejection 2.1(b), submission 00f089ee, iOS 26.6): the
// plugin calls `product.purchase(options:)`, which relies on StoreKit's
// implicit window-scene inference to present the confirmation sheet. In a
// Capacitor app on modern iOS that inference fails and the call NEVER
// RETURNS — no result, no error, no transaction callback — so the JS promise
// hangs and the app can never unlock what the user paid for. Reproduced
// locally in ios/App/AppTests/IapHostedTests.swift (probe: "purchaseProduct"
// logs, then silence). Apple added purchase(confirmIn:) in iOS 18.2 exactly
// for this; the upstream plugin (≤8.7.0) does not use it yet.
//
// Runs from postinstall, idempotent. If upstream ships a confirmIn-based
// release, this script detects it and no-ops.
import fs from "node:fs";

const FILE = "node_modules/@capgo/native-purchases/ios/Sources/NativePurchasesPlugin/NativePurchasesPlugin.swift";

const ORIGINAL = "                let result = try await product.purchase(options: purchaseOptions)";
const PATCHED = `                let result: Product.PurchaseResult
                if #available(iOS 18.2, *) {
                    // Explicit scene: implicit inference hangs purchase() in
                    // Capacitor apps on modern iOS (App Review 2.1(b)).
                    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
                    guard let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first else {
                        call.reject("No window scene available to present the purchase confirmation")
                        return
                    }
                    result = try await product.purchase(confirmIn: scene, options: purchaseOptions)
                } else {
                    result = try await product.purchase(options: purchaseOptions)
                }`;

if (!fs.existsSync(FILE)) {
  console.log("[patch-native-purchases] plugin not installed — skipping");
  process.exit(0);
}
const src = fs.readFileSync(FILE, "utf8");
if (src.includes("purchase(confirmIn:")) {
  console.log("[patch-native-purchases] already patched (or fixed upstream) — nothing to do");
  process.exit(0);
}
if (!src.includes(ORIGINAL)) {
  console.error("[patch-native-purchases] ERROR: expected purchase call not found — plugin layout changed, patch needs updating");
  process.exit(1);
}
fs.writeFileSync(FILE, src.replace(ORIGINAL, PATCHED));
console.log("[patch-native-purchases] patched purchaseProduct to use purchase(confirmIn:options:) on iOS 18.2+");
