import XCTest

/// Drives the real purchase + restore flows against the local StoreKit
/// configuration (Configuration.storekit) — reproduces the App Review path.
final class AppUITests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func attach(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// The StoreKit Testing confirmation sheet is rendered out-of-process;
    /// poll both the app and springboard for a confirm control.
    private func confirmStoreKitSheet(_ app: XCUIApplication) -> Bool {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let names = ["Purchase", "Buy", "Confirm", "Subscribe", "OK"]
        let deadline = Date().addingTimeInterval(25)
        while Date() < deadline {
            for host in [app, springboard] {
                for n in names {
                    let b = host.buttons[n].firstMatch
                    if b.exists && b.isHittable {
                        attach(app, "payment-sheet-before-confirm")
                        b.tap()
                        return true
                    }
                }
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
        return false
    }

    private func webText(_ app: XCUIApplication, _ label: String) -> XCUIElement {
        // Web content surfaces as staticTexts/links/buttons inside webViews;
        // match by CONTAINS — exact a11y labels vary with punctuation/spacing.
        let pred = NSPredicate(format: "label CONTAINS %@", label)
        let byButton = app.webViews.buttons.matching(pred).firstMatch
        if byButton.exists { return byButton }
        let byLink = app.webViews.links.matching(pred).firstMatch
        if byLink.exists { return byLink }
        return app.webViews.staticTexts.matching(pred).firstMatch
    }

    private func scrollTo(_ app: XCUIApplication, _ el: XCUIElement, maxSwipes: Int = 12) {
        var swipes = 0
        while !(el.exists && el.isHittable) && swipes < maxSwipes {
            app.swipeUp()
            swipes += 1
        }
    }

    func testPurchaseUnlocksPro() throws {
        let app = XCUIApplication()
        app.launch()

        // Landing page → pricing section → "Unlock Pro — $2.99".
        let buy = webText(app, "Unlock Pro")
        XCTAssertTrue(buy.waitForExistence(timeout: 30), "Unlock Pro button not found on landing page")
        scrollTo(app, buy)
        attach(app, "1-before-purchase")
        buy.tap()

        XCTAssertTrue(confirmStoreKitSheet(app), "StoreKit confirmation sheet never appeared — purchase did not start")

        // The pricing card must flip to the unlocked state.
        let unlocked = app.webViews.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Pro unlocked")).firstMatch
        XCTAssertTrue(unlocked.waitForExistence(timeout: 30), "Purchase completed but Pro did NOT unlock (the 2.1(b) bug)")
        attach(app, "2-after-purchase-unlocked")

        // Persistence: relaunch, entitlement must survive.
        app.terminate()
        app.launch()
        let buyAgain = webText(app, "Unlock Pro")
        let unlockedAgain = app.webViews.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Pro unlocked")).firstMatch
        scrollTo(app, unlockedAgain.exists ? unlockedAgain : buyAgain)
        XCTAssertTrue(unlockedAgain.waitForExistence(timeout: 30), "Pro unlock did not persist across relaunch")
        attach(app, "3-after-relaunch-still-unlocked")
    }

    /// Run on a FRESH INSTALL (local web storage empty) after a previous
    /// purchase exists in the StoreKit test environment.
    func testRestorePurchasesButton() throws {
        let app = XCUIApplication()
        app.launch()

        let restore = webText(app, "Restore purchase")
        XCTAssertTrue(restore.waitForExistence(timeout: 30), "Restore button not found (the 3.1.1 bug)")
        scrollTo(app, restore)
        attach(app, "4-before-restore")
        restore.tap()

        let unlocked = app.webViews.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Pro unlocked")).firstMatch
        XCTAssertTrue(unlocked.waitForExistence(timeout: 30), "Restore tapped but Pro did not unlock")
        attach(app, "5-after-restore-unlocked")
    }
}
