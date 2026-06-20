# Feature: family-night

Goal:
- Let families or small groups play Bible Trivia Coach together in the same room, taking turns answering questions and seeing a shared scoreboard.

User story:
- "On family night, we want to enter our names, take turns answering questions on the TV or iPad, and see who did best—without needing multiple devices."

Scope (v1):
- Local, single-device mode only (e.g., TV, tablet, laptop).
- 2–6 players.
- One quiz per session (e.g., 10 questions).
- Rotating turns: each question is assigned to one player in order.
- Simple scoring: +1 point per correct answer, 0 for incorrect.
- Final scoreboard screen.

Flow:

1. Entry
   - New card on /play under a section called "Family Night".
   - Button: "Start Family Night".
   - Clicking opens a setup screen.

2. Setup screen
   - Fields to add 2–6 player names (e.g., "Mom", "Dad", "Lydia", "Micah").
   - Control for number of questions (e.g., 10 / 20).
   - Optional: choose quiz type (Scripture / History / Mixed).
   - Button: "Start family game".

3. Gameplay
   - Header: "Family Night Quiz" + list of player names.
   - Subheader shows whose turn it is: "Micah's question (3 of 10)".
   - Show one question at a time, like existing QuizScreen.
   - Only current player's selection counts for scoring.
   - After answering, brief feedback (correct/incorrect), then "Next question".
   - Turn order rotates: index = (index + 1) % players.length.

4. Scoring
   - Internal state:

     - FamilyPlayer:
       - id: string
       - name: string
       - score: number

     - FamilyGameState:
       - players: FamilyPlayer[]
       - currentPlayerIndex: number
       - currentQuestionIndex: number
       - totalQuestions: number
       - questions: TriviaQuestion[]

   - When current player answers correctly, increment their score.
   - Track per-question ownership for potential future review.

5. End of game
   - Show final scoreboard:
     - Ranked list of players by score (highest first).
     - Highlight the winner(s).
   - Coach text:
     - Example: "Great game! {WinnerName} came out on top, but everyone learned tonight."
   - Buttons:
     - "Play again with same players" (new set of questions).
     - "Back to Home".

Technical notes:

- Questions:
  - For v1, reuse existing randomQuestions(...) with a fixed config (e.g., 10 mixed Scripture questions).
  - Future: allow choosing sourceType/difficulty.

- Routing:
  - Either:
    - Add a family-night screen as part of /play state (Screen type), or
    - Create a dedicated route: /play/family.
  - v1 can be implemented as an additional Screen in the existing PlayPage to keep changes local.

- Storage:
  - v1 can keep everything in memory (no persistence).
  - Future: optionally remember last family names in localStorage.

- UX constraints:
  - Large tap targets (TV / tablet friendly).
  - Always show whose turn it is, clearly.
  - Avoid time pressure; no timers.

Copy guidelines:
- Encouraging and light, oriented toward family fun and Scripture practice.
- Avoid shaming lower scores; focus on shared learning.
