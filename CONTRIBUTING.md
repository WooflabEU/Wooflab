# Contributing to WoofLab

Thanks for taking an interest in the project. For a bug, include the page URL,
reproduction steps, expected result, and browser/device details. For a feature,
describe the problem it would solve before proposing an implementation.

## Develop a change

1. Fork the repository and create a branch for your change.
2. Install Node.js 22.18.0 or a supported newer version.
3. Run `npm ci`, then `npm run dev`.
4. For authenticated flows in a fork, configure your own Supabase and X apps
   using the [setup guide](docs/SETUP.md).
5. Before submitting, run:

   ```sh
   npm test
   npm run build
   npm run check
   ```

Keep `README.md` and the default `DEPLOYMENT.md` guide in English. Keep the
Finnish setup guide consistent with the English documentation. Prefer small
changes that fit the existing HTML, CSS, and vanilla
JavaScript structure. Include screenshots for visible layout changes.

## Guestbook and configuration

- Preserve database authorization and rate-limit checks when changing comments.
- Render user comments as text rather than HTML.
- Keep X profile data sourced from trusted authentication identities.
- Use publishable keys for browser configuration. Keep privileged credentials
  out of commits, screenshots, issues, and pull requests.
- Explain any required database migration or operator configuration in the PR.

Report security vulnerabilities using [SECURITY.md](SECURITY.md), rather than
including private user data or exploit details in a public issue.

## Scope and licensing

This repository currently has no open-source license for the project-specific
code or brand assets. Read the [third-party notices](THIRD_PARTY_NOTICES.md)
before reusing dependency code, fonts, or other licensed components.
