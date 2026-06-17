import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local backup / snapshot files we do not want to lint:
    "play_backups/**",
    "src/app/play.page.before-fix.tsx",
    "src/app/play/page.before-*.tsx",
    "src/app/play/page.broken-summary-backup.tsx",
    "src/app/play/page.tts_scroll_backup.tsx",
  ]),
]);

export default eslintConfig;
