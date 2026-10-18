import { getClient } from './client.js';
import { create, fillAvatar, friendlyError, toast } from './lib/ui.js';
import { safeXProfileUrl, validateComment } from './lib/validation.js';

const PAGE_SIZE = 20;
export async function initGuestbook() {
  const $ = selector => document.querySelector(selector);
  const list = $('#comments-list');
  const feedStatus = $('#feed-status');
  const formStatus = $('#composer-status');
  const textarea = $('#comment-body');
  const loadMore = $('#load-more');
  const refresh = $('#refresh-notes');
  const deleteDialog = $('#delete-dialog');
  let client;
  let user = null;
  let isAdmin = false;
  let authGeneration = 0;
  let loading = false;
  let queuedReset = false;
  let notes = [];
  let cursor = null;
  let pendingDelete = null;

  function status(message, error = false) {
    formStatus.textContent = message;
    formStatus.dataset.error = String(error);
  }
  function showAuth(id) {
    for (const panel of ['auth-loading','auth-offline','auth-signed-out','auth-signed-in']) $( `#${panel}`).hidden = panel !== id;
  }
  function emptyState(title, text) {
    const node = create('div', 'empty-state');
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg','use');
    use.setAttribute('href','/icons.svg#paw'); svg.setAttribute('aria-hidden','true'); svg.append(use);
    node.append(svg,create('h3','',title),create('p','',text));
    list.replaceChildren(node);
  }
  function renderNotes() {
    if (!notes.length) {
      emptyState('The first pawprint could be yours.', 'A little hello is a perfectly good place to start.');
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const note of notes) {
      const card = create('article','comment-card');
      const header = create('div','comment-head');
      const avatar = create('span','avatar'); avatar.setAttribute('aria-hidden','true'); fillAvatar(avatar,note);
      const person = create('div','comment-person');
      person.append(create('span','comment-name',note.display_name || 'X member'));
      const profileUrl = safeXProfileUrl(note.handle);
      if (profileUrl) {
        const link = create('a','comment-handle',`@${note.handle}`);
        link.href = profileUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; person.append(link);
      }
      const date = new Date(note.created_at);
      const time = create('time','',new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(date));
      time.dateTime = date.toISOString(); time.title = date.toLocaleString();
      header.append(avatar,person,time);
      // Every piece of comment/profile text uses textContent. No HTML is rendered.
      card.append(header,create('p','comment-text',note.body));
      if (user && (user.id === note.author_id || isAdmin)) {
        const actions = create('div','comment-actions');
        const button = create('button','delete-note',isAdmin && user.id !== note.author_id ? 'Remove note' : 'Delete my note');
        button.type = 'button';
        button.addEventListener('click', () => { pendingDelete = note.id; deleteDialog.showModal(); });
        actions.append(button); card.append(actions);
      }
      fragment.append(card);
    }
    list.replaceChildren(fragment);
  }

  async function loadNotes(reset = false) {
    if (loading) { if (reset) queuedReset = true; return; }
    loading = true; loadMore.disabled = true; refresh.disabled = true;
    list.setAttribute('aria-busy','true'); feedStatus.textContent = reset ? 'Fetching the latest pawprints…' : 'Fetching more notes…';
    const before = reset ? null : cursor;
    try {
      const { data, error } = await client.rpc('wooflab_list_comments', {
        p_before_created_at: before?.created_at || null, p_before_id: before?.id || null, p_limit: PAGE_SIZE + 1,
      });
      if (error) throw error;
      const page = data.slice(0,PAGE_SIZE);
      const merged = reset ? page : [...notes,...page];
      notes = [...new Map(merged.map(note => [note.id,note])).values()];
      if (page.length) cursor = page.at(-1);
      if (reset && !page.length) cursor = null;
      loadMore.hidden = data.length <= PAGE_SIZE;
      renderNotes(); feedStatus.textContent = '';
    } catch {
      feedStatus.textContent = 'The notes couldn’t load just now. Please try Refresh in a moment.';
    } finally {
      loading = false; loadMore.disabled = false; refresh.disabled = false; list.setAttribute('aria-busy','false');
      if (queuedReset) { queuedReset = false; queueMicrotask(() => loadNotes(true)); }
    }
  }

  async function refreshAuth(session) {
    const generation = ++authGeneration;
    user = session?.user || null; isAdmin = false;
    if (!user) {
      showAuth('auth-signed-out'); renderNotes(); return;
    }
    const id = user.id;
    const [profileResult,adminResult] = await Promise.allSettled([
      client.from('wooflab_profiles').select('display_name,handle,avatar_url').eq('id',id).maybeSingle(),
      client.rpc('wooflab_is_admin'),
    ]);
    if (generation !== authGeneration) return;
    const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null;
    isAdmin = adminResult.status === 'fulfilled' && adminResult.value.data === true;
    if (!profile) {
      showAuth('auth-signed-out'); renderNotes();
      status('Please sign in with X to leave a note.', true); return;
    }
    fillAvatar($('#current-avatar'),profile);
    $('#current-name').textContent = profile.display_name;
    $('#current-handle').textContent = profile.handle ? `@${profile.handle}` : 'Signed in with X';
    $('#admin-notice').hidden = !isAdmin;
    showAuth('auth-signed-in'); renderNotes(); status('');
  }

  try { client = await getClient(); } catch { client = null; }
  if (!client) {
    showAuth('auth-offline'); feedStatus.textContent = ''; list.setAttribute('aria-busy','false'); refresh.hidden = true;
    emptyState('A fresh page for future pawprints.', 'The guestbook will open soon. In the meantime, have a look around the lab.');
    return;
  }

  $('#sign-in').addEventListener('click', async () => {
    const button = $('#sign-in'); button.disabled = true; status('Taking you to X…');
    try {
      const { error } = await client.auth.signInWithOAuth({ provider:'x', options:{ redirectTo:new URL('/auth/callback/',window.location.origin).href } });
      if (error) throw error;
    } catch { status('X sign-in couldn’t start. Please try again in a moment.',true); button.disabled = false; }
  });
  $('#sign-out').addEventListener('click', async () => {
    $('#sign-out').disabled = true;
    try {
      const { error } = await client.auth.signOut({scope:'local'}); if (error) throw error;
      await refreshAuth(null); textarea.value = ''; $('#comment-count').textContent = '0 / 1000';
      status('Signed out. Your public notes stay in the guestbook.');
    } catch { status('Sign-out didn’t finish. Please try again.',true); }
    finally { $('#sign-out').disabled = false; }
  });
  textarea.addEventListener('input', () => { $('#comment-count').textContent = `${textarea.value.length} / 1000`; });
  $('#comment-form').addEventListener('submit', async event => {
    event.preventDefault();
    const checked = validateComment(textarea.value);
    if (checked.error) { status(checked.error,true); textarea.focus(); return; }
    if (!user) { status('Sign in with X before leaving a note.',true); return; }
    $('#post-comment').disabled = true; status('Leaving your pawprint…');
    try {
      const { error } = await client.rpc('wooflab_post_comment',{p_body:checked.content});
      if (error) throw error;
      textarea.value = ''; $('#comment-count').textContent = '0 / 1000';
      status('Your pawprint is public. Thanks for stopping by.'); toast('Pawprint left. Byte approves.');
      await loadNotes(true);
    } catch (error) { status(friendlyError(error),true); }
    finally { $('#post-comment').disabled = false; }
  });
  refresh.addEventListener('click', () => loadNotes(true));
  loadMore.addEventListener('click', () => loadNotes(false));
  $('[data-cancel-delete]').addEventListener('click', () => deleteDialog.close());
  deleteDialog.addEventListener('close', () => { pendingDelete = null; });
  $('#confirm-delete').addEventListener('click', async () => {
    if (!pendingDelete) return;
    const id = pendingDelete; $('#confirm-delete').disabled = true;
    try {
      const { data,error } = await client.from('wooflab_comments').delete().eq('id',id).select('id');
      if (error || !data?.length) throw error || new Error('not_allowed');
      notes = notes.filter(note => note.id !== id); renderNotes(); deleteDialog.close(); toast('Pawprint removed.');
    } catch { toast('This note couldn’t be removed. Please check your sign-in and try again.'); }
    finally { $('#confirm-delete').disabled = false; }
  });
  const { data:{ subscription } } = client.auth.onAuthStateChange((_event,session) => {
    // Avoid making Supabase calls inside its synchronous auth-state callback.
    queueMicrotask(() => { refreshAuth(session).catch(() => status('Please sign in again to continue.',true)); });
  });
  window.addEventListener('pagehide', event => { if (!event.persisted) subscription.unsubscribe(); });
  await loadNotes(true);
}
