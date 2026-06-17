import { config } from "dotenv";
config({ path: ".env.local" }); // ensure env is loaded for child processes

import fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const bookMaxChapters = {
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Kings": 22,
  "2 Kings": 25,
  "1 Chronicles": 29,
  "2 Chronicles": 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 10,
  Job: 42,
  Psalms: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  "Song of Solomon": 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 12,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  "1 Corinthians": 16,
  "2 Corinthians": 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  "1 Thessalonians": 5,
  "2 Thessalonians": 3,
  "1 Timothy": 6,
  "2 Timothy": 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  "1 Peter": 5,
  "2 Peter": 3,
  "1 John": 5,
  "2 John": 1,
  "3 John": 1,
  Jude: 1,
  Revelation: 22
};

// START SMALL: you can change this list as you go.
// For whole Bible, replace with Object.keys(bookMaxChapters).
const booksToDo = Object.keys(bookMaxChapters);

const GENERATED_DIR = "generated";
fs.mkdirSync(GENERATED_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runGenerateChapter(book, chapter, count) {
  return new Promise((resolve, reject) => {
    const slug = book.toLowerCase().replace(/\s+/g, "_");
    const outPath = path.join(GENERATED_DIR, `${slug}_${chapter}.json`);

    if (fs.existsSync(outPath)) {
      console.log(`Skipping ${book} ${chapter} (already generated).`);
      return resolve();
    }

    console.log(`Generating ${book} ${chapter} (${count} questions)...`);

    const child = spawn("node", [
      "scripts/generateChapterQuiz.mjs",
      book,
      String(chapter),
      String(count)
    ], { stdio: ["ignore", "pipe", "inherit"] });

    const writeStream = fs.createWriteStream(outPath);
    child.stdout.pipe(writeStream);

    child.on("close", (code) => {
      writeStream.close();
      if (code === 0) {
        console.log(`✔ Saved ${book} ${chapter} to ${outPath}`);
        resolve();
      } else {
        console.error(`✖ Failed for ${book} ${chapter} (exit code ${code})`);
        // remove incomplete file
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        reject(new Error(`generateChapterQuiz failed for ${book} ${chapter}`));
      }
    });
  });
}

async function main() {
  for (const book of booksToDo) {
    const maxCh = bookMaxChapters[book];
    if (!maxCh) {
      console.warn("Unknown max chapters for book:", book);
      continue;
    }

    for (let ch = 1; ch <= maxCh; ch++) {
      try {
        await runGenerateChapter(book, ch, 8);
        await sleep(1000); // small delay to be gentle on the API
      } catch (err) {
        console.error("Error generating", book, ch, err.message);
        // continue to next chapter/book
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
