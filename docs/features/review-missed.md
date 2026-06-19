# Feature: review-missed

Goal:
- Let players review the questions they missed after a quiz so they can reinforce learning.

User story:
- "After I finish a quiz, I want to see which questions I missed, the right answers, and a short explanation, so I can remember better next time."

Behavior:
- After a quiz ends:
  - If the player missed at least one question, show a button:
    - Label: "Review missed questions".
  - If all answers were correct, do not show the button (or show a small congrats message instead).

Review screen:
- One question per "card":
  - Question text.
  - Player's answer, marked incorrect (e.g., with a red X or muted style).
  - Correct answer, marked clearly (e.g., green check).
  - Short explanation.
  - Scripture reference (with optional link/button to open the passage via `/api/passage`).

Navigation:
- Simple "Previous" / "Next" controls or swipe/arrow support.
- Progress indicator (e.g., "2 of 5 missed questions").

Data model (sketch):
- Session results:

  - AnswerRecord:
    - questionId: string
    - chosenIndex: number
    - correctIndex: number
    - isCorrect: boolean
    - completedAt: string (ISO)

  - SessionResult:
    - id: string
    - questionIds: string[]
    - answers: AnswerRecord[]

Storage:
- First version can store the most recent SessionResult in localStorage or a simple in-memory store.
- Future versions may persist to a backend user profile.

Copy guidelines:
- Keep the tone encouraging:
  - "Not quite, but this is how we learn."
  - "Great opportunity to review this verse."
- Invite the player to read explanations instead of just moving on.
