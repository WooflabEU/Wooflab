import test from 'node:test';
import assert from 'node:assert/strict';
import { isNoteId, noteRequest, noteUrl, packShare } from '../src/lib/sharing.js';
import { getPublicNote } from '../src/lib/public-note.js';

const id = '891a562a-e623-4bdc-85a0-ef449b17222b';

test('the X composer receives the exact message, link position and blank lines', () => {
  const share = packShare(id);
  const expected = `I just joined the Woof pack!\n\nhttps://wooflab.eu/guestbook/?note=${id}\n\nWoof woof!`;
  const intent = new URL(share.intentUrl);
  assert.equal(share.text, expected);
  assert.equal(intent.origin, 'https://x.com');
  assert.equal(intent.pathname, '/intent/tweet');
  assert.equal(intent.searchParams.get('text'), expected);
  assert.equal(intent.searchParams.has('url'), false);
  assert.equal(share.url, noteUrl(id));
});

test('public links use the production domain and normalize valid UUIDs', () => {
  assert.equal(noteUrl(id.toUpperCase()), `https://wooflab.eu/guestbook/?note=${id}`);
  for (const invalid of ['', 'javascript:alert(1)', '../settings', `${id}&url=https://example.com`, null]) {
    assert.equal(isNoteId(invalid), false);
    assert.throws(() => noteUrl(invalid));
  }
});

test('absent, malformed and ambiguous note queries are distinguished before any request', () => {
  assert.deepEqual(noteRequest(''), { present: false, id: null });
  assert.deepEqual(noteRequest(`?note=${id.toUpperCase()}`), { present: true, id });
  assert.deepEqual(noteRequest('?note='), { present: true, id: null });
  assert.deepEqual(noteRequest('?note=%3Cscript%3E'), { present: true, id: null });
  assert.deepEqual(noteRequest(`?note=${id}&note=${id}`), { present: true, id: null });
});

test('an invalid public ID is rejected before contacting Supabase', async () => {
  let calls = 0;
  await assert.rejects(() => getPublicNote({ from() { calls++; } }, 'bad-id'));
  assert.equal(calls, 0);
});

test('a failed direct lookup stays an error rather than looking like a deleted note', async () => {
  const client = { from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: null, error: new Error('offline') }; } }; } };
  await assert.rejects(() => getPublicNote(client, id), /offline/);
});
