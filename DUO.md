# iPhone Duo guidance — Bible Study Coach

**Read this before any iPhone Duo work, and recheck the Apple sources below first.** Apple
documentation is normative. Developer-forum answers are implementation advice. News and user
reports are anecdotal feedback, not platform requirements.

- Created: 2026-11-25. Sources last checked: 2026-11-25 (some first read 2026-11-10, noted below).
- Status (2026-11-25, uncommitted, awaiting Allen's review): **fold bridge + two-pane Read,
  Lesson and Quiz implemented** (section 7). Play hub, Settings, Learn index/topic and Family
  Night are still one column. Verified on the simulator only — **no hardware test yet**.
- Screenshots (outside the repo, not committed), under `/Users/allenrogers/Projects/duo-shots/bible/`:
  before = `2026-11-25-duo-audit/` and `2026-11-25-playback-fix/`; after = `2026-11-25-duo-two-pane/`.

---

## 1. Sources

### Apple (normative)
| Source | Accessed | Takeaway |
|---|---|---|
| [HIG: Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo) (page dated Sept 9, 2026) | 2026-11-25 | Same app, same functionality and state on both displays and in every pose. "Show an additional level of hierarchy on the larger inner display if it makes sense for your content" (Mail shows list and message side by side). Compact width on the outer display and regular width on the inner display "give you the fundamentals for every pose". No custom layout per pose. Avoid fixed widths and extreme changes while folding. Keep important elements clear of the centre (fold). Bars move to the side except on the inner display in portrait. Don't override default bar placement. Account for asymmetric safe areas. Vertical controls stay on the same side in right-to-left languages. |
| [Preparing your app for iPhone Duo](https://developer.apple.com/documentation/technologyoverviews/preparing-your-app-for-iphone-duo) | 2026-11-25 (first read 2026-11-10) | Lay out from scene/container bounds and size classes, never screen size, idiom or orientation. Use split views and arrangement views. Reserved regions: **division** (fold, active only when partially open) and **occlusion** (outer camera always; inner camera only when active), queried with `reservedRegions(kind:options:)`. Test every orientation and pose for views across the fold and controls hidden in it. Says nothing about web content. |
| [iPhone Duo hub](https://developer.apple.com/iphone-duo/) and ["Three steps"](https://developer.apple.com/iphone-duo/prepare/) | 2026-11-10 | iOS 27.1 SDK or later = "optimized for iPhone Duo" (full display; native bars vertical below the status bar). Xcode's app-resizability skill finds most issues, not all. The iPhone Duo simulator in Xcode 27.1 is "the best way to test the full native experience". From April 2027, apps built with the 27.1 SDK or later must include Duo screenshots. |
| [Interacting with your app in Device Hub](https://developer.apple.com/documentation/xcode/interacting-with-your-app-in-device-hub) | 2026-11-10 | Closed, Partially Open and Open pose buttons; Option-drag the slider to fold to any angle. |
| Xcode `app-resizability` agent skill (exported with `xcrun agent skills export`, Xcode 27.2) | 2026-11-25 | UIKit/SwiftUI modernization: no `UIScreen.main`, orientation or idiom checks; scene lifecycle; safe areas that are asymmetric and change at runtime. Prerequisites checked for this app: launch storyboard ✓, iPad lists all 4 orientations ✓, no `UIRequiresFullScreen` ✓, already uses SceneDelegate ✓, no legacy APIs in native Swift ✓. |

### Developer implementation advice (Apple Developer Forums; replies from Apple staff noted)
| Thread | Accessed | Takeaway |
|---|---|---|
| [Adapting WKWebView content to reserved regions on iPhone Duo](https://developer.apple.com/forums/thread/848036) (Sept 2026, Apple Frameworks Engineer) | 2026-11-25 | **The key fact for this app.** CSS safe-area insets and the scroll-view inset adjustment are *unaffected* by the fold. The Viewport Segments and Device Posture web APIs expose reserved regions but are experimental in Safari and **cannot be enabled in WKWebView**. Apple's recommended approach: the native host computes the reserved-region geometry and passes it to the page. |
| [How to stay narrow on an iPhone Duo?](https://developer.apple.com/forums/thread/847836) (Sept 2026, Apple, recommended answer) | 2026-11-25 | Apps can't opt out of full width; every app is expected to adapt to any scene size. |
| [Managing empty space … dual-window mode](https://developer.apple.com/forums/thread/847859) (Sept 2026, Apple, recommended answer) | 2026-11-25 | Apps built with the 27.1 SDK fill the screen. There's no API to dock an app's scene to one side. |
| [Vanishing vertical toolbars; odd nav bar behaviour](https://developer.apple.com/forums/thread/849474) (Oct 2026, Apple DTS) | 2026-11-25 | Native vertical-bar bugs exist (FB25467711). Not relevant to this app's HTML tab bar, but a reminder to test real bars if native chrome is ever added. |
| [Capgo: Capacitor iPhone Duo safe-area guide](https://capgo.app/blog/capacitor-iphone-duo-safe-area-guide/) (third party) | 2026-11-25 | When the pose changes, UIKit updates the insets, the web view relays out, and `env(safe-area-inset-*)` updates on the next style pass. Audit left/right padding on every screen, not just top and bottom. |

### User complaints and preferences (anecdotal)
| Source | Accessed | Takeaway |
|---|---|---|
| Search summary of news coverage ([MacObserver](https://www.macobserver.com/?p=495706), [IBTimes](https://www.ibtimes.co.uk/new-apple-iphone-duo-owners-slam-app-situation-unoptimised-apps-suffer-from-letterboxing-1832470), [PhoneArena](https://www.phonearena.com/news/iphone-duo-app-optimization_id184884), [iThinkDiff](https://www.ithinkdiff.com/iphone-duo-black-bars-apps-not-filling-screen/)). MacObserver blocked direct fetch; content seen via search results only. | 2026-11-25 | Owners' main complaint is apps letterboxed or shown small with "giant black bars", plus a dead strip beside the clock/camera column on the outer display. Fixed mainly by rebuilding with the 27.1 SDK. Users prize *filled, purposeful* layouts and notice unused space. No consumer thread specifically about the right-hand column of optimized apps was found. |

---

## 2. Durable principles for this app

1. **Fill the scene, but with purpose.** Layout follows the web view's width and height (CSS
   media or container queries), never device detection. Widening a phone card is not "using" the inner display.
2. **One app, two densities.** Outer display = the phone layout. Inner display may add **one**
   level of hierarchy (list beside detail, Scripture beside explanation) when the content benefits.
   Same features and state everywhere.
3. **Never place essential text or controls in reserved regions.** The status/camera column must
   stay clear (it does today via `env(safe-area-inset-*)`). The fold is *invisible to CSS*: until
   the native host passes fold geometry in, nothing interactive should be centred on the inner display in half-open poses.
4. **Let the fold fall between panes.** In two-pane layouts the gutter should sit at the fold
   when it's active, so each pane is a full half (Apple: even column counts, keep the centre clear).
5. **Readable measure beats width.** Scripture and lesson text cap near 65–75 characters per line
   on any width. Spare width goes to a second pane or margins, not longer lines.
6. **No extreme changes while folding.** The selected passage, lesson step, quiz question and
   playback state survive open/close/rotate. Panes collapse to one column; they don't navigate away.
7. **Don't duplicate navigation.** One primary nav. If the bottom bar ever moves to a side rail
   on short landscape heights, it *replaces* the bottom bar; it's never added alongside it.
8. **Preserve the standard iPhone, Dynamic Type, and accessibility.** Two-pane breakpoints must
   collapse back to one column at large text sizes (breakpoints in `em`/`ch`, not px alone). Right-to-left:
   the app is English-only today. If it's localized, switch to logical CSS properties.

---

## 3. Measured geometry (simulator, iOS 27.1, iPhone Duo)

| Pose | Web view size (pt) | Reserved | Notes |
|---|---|---|---|
| Closed, portrait | 466×678 | Outer camera + status column on the **right**, ≈84pt (`env(safe-area-inset-right)`) | Phone layout (≤480px rule) |
| Closed, landscape | 678×466 | Camera column on the **left** | 466pt tall. The bottom nav takes ≈95pt |
| Open, landscape | 951×669 | Status column on the **right**, ≈84pt (inferred from centring; confirm with Web Inspector) | ≥768px rule: one 720pt card |
| Open, portrait | 669×951 | Status at the **top** | One 560pt card |
| Half-open, book | 951×669 | **Fold: vertical band x 455.5–495.5pt, active**; hinge `partiallyOpen` (110° in the default half-open pose) | Now reported to the page by the bridge |
| Half-open, laptop/tabletop | 669×951 | **Fold: horizontal band y 455.5–495.5pt, active** | Now reported to the page by the bridge |

2026-11-25: the fold bands above were re-measured **in this app's web view** through the DuoLayout
bridge (`log show --info --predicate 'category == "DuoLayout"'`). Fully open, the same band is
reported **inactive** (`includeInactive`). Closed: no division. The simulator still doesn't *draw*
the fold, so "nothing sits in the fold" is checked against these numbers, not seen on glass.

---

## 4. Screen-by-screen audit (commit fd39786, 2026-11-25)

**How the right side of the open display is used today:** in inner landscape the card is 720pt,
centred in the safe area. To its right are ≈74pt of empty margin, then the ≈84pt reserved
status column. The theme toggle floats in that margin. Nothing essential sits in the reserved
column (correct). But the extra width isn't used for anything purposeful: every screen is the phone column made
wider. Left and right margins are dead space.

| Screen | Outer (closed) | Inner open | Half-open (inferred) | Assessment |
|---|---|---|---|---|
| **Home `/`** | Good. Respects the right column | One centred column | Hero image and CTA near the centre | Marketing page; low value to change |
| **Play hub `/play`** | Good | One long 720pt column; Learn and Your Path are 2–3 screens down; mode tiles go 4-across | Cards straddle the fold | **Candidate:** two-column dashboard (today + daily on one side, modes / Learn / Path on the other). Medium value |
| **Quiz** | Good. Feedback above Next (fd39786) | Answers become a 2×2 grid. Big empty score header | **Book pose: the right-hand answers' A/B/C/D badges (≈x 456–481pt) fall in the fold** | Keep one focused task (don't split). Make the grid gap follow the fold, or use one column when a fold is active |
| **Learn index / topic** | Good | A single "Grace" card in a 720pt card; mostly empty | — | Natural list-beside-detail case, but only 1 topic / 1 lesson today. Revisit when there are ≥3 topics |
| **Lesson (Grace)** | Good. Wraps well | Scripture lines ≈80+ chars; explanation and check below, far from the text | Text crosses the fold | **Strong candidate:** Scripture pinned in one pane, explanation + 5-question check in the other, so the reader can refer to the passage while answering. Fold falls between panes |
| **Read `/read`** | Good. ~~Playback bar extended into the right status column~~ — **fixed 2026-11-25** (safe-area side insets, uncommitted) | Picker + controls fill the top ~60%; Scripture starts at y≈460 of 669 (one or two verses visible); lines ≈90 chars | **Laptop pose: the Load/Listen/Pause/Stop row sits on the fold band.** Book pose: lines cross the fold | **Strongest candidate:** narrow controls pane (book/chapter, Listen/Pause/Stop, reader settings) beside a passage pane capped at a readable measure. Playback controls stay reachable while reading. A verse outline is **not** recommended for short passages (low benefit) |
| **Settings** | Not re-audited this pass | Single-column form | — | Low priority; a form doesn't benefit from two panes |
| **Bottom nav (HTML)** | Fine in portrait | Horizontal bar spans the full width; items in a 520pt group | — | Native bars go vertical on the Duo, but this is HTML, so it stays at the bottom. In **landscape** (outer 466pt, inner 669pt tall) it costs 14–20% of the height. Experiment only (see P3) |
| **Theme toggle** | OK in portrait | OK in landscape | — | Overlaps the card's top-right corner by ≈5pt in inner portrait and outer landscape. Cosmetic |

Also verified (2026-11-25, same build): unfolding and folding live keep the quiz question and the
lesson in place with no clipping. Text wrapping and tab bars are fine on iPhone 17e and 17
(iOS 27.2).

---

## 5. Recommendations (not approved — proposals only)

| Pri | Proposal | Why | Notes |
|---|---|---|---|
| **P1** | **Fold bridge**: a small Capacitor plugin in the host reads `UIView.reservedRegions(kind: division/occlusion)` on layout and trait changes and sets CSS variables (`--duo-fold-x`, `--duo-fold-width`, `--duo-fold-axis`, `--duo-fold-active`) on `<html>` | Apple's recommended route for WKWebView. CSS can't see the fold otherwise | **Done 2026-11-25** as a typed plugin + JS event (not CSS variables); see section 7 |
| **P1** | Read playback bar: add `env(safe-area-inset-left/right)` to its `left`/`right` | Real overlap with the reserved column on the outer display | **Done 2026-11-25** (uncommitted); verified closed portrait/landscape, open, book, laptop (fold not rendered by simulator) |
| **P1** | Keep interactive rows off the fold: Read controls (laptop pose) and the quiz answer grid (book pose) | Controls in the fold are hard to see and tap (Apple checklist) | **Done 2026-11-25** for Read, Quiz and the bottom nav (two-pane layouts put the fold in the gutter) |
| **P2** | **Read two-pane** at regular width in landscape (≈ ≥840px available and ≥ some `em` threshold): controls/picker pane + passage pane | Purposeful use of the inner display; Scripture visible on open; playback always reachable | Collapses to today's layout on the outer display, in portrait and at large text. Test with Listen highlighting and the auto-scroll |
| **P2** | **Lesson two-pane**: Scripture pane + explanation/check pane | Bible-study fit: answer while viewing the text | Keep lesson progress rules unchanged |
| **P2** | Readable measure: cap passage/lesson text near 70ch everywhere | Inner landscape lines are ≈80–90 chars | Safe on standard iPhone (already narrower) |
| **P3** | Play hub two-column dashboard on regular width | Reduces scrolling; Learn becomes visible | Avoid putting card edges at the fold |
| **P3** | Learn topic list beside lesson list/detail | Apple's "extra level of hierarchy" | Only once there are ≥3 topics |
| **P3** | Experiment: in short landscape heights, move the HTML nav to a *vertical* rail on the trailing edge below the status area (mirrors native Duo bars) | Recovers 14–20% of height | Replaces the bottom bar, never both. Needs usability evidence first |
| **P3** | Nudge the theme toggle so it doesn't touch the card corner | Cosmetic | — |

**Not recommended:** filling the status column with content; a second navigation rail; per-pose custom layouts; a verse-outline sidebar for short readings.

---

## 6. Simulator limits and tests still needed

- **No iOS 27.3 beta** is installed. The installed runtimes are iOS 27.0, 27.1 and 27.2. The Duo device type only runs on **27.1** here (creating it on 27.2 fails with "Incompatible device"). Xcode 27.2 (27B52).
- The simulator **doesn't render or expose the fold to web content**. The fold coordinates come from a native measurement in another app (2026-11-09).
- The inner-camera occlusion (only while the camera is active) was not tested. The app doesn't use the camera.
- The `env(safe-area-inset-right)` ≈84pt value on the inner display is inferred from layout. Confirm it with Safari Web Inspector.
- Not yet tested on Duo: accessibility text sizes (AX1–AX5), VoiceOver order in two-pane layouts, Split View multitasking (the app at half width), intermediate hinge angles (Option-drag), sheets (What's New) in half-open poses, and Settings.
- **No physical iPhone Duo test.** Apple says simulators don't replicate devices; check on hardware before shipping Duo layouts.
- App Store: Duo screenshots become required from April 2027 for apps built with the 27.1 SDK or later.

---

## 7. Implementation (2026-11-25, uncommitted)

Sources rechecked 2026-11-25 before coding: HIG "Designing for iPhone Duo", "Preparing your app
for iPhone Duo", forum thread 848036 (WKWebView: native host must pass the geometry), and the Xcode
`app-resizability` skill. No guidance changed since the audit above.

### Native bridge (iOS only, smallest typed surface)
- `ios/App/App/DuoLayoutBridge.swift`: `DuoLayoutPlugin` (JS name `DuoLayout`) with one method,
  `getLayout()`, and one event, `layoutChange` (sent only when the snapshot changes). Snapshot:
  `{ available, viewport{width,height}, hinge, hingeAngle?, division[], occlusion[] }`, each region
  `{x,y,width,height,active}` in web-view points (= CSS px).
- Geometry comes from `UIView.reservedRegions(kind:options: .includeInactive)` (iOS 27.1+);
  hinge state from `UIHingeInteraction` (angle rounded to 5°). Refreshes on
  `viewDidLayoutSubviews`, on each hinge update and 0.35 s after it.
- `AppBridgeViewController` (subclass of `CAPBridgeViewController`, set in `Main.storyboard`)
  registers the plugin. **No device checks, no hardcoded sizes or hinge coordinates.** On phones,
  iPad and iOS < 27.1 the region lists are empty and the web layer uses plain width rules.
- Versions (verified locally 2026-11-26 with `xcodebuild -version`, `xcrun --show-sdk-version`
  / `--show-sdk-build-version`, `simctl list runtimes`):
  - **Toolchain / build SDK:** Xcode 27.2 (27B52), iOS SDK 27.2 (build 24B8118).
  - **API availability (separate from the build SDK):** in that SDK, `reservedRegions`,
    `UIView.ReservedRegion`, `UIHingeInteraction` and `UIHinge` are marked available starting
    in **iOS 27.1**, so the bridge guards them with `#available(iOS 27.1, *)` (deployment target
    15.0/17.0).
  - **Duo simulator runtime:** iOS 27.1 (24A94425).

### Web layout (`src/lib/duoLayout.ts`, `src/components/duo/DuoSplit.tsx`)
| Reported | Layout | Condition |
|---|---|---|
| Vertical fold (active or inactive) | `columns`: gutter = the fold band | Both sides ≥ 300px × text scale, height ≥ 480 |
| Horizontal fold, **active** (laptop) | `rows`: top/bottom = the fold band | Each part ≥ 200px × text scale |
| Horizontal fold, inactive (flat open portrait) | one column | — |
| No fold (iPad, desktop) | `columns` 55/45 with a 24px gutter | usable width ≥ 2×min pane + 24, width ≥ 840, height ≥ 560 |
| Anything else (all iPhones, Duo closed) | one column — **phone layout unchanged** | — |

- Text scale = app text size × Learn system text scale, so large text falls back to one column.
- `DuoSplit` keeps the same element tree in every mode, so state survives folding, unfolding and
  rotation. Panes are `role="region"` with labels and scroll independently; the page behind them
  doesn't scroll. Panes start below the safe-area insets, end above the bottom nav, and the pane
  under the floating theme toggle starts below it.
- Bottom nav: while a vertical fold is **active** (book), the tabs move into the leading half so
  none sits on the fold.

### Screens
- **Read** — passage pane (max 36em measure, tappable verse numbers with `aria-pressed`, selected
  verse outlined) + study companion pane: Listen/Pause/Stop, a "Current verse" card that follows
  selection and audio progress (Selected / Now reading / Paused at, previous/next verse, "Listen
  from X"), chapter navigation, and book/chapter pickers. A new passage starts its pane at the top.
  Phone path untouched (floating playback bar stays inside the safe area).
- **Lesson** — Scripture pane (36em) beside the lesson, its check and its result. A question's
  prompt and its answers always stay together in the lesson pane.
- **Quiz** — question and answers together in the leading pane; score/timer, verse of the day,
  feedback and Next/Finish in the trailing pane. Answers stack in one column in a pane.
- Not split (deliberate or not yet): Play hub, Settings, Learn index/topic, Family Night quiz.

### Test evidence (simulator, Duo iOS 27.1 + iPhone 17e / 17 iOS 27.2)
Screenshots in `duo-shots/bible/2026-11-25-duo-two-pane/`:
01–04 Read open (load, verse select, Listen from 3:3 with word highlight, next chapter);
05–06 Lesson + check open; 07 book pose, check state kept, nav beside fold; 08–09 laptop rows
(Lesson check, Read); 10–11 Quiz question/feedback; 12 open portrait, one column; 13–14 closed
landscape/portrait, playback bar in the safe area; 15–17 iPhone 17e/17 unchanged; 18 app text
1.30× → one column. Also exercised: Stop, folding mid-check and mid-passage, independent pane
scroll. `tsc` clean; ESLint 0 errors (7 warnings, all pre-existing in `play/page.tsx`);
`test:learn` 34/34; `validate:questions` passes.

### Limitations / still needs a real device
- The simulator doesn't draw the fold: "nothing across the fold" is **inferred from reported
  geometry**, not seen. Check on hardware, including intermediate hinge angles.
- Not tested: VoiceOver reading order across panes, AX1–AX5 system text, RTL (app is English-only;
  pane placement uses physical left/right), Split View at half width, inner-camera occlusion.
- Flat open portrait is one column and runs across the inactive crease (Apple allows this for an
  inactive fold; revisit if it reads badly on hardware).
- The large-text fallback is conservative (one column already at 1.30×).
- Play hub and Settings are still one stretched column on the inner display; in book pose their
  cards can cross the fold.
- Read state resets on a tab switch (pre-existing, unchanged).
- The Read passage pane shows a card inside the pane card (cosmetic).

## Changelog
- 2026-11-25 — Created. Sources checked, first audit of fd39786 on the iPhone Duo simulator (iOS 27.1).
- 2026-11-25 — P1 fixed: Read playback bar now uses `calc(12px + env(safe-area-inset-left/right))`. Fold crossing in book pose still unverified on hardware.
- 2026-11-25 — Implemented the fold bridge (P1) and two-pane Read, Lesson and Quiz (P2) — section 7. Fold band re-measured through the bridge. Uncommitted for review.
