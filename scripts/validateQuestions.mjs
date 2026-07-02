import fs from "node:fs";

const corePath = "public/packs/trivia_core_en_v1.json";

if (!fs.existsSync(corePath)) {
  console.error("Could not find", corePath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(corePath, "utf8"));
if (!Array.isArray(data.questions)) {
  console.error("trivia_core_en_v1.json does not have a top-level 'questions' array");
  process.exit(1);
}

const bannedPhrases = [
  "podcast", "paperwork", "meme", "selfie", "video game",
  "social media", "email", "texting", "guarded guard"
];

function looksSilly(text) {
  const lower = text.toLowerCase();
  return bannedPhrases.some((p) => lower.includes(p));
}

let issues = [];

for (const q of data.questions) {
  const id = q.id || "<no-id>";
  const isTF = q.trueFalse === true;
  const isPlayful = q.playful === true;

  // Basic structure checks
  if (!q.text || typeof q.text !== "string") {
    issues.push({ id, type: "structure", msg: "Missing or non-string question text" });
  }

  const expectedLen = isTF ? 2 : 4;
  if (!Array.isArray(q.options) || q.options.length !== expectedLen) {
    issues.push({
      id, type: "structure",
      msg: `Options must be an array of ${expectedLen} strings (got ${q.options?.length ?? 0})`
    });
  } else {
    q.options.forEach((opt, idx) => {
      if (typeof opt !== "string") {
        issues.push({ id, type: "structure", msg: `Option[${idx}] is not a string` });
        return;
      }
      if (opt.length > 90) {
        issues.push({ id, type: "readability", msg: `Option[${idx}] very long (${opt.length} chars)` });
      }
      // Only flag silly options on non-playful questions
      if (!isPlayful && looksSilly(opt)) {
        issues.push({ id, type: "silly", msg: `Option[${idx}] contains suspicious phrase: "${opt}"` });
      }
    });
  }

  // correctIndex must be valid
  if (
    typeof q.correctIndex !== "number" ||
    q.correctIndex < 0 ||
    !Array.isArray(q.options) ||
    q.correctIndex >= q.options.length
  ) {
    issues.push({ id, type: "structure", msg: "Missing or invalid correctIndex" });
  }

  // Scripture questions should have refStart/refEnd
  const srcType = (q.sourceType || "scripture").toLowerCase();
  if (srcType === "scripture") {
    if (!q.refStart || !q.refEnd) {
      issues.push({ id, type: "structure", msg: "Scripture question missing refStart/refEnd" });
    }
  }

  // Explanation length sanity
  if (!q.explanation || typeof q.explanation !== "string" || q.explanation.length < 15) {
    issues.push({ id, type: "readability", msg: "Explanation is missing or very short" });
  }
}

console.log(`Scanned ${data.questions.length} questions in ${corePath}.`);
if (issues.length === 0) {
  console.log("No issues detected by validator.");
  process.exit(0);
}

// Separate structural from readability/silly
const structural = issues.filter(i => i.type === "structure");
const warnings   = issues.filter(i => i.type !== "structure");

console.log(`Found ${structural.length} structural issues, ${warnings.length} warnings.`);

if (structural.length > 0) {
  console.log("\nStructural issues (must fix):");
  for (const issue of structural.slice(0, 20)) {
    console.log(`  [${issue.type}] id=${issue.id}: ${issue.msg}`);
  }
}

if (warnings.length > 0) {
  console.log("\nWarnings (review but not blocking):");
  for (const issue of warnings.slice(0, 20)) {
    console.log(`  [${issue.type}] id=${issue.id}: ${issue.msg}`);
  }
}

// Only fail on structural issues
if (structural.length > 0) {
  process.exit(1);
}
process.exit(0);
