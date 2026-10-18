import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { loadGuestbookPreview } from '../src/guestbook-preview.js';

function fixture() {
  const dom = new JSDOM('<div data-guestbook-preview></div>');
  return { dom, container: dom.window.document.querySelector('div') };
}

test('preview renders real public notes as text and requests only three records', async () => {
  const { dom, container } = fixture();
  let request;
  const content = '<img src=x onerror=alert(1)>';
  const client = { async rpc(name, args) {
    request = { name, args };
    return { data: [{ display_name: '<script>test</script>', body: content, created_at: '2026-10-18T10:00:00Z' }], error: null };
  } };
  await loadGuestbookPreview(container, async () => client);
  assert.equal(request.name, 'wooflab_list_comments');
  assert.equal(request.args.p_limit, 3);
  assert.equal(request.args.p_before_id, null);
  assert.equal(container.querySelector('.preview-note-body').textContent, content);
  assert.equal(container.querySelectorAll('img,script').length, 0);
  assert.equal(container.getAttribute('aria-busy'), 'false');
  dom.window.close();
});

test('empty guestbook is shown honestly without sample comments', async () => {
  const { dom, container } = fixture();
  await loadGuestbookPreview(container, async () => ({ rpc: async () => ({ data: [], error: null }) }));
  assert.match(container.textContent, /first pawprint could be yours/);
  assert.equal(container.querySelectorAll('article').length, 0);
  dom.window.close();
});

test('RPC and configuration failures leave an understandable state and clear loading', async () => {
  const { dom, container } = fixture();
  await loadGuestbookPreview(container, async () => { throw new Error('internal connection details'); });
  assert.match(container.textContent, /taking a little break/);
  assert.ok(!container.textContent.includes('internal connection details'));
  assert.equal(container.getAttribute('aria-busy'), 'false');
  await loadGuestbookPreview(container, async () => ({ rpc: async () => ({ data: null, error: { message: 'denied' } }) }));
  assert.match(container.textContent, /Open the guestbook/);
  dom.window.close();
});

test('an unconfigured guestbook and an invalid date do not break the final scene', async () => {
  const { dom, container } = fixture();
  await loadGuestbookPreview(container, async () => null);
  assert.match(container.textContent, /opening soon/);
  await loadGuestbookPreview(container, async () => ({ rpc: async () => ({ data: [{ display_name: 'Visitor', body: 'Hello', created_at: 'invalid' }], error: null }) }));
  assert.equal(container.querySelector('.preview-note-body').textContent, 'Hello');
  assert.equal(container.querySelector('time'), null);
  dom.window.close();
});
