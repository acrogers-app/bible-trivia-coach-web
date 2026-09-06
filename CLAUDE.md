<!-- READ FIRST: /Volumes/Nvme4TB/PROJECTS.md -->
<!-- Then: memory files -->
<!-- Then: this file -->

> ⚠️ **Shared Stripe account — read before any checkout/webhook/verify code.** This app
> bills through the ONE shared WeBeUseful Stripe account, so every app's events reach every
> webhook. (1) Tag `metadata.app = "bible"` on checkout creation. (2) Every grant point — a
> minting webhook OR an account-less `/api/verify` — must **allowlist** `metadata.app ===
> "bible"`, never a denylist. Full rules + the 2026-09-05 incident:
> `SHARED_STRIPE_ACCOUNT_RULES.md` (in the `webeuseful-projects` monorepo root).

@AGENTS.md

# Bible Study Coach

## What This Is
Bible Study Coach — daily Gospel readings plus low-pressure Bible trivia with an encouraging coach character. Warm, no guilt, no streak pressure; Scripture-centered. Ships as a Next.js web app (biblestudy.webeuseful.com) and as the iOS app via Capacitor (ios/App, includes a watch app with verse-of-the-day complication).

## Status
LIVE (web). iOS 1.1.0 lineage approved; child-safety audit CLEAN (2026-07-21).

## URLs
- Live: https://biblestudy.webeuseful.com (also bible-trivia-coach-web.vercel.app)
- GitHub: https://github.com/acrogers-app/bible-trivia-coach-web (private)
- Vercel: project `bible-trivia-coach-web` (prj_CPXhicy2lgDE92qbPem97KYUKfGe), team allen-bible-trivia
- ASC: app id 6788610253 ("BibleStudyCoach")

## Local Path
/Volumes/Nvme4TB/projects/BibleTriviaCoach/bible-trivia-coach-web
(**NOT** projects/bible-trivia-coach-web — the outer BibleTriviaCoach dir also holds the old BibleTriviaCoach.xcodeproj, which has NO watch target; the watch app builds from ios/App/App.xcodeproj scheme "BibleStudyCoach Watch App".)

## Tech Stack
Next.js 16 (App Router, Turbopack), TypeScript, Capacitor iOS wrapper, static trivia JSON, Vercel Analytics (opt-out gated).

## Architecture
- Routes: `/` marketing, `/play` main hub (Today / Daily challenge / Quick), `/read`, `/levels`, `/settings`, `/privacy`, `/safety`, `/dev`.
- APIs: `/api/passage` (params are `?start=John 3:16&end=...`, NOT book/chapter), `/api/chapter`, analytics route — all rate-limited via `src/lib/rateLimit.ts` (in-memory per-IP: passage/chapter 120/min, analytics 30/min → 429).
- `src/lib/familyMode.ts` + FamilyModeChrome — Family Mode (see spec below).
- Trivia data: `public/packs` + `public/data/trivia_core_en_v1.json`; validation `scripts/validateQuestions.mjs` (`npm run validate:questions`).
- `npm run check` = lint + build + question validation. Run before every push.

## Deploy Workflow
Auto-deploy is active (GitHub → Vercel): push to `main` deploys biblestudy.webeuseful.com. Commit author allen.webeuseful@gmail.com. Test locally first (`npm run check`); bump package.json version for significant releases. NOTE: repo policy (below) forbids pushes/deploys by default — Allen overrode this on 2026-07-21 for safety work only; **future sessions should still ask before pushing unless he directs otherwise.**

## After Every Deploy — REQUIRED
Always do these steps after deploying, without being asked:
1. `open https://biblestudy.webeuseful.com/play` and `open https://biblestudy.webeuseful.com/settings` — opens in browser
2. Take puppeteer screenshots of key screens (play top+bottom incl. Coach's tip, settings, day picker, By Book) in BOTH dark and light mode, at 390px and 768px, full-page. Save to `/tmp/bible-trivia-screenshots/`
3. `open /tmp/bible-trivia-screenshots/` — opens the folder in Finder
4. For iOS changes: `npx cap open ios`
5. Show the screenshots in the report

Never skip this. Allen needs to see what shipped before approving the next task.

## Environment Variables (names only)
None required for core function (trivia is static). Vercel Analytics is built in.

Web Pro unlock (Stripe, one-time $2.99) — set in Vercel to activate; dormant until then:
- `STRIPE_SECRET_KEY` (test: `sk_test_…`)
- `STRIPE_PRICE_BIBLE_COACH` (test price id from `stripe-setup.mjs`)
- `NEXT_PUBLIC_SITE_URL` (defaults to https://biblestudy.webeuseful.com)

## Current Version
Web: continuous (main). iOS: 1.1.0(2) approved lineage.

## Recent Changes (newest first)
1. cba105e — safety page contact form posting to the shared safety inbox (dashboard /api/safety-contact)
2. 194e259 — docs: auto-deploy workflow
3. Family Mode (PIN-gated, analytics-killing) + /safety page + rate limiting + analytics opt-out gating (safety audit fixes)
4. Smart App Banner (id6788610253) + og.png + SEO commit
5. Watch app + verse-of-the-day complication (committed 885c75e)
6. Offline mode + analytics (sw btc-v2)
7. iOS 1.1.0 submitted/approved
8. Dark mode + bottom nav script-driven refactors (see scripts/fix_*.mjs history)
9. Question pack generation/validation pipeline
10. Capacitor iOS wrapper + App Store record

## Safety Audit Results (2026-07-21 — CLEAN)
- No social features, no accounts, no PII collection.
- No runtime AI: trivia is static JSON; OpenAI gpt-4.1-nano is used ONLY in offline authoring scripts under scripts/.
- No exposed keys; CORS locked to Capacitor origins; strong CSP.
- Findings fixed during audit: (1) Vercel Analytics now gated by the opt-out via FamilyModeChrome; (2) per-IP rate limiting added on all 3 API routes.
- Safety contact: safety@webeuseful.com (forwarder pending at Namecheap; the /safety contact form is the working channel — posts to the dashboard safety inbox, which pushes+emails Allen instantly).

## Family Mode Spec
- Toggle in /settings — immediate-effect (deliberately outside the draft/Save pattern).
- State: localStorage `bible-coach-family-mode`; 4-digit parent PIN hashed in `bible-coach-family-pin` (src/lib/familyMode.ts).
- ON: disables ALL analytics (quiz + Vercel), shows a fixed green top banner site-wide.
- OFF requires the PIN.

## Content Pipeline (how trivia is generated)
- Authoring is OFFLINE, in `scripts/`: `batchGenerate.mjs` generates question packs with OpenAI gpt-4.1-nano (no runtime AI calls ever).
- Output lands as static JSON in `public/packs` / `public/data/trivia_core_en_v1.json`.
- Every pack must pass `npm run validate:questions` (scripts/validateQuestions.mjs) — wired into `npm run check`.
- Content rules (from AGENTS.md): explanations short and anchored in the text; encourage, never guilt; no speculative theology.
- The many `fix_*.mjs` scripts are one-shot codemods from past refactors — historical, don't re-run.

## Known Issues & Gotchas
- Repo is littered with `.bak.*` / `.backup.*` sibling files (e.g. globals.css.bak.*) — exclude from greps; don't edit them.
- Lint enforces react-hooks/set-state-in-effect — use `useSyncExternalStore` for localStorage-backed state.
- `/api/passage` params: `?start=` / `?end=` verse refs.
- A push to main auto-deploys prod AND publishes any pending iOS-related commits sitting on main.

## Todo (prioritized)
1. (Allen) safety@ forwarder at Namecheap
2. Feature backlog labels: review-missed, level-chip, family-night, daily-challenge-nudge, coach-voice-text (see AGENTS.md)
3. Consider surfacing Family Mode in onboarding

## Revenue Model
- **Web:** Bible Coach Pro — **$2.99 one-time** unlock via Stripe (account-less license; `/pricing`, `/api/checkout`, `/unlock/success`, `src/lib/pro.ts`). Built 2026-07-27; live but **dormant until the Stripe env vars are set** (checkout returns 503 → UI shows "coming soon"). Flip to live keys when ready.
- **iOS:** non-consumable IAP `com.webeuseful.BibleTriviaCoach.pro` $2.99 (code written; see outer CLAUDE.md).

## Model Guide
Sonnet for content, UI, and pack work. Fable 5/Opus for safety/Family Mode logic, rate limiting/CSP changes, or Capacitor/watch build issues.

## Security & Workflow Rules

- **Stay inside this repo only.** Never read or write files outside this repository.
- **Never request or store secrets.** Do not ask for API keys, tokens, passwords, or credentials, and never write them into files, commits, or logs.
- **Never read `.env*` contents.** Do not open, print, or copy the contents of any `.env` file.
- **Always show diffs before edits.** Present the proposed change (diff or before/after) before modifying any file.
- **Ask before running commands.** Get explicit approval before executing any shell command.
- **No destructive commands.** Never run commands that delete, overwrite, or irreversibly change data or history (e.g. `rm -rf`, `git reset --hard`, `git push --force`).
- **No new dependencies without approval.** Do not add packages or run installs for new dependencies unless explicitly approved.
- **Run lint/tests after changes and report results.** After code changes, run `npm run check` (or the relevant subset) and report the actual results, including failures.
- **Prefer minimal, reversible changes.** Make the smallest change that solves the problem and avoid edits that are hard to undo.
- NEVER: push broken code to main, push secrets, or merge without local testing.

## Vercel deployment budget

Vercel deployments are capped at 100/24 hours. During overnight or heavy sessions monitor usage at dashboard.webeuseful.com. Never exceed 80 deployments in 24 hours without checking first.

## Payments & domains (operational rules)

- Never rotate Stripe keys without explicit written permission.
- Never add domains without checking if they are registered first.
- Always verify domains exist before referencing them in code.

## 🔐 Secrets Policy — NON-NEGOTIABLE
NEVER put any secret, key, token, or password in any file.
NEVER commit .env files.
NEVER commit Config.plist (or any plist) with secrets.
NEVER commit any file with "key=value" where value looks like an API key.

If a task requires an API key:
1. Check Vercel env vars first
2. If missing, ask Allen to add it
3. Never create a placeholder with a real key format
4. Never hardcode fallbacks

Secrets live in:
- Vercel Environment Variables (server)
- iOS Keychain (device)
- macOS Keychain (local dev only)
NOWHERE ELSE.

A pre-commit hook in this repo blocks likely secrets (reinstall after fresh
clones: `cp /Volumes/Nvme4TB/docs/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`).
See: /Volumes/Nvme4TB/docs/SECRETS_POLICY.md and /Volumes/Nvme4TB/docs/ENV_VARS.md
