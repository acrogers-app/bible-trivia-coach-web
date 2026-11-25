# Review: Grace · Lesson 1 "Saved by grace" (APPROVED 2026-11-25)

Draft file: `content/learn/drafts/grace.json` (status `draft`; never bundled).
AI-drafted for your review. Nothing here is approved.
Reviewed against `../LESSON_STANDARD.md` and `../REVIEW_CHECKLIST.md`. Meeting the
standard means the lesson follows our rules; it does not show the lesson is effective.

## Learning outcomes (draft)
After this lesson a learner can:
- **O1** Explain in their own words what "grace" means in Ephesians 2:1–10, using the text
  (God's kindness that saves, given as a gift and not earned by works).
- **O2** Identify the "before" and "after" in verses 1–7: dead in transgressions and sins,
  then made alive with Christ because God is rich in mercy and love.
- **O3** Explain, from verses 8–10, how Paul relates grace, faith and good works as the
  text states them (saved by grace through faith, not of works; created for good works).

## Section → outcome map
| Section | Outcomes |
|---------|----------|
| Scripture, Ephesians 2:1–10 | O1, O2, O3 |
| Explanation | O1, O2, O3 |
| Go deeper (views differ) | O3 context only; not tested |
| Reflect (optional) | O3 |
| Word study (proposed, not in app) | O1 |

## Question → outcome map (current 5; app rule 4 of 5)
| # | Question id | Tests | Outcome |
|---|-------------|-------|---------|
| 1 | `ephesians-2-1` | "Dead in sins" (2:1) | O2 |
| 2 | `ephesians-2-9` | "Rich in mercy, with great love" (2:4) | O2 |
| 3 | `ephesians-2-10` | "So that no one would boast" (2:9) | O3 |
| 4 | `ephesians-2-4` | "To do good works prepared by God" (2:10) | O3 |
| 5 | `ephesians-2-11` (NEW) | Best explanation of grace in 2:8–10 | O1, O3 |

**O1 gap: addressed** by `ephesians-2-11` (approved by Allen and added to the shared pack). It
replaces `ephesians-2-3`, whose grace-through-faith point it also covers.

## Scripture
Ephesians 2:1–10, World English Bible. The app loads the text from `db/web.sqlite`.
The lesson stores the reference only. All five quotes in the explanation were checked
word-for-word against WEB: "dead in transgressions and sins" (2:1), "rich in mercy" (2:4),
"the gift of God" (2:8), "not of works" (2:9), "his workmanship" (2:10).

## Explanation (shown as "Explanation · not Scripture")
> Paul describes two pictures. In the first (verses 1–3), people are "dead in transgressions and sins," living the way the world around them lives. In the second (verses 4–7), God acts: because he is "rich in mercy" and loves us, he makes people alive together with Christ. Paul's word for this is grace, God's kindness that we do not earn. Verses 8–9 put it plainly: salvation is "the gift of God," received through faith and "not of works," so no one can boast. Verse 10 then shows what follows. People saved by grace are "his workmanship," made for the good works God prepared for them. In this passage, good works are the result of grace, not the way to earn it.

## Go deeper (marked "views differ")
> Christians broadly agree that salvation is grounded in God’s grace, not something people can earn. Traditions differ in how they understand faith, baptism, and the role of good works in receiving and living out that grace. Lutheran, Reformed, Catholic, Orthodox, Methodist, and Baptist teachers read Ephesians 2:8–10 within their wider teachings. If you want to go further, ask a pastor or teacher in your church how they understand these verses.

## Reflect (optional, not tracked)
"Verse 10 says you are God's workmanship. What is one good thing you could do this
week as a response to grace, not as a way to earn it?"

## Word study (proposed only; the app has no word-study section yet)
Flags on the earlier draft in the standard:
- It defined *charis* as "favor or kindness freely given, **not earned**; also a gift."
  "Not earned" comes from Ephesians 2:8–9 (context), not from the lexicon gloss. It
  mixed the two.
- It said Hebrew *channun* ("gracious", Exodus 34:6) is "from the same root as *chen*."
  That invites a root-only argument and doesn't serve O1–O3. Dropped.
- Putting Greek *charis* beside Hebrew *chen* implied the two mean the same thing. Not
  claimed; any translation link (e.g. in the Septuagint) needs a cited source first.

Revised proposal (needs source check before approval):
- **Lexicon gloss:** Greek χάρις *charis*, Strong's G5485. General range includes favor,
  kindness and gift. *Copy the exact entry wording from Strong's/Thayer's before approval.*
- **In this passage (explanation, not lexicon):** in 2:5 and 2:8 Paul uses *charis* for
  God's kindness that saves people, which verses 8–9 call "the gift of God" and "not of works."
- **Hebrew *chen* / Genesis 6:8:** recommend leaving out of this lesson and saving for a
  separate Old Testament lesson where it serves that lesson's outcomes.

## Pending questions (proposals only; NOT in the question pack)
- ~~P1~~ superseded: Allen approved a different O1 question, now `ephesians-2-11`.
- **P2 (O1, needs word-study section):** "The Greek word translated 'grace' in Ephesians 2:8 is…" → *charis*.
  Tests a term, not meaning; keep only if a word-study section is built.
- **P3 (Genesis 6:8):** "What did Noah find in the LORD's eyes?" → "Favor". Doesn't map to
  O1–O3 for this lesson; move to a future Old Testament grace lesson.

## Checklist status (re-checked 2026-11-24: all quotes match WEB; all 5 question ids present in the pack)
- A Design: outcomes and maps done; O1 gap addressed by `ephesians-2-11`.
- B Sources: WEB quotes verified; lexicon wording not yet copied (word study is proposal only).
- C Questions: 5 checked for one defensible answer; `ephesians-2-2`, `-2-3`, `-2-5` not used (see below); contested ones deferred.
- D Accessibility/product: Read and Listen (recorded; verified with Sarah in simulator 2026-11-24, narrator changed to Sunny Singh the same day): highlight, Stop, leaving the lesson and backgrounding all stop audio; plays offline. Isolation covered by tests.
  - Accessibility pass 2026-11-24 (code fixes only; lesson content unchanged):
    - Large text: before, iPhone text size had no effect on Learn (fixed px sizes). Now Learn
      text follows both the iPhone text size and the app's text size; headings grow half as
      much. Checked in the simulator at default and at the largest accessibility size
      (passage, Listen, check questions, answers, feedback): text wraps, no sideways
      scrolling, controls stay usable. Buttons keep a rounded shape when text wraps.
    - Screen reader (structure checked in a browser on the same build, not with real
      VoiceOver): reference is a heading; Listen/Stop say "Listen to / Stop reading
      Ephesians 2:1–10"; emoji in labels are hidden; answer choices are a group; after
      answering, "Correct answer" / "Your answer" are spoken and the feedback is announced;
      focus moves to each new question (with "Question n of 5"), to the title on the
      result and back to the lesson, and each screen starts at the top.
    - Spoken-verse highlight: now a left accent bar plus tint (not color alone; outline in
      high-contrast mode); the spoken verse scrolls to stay clear of the tab bar, which is now
      opaque app-wide. Checked in the simulator in light and dark mode.
  - Real iPhone check 2026-11-24 (Allen, iPhone 15 Pro Max, Grace preview debug build with
    Sunny audio, installed over store 1.2.6):
    - Offline (Airplane Mode): Scripture shows; Sunny plays all 10 verses. Pass.
    - Dark mode: spoken-verse highlight easy to see. Pass.
    - VoiceOver: Listen/Stop, questions, answers, feedback and results in a sensible order;
      nothing skipped. Pass.
    - Large text (Larger Accessibility Sizes, slider at max): passage, Listen, questions,
      answers, feedback and results; nothing cut off. Pass.
    - Light mode: looks good. Pass.
    - No issues found; no fixes made.
    - VoiceOver on the Learn topic and list screens (2026-11-25): all fine, nothing
      skipped. Pass.
    - Not tested on the device: other devices (iPad, smaller iPhones). The rest of the app
      doesn't follow the iPhone text size.
- E Pilot: not started.
- F Issues and revisions: none recorded yet.
- G Approval: approved by Allen 2026-11-25 ("Approve Grace"). `review.status` set to
  "approved" (reviewer recorded internally, never shown) and the lesson moved into
  `public/data/topics_en_v1.json`. Not committed or shipped yet.

## Check questions (5; pass = 4 of 5), simple recall first, interpretation last
1. `ephesians-2-1` (2:1): believers were once "Dead in sins"
2. `ephesians-2-9` (2:4, NEW): God is "Rich in mercy, with great love"
3. `ephesians-2-10` (2:8–9, NEW): "not of works" "So that no one would boast"
4. `ephesians-2-4` (2:10): created "To do good works prepared by God"
5. `ephesians-2-11` (2:8–10, NEW): "Which statement best explains grace in Ephesians 2:8–10?"
   - ✓ Salvation is God’s gift, received through faith rather than earned by works; those saved are created for good works.
   - ✗ Salvation is a reward God gives for good works… (contradicts "not of works", 2:9)
   - ✗ …those saved no longer need to do any good works. (contradicts "created… for good works", 2:10)
   - ✗ …those who do the most good works may rightly boast in it. (contradicts "that no one would boast", 2:9)

The three NEW questions are in the shared pack (`public/packs/trivia_core_en_v1.json`),
so they also appear in Play's Ephesians 2 quizzes.

Left out: `ephesians-2-3` (covered by `ephesians-2-11`), `ephesians-2-2` (two defensible answers) and `ephesians-2-5` (duplicate of
`ephesians-2-1`; ambiguous option from 2:12).

## Deferred harder questions (ideas only; not added anywhere)
- 2:8 "that not of yourselves": is "that" the faith, the grace or the whole salvation? Grammar is debated.
- 2:3 "by nature children of wrath": readings differ on inherited sin.
- 2:2 "prince of the power of the air": identity is an interpretation, not stated.
- How baptism or ongoing faithfulness relates to grace: not stated in this passage; varies by tradition.
- 2:10 "prepared before": how predestination relates to it is disputed.

## To approve (your call only)
Edit or OK the text above. Then I set `review.status` to "approved", with your name
recorded internally (never shown) and the date, and move the lesson into the shipped file.
