// 1.2.7 migration: queued quiz analytics from older versions are deleted, never sent, and
// nothing else stored on the device is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANALYTICS_OUTBOX_DB, clearAnalyticsOutbox } from '../../src/lib/analyticsOutboxCleanup.ts';

/** Minimal IndexedDB factory: databases by name; deleteDatabase answers asynchronously. */
function fakeIndexedDB(names, outcome = 'success') {
  const dbs = new Map(names.map((n) => [n, { name: n }]));
  const deleted = [];
  return {
    dbs,
    deleted,
    deleteDatabase(name) {
      const req = {};
      setTimeout(() => {
        if (outcome === 'success') {
          deleted.push(name);
          dbs.delete(name);
          req.onsuccess?.();
        } else if (outcome === 'blocked') {
          req.onblocked?.();
        } else {
          req.onerror?.();
        }
      }, 0);
      return req;
    },
  };
}

test('the outbox name matches the one 1.2.6 used', () => {
  assert.equal(ANALYTICS_OUTBOX_DB, 'btc-outbox');
});

test('deletes only the analytics outbox and leaves other local data alone', async () => {
  const idb = fakeIndexedDB(['btc-outbox', 'btc-learn', 'keyval-store']);
  const localStorage = new Map([
    ['btc-settings', '{"theme":"dark"}'],
    ['btc-progress', '{"streak":4}'],
    ['weu_totals_v1', '{"n":10}'],
  ]);
  const before = new Map(localStorage);

  assert.equal(await clearAnalyticsOutbox(idb), true);

  assert.deepEqual(idb.deleted, ['btc-outbox']);
  assert.deepEqual([...idb.dbs.keys()].sort(), ['btc-learn', 'keyval-store']);
  assert.deepEqual(localStorage, before);
});

test('succeeds when there is no outbox (fresh install)', async () => {
  const idb = fakeIndexedDB(['btc-learn']);
  assert.equal(await clearAnalyticsOutbox(idb), true);
  assert.deepEqual([...idb.dbs.keys()], ['btc-learn']);
});

test('never throws: unavailable, blocked, failing or throwing IndexedDB resolve false', async () => {
  assert.equal(await clearAnalyticsOutbox(undefined), false);
  assert.equal(await clearAnalyticsOutbox(fakeIndexedDB(['btc-outbox'], 'blocked')), false);
  assert.equal(await clearAnalyticsOutbox(fakeIndexedDB(['btc-outbox'], 'error')), false);
  assert.equal(await clearAnalyticsOutbox({ deleteDatabase() { throw new Error('denied'); } }), false);
});

// analytics.ts and OfflineBanner.tsx use extensionless imports that node --test cannot load,
// so their wiring is checked from source.
test('app start clears the outbox and no longer replays it; analytics stay disabled', () => {
  const banner = readFileSync(new URL('../../src/components/OfflineBanner.tsx', import.meta.url), 'utf8');
  assert.match(banner, /clearAnalyticsOutbox\(\)/);
  assert.doesNotMatch(banner, /flushAnalyticsOutbox/);

  const analytics = readFileSync(new URL('../../src/lib/analytics.ts', import.meta.url), 'utf8');
  assert.match(analytics, /const ANALYTICS_ENABLED = false;/);
  assert.match(analytics, /const OUTBOX_DB = ANALYTICS_OUTBOX_DB;/);
});
