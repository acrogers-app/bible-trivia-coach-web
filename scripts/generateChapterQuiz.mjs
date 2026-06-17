import { config } from "dotenv";
config({ path: ".env.local" }); // load OPENAI_API_KEY for CLI

import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set. Add it to .env.local");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const [,, bookArg, chapterArg, countArg] = process.argv;

  if (!bookArg) {
    console.error("Usage: node scripts/generateChapterQuiz.mjs <Book> [chapter] [count]");
    console.error('Example: node scripts/generateChapterQuiz.mjs "Mark" 1 10');
    process.exit(1);
  }

  const book = bookArg.trim();
  const chapter = chapterArg && !Number.isNaN(Number(chapterArg))
    ? Number(chapterArg)
    : null;
  const count = countArg ? Number(countArg) : 10;

  const scopeLabel = chapter ? `${book} ${chapter}` : book;

  const systemPrompt = `
You are helping create Bible trivia questions and reflection prompts for a Bible study app.

- Base all questions on the biblical text of the requested book/chapter (e.g. "${scopeLabel}").
- Focus on clear facts and themes from the text, not speculative or controversial doctrines.
- Avoid denomination-specific claims; stay with what most evangelical/Protestant readers would see as clear from the passage.
- Do not output long Scripture quotations verbatim. Short phrases (under about 10 words) are okay when needed in explanations.
- All answer options (including wrong ones) must be serious, respectful, and textually plausible; do not use jokes, sarcasm, or nonsense phrases.
- All answer options (including wrong ones) must be serious, respectful, and textually plausible; do not use jokes, sarcasm, or nonsense phrases.
`.trim();

  const userPrompt = `
Generate content for: ${scopeLabel}.

1. Create ${count} multiple-choice Bible trivia questions strictly based on this passage.
2. For each question provide:
   - text (string)
   - options (array of 4 concise strings)
   - correctIndex (0-3)
   - explanation (1–3 sentences explaining the correct answer and pointing to the verse)
   - difficulty ("easy" | "medium" | "hard")
   - category (short string like "Gospels", "History", "Letters")
   - refStart (e.g., "${book} ${chapter ?? 1}:1")
   - refEnd (e.g., "${book} ${chapter ?? 1}:10")

3. Also create ONE reflection entry with:
   - verseFocus (string, e.g., "${book} ${chapter ?? 1}:14-15")
   - prompts (array of 2–4 short reflection questions)
   - prayerSuggestion (one sentence)

Return a single JSON object with EXACTLY this shape:

{
  "questions": [
    {
      "text": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "explanation": "...",
      "difficulty": "easy",
      "category": "...",
      "refStart": "...",
      "refEnd": "..."
    }
  ],
  "reflection": {
    "verseFocus": "...",
    "prompts": ["...", "..."],
    "prayerSuggestion": "..."
  }
}
`.trim();

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-nano",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    console.error("Model returned no content.");
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error("Failed to parse JSON from model:", err);
    console.error("Raw content:", content);
    process.exit(1);
  }

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const reflection = parsed.reflection || null;

  const bookSlug = book.toLowerCase().replace(/\s+/g, "_");
  const chapterSlug = chapter ? String(chapter) : "all";

  const questions = rawQuestions.map((q, index) => ({
    id: `${bookSlug}-${chapterSlug}-${index + 1}`,
    difficulty: q.difficulty || "medium",
    category: q.category || "Bible",
    playful: false,
    sourceType: "scripture",
    learnMore: "",
    sources: [],
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    refStart: q.refStart,
    refEnd: q.refEnd,
  }));

  const reflectionKey = chapter ? `${book} ${chapter}` : book;

  const output = {
    scope: scopeLabel,
    questions,
    reflectionKey,
    reflection
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
