# Bible Study Coach — Changelog

All notable changes to this project are documented here.
Semantic versioning: MAJOR.MINOR.PATCH (1.2.0 = new features, 1.1.1 = bug
fixes, 2.0.0 = major redesign). Update this file with every change and commit
it with every release. The in-app "What's New" modal is keyed to the version
in `src/lib/gameFx.ts` (`APP_VERSION`) — bump both together.

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
