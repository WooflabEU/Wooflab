# Global WoofLab theme

Every page uses the same brand tokens and shared components. The default is
the ink background, warm white text and lime accent from the slideshow.

## Shared files

| File | Responsibility |
| --- | --- |
| `src/theme.css` | Brand palette, semantic color tokens and scene color variations |
| `src/styles.css` | Global typography, header, footer, buttons, forms, dialogs and secondary-page layouts |
| `src/site-shell.js` | Shared navigation, Escape handling, current-page links and footer year |
| `src/slideshow.css` | Homepage scene composition, progress controls and scroll-specific layout |

`src/main.js` imports the theme on every route. Change shared colors in
`theme.css`; avoid adding a separate palette inside a page stylesheet.

## Covered pages and states

- Homepage: its five scenes keep their ink, paper and lime compositions.
- Guestbook: heading, composer, X sign-in/out controls, textarea, comments,
  loading, empty and error states, moderation notice, and delete dialog.
- Privacy and Dog House rules: shared reading layout and typography.
- Authentication callback: success-pending and error states.
- 404: the same header, typography, buttons and footer.
- Focus timer and idea generator: shared dark dialog components.

The header is the same component everywhere. It stays fixed over the homepage
and sticky on reading/form pages. The smaller mobile menu uses the same styles
and behavior on every route. The homepage footer is compact inside its final
scene; its colors are inherited from that scene's semantic tokens.

## Scene variations

`data-scene-theme="light"` and `data-scene-theme="lime"` scope the same semantic
tokens to individual homepage scenes. They also set an appropriate focus color
and native color scheme. Secondary pages use the default global dark theme.

## Checks and limitations

The delivery passed 56 automated tests, the Vite production build and checks for
all six generated pages. The page checker verifies that every route loads the
same global stylesheet and browser theme color. Shared navigation tests cover
all six pages; existing tool, slideshow, comment-preview and isolated database
tests remain included.

Interactive browser rendering and production X sign-in were not verified in
the delivery environment. Check the local guestbook and the production callback
after applying the update. Existing authentication logic, public configuration
and database migrations are unchanged.
