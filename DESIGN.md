---
version: alpha
name: Tandra Peters Roofing Consultant
description: >-
  Editorial, premium-but-grounded visual identity for Tandra Peters — an
  Austin-based roofing consultant partnered with Birdcreek Roofing. Deep
  forest "everglade" ink on warm "paper" cream, a soft "accent" green
  for affirmative interaction, and a lavender "hero-accent" reserved
  for the one promise the brand makes above the fold.
colors:
  # Exact sRGB conversions of the OKLCH tokens in src/theme.ts.
  # Token names mirror theme.colors.* for traceability.
  # `primary` is an alias of `everglade` so consumer agents can locate
  # the spec's expected key without losing the brand-native name.
  primary: "#092A1D"
  white: "#FFFFFF"
  black: "#141410"
  everglade: "#092A1D"
  everglade-light: "#12533A"
  everglade-muted: "#ACECD3"
  text-on-brand: "#D5F6E9"
  paper: "#F4F4F1"
  paper-dark: "#D2D2C6"
  paper-dim: "#E7E7E4"
  accent: "#69A758"
  accent-light: "#A5CA9B"
  purple: "#CECCFF"
  hero-accent: "#9C99FF"
  danger: "#C82F05"
  legal-muted: "#3C5D4E"
typography:
  display:
    fontFamily: Manrope
    fontSize: 6rem
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.02em
  h1:
    fontFamily: Instrument Serif
    fontSize: 2.75rem
    fontWeight: 400
    lineHeight: 1.15
  h2:
    fontFamily: Instrument Serif
    fontSize: 2.35rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 1.25rem
    fontWeight: 300
    lineHeight: 1.6
  body-md:
    fontFamily: Manrope
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
  body-sm:
    fontFamily: Manrope
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
  label-caps:
    fontFamily: Manrope
    fontSize: 0.6875rem
    fontWeight: 800
    lineHeight: 1
    letterSpacing: 0.16em
  nav-link:
    fontFamily: Manrope
    fontSize: 0.8125rem
    fontWeight: 700
    letterSpacing: 0.1em
  button:
    fontFamily: Manrope
    fontSize: 1rem
    fontWeight: 900
    letterSpacing: 0.1em
rounded:
  none: 0
  sm: 4px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  "3xl": 64px
  "4xl": 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "1rem 2rem"
  button-primary-hover:
    backgroundColor: "{colors.everglade-light}"
    textColor: "{colors.paper}"
  button-accent:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.everglade}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "1rem 2rem"
  button-accent-bold:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.everglade}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "1rem 2rem"
  button-secondary:
    backgroundColor: "{colors.black}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "1rem 2rem"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "1rem 2rem"
  nav-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.everglade}"
    typography: "{typography.nav-link}"
  badge-metadata:
    backgroundColor: "{colors.black}"
    textColor: "{colors.hero-accent}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0.75rem"
  badge-soft:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.everglade}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0.75rem"
  card-article:
    backgroundColor: "{colors.black}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "2rem"
  card-brand:
    backgroundColor: "{colors.everglade}"
    textColor: "{colors.text-on-brand}"
    rounded: "{rounded.lg}"
    padding: "2rem"
  card-light:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.everglade}"
    rounded: "{rounded.lg}"
    padding: "2rem"
  card-inset:
    backgroundColor: "{colors.paper-dim}"
    textColor: "{colors.everglade}"
    rounded: "{rounded.none}"
    padding: "1.5rem"
  card-divider:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.everglade}"
    rounded: "{rounded.none}"
    padding: "1rem"
  text-brand-soft:
    backgroundColor: "{colors.everglade}"
    textColor: "{colors.everglade-muted}"
    typography: "{typography.body-sm}"
    padding: "0.5rem 0"
  text-legal-meta:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.legal-muted}"
    typography: "{typography.body-sm}"
    padding: "0.5rem 0"
  avatar-round:
    backgroundColor: "{colors.paper-dim}"
    rounded: "{rounded.full}"
    size: "2.2rem"
---

## Overview

Editorial Gravitas meets Texas Craft. The identity reads like a long-form
journalism feature about the land — deep forest ink, warm limestone paper,
and a single periwinkle flourish for the hero promise. The roofing trade
is loud and salesy; Tandra Peters speaks at a lower volume with steadier
weight, the way a trusted contractor walks a roof.

Edges are intentionally sharp. Buttons, badges, nav chrome, and legal
insets use **no border radius**. The two exceptions are deliberate:
editorial article cards (`rounded.lg`) read as collectible objects, and
the founder avatar (`rounded.full`) reads as personal — a face, not a
logo.

### Source of truth

Every color hex below is a precise sRGB conversion of the OKLCH values
in `src/theme.ts`. Token names mirror `theme.colors.*` so an agent can
trace any DESIGN.md reference back to a concrete TypeScript export
without renaming.

## Colors

The palette is sourced from a Central Texas roofline at golden hour:
forest canopy, weathered cedar, limestone, and a single bloom of
mountain laurel for the brand promise.

- **`everglade` `#092A1D`** — Deep forest ink. The brand's resting
  voice: headlines on cream, nav text on light surfaces, primary CTAs.
  Almost black, but with a clear green undertone in OKLCH.
- **`everglade-light` `#12533A`** — Hover/secondary brand. Used on
  primary-button hover and on darker brand panels that need a tier of
  separation from `everglade`.
- **`everglade-muted` `#ACECD3`** — Pale mint tint. Reserved for
  decorative dividers and subtle iconography on the dark brand
  surface. Not a text color on cream — it disappears.
- **`text-on-brand` `#D5F6E9`** — Muted text on `everglade` surfaces
  (footer, testimonial bands). Hits AA against the dark green
  background without competing with the cream heading.
- **`paper` `#F4F4F1`** — Warm limestone, the default page canvas.
  Softer than pure white; carries everglade type beautifully.
- **`paper-dark` `#D2D2C6`** — A heavier paper for borders, separators,
  and the few panels that need to read as "set into" the page.
- **`paper-dim` `#E7E7E4`** — The quietest cream, between `paper` and
  `paper-dark`. Used for `card-inset` and form-field rails.
- **`black` `#141410`** — Warm near-black (`paper.950` in OKLCH, not a
  true `#000`). The hero band, article cards, and the footer all sit
  on this — pairing with cream type gives a matte-print effect.
- **`accent` `#69A758`** — Full-saturation Hill Country green. Used
  sparingly for affirmative interaction in dense contexts.
- **`accent-light` `#A5CA9B`** — Sage wash. The hero's primary CTA
  fill — soft enough to coexist with the lavender headline accent,
  bright enough to remain the page's brightest object.
- **`hero-accent` `#9C99FF`** — Mountain-laurel periwinkle. Reserved
  for the second line of the hero headline and the eyebrow above it.
  Never a button, never a link.
- **`purple` `#CECCFF`** — The pale wash of `hero-accent`. Used as a
  soft badge fill on cream surfaces where everglade text needs to sit
  inside a tinted pill.
- **`danger` `#C82F05`** — Hot vermilion, for destructive confirmation
  only. Resist using it for "alert" — it reads as _destroy_, not warn.
- **`legal-muted` `#3C5D4E`** — Deep sage-teal for small print on
  legal pages, timestamps, byline rows, and footnote labels. Sourced
  from `granite.700` (not `granite.600`) so it clears WCAG AA body
  contrast on `paper` (6.70:1), `paper-dim` (5.98:1), and
  `paper-dark` (4.86:1). If you reach for a lighter muted-text value,
  promote it to a _meta-only_ role and verify against the target
  surface before shipping.

## Typography

Two families do all the work. **Manrope** carries the brand's working
voice — confident, modern, slightly geometric. **Instrument Serif**
appears on editorial moments (article titles, page-list intros, legal
section headers) where the roofing-trade context gives way to a more
considered, magazine-style register.

- `display` — Hero only. Uppercase, weight 800, tight tracking
  (`-0.02em`), line-height 0.9. The token pins the **maximum** size at
  6rem; `Hero.tsx` scales it fluidly via `clamp(3rem, 10vw, 6rem)`.
- `h1` / `h2` — Instrument Serif at editorial weights. Reserved for
  article pages, listing pages, and legal documents. Code uses
  `clamp(1.75rem, 4–5vw, max)` for fluid scaling.
- `body-lg` — Hero subtitle and section leads. Light weight (300) so
  it recedes behind the display headline. Fluid:
  `clamp(1rem, 2vw, 1.25rem)`.
- `body-md` — Default reading size for marketing copy and legal text.
  Line-height 1.7 — generous, scannable.
- `label-caps` — Eyebrows, back-links, badge text, breadcrumbs.
  Letter-spacing `0.16em` is the brand's signature small-caps texture.
- `button` — Always uppercase, weight 900 on the hero (maximum
  authority), weight 700 on nav (one tier quieter).

> **Fluid scaling note.** The DESIGN.md spec requires single-value
> dimensions, so `display` and the heading tokens are pinned at their
> desktop maxima. Agents that support `clamp()` should restore the
> fluid range when implementing; agents targeting fixed-canvas
> environments can use the token value as-is.

Bebas Neue is loaded in `index.html` but reserved for one-off display
moments (poster, stat callouts). Do not introduce it to running UI
without a typographic reason.

## Layout

Spacing is a 4-pt scale with a strong jump from `xl` (32px) to `2xl`
(48px). The jump matters: anything below `xl` is intra-component (gaps
between a label and a field, a button's padding); anything `2xl` or
larger is structural (between sections, between a heading and its
content block).

- Page sections (`content-section--padded`) use `padding-block: 6rem`
  (= `4xl`) on desktop. This is the band rhythm of the homepage.
- The fixed nav adds `padding-top: 6.5rem` (~`4xl`) to every routed
  page below the homepage.
- Containers come in five widths: `wide` (80rem), `article` (52rem),
  `reading` (48rem), `legal` (42rem), and `contact-compact` (60rem).
  Pick by reading distance, not by what fits.

Horizontal gutters are a flat `1.5rem` (= `lg`) at all viewports. The
design does not breathe wider on large screens — the content does.

## Components

### Buttons

Six variants, all sharp-edged, all `typography.button` (uppercase
Manrope with `0.1em` tracking):

- `button-primary` — Everglade fill, paper text. Default action on
  light surfaces.
- `button-accent` — Sage-wash fill, everglade text. Reserved for the
  **hero only** — its job is to be the single brightest thing on the
  page.
- `button-accent-bold` — Full-saturation accent for dense contexts
  (article CTAs, in-line conversions on long pages) where the soft
  hero variant would get lost.
- `button-secondary` — Used on the dark hero band as a tertiary
  action. Modeled here as `black` fill / `white` text; the actual UI
  renders it transparent with a 1px white border (the spec has no
  `border` property, but the contrast pairing is what matters for
  legibility).
- `button-danger` — Hot vermilion destructive confirmation. Used in
  admin affordances (Sanity Studio actions, irreversible deletes);
  never in primary marketing flows.
- `button-primary-hover` — Hover-state token for the primary button.

Hover transitions are a single `background-color` swap or
`filter: brightness(1.1)` — no transform, no shadow, no scale.

### Nav

The nav floats transparently at the top of the homepage and solidifies
to a 70%-opaque cream blur (`backdrop-filter: blur(20px)`) once the
user scrolls past 20px. On all routed sub-pages it is solid from
first paint. The nav text inverts accordingly: white on the hero,
everglade on every other surface.

### Cards

Five card variants, each tuned to a job:

- `card-article` — The lone _highlighted_ element in the system. Black
  surface, paper text, 1rem radius, 2rem padding, 420–500px min
  height. Collectible, like loose magazine cards on a desk.
- `card-brand` — The deep-everglade variant for testimonial bands and
  footer panels. Uses `text-on-brand` for body so the brand color
  reads "settled," not "shouted."
- `card-light` — A rounded warm-cream card for feature blocks and
  service tiles. Matches `card-article`'s shape, inverts its tone.
- `card-inset` — Square-edged `paper-dim` block for legal asides and
  form-field rails. The plainest container in the system.
- `card-divider` — Heavier `paper-dark` for content-set-into-page
  panels (related articles, sidebar pulls).

### Badges and eyebrows

- `badge-metadata` — Periwinkle text on the dark hero background.
  Always `label-caps` typography. Sharp-edged.
- `badge-soft` — Pale-purple wash with deep everglade text for the
  rare badge that needs to sit on a light surface (e.g., article
  category pills on listing pages).

### Text blocks

- `text-brand-soft` — Muted-mint text on `everglade`, for byline and
  caption rows inside `card-brand` and the footer.
- `text-legal-meta` — Deep sage-teal small print on `paper`, for
  timestamps, footnote labels, and "last updated" lines on legal
  pages.

### Avatar

`avatar-round` is the only fully circular element. Used exclusively
for the founder's portrait in the nav (2.2rem). Anonymous identities
use `card-light` with initials in Instrument Serif — not a circle.

## Do's and Don'ts

**Do**

- Lead every page with a clear primary action in `everglade` or
  `accent`.
- Keep `hero-accent` on the hero band. It is a one-time-per-page
  color.
- Use Instrument Serif when the moment is editorial (a long-form
  article title, a legal page header, a listing intro).
- Use `xl`-or-larger spacing between distinct content sections.
- Round corners only on the four card variants tagged `rounded.lg`
  and the founder avatar.

**Don't**

- Don't round buttons, badges, nav chrome, or form inputs. Sharp edges
  are the system's signature.
- Don't introduce a third color family. If you need emphasis beyond
  `everglade`/`accent`, reach for weight, size, or whitespace first.
- Don't use `hero-accent` for buttons, links, or any interactive
  affordance. It is decorative type only.
- Don't put body copy on `black`. The dark surface is for hero and
  card moments; body reading happens on `paper`.
- Don't add drop shadows or elevation gradients. The system reads flat
  on purpose — depth comes from contrast and color, not from light.
