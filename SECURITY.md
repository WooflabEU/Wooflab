# Security

## Report a vulnerability

For a suspected vulnerability, use GitHub's **Security → Advisories → Report a
vulnerability** option if it is available on this repository. If private
reporting is unavailable, open an issue asking for a private reporting channel
without publishing reproduction details, credentials, or personal data.

Include the affected page or component, a minimal reproduction, the expected
impact, and the commit or version you tested. Please use your own accounts and
test data when reproducing an issue.

## Public configuration and credentials

The Supabase project URL and publishable key in browser configuration are
public by design. Database grants, row-level security policies, trusted X
identities, and database functions control guestbook access.

Supabase secret/service-role keys, X Client Secrets, database passwords, and
personal access tokens are privileged credentials. They must not appear in
browser files, `VITE_` variables, Git history, or public reports. X OAuth
credentials are configured in Supabase Auth.

## Project checks

The existing database tests exercise public reads, authenticated writes,
comment ownership, moderation, and posting limits in an isolated PGlite
database. Production configuration validation rejects recognizable privileged
Supabase keys. These checks do not replace testing the real OAuth flow or
reviewing a production Supabase project's configuration.
