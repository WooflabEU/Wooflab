# Woof pack sharing and public pawprint links

After a successful guestbook post, the composer shows **You’re in the Woof
pack!**, a preview of the share message, and three actions:

| Action | Behavior |
| --- | --- |
| Share on X | Opens the X composer with the prepared message |
| Copy link | Copies the note's public URL, with a selectable field if clipboard access is unavailable |
| Write another note | Returns to the form without discarding a draft edited during the previous save |

The message is exactly:

```text
I just joined the Woof pack!

https://wooflab.eu/guestbook/?note=<post-id>

Woof woof!
```

The real saved UUID replaces `<post-id>`. The entire message is encoded in the
X Web Intent's `text` parameter, preserving the link position and blank lines.
The visitor reviews and publishes the X post themselves. The website confirms
the saved guestbook post; it does not treat opening the X composer as proof of
an X publication.

## Direct links

`/guestbook/?note=<uuid>` loads the requested public note independently of the
paginated feed. It works for older notes and signed-out visitors. The requested
note is highlighted above the feed, with no duplicate card or changed pagination
cursor. Comment timestamps also link to each note's public URL.

Removed notes show **This pawprint has wandered off.** Malformed IDs are rejected
before a database query. Connection errors show a separate retry state instead
of claiming that a note was deleted. Visitor text is always rendered as text.

## Files

- `src/guestbook.js`: confirmation, account-state handling, copying and linked-note UI.
- `src/lib/sharing.js`: UUID validation, canonical public URLs and exact share text.
- `src/lib/public-note.js`: public note/profile reads using existing permissions.
- `guestbook/index.html`: success and linked-note panels.
- `src/styles.css`: shared dark-theme styles for the new states.

Public share links always use `https://wooflab.eu`, including when the site is
tested locally. Change the canonical base in `sharing.js` for a separate fork.

## Database and authentication

No new migration, tables, credentials or X posting permissions are needed for
this update. The existing `wooflab_post_comment` function returns the saved UUID.
Direct links use the public SELECT permissions already included in
`supabase/migrations/001_guestbook.sql`. X sign-in and server-enforced posting,
deletion and rate-limit rules continue to apply.

Signing out or changing accounts clears the previous account's share card. A
late save response cannot claim success for a different signed-in account.

## Verification

Version 1.2.0 passed 56 automated tests, the production build and generated-page
checks. Coverage includes delayed saves, rejected writes, exact X message
encoding, clipboard denial, account changes, old public links, pagination,
safe visitor-text rendering and deleted-note handling.

Interactive browser rendering and completion of the X composer were not
verified in the delivery environment. Check the guestbook on desktop and mobile
and open a shared link while signed out before publishing.

## References

- [X Web Intents](https://docs.x.com/x-for-websites/web-intents/overview)
- [X Post button](https://docs.x.com/x-for-websites/post-button/overview)
