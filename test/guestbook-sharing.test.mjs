import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { initGuestbook } from '../src/guestbook.js';
import { noteUrl, packShare } from '../src/lib/sharing.js';

const USER = '10000000-0000-4000-8000-000000000001';
const OTHER_USER = '10000000-0000-4000-8000-000000000002';
const NEW = '20000000-0000-4000-8000-000000000001';
const OLD = '30000000-0000-4000-8000-000000000001';
const note = (id, body = 'A public pawprint.', author_id = USER) => ({ id, body, author_id, created_at: '2026-10-18T20:00:00Z', display_name: 'Pack member', handle: 'pack_member', avatar_url: null });
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const page = (await readFile(new URL('../guestbook/index.html', import.meta.url), 'utf8'))
  .replace('<!-- partial:header -->', await readFile(new URL('../src/partials/header.html', import.meta.url), 'utf8'))
  .replace('<!-- partial:footer -->', await readFile(new URL('../src/partials/footer.html', import.meta.url), 'utf8'));

async function fixture(t, options = {}) {
  const state = {
    session: options.anonymous ? null : { user: { id: USER } },
    feed: options.feed || [], publicNotes: new Map(options.publicNotes || []),
    profiles: new Map([[USER, { display_name: 'Pack member', handle: 'pack_member', avatar_url: null }], [OTHER_USER, { display_name: 'Another member', handle: 'another_member', avatar_url: null }]]),
    postResult: options.postResult || { data: NEW, error: null },
    rpcCalls: [], reads: [], notifications: [], scrollRequests: 0,
    feedFailure: false, lookupFailure: false, unsubscribed: false,
  };
  const dom = new JSDOM(page, { url: `https://wooflab.eu/guestbook/${options.search || ''}` });
  const win = dom.window;
  const doc = win.document;
  const $ = selector => doc.querySelector(selector);
  win.HTMLElement.prototype.scrollIntoView = () => { state.scrollRequests++; };
  const dialog = $('#delete-dialog');
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new win.Event('close')); };
  const client = {
    async rpc(name, args) {
      state.rpcCalls.push({ name, args });
      if (name === 'wooflab_is_admin') return { data: false, error: null };
      if (name === 'wooflab_list_comments') {
        if (state.feedFailure) return { data: null, error: new Error('offline') };
        return { data: [...state.feed], error: null };
      }
      if (name === 'wooflab_post_comment') {
        const author = state.session?.user.id;
        const result = await state.postResult;
        if (!result.error && result.data) {
          const record = note(result.data, args.p_body, author);
          state.publicNotes.set(record.id, record);
          state.feed = [record, ...state.feed];
        }
        return result;
      }
      throw new Error(`Unexpected RPC: ${name}`);
    },
    from(table) {
      const query = {
        table, operation: 'read', id: null,
        select(columns) {
          this.columns = columns;
          if (this.operation === 'delete') {
            state.publicNotes.delete(this.id);
            state.feed = state.feed.filter(record => record.id !== this.id);
            return Promise.resolve({ data: [{ id: this.id }], error: null });
          }
          return this;
        },
        eq(column, value) { assert.equal(column, 'id'); this.id = value; return this; },
        delete() { this.operation = 'delete'; return this; },
        async maybeSingle() {
          state.reads.push({ table, id: this.id, columns: this.columns });
          if (table === 'wooflab_comments') {
            if (state.lookupFailure) return { data: null, error: new Error('offline') };
            return { data: state.publicNotes.get(this.id) || null, error: null };
          }
          if (table === 'wooflab_profiles') return { data: state.profiles.get(this.id) || null, error: null };
          throw new Error(`Unexpected table: ${table}`);
        },
      };
      return query;
    },
    auth: {
      onAuthStateChange(callback) {
        state.onAuth = callback;
        queueMicrotask(() => callback('INITIAL_SESSION', state.session));
        return { data: { subscription: { unsubscribe() { state.unsubscribed = true; } } } };
      },
      async signOut() { state.session = null; state.onAuth('SIGNED_OUT', null); return { error: null }; },
      async signInWithOAuth() { return { error: null }; },
    },
  };
  await initGuestbook({ root: doc, win, clientProvider: async () => options.offline ? null : client, notify: message => state.notifications.push(message) });
  await tick();
  t.after(() => dom.window.close());
  return {
    state, dom, win, doc, $,
    async post(content = 'Hello, pack!') {
      $('#comment-body').value = content;
      $('#comment-body').dispatchEvent(new win.Event('input'));
      $('#comment-form').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
      await tick();
    },
    async session(userId) {
      state.session = userId ? { user: { id: userId } } : null;
      state.onAuth(userId ? 'SIGNED_IN' : 'SIGNED_OUT', state.session);
      await tick();
    },
  };
}

test('sharing appears only after persistence and uses the returned ID, not the feed order', async t => {
  const pending = deferred();
  const f = await fixture(t, { postResult: pending.promise, feed: [note(OLD)] });
  await f.post();
  assert.equal(f.$('#pack-success').hidden, true);
  assert.equal(f.$('#comment-form').hidden, false);
  assert.equal(f.$('#post-comment').disabled, true);
  f.$('#comment-form').dispatchEvent(new f.win.Event('submit', { cancelable: true }));
  assert.equal(f.state.rpcCalls.filter(call => call.name === 'wooflab_post_comment').length, 1);
  pending.resolve({ data: NEW, error: null });
  await tick();
  assert.equal(f.$('#pack-success').hidden, false);
  assert.equal(f.$('#comment-form').hidden, true);
  assert.equal(f.$('#pack-share-preview').textContent, packShare(NEW).text);
  assert.equal(f.$('#share-on-x').href, packShare(NEW).intentUrl);
  assert.equal(f.$('#share-on-x').target, '_blank');
  assert.match(f.$('#share-on-x').rel, /noopener/);
  assert.equal(f.doc.activeElement.id, 'pack-success-title');
  assert.equal(f.$('#comment-body').value, '');
});

test('a rejected post preserves the draft and never offers a share link', async t => {
  const f = await fixture(t, { postResult: { data: null, error: { message: 'rate_limit' } } });
  await f.post('My draft stays here.');
  assert.equal(f.$('#comment-body').value, 'My draft stays here.');
  assert.equal(f.$('#pack-success').hidden, true);
  assert.equal(f.$('#share-on-x').hasAttribute('href'), false);
  assert.match(f.$('#composer-status').textContent, /30 seconds/);
  assert.equal(f.$('#post-comment').disabled, false);
});

test('a feed refresh failure after saving cannot remove the successful share state', async t => {
  const f = await fixture(t);
  f.state.feedFailure = true;
  await f.post();
  assert.equal(f.$('#pack-success').hidden, false);
  assert.match(f.$('#feed-status').textContent, /couldn’t load/);
  assert.equal(f.$('#share-on-x').href, packShare(NEW).intentUrl);
});

test('copy link copies the canonical public URL and confirms only the copy action', async t => {
  const f = await fixture(t);
  let copied;
  Object.defineProperty(f.win.navigator, 'clipboard', { value: { async writeText(value) { copied = value; } } });
  await f.post();
  f.$('#copy-pawprint-link').click();
  await tick();
  assert.equal(copied, noteUrl(NEW));
  assert.equal(f.$('#pack-share-status').textContent, 'Link copied. Woof!');
  assert.equal(f.$('#pack-copy-link').hidden, true);
});

test('clipboard denial exposes a selectable read-only link instead of losing the action', async t => {
  const f = await fixture(t);
  Object.defineProperty(f.win.navigator, 'clipboard', { value: { async writeText() { throw new Error('denied'); } } });
  await f.post();
  f.$('#copy-pawprint-link').click();
  await tick();
  assert.equal(f.$('#pack-copy-link').hidden, false);
  assert.equal(f.$('#pack-copy-link').readOnly, true);
  assert.equal(f.$('#pack-copy-link').value, noteUrl(NEW));
  assert.equal(f.doc.activeElement.id, 'pack-copy-link');
  assert.match(f.$('#pack-share-status').textContent, /Select and copy/);
});

test('write another note restores the form and preserves text edited during a pending save', async t => {
  const pending = deferred();
  const f = await fixture(t, { postResult: pending.promise });
  await f.post('First note');
  f.$('#comment-body').value = 'A second draft';
  pending.resolve({ data: NEW, error: null });
  await tick();
  f.$('#write-another-note').click();
  assert.equal(f.$('#pack-success').hidden, true);
  assert.equal(f.$('#comment-form').hidden, false);
  assert.equal(f.$('#comment-body').value, 'A second draft');
  assert.equal(f.doc.activeElement.id, 'comment-body');
  assert.equal(f.$('#share-on-x').hasAttribute('href'), false);
});

test('signing out clears the previous account’s success and sharing details', async t => {
  const f = await fixture(t);
  await f.post();
  f.$('#sign-out').click();
  await tick();
  assert.equal(f.$('#auth-signed-out').hidden, false);
  assert.equal(f.$('#pack-success').hidden, true);
  assert.equal(f.$('#pack-share-preview').textContent, '');
  assert.equal(f.$('#share-on-x').hasAttribute('href'), false);
});

test('an account change during saving cannot claim success or erase the new account’s draft', async t => {
  const pending = deferred();
  const f = await fixture(t, { postResult: pending.promise });
  await f.post('First account note');
  await f.session(OTHER_USER);
  f.$('#comment-body').value = 'Another account draft';
  pending.resolve({ data: NEW, error: null });
  await tick();
  assert.equal(f.$('#pack-success').hidden, true);
  assert.equal(f.$('#comment-body').value, 'Another account draft');
  assert.equal(f.$('#current-name').textContent, 'Another member');
});

test('refreshing the same authenticated account preserves the share state', async t => {
  const f = await fixture(t);
  await f.post();
  await f.session(USER);
  assert.equal(f.$('#pack-success').hidden, false);
  assert.equal(f.$('#share-on-x').href, packShare(NEW).intentUrl);
});

test('an old public permalink loads anonymously and leaves the pagination cursor intact', async t => {
  const recent = Array.from({ length: 21 }, (_, index) => note(`40000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`));
  const old = note(OLD, 'An older pawprint.');
  const f = await fixture(t, { anonymous: true, search: `?note=${OLD}`, feed: recent, publicNotes: [[OLD, old]] });
  assert.equal(f.$('#linked-note-panel').hidden, false);
  assert.equal(f.$('#linked-note-content .comment-text').textContent, old.body);
  assert.equal(f.$('#auth-signed-out').hidden, false);
  assert.equal(f.state.reads.find(read => read.table === 'wooflab_comments').id, OLD);
  f.state.feed = [old];
  f.$('#load-more').click();
  await tick();
  const calls = f.state.rpcCalls.filter(call => call.name === 'wooflab_list_comments');
  assert.equal(calls[1].args.p_before_id, recent[19].id);
  assert.equal(f.doc.querySelectorAll(`#note-${OLD}`).length, 1);
  assert.equal(f.$('#comments-list').textContent.includes(old.body), false);
});

test('a removed linked post has an honest missing state while the normal feed remains usable', async t => {
  const f = await fixture(t, { anonymous: true, search: `?note=${OLD}`, feed: [note(NEW, 'A current note.')] });
  assert.match(f.$('#linked-note-status').textContent, /wandered off/);
  assert.equal(f.$('#linked-note-panel').getAttribute('aria-busy'), 'false');
  assert.equal(f.$('#retry-linked-note').hidden, true);
  assert.match(f.$('#comments-list').textContent, /A current note/);
});

test('malformed permalink input never reaches a comment lookup', async t => {
  const f = await fixture(t, { anonymous: true, search: '?note=javascript%3Aalert%281%29' });
  assert.match(f.$('#linked-note-status').textContent, /doesn’t look right/);
  assert.equal(f.state.reads.filter(read => read.table === 'wooflab_comments').length, 0);
});

test('a transient direct-link error offers retry and can recover', async t => {
  const f = await fixture(t, { anonymous: true, search: `?note=${OLD}` });
  f.state.lookupFailure = true;
  f.$('#refresh-notes').click();
  await tick();
  assert.match(f.$('#linked-note-status').textContent, /couldn’t load/);
  assert.equal(f.$('#retry-linked-note').hidden, false);
  f.state.lookupFailure = false;
  f.state.publicNotes.set(OLD, note(OLD, 'Recovered pawprint.'));
  f.$('#retry-linked-note').click();
  await tick();
  assert.equal(f.$('#retry-linked-note').hidden, true);
  assert.equal(f.$('#linked-note-content .comment-text').textContent, 'Recovered pawprint.');
});

test('linked visitor content and profile names are rendered as text', async t => {
  const unsafe = '<img src=x onerror=alert(1)>';
  const f = await fixture(t, { anonymous: true, search: `?note=${OLD}`, publicNotes: [[OLD, note(OLD, unsafe)]] });
  f.state.profiles.set(USER, { display_name: '<script>bad()</script>', avatar_url: 'javascript:alert(1)' });
  f.$('#refresh-notes').click();
  await tick();
  assert.equal(f.$('#linked-note-content .comment-text').textContent, unsafe);
  assert.equal(f.$('#linked-note-content .comment-name').textContent, '<script>bad()</script>');
  assert.equal(f.$('#linked-note-content').querySelectorAll('script,img').length, 0);
});

test('deleting a linked own note updates the missing state and cannot resurrect from stale feed data', async t => {
  const old = note(OLD, 'Remove this note.');
  const f = await fixture(t, { search: `?note=${OLD}`, feed: [old], publicNotes: [[OLD, old]] });
  f.$('#linked-note-content .delete-note').click();
  assert.equal(f.$('#delete-dialog').open, true);
  f.$('#confirm-delete').click();
  await tick();
  assert.match(f.$('#linked-note-status').textContent, /wandered off/);
  f.state.feed = [old];
  f.state.publicNotes.set(OLD, old);
  f.$('#refresh-notes').click();
  await tick();
  assert.equal(f.doc.querySelectorAll(`#note-${OLD}`).length, 0);
  assert.match(f.$('#linked-note-status').textContent, /wandered off/);
});

test('deleting the just-published note clears its share confirmation', async t => {
  const f = await fixture(t);
  await f.post();
  f.$('#comments-list .delete-note').click();
  f.$('#confirm-delete').click();
  await tick();
  assert.equal(f.$('#pack-success').hidden, true);
  assert.equal(f.$('#share-on-x').hasAttribute('href'), false);
  assert.match(f.$('#composer-status').textContent, /removed/);
});

test('a successful response without a usable ID does not fabricate a share URL or report a failed save', async t => {
  const f = await fixture(t, { postResult: { data: null, error: null } });
  await f.post();
  assert.equal(f.$('#pack-success').hidden, true);
  assert.equal(f.$('#share-on-x').hasAttribute('href'), false);
  assert.match(f.$('#composer-status').textContent, /is public, but its share link is unavailable/);
});

test('blank and anonymous submissions cannot produce a pack success state', async t => {
  const f = await fixture(t, { anonymous: true });
  await f.post('   ');
  await f.post('No session');
  assert.equal(f.state.rpcCalls.filter(call => call.name === 'wooflab_post_comment').length, 0);
  assert.equal(f.$('#pack-success').hidden, true);
});
