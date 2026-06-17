import { config } from "dotenv";
config({ path: ".env.local" });

import OpenAI from "openai";
import fs from "node:fs";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in .env.local");
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const books = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalms",
  "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
  "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
  "Hosea", "Joel", "Amos", "Obadiah", "Jonah",
  "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
  "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians",
  "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
  "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus",
  "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation"
];

const gospelDisplay = {
  "Matthew": "Gospel of Matthew",
  "Mark": "Gospel of Mark",
  "Luke": "Gospel of Luke",
  "John": "Gospel of John"
};

const summariesPath = "public/data/book_summaries_en_v1.json";

function loadExistingSummaries() {
  if (!fs.existsSync(summariesPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(summariesPath, "utf8"));
}

async function generateSummary(book, displayTitle) {
  const systemPrompt = `
You are helping create short "Big picture" summaries for each book of the Christian Bible for a Bible study app.

Write at about an 8th-grade reading level.
Stay with widely-accepted, non-controversial observations.

Return ONLY JSON with this shape:

{
  "summary": "2-3 sentences about the book overall.",
  "keyThemes": ["short phrase", "short phrase", "short phrase"],
  "keyVerses": ["Book 1:1", "Book 2:8-9"]
}
`.trim();

  const userPrompt = `
Book: ${book}
Display title for the user: ${displayTitle}

Write:
- A 2-3 sentence summary of this biblical book.
- 3 key themes (short phrases).
- 2-4 key verses (references only, like "John 3:16", not full text).
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
  if (!content) throw new Error(`No content returned for ${book}`);

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error("Failed to parse JSON for", book, ":", err);
    console.error("Raw content:", content);
    throw err;
  }

  const summary = String(parsed.summary || "").trim();
  const keyThemes = Array.isArray(parsed.keyThemes) ? parsed.keyThemes.map(String) : [];
  const keyVerses = Array.isArray(parsed.keyVerses) ? parsed.keyVerses.map(String) : [];

  return { summary, keyThemes, keyVerses };
}

async function main() {
  let existing = loadExistingSummaries();

  // Backup once before modifying
  if (fs.existsSync(summariesPath)) {
    fs.copyFileSync(
      summariesPath,
      summariesPath.replace(".json", ".before-auto-fill.json")
    );
    console.log("Backed up existing summaries to *.before-auto-fill.json");
  }

  for (const book of books) {
    if (existing[book]) {
      console.log(`Skipping ${book} (already has a summary).`);
      continue;
    }

    const displayTitle = gospelDisplay[book] || book;
    console.log(`Generating summary for ${book}...`);

    try {
      const { summary, keyThemes, keyVerses } = await generateSummary(book, displayTitle);
      existing[book] = {
        title: displayTitle,
        summary,
        keyThemes,
        keyVerses
      };
      // Write after each book so progress is saved
      fs.mkdirSync("public/data", { recursive: true });
      fs.writeFileSync(summariesPath, JSON.stringify(existing, null, 2));
      console.log(`✔ Saved summary for ${book}`);
    } catch (err) {
      console.error(`✖ Failed to generate summary for ${book}:`, err.message);
      // continue to next book
    }
  }

  console.log("Done generating book summaries.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
