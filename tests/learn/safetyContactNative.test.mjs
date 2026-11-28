// 1.2.7: the iPhone and Android apps never show or submit the contact form; they link to the
// website's Child Safety page, opened in the system browser. Checked from source because the
// component imports Capacitor and React.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../src/app/safety/SafetyContact.tsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../../src/app/safety/page.tsx', import.meta.url), 'utf8');

test('renders nothing before hydration, so the form is not in the prerendered HTML', () => {
  assert.match(src, /if \(!hydrated\) return null;/);
  assert.ok(src.indexOf('if (!hydrated) return null;') < src.indexOf('<SafetyContactForm'));
});

test('native branch returns only an external link, before the form branch', () => {
  const nativeStart = src.indexOf('if (ios || android) {');
  const formAt = src.indexOf('<SafetyContactForm');
  assert.ok(nativeStart > 0 && formAt > nativeStart);
  const nativeBranch = src.slice(nativeStart, formAt);
  assert.match(nativeBranch, /href=\{WEBSITE_SAFETY_URL\} target="_blank"/);
  assert.doesNotMatch(nativeBranch, /<form|fetch\(|SafetyContactForm/);
  assert.match(src, /WEBSITE_SAFETY_URL = 'https:\/\/biblestudy\.webeuseful\.com\/safety'/);
});

test('the Safety page reaches the form only through SafetyContact', () => {
  assert.doesNotMatch(page, /SafetyContactForm/);
  assert.match(page, /<SafetyContact textStyle=\{textStyle\} \/>/);
});
