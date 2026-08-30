import XCTest
import StoreKitTest
import WebKit

/// Hosted in the real App process: drives the actual page JS through the
/// Capacitor WKWebView against a local StoreKit test session, so the full
/// purchase → JS unlock → persistence chain runs exactly as in production.
///
/// Deliberately written WITHOUT async/await: Swift concurrency continuations
/// segfault in this Xcode 26 + x86_64-simulator combination (same family as
/// the Swift Testing `Test.all` bootstrap crash, dodged via
/// SWIFT_TESTING_ENABLED=0 in the xctestrun).
final class IapHostedTests: XCTestCase {

    private let productID = "com.acrogers.bibletriviacoach.pro"
    private var session: SKTestSession!

    override func setUpWithError() throws {
        continueAfterFailure = false
        let bundle = Bundle(for: IapHostedTests.self)
        guard let url = bundle.url(forResource: "Configuration", withExtension: "storekit") else {
            throw XCTSkip("Configuration.storekit missing from test bundle resources")
        }
        session = try SKTestSession(contentsOf: url)
        session.disableDialogs = true
        session.resetToDefaultState()
        session.clearTransactions()
    }

    // ── helpers (expectation / run-loop style only) ────────────────────────

    private func findWebView() -> WKWebView? {
        for scene in UIApplication.shared.connectedScenes {
            guard let ws = scene as? UIWindowScene else { continue }
            for window in ws.windows {
                if let wv = firstWebView(in: window) { return wv }
            }
        }
        return nil
    }

    private func firstWebView(in view: UIView) -> WKWebView? {
        if let wv = view as? WKWebView { return wv }
        for sub in view.subviews {
            if let wv = firstWebView(in: sub) { return wv }
        }
        return nil
    }

    @discardableResult
    private func eval(_ wv: WKWebView, _ js: String, timeout: TimeInterval = 10) -> Any? {
        var out: Any?
        let exp = expectation(description: "js")
        wv.evaluateJavaScript(js) { result, _ in
            out = result
            exp.fulfill()
        }
        wait(for: [exp], timeout: timeout)
        return out
    }

    private func waitForWebView(timeout: TimeInterval = 30) -> WKWebView {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if let wv = findWebView() {
                if let ready = eval(wv, "document.readyState") as? String,
                   ready == "complete" || ready == "interactive" {
                    return wv
                }
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
        XCTFail("WKWebView never became ready")
        fatalError("unreachable")
    }

    private func waitForJS(_ wv: WKWebView, _ js: String, timeout: TimeInterval = 30, label: String) {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if let ok = eval(wv, js) as? Bool, ok { return }
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
        let dump = eval(wv, "document.body.innerText.slice(0, 1500)") as? String ?? "<no dom>"
        XCTFail("Timed out waiting for: \(label)\nDOM:\n\(dump)")
    }

    private func attachSnapshot(_ wv: WKWebView, _ name: String) {
        // Best-effort: on some simulator runtimes the WKWebView snapshot
        // callback never fires (GPU process assertion) — never fail the test
        // over evidence imagery; the state JSON attachments are the record.
        var image: UIImage?
        let exp = XCTestExpectation(description: "snapshot")
        wv.takeSnapshot(with: nil) { img, _ in
            image = img
            exp.fulfill()
        }
        _ = XCTWaiter().wait(for: [exp], timeout: 8)
        if let image {
            let att = XCTAttachment(image: image)
            att.name = name
            att.lifetime = .keepAlways
            add(att)
        }
    }

    private func attachState(_ wv: WKWebView, _ name: String) {
        let js = "JSON.stringify({ proFlag: localStorage.getItem('btc-pro'), cookie: document.cookie, " +
                 "buttons: [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 30), " +
                 "unlockedMarker: document.body.innerText.includes('Pro unlocked') })"
        if let state = eval(wv, js) as? String {
            let att = XCTAttachment(string: state)
            att.name = name
            att.lifetime = .keepAlways
            add(att)
        }
    }

    private func clearLocalEntitlement(_ wv: WKWebView) {
        eval(wv, "localStorage.removeItem('btc-pro'); document.cookie='btc-pro=; max-age=0; path=/'; window.dispatchEvent(new Event('btc-pro-change')); true")
    }

    // ── tests ──────────────────────────────────────────────────────────────

    /// 2.1(b): purchase must unlock Pro, and the unlock must persist.
    func testPurchaseUnlocksProAndPersists() {
        let wv = waitForWebView()

        clearLocalEntitlement(wv)
        waitForJS(wv, "[...document.querySelectorAll('button')].some(b => b.textContent.includes('Unlock Pro'))", label: "Unlock Pro button on landing page")
        attachState(wv, "1-state-before-purchase")
        attachSnapshot(wv, "1-before-purchase")

        // Tap the real Unlock button (the reviewer's action).
        eval(wv, "[...document.querySelectorAll('button')].find(b => b.textContent.includes('Unlock Pro')).click(); true")

        // Purchase runs against the local StoreKit session (dialogs off) —
        // the JS must flip the entitlement and the UI must show unlocked.
        waitForJS(wv, "localStorage.getItem('btc-pro') === '1'", timeout: 45, label: "btc-pro entitlement flag after purchase")
        waitForJS(wv, "document.body.innerText.includes('Pro unlocked')", label: "unlocked UI marker after purchase")
        attachState(wv, "2-state-after-purchase")
        attachSnapshot(wv, "2-after-purchase")

        // StoreKit ground truth: the test session holds the Pro transaction.
        let txs = session.allTransactions()
        XCTAssertTrue(txs.contains { $0.productIdentifier == productID }, "StoreKit test session has no transaction for \(productID)")

        // Persistence proxy for relaunch: reload the page (fresh JS world) —
        // the entitlement must still gate as unlocked from storage.
        eval(wv, "location.reload(); true")
        RunLoop.current.run(until: Date().addingTimeInterval(2))
        _ = waitForWebView()
        waitForJS(wv, "localStorage.getItem('btc-pro') === '1' && document.body.innerText.includes('Pro unlocked')", label: "unlock persisted after reload")
        attachState(wv, "3-state-after-reload")
        attachSnapshot(wv, "3-after-reload")
    }

    /// 3.1.1: the dedicated Restore Purchases button must exist and restore.
    func testRestoreButtonRestores() {
        // Seed ownership in the test session (prior purchase on this Apple
        // ID), then wipe the app-local flag — the fresh-install situation
        // restore exists for.
        _ = try? session.buyProduct(productIdentifier: productID)

        let wv = waitForWebView()
        clearLocalEntitlement(wv)
        waitForJS(wv, "[...document.querySelectorAll('button')].some(b => b.textContent.includes('Restore purchase'))", label: "visible Restore purchase button")
        attachState(wv, "4-state-before-restore")
        attachSnapshot(wv, "4-before-restore")

        eval(wv, "[...document.querySelectorAll('button')].find(b => b.textContent.includes('Restore purchase')).click(); true")

        waitForJS(wv, "localStorage.getItem('btc-pro') === '1'", timeout: 45, label: "entitlement flag after restore")
        waitForJS(wv, "document.body.innerText.includes('Purchases restored') || document.body.innerText.includes('Pro unlocked')", label: "restore success feedback in UI")
        attachState(wv, "5-state-after-restore")
        attachSnapshot(wv, "5-after-restore")
    }
}
