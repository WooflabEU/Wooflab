# Changelog

## 1.2.0 - 2026-10-19

- Added the Woof pack success card after a confirmed guestbook post.
- Added an optional X composer with the exact pack message and direct post link.
- Added Copy link, clipboard fallback and Write another note actions.
- Added public note URLs that work independently of feed pagination.
- Added missing-note, malformed-link and retry states with safe text rendering.
- Kept sharing tied to the correct account and protected newer drafts during delayed saves.
- Added integration tests for the guestbook flow; all 56 tests pass.
- Kept the existing Supabase migration and authentication credentials unchanged.

## 1.1.1 - 2026-10-18

- Made the slideshow's ink, warm white and lime palette the default global theme.
- Rebuilt shared typography, navigation, footer, buttons, forms and dialogs.
- Applied the theme to the guestbook, privacy, Dog House rules, callback and 404 pages.
- Added shared navigation tests for all six pages, including Escape focus return.
- Added build checks that every page loads the same stylesheet and theme color.
- Preserved the homepage scenes, Byte assets, tool logic, X authentication and database rules.

## 1.1.0 - 2026-10-18

- Rebuilt the homepage as five scroll-driven scenes with short English copy.
- Added GSAP ScrollTrigger motion, scene navigation, a motion toggle, and reduced-motion handling.
- Added an on-demand preview of real public guestbook comments with honest empty and error states.
- Preserved the original Byte assets, W brand, tools, Supabase configuration, X sign-in, and database rules.
- Added slideshow and comment-preview DOM tests and compressed asset budgets.
- Aligned Pages scripts and English deployment instructions with the existing master branch.
- Removed obsolete repository-reset instructions and old delivery files from the export.

# Changes

## 1.0.3

- Added the WoofLab geometric W logo, outlined SVG wordmarks, and a
  500 × 500 PNG organization avatar.
- Applied the W mark to the shared website header, footer, and favicon.
- Added English brand usage and GitHub organization avatar instructions.
- Updated repository links to the wooflabEU organization.

## 1.0.2

- Replaced the delivery-package README with an English public-repository
  overview linking to the live website and the existing Byte illustrations.
- Added English and Finnish setup guides for GitHub, Cloudflare Pages,
  Supabase, X OAuth 2.0, and guestbook administration.
- Added a root-level English deployment guide and made it the default
  deployment documentation linked from the README and both setup guides.
- Added portable instructions for creating a clean repository from a source
  export and selecting a repository-local public commit identity.
- Added GitHub Actions validation, issue forms, contribution guidance,
  vulnerability reporting guidance, and a pull request template.
- Added repository, homepage, and issue tracker metadata to the package.
- Preserved the deployed website configuration, application behavior, and
  database migration.

## 1.0.1

- Fixed vertically stretched images by preserving intrinsic image proportions
  as their layout width changes.
- Added original-resolution 1254 × 1254 WebP variants of all three Byte scenes.
- Updated responsive image sources and sizing hints for sharp desktop/retina
  display without upscaling the originals.

When updating a deployed site, keep your existing `site-config.json` settings.
