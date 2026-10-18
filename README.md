# WooflabEU

<img src="public/brand/wooflabeu-logo.svg" alt="WooflabEU" width="360">

**Small paws. Big ideas.**

A little workshop for useful tools, curious experiments, and Byte: a fictional
dog with a weakness for snacks and a habit of sitting on the keyboard.

[Visit wooflab.eu](https://wooflab.eu) ·
[Sign the guestbook](https://wooflab.eu/guestbook/) ·
[Deploy (English)](DEPLOYMENT.md) ·
[Setup (English)](docs/SETUP.md) ·
[Ohjeet suomeksi](docs/SETUP.fi.md) ·
[Logo and brand assets](docs/BRANDING.md) ·
[Apply this update](UPDATE.md) ·
[Slideshow guide](docs/SLIDESHOW.md)

[![CI](https://github.com/wooflabEU/wooflab/actions/workflows/ci.yml/badge.svg)](https://github.com/wooflabEU/wooflab/actions/workflows/ci.yml)

![Byte working at a laptop with a WoofLab sticker](public/images/byte-coding-560.webp)

## What's here

- A five-scene, scroll-driven slideshow with minimal English copy and Byte artwork.
- Motion on/off control, reduced-motion support, native scrolling, and direct scene links.
- A shared ink-and-lime theme across the guestbook, privacy, house rules,
  authentication callback, 404 page, header, footer, forms, and dialogs.
- **Focus Fetch:** a small focus timer with start, pause, and reset controls.
- **Idea Fetch:** a generator for the next small thing to make.
- A public guestbook with X OAuth 2.0 sign-in through Supabase.
- Responsive WebP illustrations, self-hosted fonts, and static HTML pages.

Everyone can read guestbook comments. Signed-in X users can post and remove
their own comments; an administrator can moderate all comments. Posting is
limited to one comment every 30 seconds per account in the database.

## Stack

| Part | Technology |
| --- | --- |
| Website | Vite, HTML, CSS, and vanilla JavaScript |
| Animation | Self-hosted GSAP ScrollTrigger, loaded only on the homepage |
| Hosting | Cloudflare Pages, deployed from GitHub |
| Authentication | Supabase Auth with the X OAuth 2.0 provider |
| Guestbook | Supabase Postgres, RLS policies, and database functions |
| Tests | Node.js test runner, JSDOM, and PGlite |

The site builds into static files. Database access and authentication are
handled by Supabase; no Pages Functions or Cloudflare D1 database is required.

## Run locally

Use Node.js 22.18.0 or a supported newer version, with npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.
For a fork or a separate deployment, configure your own Supabase project before
testing authenticated guestbook flows. See the [setup guide](docs/SETUP.md).

## Validate and build

```sh
npm test
npm run build
npm run check
```

- Tests cover the small tools, public configuration, and guestbook permissions
  against an isolated PGlite database.
- The build writes the production site to `dist/`.
- The project check verifies the generated pages, local links, image files,
  public configuration, and guestbook text rendering.

GitHub Actions runs these checks for pushes to `master` or `main`, and pull requests.

## Deploy

Start with [DEPLOYMENT.md](DEPLOYMENT.md), the repository's default deployment
guide in English. It covers the GitHub → Cloudflare Pages workflow, public
configuration, custom domains, X callback URLs, and deployment troubleshooting.

Connect this repository to **Cloudflare Pages** with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `master` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Repository root |

The Pages project name must match `name` in `wrangler.jsonc`.
Cloudflare builds and deploys new commits pushed to `master`.
To apply this export to the existing repository, follow
[Update the existing master branch](UPDATE.md).
For detailed database and authentication configuration, see the
[English setup guide](docs/SETUP.md). A [Finnish version](docs/SETUP.fi.md)
is available as an alternative.

## Public configuration

`public/site-config.json` contains browser-visible settings. The Supabase URL
and **publishable key** are intentionally public; access is controlled by the
database grants, RLS policies, and authentication checks.

Keep Supabase secret/service-role keys and the X Client Secret out of this
repository and out of `VITE_` variables. X credentials belong in the Supabase
provider settings. See [SECURITY.md](SECURITY.md) for reporting a vulnerability.

## Project map

```text
index.html                 Five fullscreen scenes and tool dialogs
guestbook/                 Public guestbook page
auth/callback/             Authentication callback page
privacy/ and terms/        Privacy information and guestbook rules
src/                       Styles, page scripts, and shared partials
public/                    Images, icons, fonts, headers, and public settings
supabase/migrations/       Database tables, permissions, and functions
test/                      Tools, slideshow, comment preview, and database tests
scripts/                   Production-build checks
DEPLOYMENT.md              Default deployment guide in English
docs/                      English and Finnish setup guides
```

## Contributing and licenses

Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change.
Third-party notices and included dependency licenses are listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The organization avatar and website logo use the geometric W mark. See
[Brand assets](docs/BRANDING.md) for files and GitHub upload instructions.

No open-source license has been selected for the WoofLab-specific code,
character, or artwork. Byte is fictional; the character illustrations were
generated for this project.
