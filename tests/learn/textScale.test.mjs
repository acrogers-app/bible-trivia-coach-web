// Learn text follows the app text size and the iOS system text size (Dynamic Type).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_FS, fs, headingRatio, systemTextRatio } from '../../src/lib/learn/textScale.ts';

// Fake just enough of the browser for systemTextRatio().
function withFakeBrowser({ supports, bodyPx }, fn) {
  const saved = { document: globalThis.document, CSS: globalThis.CSS, getComputedStyle: globalThis.getComputedStyle };
  globalThis.CSS = { supports: () => supports };
  globalThis.document = {
    createElement: () => ({ style: {}, remove() {} }),
    body: { appendChild() {} },
  };
  globalThis.getComputedStyle = () => ({ fontSize: `${bodyPx}px` });
  try { return fn(); } finally { Object.assign(globalThis, saved); }
}

test('fs() scales a default px size by the app and system text sizes', () => {
  assert.equal(fs(13), 'calc(13px * var(--btc-font-mult, 1) * var(--learn-dt, 1))');
  assert.match(BODY_FS, /1em \* var\(--learn-dt, 1\)/);
});

test('default iOS text size (17px body) gives ratio 1', () => {
  assert.equal(withFakeBrowser({ supports: true, bodyPx: 17 }, systemTextRatio), 1);
});

test('largest accessibility size scales up, capped at 3.2', () => {
  assert.ok(Math.abs(withFakeBrowser({ supports: true, bodyPx: 53 }, systemTextRatio) - 53 / 17) < 1e-9);
  assert.equal(withFakeBrowser({ supports: true, bodyPx: 90 }, systemTextRatio), 3.2);
});

test('smallest sizes are floored at 0.85 so text stays readable', () => {
  assert.equal(withFakeBrowser({ supports: true, bodyPx: 12 }, systemTextRatio), 0.85);
});

test('browsers without the iOS system font are unaffected', () => {
  assert.equal(withFakeBrowser({ supports: false, bodyPx: 40 }, systemTextRatio), 1);
});

test('no document (server render) gives ratio 1', () => {
  assert.equal(systemTextRatio(), 1);
});

test('headings grow half as much as body text', () => {
  assert.equal(headingRatio(1), 1);
  assert.equal(headingRatio(3), 2);
  assert.ok(Math.abs(headingRatio(0.85) - 0.925) < 1e-9);
});
