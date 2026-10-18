# Setup and deployment

[Deployment guide (English, default)](../DEPLOYMENT.md) ·
[Back to the project](../README.md) · [Ohjeet suomeksi](SETUP.fi.md)

Production website: [wooflab.eu](https://wooflab.eu).
Source repository: [wooflabEU/wooflab](https://github.com/wooflabEU/wooflab).

These instructions also cover setting up an independent fork. Use your own
domain, Supabase project, and X application for a separate deployment.

## 1. Local development

Use Node.js 22.18.0 or a supported newer version; the project requires at least
22.12.0. Run these commands from the directory containing `package.json`:

```sh
npm ci
npm run dev
```

Vite normally serves the site at `http://localhost:5173`.

```sh
npm test
npm run build
npm run check
npm run preview
```

The tests use a local PGlite database and do not contact the production
Supabase project. `npm run check` requires an existing production build.

## 2. Supabase database

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
   The Free plan is an option for a small deployment; check its current limits
   and inactivity policy in the [pricing information](https://supabase.com/pricing).
2. Open **SQL Editor**, create a query, and run the complete contents of
   [001_guestbook.sql](../supabase/migrations/001_guestbook.sql).
3. The migration creates profiles, comments, private administrator and rate-limit
   tables, grants, RLS policies, and the guestbook functions. It can be re-run.
4. Open the project's **Connect** dialog to copy the project URL and a
   **publishable key**. Keys are also available under **Settings → API Keys**.

Apply the migration before testing comments. Adding the frontend configuration
does not create database tables or grant access by itself.

## 3. X OAuth 2.0

The application uses Supabase's **X / Twitter (OAuth 2.0)** provider (`x`).

1. In Supabase, open **Authentication → Sign In / Providers →
   X / Twitter (OAuth 2.0)** and copy the callback URL shown there.
2. Create or open your app in the [X Developer Portal](https://developer.x.com/).
3. Open **User authentication settings** and configure a **Web App** using
   OAuth 2.0. Enable **Request email from users**, as required by the Supabase
   integration. Email addresses are not displayed in the guestbook.
4. Set the X app's callback URL to the address copied from Supabase:

   ```text
   https://YOUR-PROJECT.supabase.co/auth/v1/callback
   ```

5. For the WoofLab deployment, configure these other app URLs:

   | Setting | URL |
   | --- | --- |
   | Website | `https://wooflab.eu` |
   | Terms of service | `https://wooflab.eu/terms/` |
   | Privacy policy | `https://wooflab.eu/privacy/` |

6. Copy the **OAuth 2.0 Client ID** and **Client Secret** into Supabase's X
   provider settings, enable the provider, and save.
7. In Supabase's **Authentication → URL Configuration**, set:

   | Setting | URL |
   | --- | --- |
   | Site URL | `https://wooflab.eu` |
   | Allowed redirect URL | `https://wooflab.eu/auth/callback/` |
   | Optional local redirect URL | `http://localhost:5173/auth/callback/` |

X returns users to Supabase's `/auth/v1/callback`. Supabase returns them to the
website's `/auth/callback/`. These are two distinct addresses.

For authentication on a Pages preview, explicitly allow that preview's exact
callback URL in Supabase. Use the production domain when testing production
sign-in. X access requirements and any API charges are separate from Supabase.

## 4. Website configuration

Configure [public/site-config.json](../public/site-config.json):

```json
{
  "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
  "supabasePublishableKey": "sb_publishable_YOUR_PUBLIC_KEY",
  "contactEmail": "",
  "operatorName": "WoofLab"
}
```

Use your real contact email and appropriate operator name for your deployment.
The contact address is displayed in the footer and privacy page when provided.
Keep the privacy information consistent with the services and data you use.

For an existing deployment, preserve its configured values when updating the
project. The build copies this file to `dist/site-config.json`.

Alternatively, these public build-time variables override the corresponding
JSON values:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `VITE_CONTACT_EMAIL` | Public contact email |

Use only browser-safe values here. Supabase secret/service-role keys belong in
trusted backend services; the X Client Secret belongs in Supabase's provider
configuration. The build rejects recognizable privileged Supabase keys.

## 5. GitHub → Cloudflare Pages

1. Push the source files to your GitHub repository with a `main` branch.
2. In Cloudflare, open **Workers & Pages → Create application → Pages →
   Connect to Git**. Choose GitHub and authorize the repository.
3. Set the Pages project name to the `name` value in
   [wrangler.jsonc](../wrangler.jsonc).
4. Use these build settings:

   | Setting | Value |
   | --- | --- |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | Repository root, where `package.json` is located |

5. Save and deploy. Check the homepage at the resulting `pages.dev` URL.
6. Open **Custom domains** and add your domain. For the apex domain to use
   Pages, its DNS zone must be on the same Cloudflare account and use the
   assigned Cloudflare nameservers. If a domain is attached to an older Pages
   project, move that domain association to the new project after it builds.
7. Test the guestbook on the final HTTPS domain.

The successful Pages setup asks for a **build output directory**. A deployment
log running `npx wrangler deploy` is a Workers Builds configuration; return to
the Pages setup for this repository. No Worker entry-point script is needed.

GitHub Actions validates the project, while Cloudflare's Git integration builds
and deploys it separately. The CI workflow is not a deployment gate.

A Direct Upload Pages project cannot be converted into a Git-integrated
project. Create a new Pages project when changing between those workflows.

For an intentionally manual Pages deployment, the repository also includes
`pages:login`, `pages:create`, and `deploy` npm scripts. The `deploy` script
targets the Pages project named `wooflab`; adjust that target if using another
project name. Git-integrated deployment does not use this script.

## 6. Guestbook administrator

Sign in to the website with your own X account once. In Supabase SQL Editor:

```sql
select id, handle, display_name
from public.wooflab_profiles;
```

Find your own profile and use its UUID in this query:

```sql
insert into wooflab_private.admins (user_id)
values ('YOUR-SUPABASE-USER-UUID')
on conflict (user_id) do nothing;
```

Refresh the guestbook. An administrator can remove other users' comments.
Only grant administrator access to accounts you control or explicitly trust.

## 7. Verify a deployment

- Open the homepage and menu on desktop and mobile.
- Try starting, pausing, and resetting Focus Fetch; generate an Idea Fetch idea.
- Read the guestbook while signed out.
- Sign in with X, post a comment, and confirm it remains visible after sign-out.
- Sign back in and delete your own comment; verify administrator moderation
  with the administrator account.
- Open `/guestbook/`, `/privacy/`, `/terms/`, and `/auth/callback/` directly.

Comments are public immediately. The database limits comments to 1–1,000
characters and one post per 30 seconds per user. Signing out leaves comments
in place. Removing a user from Supabase Auth cascades to that user's profile,
comments, and private rate-limit state.

## Official references

- [Supabase X OAuth 2.0](https://supabase.com/docs/guides/auth/social-login/auth-twitter)
- [Supabase API keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
