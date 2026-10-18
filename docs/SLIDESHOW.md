# Slideshow design and maintenance

The homepage is five real HTML sections in one natively scrolling document:

| Scene | Anchor | Purpose |
| --- | --- | --- |
| Welcome | `#welcome` | Byte at the laptop and the WoofLab introduction |
| Focus Fetch | `#lab` | Open the existing focus timer |
| Idea Fetch | `#ideas` | Open the existing idea generator |
| Meet Byte | `#byte` | Short, explicitly fictional origin story |
| Guestbook | `#pawprints` | Preview public comments and open the guestbook |

Each section has a minimum viewport height rather than a fixed height, so short
screens, larger fonts, and mobile layouts can grow without clipping content.
The Byte images keep their aspect ratio and use responsive WebP variants.

## Files to edit

- `src/theme.css`: global brand colors and component tokens. See the
  [global theme guide](THEME.md) for secondary pages and shared components.
- `index.html`: English copy, artwork and native links. Keep stable IDs for
  existing incoming links, including `#lab` and `#byte`.
- `src/slideshow.css`: scene layout, responsive styles and shared finishing.
- `src/slideshow.js`: current-scene navigation, preference storage, and lazy
  public-comment preview. It does not intercept wheel or touch events.
- `src/scroll-motion.js`: GSAP ScrollTrigger timelines. Movement is linked
  directly to scroll position, using transforms and opacity.
- `src/guestbook-preview.js`: three real public notes, rendered as plain text.

## Motion and fallback behavior

The visitor controls movement by scrolling. There is no timed autoplay. The
Motion on/off control stores an optional local preference. The operating
system's reduced-motion setting takes precedence; the control explains when
that setting is active.

Without the animation module, scenes remain visible and links still work.
Without JavaScript, the page remains a normal readable document and the
guestbook link remains available. The interactive tools require JavaScript.

Desktop uses CSS scroll snap with proximity alignment. Mobile uses natural
vertical scrolling with smaller animation distances. Keyboard navigation uses
native browser scrolling and focusable links; no global arrow-key handler
interferes with forms or dialogs.

## Comments and existing services

The public preview loads once when it approaches the viewport. It uses the
existing `wooflab_list_comments` function with a limit of three. An empty
guestbook, missing configuration and temporary errors have distinct states.
There are no generated testimonials or sample visitor comments.

The complete `/guestbook/` page, X authentication callback, tool logic, database
permissions and original public configuration are retained.

## Verification

The delivered source passed 33 Node tests, a production Vite build, and the
generated-page checks. Tests include isolated database authorization, timer
behavior, scene navigation, reduced-motion changes, delayed imports, lazy
comment loading, and safe rendering of visitor text. Build checks also enforce
compressed JavaScript/CSS budgets and validate local links and assets.
All six generated pages are checked for the shared stylesheet and theme color.

Browser rendering and an interactive production X sign-in were not verified in
the delivery environment. Before publishing, inspect desktop and mobile in
Firefox, Chrome and Safari; check fast scrolling, viewport resizing, keyboard
focus, the motion toggle and both tools. Test X sign-in on the configured domain.

## References

- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [GSAP responsive and reduced-motion setup](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/)
- [MDN scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type)
- [Animation performance](https://web.dev/articles/animations-guide)
- [W3C animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
