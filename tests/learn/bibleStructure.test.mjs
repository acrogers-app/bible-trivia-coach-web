// Read page pickers only offer chapters and verses that exist in the WEB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VERSE_COUNTS, chapterCount, verseCount } from '../../src/lib/bibleStructure.ts';

test('66 books, 1,189 chapters', () => {
  assert.equal(VERSE_COUNTS.length, 66);
  assert.equal(VERSE_COUNTS.reduce((a, b) => a + b.length, 0), 1189);
});

test('known chapter and verse counts', () => {
  assert.equal(chapterCount(36), 2);      // Haggai
  assert.equal(chapterCount(18), 150);    // Psalms
  assert.equal(verseCount(18, 119), 176); // Psalm 119
  assert.equal(verseCount(40, 1), 45);    // Mark 1
  assert.equal(chapterCount(99), 0);
  assert.equal(verseCount(36, 3), 0);     // Haggai 3 does not exist
});
