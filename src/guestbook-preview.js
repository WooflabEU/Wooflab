import { getClient } from './client.js';

function state(container, text) {
  const p = container.ownerDocument.createElement('p');
  p.className = 'preview-state';
  p.textContent = text;
  container.replaceChildren(p);
}

export async function loadGuestbookPreview(container, clientProvider = getClient) {
  container.setAttribute('aria-busy', 'true');
  try {
    const client = await clientProvider();
    if (!client) {
      state(container, 'The guestbook is opening soon. Byte is getting the welcome mat ready.');
      return;
    }
    const { data, error } = await client.rpc('wooflab_list_comments', {
      p_before_created_at: null, p_before_id: null, p_limit: 3,
    });
    if (error || !Array.isArray(data)) throw error || new Error('Unexpected response');
    if (!data.length) {
      state(container, 'The first pawprint could be yours. A little hello is a good place to start.');
      return;
    }
    const doc = container.ownerDocument;
    const fragment = doc.createDocumentFragment();
    for (const note of data.slice(0, 3)) {
      const article = doc.createElement('article');
      article.className = 'preview-note';
      const heading = doc.createElement('div');
      heading.className = 'preview-note-heading';
      const author = doc.createElement('span');
      author.className = 'preview-note-author';
      author.textContent = note.display_name || 'X member';
      heading.append(author);
      const date = new Date(note.created_at);
      if (!Number.isNaN(date.getTime())) {
        const time = doc.createElement('time');
        time.dateTime = date.toISOString();
        time.textContent = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
        heading.append(time);
      }
      const body = doc.createElement('p');
      body.className = 'preview-note-body';
      body.textContent = note.body || '';
      article.append(heading, body);
      fragment.append(article);
    }
    container.replaceChildren(fragment);
  } catch {
    state(container, 'The latest notes are taking a little break. Open the guestbook to try again.');
  } finally {
    container.setAttribute('aria-busy', 'false');
  }
}
