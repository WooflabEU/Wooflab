import { isNoteId } from './sharing.js';

/** Read an older public note independently of the paginated guestbook feed. */
export async function getPublicNote(client, id) {
  if (!isNoteId(id)) throw new Error('Invalid pawprint link.');
  const { data: note, error } = await client.from('wooflab_comments')
    .select('id,author_id,body,created_at').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!note) return null;
  if (note.id?.toLowerCase() !== id.toLowerCase()) throw new Error('Unexpected pawprint response.');
  const { data: profile, error: profileError } = await client.from('wooflab_profiles')
    .select('display_name,handle,avatar_url').eq('id', note.author_id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;
  return { ...note, ...profile, id: note.id.toLowerCase() };
}
