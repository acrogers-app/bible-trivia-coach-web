"""
Phase 1: Generate Bible trivia questions for chapters with gaps.
Uses Ollama (local, free) + Instructor (structured output).
Run: python3 scripts/phase1_generate.py [--limit N] [--priority 1|2|3] [--model NAME]
"""

import json
import sqlite3
import sys
import os
import re
import time
import argparse
from pathlib import Path
from typing import Literal

import instructor
from pydantic import BaseModel, Field, model_validator

# ── Config ──────────────────────────────────────────────────────────────────
BASE        = Path(__file__).parent.parent
DB_PATH     = BASE / "db/web.sqlite"
GAPS_FILE   = BASE / "scripts/phase1_gaps.json"
OUTPUT_FILE = BASE / "scripts/phase1_generated.json"
CHECKPOINT  = BASE / "scripts/phase1_checkpoint.json"
MIN_Q       = 3      # minimum questions per chapter
BATCH_SIZE  = 5      # questions to generate per chapter

BOOK_CANONICAL = {
    1:"Genesis",2:"Exodus",3:"Leviticus",4:"Numbers",5:"Deuteronomy",
    6:"Joshua",7:"Judges",8:"Ruth",9:"1 Samuel",10:"2 Samuel",
    11:"1 Kings",12:"2 Kings",13:"1 Chronicles",14:"2 Chronicles",
    15:"Ezra",16:"Nehemiah",17:"Esther",18:"Job",19:"Psalms",20:"Proverbs",
    21:"Ecclesiastes",22:"Song of Solomon",23:"Isaiah",24:"Jeremiah",
    25:"Lamentations",26:"Ezekiel",27:"Daniel",28:"Hosea",29:"Joel",
    30:"Amos",31:"Obadiah",32:"Jonah",33:"Micah",34:"Nahum",35:"Habakkuk",
    36:"Zephaniah",37:"Haggai",38:"Zechariah",39:"Malachi",
    40:"Matthew",41:"Mark",42:"Luke",43:"John",44:"Acts",45:"Romans",
    46:"1 Corinthians",47:"2 Corinthians",48:"Galatians",49:"Ephesians",
    50:"Philippians",51:"Colossians",52:"1 Thessalonians",53:"2 Thessalonians",
    54:"1 Timothy",55:"2 Timothy",56:"Titus",57:"Philemon",58:"Hebrews",
    59:"James",60:"1 Peter",61:"2 Peter",62:"1 John",63:"2 John",
    64:"3 John",65:"Jude",66:"Revelation"
}

# ── Pydantic models (Instructor uses these to guarantee output structure) ───
class TriviaQuestion(BaseModel):
    id: str = Field(description="Unique ID like 'gen-1-q1'")
    text: str = Field(description="The question text, ends with ?")
    options: list[str] = Field(description="Exactly 4 answer choices")
    answer: str = Field(description="Must be the EXACT text of the correct option")
    explanation: str = Field(description="Why the answer is correct, citing the verse")
    difficulty: Literal["easy", "medium", "hard"]
    category: str = Field(description="Short topic label e.g. 'Creation' or 'Prophecy'")
    refStart: str = Field(description="Format: 'Book Chapter:Verse' e.g. 'John 3:16'")
    refEnd: str = Field(description="Format: 'Book Chapter:Verse' e.g. 'John 3:16'")
    playful: bool = False
    sourceType: str = "scripture"

    @model_validator(mode='after')
    def check_answer_in_options(self):
        if len(self.options) != 4:
            raise ValueError(f"Must have exactly 4 options, got {len(self.options)}")
        if self.answer not in self.options:
            raise ValueError(f"answer '{self.answer}' not in options {self.options}")
        return self

    @model_validator(mode='after')
    def check_ref_format(self):
        pat = re.compile(r'^.+\s+\d+:\d+$')
        if not pat.match(self.refStart):
            raise ValueError(f"refStart must be 'Book ch:vs', got: {self.refStart}")
        if not pat.match(self.refEnd):
            raise ValueError(f"refEnd must be 'Book ch:vs', got: {self.refEnd}")
        return self

class QuestionBatch(BaseModel):
    questions: list[TriviaQuestion] = Field(
        description="List of trivia questions about the passage"
    )

# ── Helpers ─────────────────────────────────────────────────────────────────
def get_chapter_text(db, book_id: int, chapter: int) -> list[dict]:
    rows = db.execute(
        "SELECT chapter, number as verse, text FROM verses "
        "WHERE book_id=? AND chapter=? ORDER BY number",
        (book_id, chapter)
    ).fetchall()
    return [{"verse": r["verse"], "text": r["text"]} for r in rows]

def format_passage(book_name: str, chapter: int, verses: list[dict]) -> str:
    lines = [f"{book_name} {chapter}:{v['verse']}  {v['text']}" for v in verses]
    return "\n".join(lines)

def make_id(book_name: str, chapter: int, idx: int) -> str:
    slug = book_name.lower().replace(" ", "-")
    return f"{slug}-{chapter}-gen{idx}"

def load_checkpoint() -> set:
    if CHECKPOINT.exists():
        return set(json.loads(CHECKPOINT.read_text()))
    return set()

def save_checkpoint(done: set):
    CHECKPOINT.write_text(json.dumps(sorted(done), indent=2))

def load_existing() -> list:
    if OUTPUT_FILE.exists():
        return json.loads(OUTPUT_FILE.read_text())
    return []

def save_generated(questions: list):
    OUTPUT_FILE.write_text(json.dumps(questions, indent=2, ensure_ascii=False))

# ── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert Bible trivia question generator for the
Bible Trivia Coach app — used by children, adults, and seniors.

Your job: given a Bible passage, generate factual multiple-choice questions.

STRICT RULES:
1. Generate EXACTLY the requested number of questions.
2. Each question has EXACTLY 4 answer choices.
3. The "answer" field must be the EXACT text of one of the 4 options.
4. "refStart" and "refEnd" must use format: "Book Chapter:Verse"
   (e.g. "John 3:16", "Psalms 23:1", "1 Samuel 17:4")
5. Use the CANONICAL book spelling:
   - "Psalms" (not "Psalm"), "Revelation" (not "Revelations")
   - "1 Samuel", "2 Kings", "Song of Solomon"
6. Only ask about what is EXPLICITLY stated in the passage — no guessing.
7. Mix difficulties: include easy (who/what), medium (context), hard (details).
8. Explanations must cite the specific verse.
9. Keep questions clean, respectful, and appropriate for all ages.
10. Never include the answer in the question text."""

# ── Main generation function ─────────────────────────────────────────────────
def generate_for_chapter(
    client,
    model: str,
    book_id: int,
    book_name: str,
    chapter: int,
    need: int,
    verses: list[dict]
) -> list[dict]:

    passage = format_passage(book_name, chapter, verses)
    count   = min(need, BATCH_SIZE)

    user_prompt = f"""Generate {count} Bible trivia questions for this passage.

PASSAGE:
{passage}

Requirements:
- All refStart/refEnd must be in format "{book_name} {chapter}:VERSE"
- Mix easy/medium/hard difficulties
- Make questions engaging for all ages
- Each question must have exactly 4 options with one correct answer"""

    try:
        result = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt},
            ],
            response_model=QuestionBatch,
            max_retries=3,
        )

        out = []
        for i, q in enumerate(result.questions):
            d = q.model_dump()
            d["id"] = make_id(book_name, chapter, i + 1)
            out.append(d)
        return out

    except Exception as e:
        print(f"  ERROR generating for {book_name} {chapter}: {e}")
        return []

# ── Entry point ──────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit",    type=int, default=50,
                        help="Max chapters to process (default 50)")
    parser.add_argument("--priority", type=int, default=None,
                        help="Only process this priority level (1=Gospels, 2=NT, 3=OT)")
    parser.add_argument("--model",    default="llama3.1:8b",
                        help="Ollama model name")
    parser.add_argument("--all",      action="store_true",
                        help="Process all gaps (ignores --limit)")
    args = parser.parse_args()

    # Setup Instructor + Ollama (via OpenAI-compatible endpoint)
    from openai import OpenAI
    client = instructor.from_openai(
        OpenAI(base_url="http://localhost:11434/v1", api_key="ollama"),
        mode=instructor.Mode.JSON,
    )

    # Load data
    gaps       = json.loads(GAPS_FILE.read_text())
    checkpoint = load_checkpoint()
    generated  = load_existing()

    print(f"\n=== Phase 1: Generate Questions ===")
    print(f"Model:       {args.model}")
    print(f"Total gaps:  {len(gaps)}")
    print(f"Already done: {len(checkpoint)}")

    # Filter
    if args.priority:
        gaps = [g for g in gaps if g["priority"] == args.priority]
    
    gaps = [g for g in gaps if f"{g['bookId']}:{g['chapter']}" not in checkpoint]

    if not args.all:
        gaps = gaps[:args.limit]

    print(f"Will process: {len(gaps)} chapters\n")

    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row

    total_new = 0
    for i, gap in enumerate(gaps):
        key       = f"{gap['bookId']}:{gap['chapter']}"
        book_name = gap["bookName"]
        chapter   = gap["chapter"]
        need      = gap["need"]

        print(f"[{i+1}/{len(gaps)}] {book_name} {chapter} "
              f"(have {gap['have']}, need {need})", end="", flush=True)

        verses = get_chapter_text(db, gap["bookId"], chapter)
        if not verses:
            print(" — no verses in DB, skipping")
            checkpoint.add(key)
            save_checkpoint(checkpoint)
            continue

        t0 = time.time()
        new_qs = generate_for_chapter(
            client, args.model, gap["bookId"], book_name, chapter, need, verses
        )

        elapsed = time.time() - t0
        print(f" → {len(new_qs)} questions ({elapsed:.1f}s)")

        generated.extend(new_qs)
        total_new += len(new_qs)

        checkpoint.add(key)
        save_checkpoint(checkpoint)
        save_generated(generated)

    db.close()

    print(f"\n=== Done ===")
    print(f"New questions generated: {total_new}")
    print(f"Total in output file:    {len(generated)}")
    print(f"Output: {OUTPUT_FILE}")
    print(f"\nNext: node scripts/phase1_merge.mjs")

if __name__ == "__main__":
    main()
