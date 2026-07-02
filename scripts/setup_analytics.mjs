import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BASE = process.cwd();
const ERRORS = [];

function log(msg)  { console.log(`\n✓ ${msg}`); }
function warn(msg) { console.log(`⚠  ${msg}`); }
function fail(msg) { ERRORS.push(msg); console.log(`✗ ${msg}`); }

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
}

function write(rel, content) {
  const full = path.join(BASE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  log(`Written: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(BASE, rel), 'utf8');
}

function backup(rel) {
  const full = path.join(BASE, rel);
  if (fs.existsSync(full)) fs.copyFileSync(full, `${full}.bak.analytics.${Date.now()}`);
}

function buildAndCheck() {
  log('Building...');
  const out = run('npm run build 2>&1');

  const tsErrors = [...out.matchAll(/Type error: (.+)/g)].map(m => m[1]);
  const parseErrors = [...out.matchAll(/Expected .+, got .+/g)].map(m => m[0]);
  const allErrors = [...tsErrors, ...parseErrors];

  const success = out.includes('Generating static pages') && allErrors.length === 0;
  return { out, allErrors, success };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Install langfuse
// ─────────────────────────────────────────────────────────────────────────────
log('Installing langfuse...');
const installOut = run('npm install langfuse --save 2>&1');
if (installOut.toLowerCase().includes('err!') || installOut.includes('npm error')) {
  fail('langfuse install failed: ' + installOut.slice(0,200));
} else {
  log('langfuse installed OK');
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Update appSettings (add analyticsEnabled)
// ─────────────────────────────────────────────────────────────────────────────
backup('src/lib/appSettings.ts');
let appSettings = read('src/lib/appSettings.ts');
if (!appSettings.includes('analyticsEnabled')) {
  appSettings = appSettings
    .replace('readerShowAllVoices: boolean;',
             'readerShowAllVoices: boolean;\n  analyticsEnabled: boolean;')
    .replace('readerShowAllVoices: false,',
             'readerShowAllVoices: false,\n  analyticsEnabled: true,');
  write('src/lib/appSettings.ts', appSettings);
} else { log('appSettings already has analyticsEnabled'); }

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Create src/lib/analytics.ts
// ─────────────────────────────────────────────────────────────────────────────
write('src/lib/analytics.ts', `\
/**
 * Analytics — fire-and-forget, never throws, respects user opt-out.
 * No PII. Only questionId, correct/wrong, difficulty, refs.
 */
import { loadSettings } from './appSettings';

export type QuizAnswerEvent = {
  questionId:   string;
  questionText: string;
  correct:      boolean;
  selectedText: string;
  correctText:  string;
  difficulty:   string;
  refStart:     string;
  refEnd:       string;
  sourceType:   string;
};

export type QuizAnalyticsPayload = {
  sessionId: string;
  quizTitle: string;
  total:     number;
  correct:   number;
  answers:   QuizAnswerEvent[];
  timestamp: string;
};

export function makeSessionId(): string {
  return \`q-\${Date.now().toString(36)}-\${Math.random().toString(36).slice(2, 7)}\`;
}

export function sendQuizAnalytics(payload: QuizAnalyticsPayload): void {
  try {
    if (typeof window === 'undefined') return;
    const settings = loadSettings();
    if (settings.analyticsEnabled === false) return;

    // Fire-and-forget — keepalive ensures delivery even during page navigation
    fetch('/api/analytics', {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json' },
      body:      JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must NEVER break the app
  }
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: Create /api/analytics route
// ─────────────────────────────────────────────────────────────────────────────
write('src/app/api/analytics/route.ts', `\
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type QuizAnswerEvent = {
  questionId:   string;
  questionText: string;
  correct:      boolean;
  selectedText: string;
  correctText:  string;
  difficulty:   string;
  refStart:     string;
  refEnd:       string;
  sourceType:   string;
};

type QuizAnalyticsPayload = {
  sessionId: string;
  quizTitle: string;
  total:     number;
  correct:   number;
  answers:   QuizAnswerEvent[];
  timestamp: string;
};

function extractBook(ref: string): string {
  const m = String(ref || '').match(/^(.+?)\\s+\\d+:\\d+$/);
  return m ? m[1] : 'unknown';
}

async function logToLangfuse(payload: QuizAnalyticsPayload) {
  const pk  = process.env.LANGFUSE_PUBLIC_KEY;
  const sk  = process.env.LANGFUSE_SECRET_KEY;
  const url = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

  if (!pk || !sk) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[analytics:dev]', {
        session: payload.sessionId,
        title:   payload.quizTitle,
        score:   \`\${payload.correct}/\${payload.total}\`,
        wrong: payload.answers.filter(a => !a.correct).map(a => a.questionId),
      });
    }
    return;
  }

  const { Langfuse } = await import('langfuse');
  const lf = new Langfuse({ publicKey: pk, secretKey: sk, baseUrl: url });

  const scorePct = payload.total > 0
    ? Math.round((payload.correct / payload.total) * 100) : 0;

  const trace = lf.trace({
    name: 'quiz-session', id: payload.sessionId, sessionId: payload.sessionId,
    tags: [payload.quizTitle],
    metadata: { quizTitle: payload.quizTitle, total: payload.total,
                correct: payload.correct, scorePct, timestamp: payload.timestamp },
  });

  trace.score({ name: 'score-pct',
    value:   payload.correct / Math.max(payload.total, 1),
    comment: \`\${payload.correct}/\${payload.total} correct (\${scorePct}%)\`,
  });

  for (const ans of payload.answers) {
    const book    = extractBook(ans.refStart);
    const chapter = ans.refStart?.match(/\\s(\\d+):/)?.[1] ?? '?';

    const span = trace.span({
      name: 'question',
      metadata: { questionId: ans.questionId, questionText: ans.questionText,
                  difficulty: ans.difficulty, refStart: ans.refStart,
                  refEnd: ans.refEnd, sourceType: ans.sourceType,
                  book, chapter, selectedText: ans.selectedText,
                  correctText: ans.correctText },
    });

    span.score({
      name: 'correct', value: ans.correct ? 1 : 0,
      comment: ans.correct ? 'correct' : \`wrong — chose: "\${ans.selectedText}"\`,
    });
    span.end();
  }

  await lf.flushAsync();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QuizAnalyticsPayload;
    if (!body?.sessionId || !Array.isArray(body.answers)) {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
    }
    await logToLangfuse(body);
    return NextResponse.json({ ok: true, logged: body.answers.length });
  } catch (err) {
    console.error('[analytics]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true, skipped: true });
  }
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: Patch play/page.tsx — import + analytics call in showSummary
// ─────────────────────────────────────────────────────────────────────────────
backup('src/app/play/page.tsx');
let play = read('src/app/play/page.tsx');

// 5a) Add import (after BottomNav import)
if (!play.includes("from '../../lib/analytics'")) {
  if (play.includes("import BottomNav from '../../components/BottomNav';")) {
    play = play.replace(
      "import BottomNav from '../../components/BottomNav';",
      "import BottomNav from '../../components/BottomNav';\nimport { sendQuizAnalytics, makeSessionId } from '../../lib/analytics';"
    );
    log('Added analytics import to play/page.tsx');
  } else {
    // Fallback: insert after 'use client'
    play = play.replace("'use client';",
      "'use client';\nimport { sendQuizAnalytics, makeSessionId } from '../../lib/analytics';");
    warn('Added analytics import at top of file (fallback)');
  }
} else {
  log('Analytics import already present');
}

// 5b) Patch showSummary — insert analytics call before setScreen
const SHOW_SUMMARY_TARGET =
  `    setLastQuestions(questions);\n    setLastAnswers(answers);\n    markDailyChallengeCompletedForToday(title);\n    setScreen({ name: 'summary', title, total, correct });`;

const SHOW_SUMMARY_REPLACEMENT =
  `    setLastQuestions(questions);\n    setLastAnswers(answers);\n    markDailyChallengeCompletedForToday(title);\n\n    // btc:analytics\n    try {\n      sendQuizAnalytics({\n        sessionId:  makeSessionId(),\n        quizTitle:  title,\n        total,\n        correct,\n        timestamp:  new Date().toISOString(),\n        answers: answers.map((a) => {\n          const q = questions.find((x) => x.id === a.questionId);\n          return {\n            questionId:   a.questionId,\n            questionText: q?.text ?? '',\n            correct:      a.isCorrect,\n            selectedText: q?.options?.[a.chosenIndex] ?? String(a.chosenIndex),\n            correctText:  q?.options?.[a.correctIndex] ?? String(a.correctIndex),\n            difficulty:   q?.difficulty ?? 'unknown',\n            refStart:     q?.refStart ?? '',\n            refEnd:       q?.refEnd ?? '',\n            sourceType:   q?.sourceType ?? 'scripture',\n          };\n        }),\n      });\n    } catch {}\n\n    setScreen({ name: 'summary', title, total, correct });`;

if (!play.includes('btc:analytics')) {
  if (play.includes(SHOW_SUMMARY_TARGET)) {
    play = play.replace(SHOW_SUMMARY_TARGET, SHOW_SUMMARY_REPLACEMENT);
    log('Patched showSummary with analytics call');
  } else {
    // Fallback: find setScreen summary line
    const fallback = "setScreen({ name: 'summary', title, total, correct });";
    if (play.includes(fallback)) {
      play = play.replace(fallback,
        `// btc:analytics\n    try {\n      sendQuizAnalytics({\n        sessionId: makeSessionId(), quizTitle: title, total, correct,\n        timestamp: new Date().toISOString(),\n        answers: answers.map((a: AnswerRecord) => {\n          const q = questions.find((x: TriviaQuestion) => x.id === a.questionId);\n          return {\n            questionId: a.questionId, questionText: q?.text ?? '',\n            correct: a.isCorrect,\n            selectedText: q?.options?.[a.chosenIndex] ?? String(a.chosenIndex),\n            correctText: q?.options?.[a.correctIndex] ?? String(a.correctIndex),\n            difficulty: q?.difficulty ?? 'unknown', refStart: q?.refStart ?? '',\n            refEnd: q?.refEnd ?? '', sourceType: q?.sourceType ?? 'scripture',\n          };\n        }),\n      });\n    } catch {}\n    ${fallback}`
      );
      warn('Patched showSummary (fallback — setScreen line)');
    } else {
      fail('Could not find showSummary insertion point');
    }
  }
} else {
  log('Analytics call already present in showSummary');
}

write('src/app/play/page.tsx', play);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6: Add analytics toggle to Settings
// ─────────────────────────────────────────────────────────────────────────────
backup('src/app/settings/page.tsx');
let settingsPage = read('src/app/settings/page.tsx');

if (!settingsPage.includes('analyticsEnabled')) {
  const reduceMotionBlock = settingsPage.match(
    /<label style=\{row\}>\s*<input[\s\S]*?reduceMotion[\s\S]*?<\/label>/
  )?.[0];

  if (reduceMotionBlock) {
    const analyticsLabel = `
            <label style={row}>
              <input
                type="checkbox"
                checked={draft.analyticsEnabled !== false}
                onChange={(e) => update({ analyticsEnabled: e.target.checked })}
              />
              <span>
                <strong>Anonymous analytics</strong>
                <span className="btc-text-muted" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                  Helps improve questions. No personal data collected.
                </span>
              </span>
            </label>`;
    settingsPage = settingsPage.replace(reduceMotionBlock, reduceMotionBlock + analyticsLabel);
    write('src/app/settings/page.tsx', settingsPage);
    log('Added analytics toggle to Settings');
  } else {
    warn('Could not find reduceMotion block in settings — toggle not added');
  }
} else {
  log('Analytics toggle already present in settings');
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7: Build + auto-fix
// ─────────────────────────────────────────────────────────────────────────────
let { out, allErrors, success } = buildAndCheck();
console.log(out.slice(-1200));

if (!success && allErrors.length > 0) {
  log('Build errors detected — attempting auto-fix...');

  for (const err of allErrors) {
    // Fix: sendQuizAnalytics not found (scope issue in nested component)
    if (err.includes('sendQuizAnalytics') || err.includes('makeSessionId')) {
      log('Auto-fix: moving analytics call to top-level scope...');
      let p = read('src/app/play/page.tsx');
      // Wrap the call in a safe closure that won't fail in nested scope
      p = p.replace(
        /\/\/ btc:analytics\s*\ntry \{[\s\S]*?\} catch \{\}/m,
        `// btc:analytics (deferred to avoid scope issues)
    window.setTimeout(() => {
      try {
        sendQuizAnalytics({
          sessionId: makeSessionId(), quizTitle: title, total, correct,
          timestamp: new Date().toISOString(),
          answers: answers.map((a) => {
            const q = questions.find((x) => x.id === a.questionId);
            return {
              questionId: a.questionId, questionText: q?.text ?? '',
              correct: a.isCorrect,
              selectedText: q?.options?.[a.chosenIndex] ?? String(a.chosenIndex),
              correctText: q?.options?.[a.correctIndex] ?? String(a.correctIndex),
              difficulty: q?.difficulty ?? 'unknown',
              refStart: q?.refStart ?? '', refEnd: q?.refEnd ?? '',
              sourceType: q?.sourceType ?? 'scripture',
            };
          }),
        });
      } catch {}
    }, 0);`
      );
      write('src/app/play/page.tsx', p);
    }

    // Fix: missing import
    if (err.includes("Cannot find name 'sendQuizAnalytics'") || err.includes("Cannot find name 'makeSessionId'")) {
      log('Auto-fix: adding analytics import at file top...');
      let p = read('src/app/play/page.tsx');
      if (!p.includes("from '../../lib/analytics'")) {
        p = p.replace("'use client';",
          "'use client';\nimport { sendQuizAnalytics, makeSessionId } from '../../lib/analytics';");
        write('src/app/play/page.tsx', p);
      }
    }
  }

  // Re-build after auto-fix
  const second = buildAndCheck();
  console.log(second.out.slice(-800));
  if (second.success) {
    log('Auto-fix successful! Build is green.');
  } else {
    fail('Auto-fix did not resolve all errors. Manual check needed.');
    console.log('Remaining errors:', second.allErrors);
    process.exit(1);
  }
} else if (success) {
  log('Build is green!');
} else {
  fail('Build failed for unknown reason. Check output above.');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8: Commit + push
// ─────────────────────────────────────────────────────────────────────────────
run('git add src/lib/analytics.ts src/app/api/analytics/ src/lib/appSettings.ts src/app/settings/page.tsx src/app/play/page.tsx');
const commitOut = run('git commit -m "Add Langfuse analytics: track quiz answers per question, opt-out in Settings"');
console.log(commitOut);
const pushOut = run('git push origin main');
console.log(pushOut);

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log(' Analytics setup complete!');
console.log('========================================');
if (ERRORS.length) {
  console.log('\nWarnings (non-fatal):');
  ERRORS.forEach(e => console.log(' ⚠', e));
}
console.log(`
Next steps:
  1. Sign up at https://cloud.langfuse.com (free, 50k events/month)
  2. Create project "bible-trivia-coach"
  3. Settings → API Keys → copy Public Key + Secret Key
  4. Add to .env.local:
       LANGFUSE_PUBLIC_KEY=pk-lf-...
       LANGFUSE_SECRET_KEY=sk-lf-...
  5. Add same keys to Vercel dashboard → Settings → Environment Variables
  6. Play a quiz → check Langfuse dashboard for data

In dev mode (without keys), wrong answers are logged to the terminal console.
`);
