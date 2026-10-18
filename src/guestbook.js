import { getClient } from './client.js';
import { create as createElement, fillAvatar, friendlyError, toast } from './lib/ui.js';
import { safeXProfileUrl, validateComment } from './lib/validation.js';
import { isNoteId, noteRequest, noteUrl, packShare } from './lib/sharing.js';
import { getPublicNote } from './lib/public-note.js';

const PAGE_SIZE = 20;
export async function initGuestbook({ root = document, win = window, clientProvider = getClient, notify = toast } = {}) {
  const $ = selector => root.querySelector(selector);
  const create = (tag, className, text) => createElement(tag, className, text, root);
  const list = $('#comments-list');
  const feedStatus = $('#feed-status');
  const formStatus = $('#composer-status');
  const form = $('#comment-form');
  const textarea = $('#comment-body');
  const loadMore = $('#load-more');
  const refresh = $('#refresh-notes');
  const deleteDialog = $('#delete-dialog');
  const success = $('#pack-success');
  const linkedPanel = $('#linked-note-panel');
  const linkedContent = $('#linked-note-content');
  const linkedStatus = $('#linked-note-status');
  const linkedRetry = $('#retry-linked-note');
  const request = noteRequest(win.location.search);
  const deletedIds = new Set();
  let client;
  let user = null;
  let canPost = false;
  let isAdmin = false;
  let authGeneration = 0;
  let linkedGeneration = 0;
  let linkedNote = null;
  let loading = false;
  let feedLoaded = false;
  let queuedReset = false;
  let posting = false;
  let notes = [];
  let cursor = null;
  let pendingDelete = null;
  let published = null;

  function status(message, error = false) {
    formStatus.textContent = message;
    formStatus.dataset.error = String(error);
  }
  function showAuth(id) {
    for (const panel of ['auth-loading', 'auth-offline', 'auth-signed-out', 'auth-signed-in']) $(`#${panel}`).hidden = panel !== id;
  }
  function resetSuccess() {
    published = null;
    success.hidden = true;
    form.hidden = false;
    $('.composer-card').classList.remove('has-pack-success');
    $('#share-on-x').removeAttribute('href');
    $('#pack-share-preview').textContent = '';
    $('#pack-share-status').textContent = '';
    $('#pack-copy-label').hidden = true;
    $('#pack-copy-link').hidden = true;
    $('#pack-copy-link').value = '';
  }
  function showSuccess(id, authorId) {
    const share = packShare(id);
    published = { id: id.toLowerCase(), authorId, ...share };
    form.hidden = true;
    success.hidden = false;
    $('.composer-card').classList.add('has-pack-success');
    $('#share-on-x').href = share.intentUrl;
    $('#pack-share-preview').textContent = share.text;
    $('#pack-share-status').textContent = '';
    $('#pack-copy-label').hidden = true;
    $('#pack-copy-link').hidden = true;
    $('#pack-copy-link').value = share.url;
    $('#pack-success-title').focus();
  }
  function emptyState(title, text) {
    const node = create('div', 'empty-state');
    const svg = root.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = root.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '/icons.svg#paw');
    svg.setAttribute('aria-hidden', 'true');
    svg.append(use);
    node.append(svg, create('h3', '', title), create('p', '', text));
    list.replaceChildren(node);
  }
  function noteCard(note) {
    const card = create('article', 'comment-card');
    if (isNoteId(note.id)) card.id = `note-${note.id.toLowerCase()}`;
    const header = create('div', 'comment-head');
    const avatar = create('span', 'avatar');
    avatar.setAttribute('aria-hidden', 'true');
    fillAvatar(avatar, note);
    const person = create('div', 'comment-person');
    person.append(create('span', 'comment-name', note.display_name || 'X member'));
    const profileUrl = safeXProfileUrl(note.handle);
    if (profileUrl) {
      const link = create('a', 'comment-handle', `@${note.handle}`);
      link.href = profileUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      person.append(link);
    }
    const date = new Date(note.created_at);
    const validDate = !Number.isNaN(date.getTime());
    const time = create('time', '', validDate ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date) : 'Pawprint');
    if (validDate) { time.dateTime = date.toISOString(); time.title = date.toLocaleString(); }
    header.append(avatar, person);
    if (isNoteId(note.id)) {
      const permalink = create('a', 'note-permalink');
      permalink.href = noteUrl(note.id);
      permalink.title = 'Open this pawprint';
      permalink.append(time);
      header.append(permalink);
    } else header.append(time);
    // User content and profile fields are always rendered as text.
    card.append(header, create('p', 'comment-text', note.body));
    if (user && (user.id === note.author_id || isAdmin)) {
      const actions = create('div', 'comment-actions');
      const button = create('button', 'delete-note', isAdmin && user.id !== note.author_id ? 'Remove note' : 'Delete my note');
      button.type = 'button';
      button.addEventListener('click', () => { pendingDelete = note.id; deleteDialog.showModal(); });
      actions.append(button);
      card.append(actions);
    }
    return card;
  }
  function renderNotes() {
    if (linkedNote) {
      const card = noteCard(linkedNote);
      card.classList.add('linked-pawprint');
      card.tabIndex = -1;
      linkedContent.replaceChildren(card);
    } else linkedContent.replaceChildren();
    const visibleNotes = notes.filter(note => note.id !== linkedNote?.id);
    if (!visibleNotes.length) {
      if (!feedLoaded) { list.replaceChildren(); return; }
      if (linkedNote) emptyState('You’re all caught up.', 'New pawprints will appear here.');
      else emptyState('The first pawprint could be yours.', 'A little hello is a perfectly good place to start.');
      return;
    }
    const fragment = root.createDocumentFragment();
    visibleNotes.forEach(note => fragment.append(noteCard(note)));
    list.replaceChildren(fragment);
  }
  function linkedMessage(message, retry = false) {
    linkedPanel.hidden = false;
    linkedPanel.setAttribute('aria-busy', 'false');
    linkedStatus.textContent = message;
    linkedRetry.hidden = !retry;
  }
  async function loadLinkedNote() {
    if (!request.present) return;
    const generation = ++linkedGeneration;
    linkedNote = null;
    if (client) renderNotes();
    if (!request.id) { linkedMessage('This pawprint link doesn’t look right. Browse all pawprints instead.'); return; }
    if (!client) { linkedMessage('This pawprint couldn’t load just now. Please try again later.'); return; }
    linkedMessage('Fetching this pawprint…');
    linkedPanel.setAttribute('aria-busy', 'true');
    try {
      const note = await getPublicNote(client, request.id);
      if (generation !== linkedGeneration) return;
      if (!note || deletedIds.has(request.id)) {
        linkedMessage('This pawprint has wandered off. It may have been removed.');
      } else {
        linkedNote = note;
        linkedMessage('');
      }
      renderNotes();
      if (linkedNote && (!root.activeElement || root.activeElement === root.body)) {
        linkedPanel.scrollIntoView?.({ block: 'start', behavior: 'auto' });
        linkedContent.querySelector('article')?.focus({ preventScroll: true });
      }
    } catch {
      if (generation === linkedGeneration) linkedMessage('This pawprint couldn’t load just now. Try again in a moment.', true);
    }
  }
  async function loadNotes(reset = false) {
    if (loading) { if (reset) queuedReset = true; return; }
    loading = true;
    loadMore.disabled = true;
    refresh.disabled = true;
    list.setAttribute('aria-busy', 'true');
    feedStatus.textContent = reset ? 'Fetching the latest pawprints…' : 'Fetching more notes…';
    const before = reset ? null : cursor;
    try {
      const { data, error } = await client.rpc('wooflab_list_comments', {
        p_before_created_at: before?.created_at || null, p_before_id: before?.id || null, p_limit: PAGE_SIZE + 1,
      });
      if (error || !Array.isArray(data)) throw error || new Error('Unexpected notes response.');
      const page = data.slice(0, PAGE_SIZE);
      const merged = reset ? page : [...notes, ...page];
      notes = [...new Map(merged.filter(note => !deletedIds.has(note.id)).map(note => [note.id, note])).values()];
      if (page.length) cursor = page.at(-1);
      if (reset && !page.length) cursor = null;
      loadMore.hidden = data.length <= PAGE_SIZE;
      feedLoaded = true;
      renderNotes();
      feedStatus.textContent = '';
    } catch {
      feedStatus.textContent = 'The notes couldn’t load just now. Please try Refresh in a moment.';
    } finally {
      loading = false;
      loadMore.disabled = false;
      refresh.disabled = false;
      list.setAttribute('aria-busy', 'false');
      if (queuedReset) { queuedReset = false; queueMicrotask(() => loadNotes(true)); }
    }
  }
  async function refreshAuth(session) {
    const generation = ++authGeneration;
    user = session?.user || null;
    canPost = false;
    isAdmin = false;
    if (published && published.authorId !== user?.id) resetSuccess();
    if (!user) { showAuth('auth-signed-out'); renderNotes(); return; }
    const id = user.id;
    const [profileResult, adminResult] = await Promise.allSettled([
      client.from('wooflab_profiles').select('display_name,handle,avatar_url').eq('id', id).maybeSingle(),
      client.rpc('wooflab_is_admin'),
    ]);
    if (generation !== authGeneration) return;
    const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null;
    isAdmin = adminResult.status === 'fulfilled' && adminResult.value.data === true;
    if (!profile) {
      resetSuccess(); showAuth('auth-signed-out'); renderNotes();
      status('Please sign in with X to leave a note.', true); return;
    }
    canPost = true;
    fillAvatar($('#current-avatar'), profile);
    $('#current-name').textContent = profile.display_name;
    $('#current-handle').textContent = profile.handle ? `@${profile.handle}` : 'Signed in with X';
    $('#admin-notice').hidden = !isAdmin;
    showAuth('auth-signed-in'); renderNotes(); status('');
  }

  try { client = await clientProvider(); } catch { client = null; }
  if (!client) {
    showAuth('auth-offline'); feedStatus.textContent = ''; list.setAttribute('aria-busy', 'false'); refresh.hidden = true;
    emptyState('A fresh page for future pawprints.', 'The guestbook will open soon. In the meantime, have a look around the lab.');
    await loadLinkedNote();
    return;
  }
  $('#sign-in').addEventListener('click', async () => {
    const button = $('#sign-in'); button.disabled = true; status('Taking you to X…');
    try {
      const { error } = await client.auth.signInWithOAuth({ provider: 'x', options: { redirectTo: new URL('/auth/callback/', win.location.origin).href } });
      if (error) throw error;
    } catch { status('X sign-in couldn’t start. Please try again in a moment.', true); button.disabled = false; }
  });
  $('#sign-out').addEventListener('click', async () => {
    $('#sign-out').disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' }); if (error) throw error;
      await refreshAuth(null); textarea.value = ''; $('#comment-count').textContent = '0 / 1000';
      status('Signed out. Your public notes stay in the guestbook.');
    } catch { status('Sign-out didn’t finish. Please try again.', true); }
    finally { $('#sign-out').disabled = false; }
  });
  textarea.addEventListener('input', () => { $('#comment-count').textContent = `${textarea.value.length} / 1000`; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (posting || !success.hidden) return;
    const checked = validateComment(textarea.value);
    if (checked.error) { status(checked.error, true); textarea.focus(); return; }
    if (!user || !canPost) { status('Sign in with X before leaving a note.', true); return; }
    const authorId = user.id;
    const submittedDraft = textarea.value;
    posting = true;
    $('#post-comment').disabled = true;
    status('Leaving your pawprint…');
    try {
      const { data: id, error } = await client.rpc('wooflab_post_comment', { p_body: checked.content });
      if (error) throw error;
      if (user?.id === authorId) {
        if (textarea.value === submittedDraft) { textarea.value = ''; $('#comment-count').textContent = '0 / 1000'; }
        if (isNoteId(id)) {
          showSuccess(id, authorId);
          status('Your pawprint is public. Welcome to the pack!');
        } else {
          status('Your pawprint is public, but its share link is unavailable. Try Refresh to find your note.');
        }
        notify('Pawprint left. Byte approves.');
      }
      await loadNotes(true);
    } catch (error) {
      if (user?.id === authorId) status(friendlyError(error), true);
    } finally {
      posting = false;
      $('#post-comment').disabled = false;
    }
  });
  $('#write-another-note').addEventListener('click', () => {
    resetSuccess(); status(''); textarea.focus();
  });
  $('#copy-pawprint-link').addEventListener('click', async () => {
    const current = published;
    if (!current) return;
    try {
      if (!win.navigator.clipboard?.writeText) throw new Error('Clipboard unavailable.');
      await win.navigator.clipboard.writeText(current.url);
      if (published === current) $('#pack-share-status').textContent = 'Link copied. Woof!';
    } catch {
      if (published !== current) return;
      $('#pack-copy-label').hidden = false;
      const input = $('#pack-copy-link');
      input.hidden = false; input.value = current.url; input.focus(); input.select();
      $('#pack-share-status').textContent = 'Select and copy your public link above.';
    }
  });
  refresh.addEventListener('click', () => { loadNotes(true); if (request.present) loadLinkedNote(); });
  loadMore.addEventListener('click', () => loadNotes(false));
  linkedRetry.addEventListener('click', loadLinkedNote);
  $('[data-cancel-delete]').addEventListener('click', () => deleteDialog.close());
  deleteDialog.addEventListener('close', () => { pendingDelete = null; });
  $('#confirm-delete').addEventListener('click', async () => {
    if (!pendingDelete) return;
    const id = pendingDelete; $('#confirm-delete').disabled = true;
    try {
      const { data, error } = await client.from('wooflab_comments').delete().eq('id', id).select('id');
      if (error || !data?.length) throw error || new Error('not_allowed');
      deletedIds.add(id);
      notes = notes.filter(note => note.id !== id);
      if (request.id === id) { linkedGeneration++; linkedNote = null; linkedMessage('This pawprint has wandered off. It may have been removed.'); }
      if (published?.id === id) { resetSuccess(); status('Your pawprint was removed.'); }
      renderNotes(); deleteDialog.close(); notify('Pawprint removed.');
    } catch { notify('This note couldn’t be removed. Please check your sign-in and try again.'); }
    finally { $('#confirm-delete').disabled = false; }
  });
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    // Supabase requests run outside its synchronous auth-state callback.
    queueMicrotask(() => { refreshAuth(session).catch(() => status('Please sign in again to continue.', true)); });
  });
  win.addEventListener('pagehide', event => { if (!event.persisted) subscription.unsubscribe(); });
  await Promise.all([loadNotes(true), loadLinkedNote()]);
}
