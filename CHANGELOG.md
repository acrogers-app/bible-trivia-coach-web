# Bible Study Coach — Changelog

All notable changes to this project are documented here.
Semantic versioning: MAJOR.MINOR.PATCH (1.2.0 = new features, 1.1.1 = bug
fixes, 2.0.0 = major redesign). Update this file with every change and commit
it with every release. The in-app "What's New" modal is keyed to the version
in `src/lib/gameFx.ts` (`APP_VERSION`) — bump both together.

## [1.2.4] — 2026-07-22
### Fixed
- Day picker list readable in dark mode (dark surface, light text, themed
  search input) — was a white box with invisible text.
- Settings preview box, voice-quality box, selects, buttons, checkboxes,
  and slider all dark-styled (accent-color on form controls).
- Coach tip card is now a golden hint box in dark (gold border on dark),
  not dull tan.
- Quiz mode tile cards (Daily Challenge, Quick Quiz, Family Night, By Book,
  Bible History, Levels) dark elevated instead of white — they also never
  set a text color, so they'd have shown black-on-dark once fixed.
- Locked path cards more visible in dark (opacity 0.55 → 0.7, themed surface).
- Quiz by Book selects dark styled; global rule themes select option lists.
- Bible Coach Pro banner now indigo-tinted and visible in dark.
- /read referenced four CSS tokens that were never defined
  (--btc-input-bg/--btc-input-border/--btc-text/--btc-btn-bg) — now aliased
  to the themed tokens.
- Service worker cache bumped to `btc-v7`.

## [1.2.3] — 2026-07-22
### Changed
- Light mode: bright white with indigo accents (not parchment).
- Dark mode: true deep navy (#080818) with elevated dark-purple cards,
  light glowing text, and gold accents — not a beige/white card.
- Light and dark are now dramatically different at a glance.
- Toggle button larger and more visible (44px rounded square; indigo in
  light, frosted in dark).
- Cleaner card hierarchy: consistent 16px radii, shared shadow tokens,
  indigo-accented Daily Challenge card and list chevrons.
- Better CTA button prominence (full-width, 17px/700, taller).
- Name input looks like a real input (bordered, elevated background).
- Phone layout: 390px centered column on a visible themed backdrop.
- Service worker cache bumped to `btc-v6`.

## [1.2.2] — 2026-07-22
### Added
- Floating ☀️/🌙 theme toggle, fixed top-right on every screen. Tapping pins
  Light/Dark instantly; the Settings Appearance card still offers System.
- Light mode now themes the WHOLE app, not just quiz screens: warm parchment
  redesign — cream card on a vellum-gold surround, brown ink, gold accents
  (never plain white). Dark mode is visually unchanged.
- Browser/status-bar theme color now matches the theme (parchment in light,
  night navy in dark) instead of the old blue.

### Changed
- App-shell colors moved from ~40 hardcoded hex values to CSS variables
  (`--app-*` / `--btc-*` tokens in globals.css) with dark defaults identical
  to v1.2.1; quiz-game light palette refined (illuminated-manuscript
  parchment, ruled-line texture, white question cards with warm shadows,
  royal-purple buzzers in both themes).
- Service worker cache bumped to `btc-v5`.

## [1.2.1] — 2026-07-21
### Fixed
- TTS speech now stops immediately when Next is tapped, when navigating away,
  or when a quiz/reading screen unmounts (was continuing over the next
  question). New shared `src/lib/speech.ts` (`stopSpeech`/`speakText`) —
  every future advance path must call `stopSpeech()`.
- Light mode now properly themes the quiz game screens (was staying dark
  purple). Dark = night sky (unchanged); light = parchment/manuscript.
  Follows the iOS/system setting live, plus a manual System/Light/Dark
  picker in Settings (localStorage `bible-theme`, applied pre-paint).
- iPad layout (≥768px): answers in a 2×2 game-show grid, larger question
  text/buttons/score, roomier game padding.

### Added
- Pulsing 🔊 "Reading aloud…" indicator while a passage is being read;
  disappears on stop, Next, or natural end.
- What's New modal now only re-shows on minor/major releases, not patches.

### Changed
- Service worker cache bumped to `btc-v4`.

## [1.2.0] — 2026-07-21
### Added
- **Family Night — Sprout-level safety**: Bible character nickname picker
  (20 names + custom, max 15 chars — no real names, emails, or ages ever),
  one-time safety notice modal (`bible-family-safety-seen`), emoji avatars
  per player, mini leaderboard after every question, winner celebration
  screen with confetti and Play Again. All scores device-local, never online.
- **Game-like experience**: 3D pressable answer buttons (green pulse on
  correct, red shake on wrong), arcade-style animated points counter with
  flying "+10/+15", streak counter with flame (+5 pt streak bonus),
  per-question countdown bar (green→yellow→red, soft tick in last 5 s —
  time running out never auto-fails, Coach just nudges), question entrance
  animation, drifting starfield background, golden verse reveal after
  correct answers. All scoped to quiz screens; honors Reduce Motion.
- **Your Path difficulty progression**: Beginner 📖 → Disciple ✝️ →
  Prophet 🔥 → Apostle 👑; score ≥70% to unlock the next
  (localStorage `btc-difficulty-progress`).
- **Streak protection notice**: gentle "streak at risk" banner when today's
  study isn't done yet.
- **What's New modal** after each update (`bible-version-seen`).
- **Family Safe Content badge** in the Family Mode banner; PIN hint in
  Settings.
- **Bible Coach Pro placeholders** (locked UI only — no gating, no IAP yet).

### Changed
- Service worker cache bumped to `btc-v3`.

## [1.1.0] — 2026-07-21
### Added
- Family Mode with parent PIN protection (analytics fully disabled while on)
- /safety page and child-safety contact form
- Per-IP API rate limiting; analytics gated by opt-out
- Passed full child-safety audit

## [1.0.0]
- Initial release: daily Gospel readings, trivia quizzes, coach character,
  reading plan, TTS reader, offline mode, Capacitor iOS app.
