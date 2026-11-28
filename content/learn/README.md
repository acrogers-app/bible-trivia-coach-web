# Learn content workflow

Learn lessons ship only after Allen, the final approver, approves each one.

Write and review every lesson against [LESSON_STANDARD.md](LESSON_STANDARD.md) and
[REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md).

1. **Draft** lessons as JSON in `content/learn/drafts/` (same shape as
   `public/data/topics_en_v1.json`, with `"review": { "status": "draft" }`).
   Offline AI drafting is allowed here. This folder is never bundled into the app.
2. **Review**: check Scripture references, explanations, "Go deeper" notes
   (contested views must be labelled `viewsDiffer: true`), reflection prompts,
   and the five check questions. A trusted pastor or Bible teacher may also
   review the theology first; that is optional and does not gate the code.
3. **Approve** (Allen only): set
   `"review": { "status": "approved", "reviewer": "…", "reviewedAt": "YYYY-MM-DD" }`
   and move the lesson into `public/data/topics_en_v1.json`. `reviewer` records the
   approver for our own audit trail. It is never shown in the app, and the app makes
   no public "reviewed by" claim.
4. **Verify**: `npm run validate:topics` (also part of `npm run check`).

Check rule:
- A lesson check is 5 questions; 4 of 5 correct marks the lesson's material as understood.
- Every approved lesson needs 5 suitable, approved question ids. Fewer is a
  content gap the validator flags; the check is never shortened and the pass
  mark is never lowered to fit.
- The optional quick start is a separate 2-question check on lesson 1. A
  perfect score marks lesson 1 Skipped, which stays open to preview.
- Learn checks run their own flow. They never touch the shared quiz results
  flow: no XP, day streak, Path, Daily Challenge, analytics, best scores or
  missed-question list.

Rules the validator enforces:
- Only approved lessons may be in the shipped file.
- Every reference must exist in the World English Bible (`db/web.sqlite`). Lessons
  store references only, never verse text.
- Approved lessons need 5 existing question ids (content gap otherwise).
- No pressure or faith-measuring wording, and no "reviewed by" text.

Preview builds show draft lessons from `content/learn/preview.json` (placeholder
text only). It is never bundled. To preview:

    cp content/learn/preview.json public/data/learn_preview_fixture.json   # git-ignored
    NEXT_PUBLIC_LEARN_PREVIEW=1 npm run build:mobile && npx cap sync ios
    rm public/data/learn_preview_fixture.json   # then rebuild without the flag
