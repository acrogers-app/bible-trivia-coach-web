// Builds the static export for the Capacitor mobile shell.
//
// Route handlers (POST /api/analytics etc.) are incompatible with
// `output: 'export'`, so src/app/api is temporarily renamed to the
// router-private src/app/_api for the duration of the build.
//
// Run: npm run build:mobile   (then: npx cap sync)
import fs from "node:fs";
import { execSync } from "node:child_process";

const API_DIR = "src/app/api";
const HIDDEN_DIR = "src/app/_api";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://bible-trivia-coach-web.vercel.app";

if (fs.existsSync(HIDDEN_DIR)) {
  throw new Error(`${HIDDEN_DIR} already exists — a previous build may have failed to restore it. Rename it back to ${API_DIR} first.`);
}

fs.renameSync(API_DIR, HIDDEN_DIR);
try {
  execSync("next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      BUILD_TARGET: "capacitor",
      NEXT_PUBLIC_API_BASE: API_BASE,
    },
  });
} finally {
  fs.renameSync(HIDDEN_DIR, API_DIR);
}

console.log("\nStatic export ready in out/ (API base: " + API_BASE + ")");
console.log("Next: npx cap sync");
