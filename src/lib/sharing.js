const NOTE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isNoteId(value) {
  return typeof value === 'string' && NOTE_ID.test(value);
}

export function noteRequest(search) {
  const params = new URLSearchParams(search);
  const values = params.getAll('note');
  return {
    present: params.has('note'),
    id: values.length === 1 && isNoteId(values[0]) ? values[0].toLowerCase() : null,
  };
}

export function noteUrl(id) {
  if (!isNoteId(id)) throw new Error('A valid pawprint ID is required.');
  const url = new URL('/guestbook/', 'https://wooflab.eu');
  url.searchParams.set('note', id.toLowerCase());
  return url.href;
}

export function packShare(id) {
  const url = noteUrl(id);
  const text = `I just joined the Woof pack!\n\n${url}\n\nWoof woof!`;
  const intent = new URL('https://x.com/intent/tweet');
  // A single text parameter preserves the link's position and the blank lines.
  intent.searchParams.set('text', text);
  return Object.freeze({ url, text, intentUrl: intent.href });
}
