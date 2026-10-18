# Apply the WoofLab update to the existing repository

This export continues the existing `master` branch of
[WooflabEU/Wooflab](https://github.com/WooflabEU/Wooflab). Keep the current Git
repository and its history. The ZIP is a complete source export, not a patch.

Version 1.1.1 makes the slideshow's theme global, including `/guestbook/`, the
legal pages, authentication callback, 404 page and tool dialogs. Copy the whole
updated source, including `src/theme.css`, `src/styles.css`, `src/site-shell.js`
and every HTML page. Replacing only `index.html` will not apply the global theme.

## 1. Prepare the current clone

Open a terminal in the existing clone, where `package.json` is located:

```sh
git switch master
git pull --ff-only origin master
git status --short
```

Resolve any unfinished local changes before copying the update. Extract the ZIP
into a separate temporary folder, then copy its files into the existing clone,
replacing matching source files. Include the `.github` folder. Keep the clone's
`.git` directory and any local `.env` settings.

The export retains the current production `public/site-config.json` and the
original database migration. A working deployment does not need a database
reset, a repeated SQL migration, or new X credentials for this visual update.

Remove obsolete tracked delivery files if they still exist:

```sh
git rm --ignore-unmatch -- OHJEET.fi.md english-deploy-only.patch update-info.json wooflab-public.patch docs/RESTORE-REPOSITORY.md
```

## 2. Install and verify

Use Node.js 22.18.0 or a supported newer version:

```sh
npm ci
npm test
npm run build
npm run check
npm run dev
```

Open the local URL printed by Vite. Check all five scenes, the two tools, mobile
navigation, Motion off, and the guestbook. X sign-in should also be checked on
the production domain because Supabase requires an allowed callback URL.

## 3. Review and commit

```sh
git diff --stat
git add -- index.html src package.json package-lock.json vite.config.js scripts test README.md DEPLOYMENT.md UPDATE.md CHANGELOG.md THIRD_PARTY_NOTICES.md docs .github .gitignore licenses
git diff --cached --stat
git commit -m "🐾 Woof! Give every page the same fresh coat"
git push origin master
```

These commands create a normal new commit. Cloudflare Pages should deploy from
`master` using `npm run build` and output directory `dist`. The existing domain
and Supabase settings remain in place. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Optional local commit identity

Before committing, use `git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT`
to review the identity Git will publish. To use a public alias, set
`git config --local user.name "WooflabEU"` and configure the GitHub-provided
`noreply` email from your personal account's Settings → Emails. This only affects
future commits.
