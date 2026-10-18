# Create a clean GitHub repository

[Project overview](../README.md) · [Deploy to Cloudflare Pages](../DEPLOYMENT.md)

Use these steps to create a new repository from a clean project export.

## 1. Start from the clean source

Extract the project archive into an empty folder. Open a terminal in the folder
containing `package.json` and the project `README.md`.

Use the source files from the archive. Do not bring the previous `.git`
directory, delivery instructions, patch files, debug logs, or backup files into
the new repository.

## 2. Create an empty repository on GitHub

Choose **wooflabEU** as the owner and **wooflab** as the repository name.
The package metadata and CI badge use this destination. If you choose a
different repository name, update those links before publishing.
Choose the repository visibility on GitHub. Leave the automatic README,
license, and other starter files unselected because the project already contains
its own files.

## 3. Choose the public commit identity

Before the first commit, choose the name and email address that should be
visible in the repository's Git history. For email privacy, copy the GitHub
provided noreply address from **Settings → Emails**.

Initialize the repository, then set the identity for this repository only.
Replace both placeholders before running the configuration commands:

```sh
git init -b main
git config user.name "YOUR_PUBLIC_GITHUB_HANDLE"
git config user.email "YOUR_GITHUB_NOREPLY_ADDRESS"
```

## 4. Commit and push

Replace the remote URL placeholder with the new repository's HTTPS URL:

```sh
git add .
git commit -m "Initial WoofLab website"
git remote add origin https://github.com/YOUR_HANDLE/YOUR_REPOSITORY.git
git push -u origin main
```

The archive's source files do not include Git history. These commands create
the first commit using the repository-local identity selected above.

## 5. Check the Cloudflare Pages connection

If the previous GitHub repository was deleted, check the Pages Git integration
and GitHub App authorization for the newly created repository. A recreated
repository is a new GitHub repository even when it has the same URL.

If the old Pages integration cannot attach to it, create a new Git-integrated
Pages project using the [deployment guide](../DEPLOYMENT.md), verify the build,
then move the custom domain association to the new project.

Keep the working website's public Supabase configuration when restoring the
source. Database credentials and X Client Secrets remain in the external
services where they were originally configured.
