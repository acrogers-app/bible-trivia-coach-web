# Bible Trivia Coach – Assistant Brief

## Repo

- Local path: /Volumes/Nvme4TB/projects/BibleTriviaCoach/bible-trivia-coach-web
- Remote: `https://github.com/acrogers-app/bible-trivia-coach-web`
- Deployed: `https://bible-trivia-coach-web.vercel.app`
- Tech: Next.js 16 (App Router, Turbopack), TypeScript.

## Product

Bible Trivia Coach helps people make Scripture stick through gentle daily readings and low-pressure quizzes.

- Short daily Gospel reading + quiz.
- Scripture and Bible-history question packs.
- Coach character that encourages the player.

Tone:
- Warm, encouraging, no guilt or streak pressure.
- Centered on Scripture; respectful and clear.
- Lightly playful is OK; avoid cheesy or irreverent jokes.

## Existing structure (high level)

- Routes:
  - `/` – marketing / explanation page.
  - `/play` – main hub: Today, Daily challenge, Quick.
  - `/api/passage` – fetch Scripture passages.
- Data:
  - Core trivia JSON under `public/data/trivia_core_en_v1.json`.
  - Validation script: `scripts/validateQuestions.mjs` (run with `npm run validate:questions`).
- Build:
  - `npm run check` runs lint, build, and question validation.

## Feature labels (used in chat & docs)

These are shorthand names that may appear in conversations:

- `review-missed` – Post-quiz review of incorrect questions.
- `level-chip` – Visual level indicator near the player’s name.
- `family-night` – Multi-player “family night” mode with per-player scores.
- `daily-challenge-nudge` – Surface today’s 5-question daily challenge.
- `coach-voice-text` – Centralized, consistent coach messages.

## Coding guidelines for assistants

When generating or editing code:

- Assume Next.js 16 App Router (no `pages/` directory).
- Use TypeScript with functional React components.
- Prefer keeping quiz/game logic in small helpers (e.g. `src/lib/...`) and UI in `src/app/...`.
- Match existing styling approach in the repo (e.g., className patterns already in components).
- Avoid introducing large new dependencies without being asked.

When writing content (questions, explanations, or coach text):

- Keep explanations short but anchored in the biblical text.
- Encourage reflection and learning; never guilt or shame.
- Avoid speculative theology; stick to clear biblical teaching or neutral historical facts.
