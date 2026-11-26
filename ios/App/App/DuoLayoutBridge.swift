import UIKit
import Capacitor
import os

// iPhone Duo fold geometry for the web layer.
//
// WKWebView can't see the fold: CSS safe-area insets ignore it and the Viewport Segments /
// Device Posture web APIs can't be enabled in WKWebView (Apple Developer Forums 848036). So the
// host reads UIKit's reserved regions (iOS 27.1+) and hands them to the page through the
// "DuoLayout" plugin (src/lib/duoLayout.ts). Coordinates are in the web view's space, which is
// the CSS viewport (Capacitor's web view fills the view controller's view, inset adjustment off).
//
// Nothing here hardcodes a device: on phones, iPad and older iOS the region lists are empty
// and the hinge is "unavailable", and the web layout falls back to plain width rules.

@objc(DuoLayoutPlugin)
public class DuoLayoutPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DuoLayoutPlugin"
    public let jsName = "DuoLayout"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getLayout", returnType: CAPPluginReturnPromise)
    ]

    private static let log = Logger(subsystem: "com.acrogers.bibletriviacoach", category: "DuoLayout")
    private var lastSent: NSDictionary = [:]

    /// Set by the bridge view controller from UIHingeInteraction updates.
    var hingeStatus = "unavailable"
    var hingeAngleDegrees: Double?

    /// JS: DuoLayout.getLayout() -> DuoLayoutSnapshot (see src/lib/duoLayout.ts).
    @objc func getLayout(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(self.snapshot()) }
    }

    /// Re-reads the geometry and emits "layoutChange" only when something changed.
    func refresh() {
        let current = snapshot()
        let dict = NSDictionary(dictionary: current)
        guard !dict.isEqual(lastSent) else { return }
        lastSent = dict
        Self.log.info("layoutChange \(String(describing: current), privacy: .public)")
        notifyListeners("layoutChange", data: current)
    }

    func snapshot() -> [String: Any] {
        guard let view = webView else { return ["available": false] }
        var data: [String: Any] = [
            "available": true,
            "viewport": ["width": Double(view.bounds.width), "height": Double(view.bounds.height)],
            "hinge": hingeStatus,
            "division": [[String: Any]](),
            "occlusion": [[String: Any]](),
        ]
        if let angle = hingeAngleDegrees { data["hingeAngle"] = angle }
        if #available(iOS 27.1, *) {
            data["division"] = Self.regions(in: view, kind: .division)
            data["occlusion"] = Self.regions(in: view, kind: .occlusion)
        }
        return data
    }

    @available(iOS 27.1, *)
    private static func regions(in view: UIView, kind: UIView.ReservedRegion.Kind) -> [[String: Any]] {
        // includeInactive: the fold of a fully open device is inactive but still marks the crease,
        // which is where a two-pane gutter belongs (HIG: keep important content off the centre).
        view.reservedRegions(kind: kind, options: .includeInactive).map { region in
            [
                "x": Double(region.frame.minX),
                "y": Double(region.frame.minY),
                "width": Double(region.frame.width),
                "height": Double(region.frame.height),
                "active": region.isActive,
            ]
        }
    }
}

/// Main.storyboard's root view controller. Same as Capacitor's, plus the DuoLayout plugin.
class AppBridgeViewController: CAPBridgeViewController {
    private let duoLayout = DuoLayoutPlugin()

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(duoLayout)
        if #available(iOS 27.1, *) {
            let interaction = UIHingeInteraction { [weak self] _, update in
                guard let self else { return }
                if let hinge = update.hinge {
                    self.duoLayout.hingeStatus = Self.name(of: hinge.status)
                    // Angle updates are frequent; 5° steps are plenty for layout.
                    self.duoLayout.hingeAngleDegrees = (Double(hinge.angle) * 180 / .pi / 5).rounded() * 5
                } else {
                    self.duoLayout.hingeStatus = "unavailable"
                    self.duoLayout.hingeAngleDegrees = nil
                }
                self.duoLayout.refresh()
                // Reserved regions can settle a moment after the hinge does.
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in self?.duoLayout.refresh() }
            }
            view.addInteraction(interaction)
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        duoLayout.refresh()
    }

    @available(iOS 27.1, *)
    private static func name(of status: UIHinge.Status) -> String {
        switch status {
        case .closed: return "closed"
        case .partiallyOpen: return "partiallyOpen"
        case .fullyOpen: return "fullyOpen"
        case .unknown: return "unknown"
        @unknown default: return "unknown"
        }
    }
}
