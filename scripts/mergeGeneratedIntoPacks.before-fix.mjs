import fs from "node:fs";
import path from "node:path";

const GENERATED_DIR = "generated";
const coreDataPath = "public/data/trivia_core_en_v1.json";
const corePackPath = "public/packs/trivia_core_en_v1.json";
const reflectionsPath = "public/data/reflections_en_v1.json";

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function mergeQuestionsIntoCore(corePath, allQuestions) {
  if (!fs.existsSync(corePath)) {
    console.log("Core pack not found, skipping:", corePath);
    return;
  }
  const core = loadJson(corePath);
  if (!Array.isArray(core.questions)) {
    console.error("Core file has no questions array:", corePath);
    return;
  }
  const existingIds = new Set(core.questions.map((q) => q.id));
  const toAdd = allQuestions.filter((q) => !existingIds.has(q.id));
  core.questions.push(...toAdd);
  fs.writeFileSync(corePath, JSON.stringify(core, null, 2));
  console.log(`Added ${toAdd.length} questions to ${corePath}`);
}

function mergeReflections(reflectionsPath, allReflections) {
  let refs = {};
  if (fs.existsSync(reflectionsPath)) {
    refs = loadJson(reflectionsPath);
  }
  for (const [key, r] of Object.entries(allReflections)) {
    refs[key] = {
      title: `Reflect on ${key}`,
      verseFocus: r.verseFocus,
      prompts: r.prompts,
      prayerSuggestion: r.prayerSuggestion
    };
  }
  fs.writeFileSync(reflectionsPath, JSON.stringify(refs, null, 2));
  console.log(
    `Merged ${Object.keys(allReflections).length} reflection entries into ${reflectionsPath}`
  );
}

function main() {
  if (!fs.existsSync(GENERATED_DIR)) {
    console.error("Generated directory not found:", GENERATED_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(GENERATED_DIR)
    .filter((f) => f.endsWith(".json"));

  const allQuestions = [];
  const allReflections = {};

  for (const file of files) {
    const p = path.join(GENERATED_DIR, file);
    const gen = loadJson(p);

    if (Array.isArray(gen.questions)) {
      allQuestions.push(...gen.questions);
    }

    if (gen.reflectionKey && gen.reflection) {
      allReflections[gen.reflectionKey] = gen.reflection;
    }
  }

  console.log(
    `Found ${files.length} generated files, ${allQuestions.length} questions, ${Object.keys(allReflections).length} reflections.`
  );

  // Backups
  if (fs.existsSync(coreDataPath)) {
    fs.copyFileSync(
      coreDataPath,
      coreDataPath.replace(".json", ".before-merge.json")
    );
  }
  if (fs.existsSync(corePackPath)) {
    fs.copyFileSync(
      corePackPath,
      corePackPath.replace(".json", ".before-merge.json")
    );
  }
  if (fs.existsSync(reflectionsPath)) {
    fs.copyFileSync(
      reflectionsPath,
      reflectionsPath.replace(".json", ".before-merge.json")
    );
  }

  mergeQuestionsIntoCore(coreDataPath, allQuestions);
  mergeQuestionsIntoCore(corePackPath, allQuestions);
  mergeReflections(reflectionsPath, allReflections);
}

main();
