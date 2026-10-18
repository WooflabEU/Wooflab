# Deploy WoofLab to Cloudflare Pages

This is the default deployment guide for the repository. Documentation is in
English; a [Finnish setup guide](docs/SETUP.fi.md) is also available.

[Project overview](README.md) · [Full Supabase and X setup](docs/SETUP.md)

## Before you start

For a fresh repository created from a project export, start with
[Create a clean GitHub repository](docs/RESTORE-REPOSITORY.md).

You need a GitHub repository containing the project, a Cloudflare account,
and a Supabase project with an X OAuth 2.0 application for the guestbook.
Use your own services and domain for a separate deployment. Keep the existing
public configuration when updating the working WoofLab deployment.

## 1. Prepare the guestbook

Run [001_guestbook.sql](supabase/migrations/001_guestbook.sql) in your
Supabase project's SQL Editor. Enable the **X / Twitter (OAuth 2.0)** provider
and configure the X application as described in the
[English setup guide](docs/SETUP.md).

The homepage and small tools work without a configured guestbook. Add the
database and authentication settings before testing sign-in and comments.

## 2. Set the public website configuration

Edit [public/site-config.json](public/site-config.json):

```json
{
  "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
  "supabasePublishableKey": "sb_publishable_YOUR_PUBLIC_KEY",
  "contactEmail": "",
  "operatorName": "WoofLab"
}
```

Replace the project URL and publishable key with your own values. Set your
real contact email and operator name as appropriate. The build copies these
settings to the published website.

The Supabase URL and publishable key are public browser settings. Keep the
X Client Secret in Supabase's provider settings. Supabase secret/service-role
keys do not belong in this file or in `VITE_` variables.

## 3. Check the source

With Node.js 22.18.0 or a supported newer version installed, run from the
directory containing `package.json`:

```sh
npm ci
npm test
npm run build
npm run check
```

Commit and push the source to your GitHub repository's `main` branch.
Cloudflare will build `dist/` from the source files.

## 4. Connect GitHub to Cloudflare Pages

1. Open **Workers & Pages → Create application → Pages → Connect to Git**
   in the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Choose GitHub, authorize your repository, and begin setup.
3. Use the `name` from [wrangler.jsonc](wrangler.jsonc) as the Pages project name.
4. Enter these settings:

   | Setting | Value |
   | --- | --- |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | Repository root, where `package.json` is located |

5. Select **Save and Deploy** and open the resulting `pages.dev` URL.

This repository uses **Pages**. The setup asks for a build output directory;
it does not need a separate Workers deploy command.

## 5. Connect the domain and finish authentication

Open the Pages project's **Custom domains** section and add your domain.
An apex domain must use a DNS zone on the same Cloudflare account with the
assigned Cloudflare nameservers. Wait for the domain and HTTPS to become active.

For the WoofLab production domain, configure these authentication addresses:

| Location | Value |
| --- | --- |
| Supabase Site URL | `https://wooflab.eu` |
| Supabase allowed redirect | `https://wooflab.eu/auth/callback/` |
| X application callback | The callback copied from Supabase, ending in `/auth/v1/callback` |

Replace `wooflab.eu` with your own domain for a separate deployment. Update
canonical/social URLs in the HTML pages and the domain references in
`public/sitemap.xml` and `public/robots.txt` as well.

Test X sign-in on the final domain, post a comment, then sign out and confirm
that the comment remains public. A Pages preview used for authentication needs
its own exact callback URL in Supabase's allowed redirect list.

## 6. Publish future updates

```sh
git add .
git commit -m "Update WoofLab"
git push
```

Cloudflare automatically builds and deploys pushes to `main`. GitHub Actions
runs validation separately; it does not gate Cloudflare deployments.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Build succeeds, then `npx wrangler deploy` fails with a missing entry-point | The repository was connected to Workers Builds. Create a Pages project using the settings above. |
| Guestbook shows its opening-soon state | Set the Supabase URL and publishable key in `public/site-config.json`, then rebuild. |
| X sign-in fails or redirects to another host | Check both callback addresses and the exact allowed redirect for the domain you are using. |
| A Git deployment replaces a configuration change made in `dist/` | Change `public/site-config.json` or the corresponding public build variables; `dist/` is generated. |

A Direct Upload Pages project cannot be converted to Git integration. Create a
new Git-integrated Pages project, verify its build, then move the custom domain
association if necessary.

## Official references

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Supabase X OAuth 2.0](https://supabase.com/docs/guides/auth/social-login/auth-twitter)
