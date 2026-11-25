# Plan: recorded Scripture audio (Sunny Singh)

Status: lessons are built (Grace approved 2026-11-25, not committed). The whole-Bible part is a plan.
Last updated 2026-11-25 (all of Mark generated in Sunny's voice, as a test).

## What Allen chose
- **One narrator: Sunny Singh** ("Sunny Singh - Dramatic Fiction Narrator", ElevenLabs
  library voice, Indian English accent), everywhere: lessons and Bible chapters.
- **Decided 2026-11-24: Sunny Singh replaces Sarah.** Allen did not like Sarah's voice. He
  previewed eight Library narration voices, then heard Matthew Wheeler and Sunny Singh read
  Ephesians 2:8 with identical settings, and chose Sunny. Sarah's Grace clips were removed.
  After hearing the full Grace passage (Ephesians 2:1–10) in the app, Allen confirmed:
  keep Sunny.
  Allen's B30 clone and Lena were tried and dropped earlier.
- Caveat: Sunny's listing calls him dramatic and character-driven. Listen to whole passages
  before expanding beyond Grace. Library voices can be withdrawn by their owner after the
  listed notice period (2 years for Sunny).
- **Decided 2026-11-24: one voice only, to save ElevenLabs credits.** Some credits are
  kept back for redoing Allen's B30 voice. George (mature male) was dropped from lessons
  and is not offered for chapters; his Grace clips were deleted. He can be added back
  later in `scripts/learnVoices.mjs` (his voice ID is noted there).
- Generated at ElevenLabs speed 1.1, then played 10% faster in the app (pitch kept),
  because 1.1 alone was still a little slow. The playback rate is free to change.
- Other settings follow B30's scripture preset: stability 0.40, similarity 0.87,
  style 0.25, speaker boost on, model `eleven_multilingual_v2`, 64 kbps mono MP3.
- Voice IDs and settings live in `scripts/learnVoices.mjs`. The API key never goes in
  the repo; Allen pastes it into a terminal prompt for each run, and it is cleared after.

## Part 1: lessons (built)
- `npm run generate:learn-audio` makes one clip per verse per voice for lesson passages.
  Clip names are a hash of voice, model, settings and the exact WEB text, so:
  - unchanged verses are never paid for twice;
  - changed text or settings can never play old audio.
- Clips ship inside the app (`public/audio/learn/`), with
  `public/data/learn_audio_en_v1.json` listing them. Lessons play offline.
- Listen plays Sunny Singh. (The app can still show a voice choice if a second narrator is
  ever added; with one narrator, no choice is shown.) A voice is used only if it covers
  every verse, so a passage is never read in mixed voices. If Sunny doesn't cover it,
  Listen falls back to the device voice.
- `npm run validate:topics` fails an approved lesson whose audio is missing or
  doesn't match the current WEB text (drafts only warn). Covered by
  `tests/learn/audio.test.mjs`.
- Cost and size: Grace (Ephesians 2:1–10) is 1,045 characters, so about 1,045
  credits and about 0.47 MB per voice. 30 lessons ≈ 31k credits and ≈ 14 MB per voice.

## Part 2: the whole Bible (plan)

### Decided 2026-11-24: first phase is a Mark pilot
- **Pilot with the Gospel of Mark** (16 chapters).
- **Sunny Singh is the default full-chapter voice** (was Sarah until the 2026-11-24 audition).
- Audio is generated or cached **by chapter**, so a chapter is generated at most once
  per voice and can be saved on the phone for offline playback.
- **One voice only.** ~~George as an optional chapter voice~~ was dropped on 2026-11-24 to
  save credits; there is no second voice for chapters or lessons.
- **Mark in Sunny's voice (measured from `db/web.sqlite`):** 16 chapters, about 74,900
  characters. Billed about 33,000 credits on `eleven_multilingual_v2` (about 27% of one
  month's Creator credits); it was first estimated at 75,000 before we saw the real bill. At Grace's pace (about 1,045 characters in 63 seconds) that is about 75 minutes of
  audio and about 34 MB.
- **Before generating Mark (each step needs Allen):**
  1. Allen listens to one full Mark chapter in Sunny's voice (Mark 1 is about 4,700
     credits), to check the "dramatic narrator" style holds up over a long passage.
  2. If cost matters, the same chapter on a cheaper model, so he can compare.
  3. Decide on-demand vs. pre-generated (Decision 1 below) and whether credits for B30
     must be kept back first.
- **Mark 1 test, done 2026-11-25:** all 45 verses in Sunny's voice (one clip per verse,
  same settings as Grace), 2,058 credits as reported by ElevenLabs (4,676 characters, so
  about 44% of the character count, as with Grace). The API key's own limit counted
  closer to the full characters, so the run stopped at 1:38 until Allen raised that
  key's limit (now 20,000). Allen listened and said **"Sunny works"** for whole chapters.
  The clips are kept as a test only in `content/learn/audio-tests/mark-1-sunny/`, not
  in the app. Step 2 (cheaper model) was skipped. Still to decide: on-demand vs.
  pre-generated, and whether to go ahead with the rest of Mark (~73,000 characters).
- **Mark 2–16, done 2026-11-25:** Allen chose to generate the rest of Mark now (not the
  first-play server). 633 verses, 70,207 characters, **30,887 credits**. The account page
  went from 5,392 to 36,279 credits used, so the `character-cost` header is the real bill
  (about 44% of characters on this plan); the API key's own limit counts characters
  instead (limit now 80,000). All 16 chapters (678 clips, 74,883 characters, about 33,000
  credits in all, 36 MB) are kept as a test in `content/learn/audio-tests/mark-sunny/`,
  not in the app.
- **Chapter player, built 2026-11-25 (uncommitted):** the Read page plays Mark in Sunny's
  voice. `node scripts/buildChapterAudio.mjs` copies the test clips into
  `public/audio/chapters/` (hash-named like lesson clips) and writes
  `public/data/chapter_audio_en_v1.json` with the WEB text, so a Mark chapter loads and
  plays offline. Listen uses the recording only when every loaded verse matches exactly
  (whole chapter or a verse range); other books still use the device voice. Pause, Stop,
  leaving the page and backgrounding work as before. Shows "Narrated by Sunny Singh.
  Works offline." `tests/learn/chapterAudio.test.mjs` checks every verse against WEB.
  Mark adds about 36 MB to the app download (fine for a pilot; not for the whole Bible).
  Checked in the simulator (Mark 3) and by Allen on his iPhone 2026-11-25: "Works well."
  Not yet checked on the device: Airplane Mode for a Mark chapter.
- Before expanding beyond Mark, review: audio quality, Scripture-text accuracy against
  WEB, file size and download behaviour, offline playback, and voluntary feedback from
  a small group of volunteers. A small pilot is not proof that the approach is best.
- **No analytics and no Bible-listening history.** Any feedback is voluntary and
  privacy-conscious.
- Why Mark: it is a manageable, complete book to test the product with. It was **not**
  chosen because of evidence that it is the most popular book among our users.
- **Later expansion** should be guided by voluntary user requests and pilot feedback,
  not by assumptions about which books are most popular. This replaces the earlier
  "most-read parts first" idea in item 2 below.

### The size of the job (WEB, measured from `db/web.sqlite`)
| Part | Characters = credits per voice | Audio per voice (approx.) |
|---|---|---|
| Whole Bible (1,189 chapters) | 3.95 million | ~60 hours, ~1.8 GB |
| New Testament | 0.92 million | ~14 hours, ~420 MB |
| Gospels | 0.42 million | ~6.5 hours, ~190 MB |
| Psalms | 0.22 million | ~3.5 hours, ~100 MB |
| Average chapter | 3,300 | ~3 minutes, ~1.5 MB |

A second voice would double the credits (not planned). The Creator plan includes 121,000 credits a month,
so the whole Bible in one voice is about 33 months of Creator credits.

### Why reusing repeated words doesn't help
- Exactly repeated verses are only 0.47% of the text (18,613 characters). The
  generator already skips them for free, because clips are named by their text.
- Stitching single words or phrases together sounds choppy and robotic, and it
  breaks the voice's natural rhythm. Not an option for Scripture.
- Savings therefore have to come from **what** we generate and **when**, not from reuse.

### Recommended approach
1. **Generate on first play, then keep it (the B30 pattern).**
   - When someone presses Listen on a chapter that has no audio yet, our server makes
     it once and stores it; everyone after that gets the stored copy. Credits are only
     spent on chapters people actually listen to, never twice.
   - The phone saves each chapter after its first play, so it plays offline from then
     on. The very first play of a chapter needs internet.
   - The API key stays on the server (as in B30), never in the app.
2. ~~Pre-generate the most-read parts ahead of time: the Gospels and Psalms first
   (0.64M credits per voice), and every chapter in the reading plan.~~
   *Replaced 2026-11-24 by the Mark pilot above. Expansion after Mark follows pilot
   feedback and voluntary user requests.*
3. **One voice (Sunny Singh) for everything.** Decided 2026-11-24 to save credits.
4. **Try a cheaper model for whole chapters.** ElevenLabs' faster models cost about
   half as many credits per character (to confirm on their pricing page). Allen
   must hear Sunny on it first; quality decides.
5. **Don't put whole-Bible audio in the app download.** At ~1.8 GB per voice it must
   be downloaded per chapter or per book; only lesson audio ships in the app.
6. **Highlighting:** one clip per chapter with ElevenLabs' timestamp output, so each
   verse highlights as it's read, with no pauses between verses.

### Also worth checking (not yet verified)
- Free public-domain WEB audio recordings may exist (for example from eBible.org).
  Before relying on them, check quality, completeness, licence and whether verse
  timings exist. They would be human narrators, not Sunny.

### Decisions for Allen
1. Is on-demand generation acceptable (first play of a chapter needs internet)?
2. ~~Which comes first?~~ **Decided 2026-11-24: Mark pilot.**
3. ~~One voice or both?~~ **Decided 2026-11-24: one voice only (now Sunny Singh), for lessons and chapters.
   Credits saved go toward redoing Allen's B30 voice.**
4. Is a plan upgrade for a bulk run acceptable, or stay on Creator and spread it out?

## Lessons: status
- Done 2026-11-24: Grace regenerated in Sunny's voice (10 clips). Checked in the simulator
  (Stop, leaving the lesson, backgrounding) and by Allen on his iPhone: Sunny plays all
  10 verses offline, the spoken verse is easy to see in light and dark mode, and large
  text and VoiceOver work in the lesson. Details are in `drafts/grace-1-review.md`.
- The repo holds the normal (non-preview) build; Allen's iPhone runs a preview debug build.
- VoiceOver on the Learn topic and list screens checked by Allen 2026-11-25: fine.
- Grace approved by Allen 2026-11-25 and moved into the shipped topics file (not committed).
- New lessons: run `npm run generate:learn-audio` (Sunny only) after a lesson's text is
  final, so credits aren't spent on wording that may change.
- The app name: it shows "Bible Study Coach", but the folder and internal ID still say
  "Bible Trivia". Renaming is a separate task (the internal ID affects the App Store).
