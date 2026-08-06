# Design Tokens

A reference for the CSS custom properties defined in `app/globals.css` (base +
semantic tokens) and `components/dashboard.module.css` (dark-mode overrides).
This documents what already exists — it isn't a proposal for a new system, and
it isn't a framework migration. Consistent with the rest of this codebase
(hand-built icons, hand-built charts, hand-built markdown parser), theming
here is a small set of plain CSS variables, not a design-token pipeline or a
component library's theme object. The goal of this doc is just to keep it
consistent as more contributors touch it: know which token to reach for,
and know when a new one is actually warranted versus reusing what's here.

## Where tokens live

- **`app/globals.css`** — declares every token's light-mode (default) value on
  `:root`. This is the single source of truth for what tokens exist.
- **`components/dashboard.module.css`** — overrides the semantic subset under
  `:global([data-theme="dark"]) .shell`. Dark mode is **scoped to the
  dashboard shell only** — public landing pages, the marketing site, and auth
  screens are never dark, regardless of the visitor's OS preference or the
  `data-theme` attribute. That attribute is set on `<html>` (see the boot
  script in `app/layout.js`, which reads `localStorage` before paint to avoid
  a light-then-dark flash), but the dark values themselves only take effect
  inside `.shell` — so setting the attribute app-wide is safe and a no-op
  everywhere else.

Every component reads tokens via `var(--token-name)`; nothing hardcodes a hex
value for anything token-worthy. A hardcoded color in a `.module.css` file
should be either a one-off illustrative color (a chart series, a template
accent) or a bug.

## Base tokens

The foundational palette. Every semantic token below is built from these, and
most components should reach for a semantic token rather than one of these
directly (e.g. a delete button should use `--danger`, not reimplement it from
`--foreground`).

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--background` | `#ffffff` | `#14161b` | Page background |
| `--foreground` | `#111827` | `#e7e9ec` | Default text color |
| `--muted` | `#6b7280` | `#9aa1ac` | Secondary text, hints, placeholders |
| `--border` | `#e5e7eb` | `#2b2f38` | Dividers, input borders, card outlines |
| `--primary` | `#2563eb` | `#3b82f6` | Primary buttons, links, active states |
| `--primary-hover` | `#1d4ed8` | `#60a5fa` | Hover/active state of `--primary` |

Note the dark-mode `--primary` is *lighter* than the light-mode one (`#3b82f6`
vs `#2563eb`) — a mid-tone blue that reads as vivid on white reads muddy on a
near-black surface, so the two aren't simply the same hue at different
lightness; each was picked to have correct contrast and vibrancy against its
own background.

## Semantic surface & status tokens

Added for dark-mode support — every card, panel, chip, and status message
across the app picks these up automatically without each CSS module writing
its own `[data-theme="dark"]` rule.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--surface` | `#ffffff` | `#1c1f26` | Cards, panels, dropdowns |
| `--surface-sunken` | `#f9fafb` | `#1a1c22` | Recessed areas (code blocks, inset wells) |
| `--surface-hover` | `#f3f4f6` | `#262a33` | Hover state for list rows, menu items |
| `--surface-accent` | `#eef2ff` | `#1e2a45` | Selected/active row background |
| `--danger` | `#dc2626` | `#f87171` | Destructive actions, error text |
| `--danger-strong` | `#b91c1c` | `#fca5a5` | Emphasized danger (hover on a delete button) |
| `--danger-bg` | `#fef2f2` | `rgba(220,38,38,.18)` | Error banners/badges |
| `--danger-border` | `#fecaca` | `rgba(248,113,113,.4)` | Border on error banners |
| `--success` | `#16a34a` | `#4ade80` | Success text/icons |
| `--success-strong` | `#15803d` | `#86efac` | Emphasized success |
| `--success-bg` | `#dcfce7` | `rgba(34,197,94,.16)` | Success banners/badges |
| `--warning` | `#d97706` | `#fbbf24` | Warning text/icons |
| `--warning-bg` | `#fffbeb` | `rgba(245,158,11,.14)` | Warning banners |
| `--warning-border` | `#fde68a` | `rgba(245,158,11,.45)` | Border on warning banners |
| `--info` | `#1d4ed8` | `#93c5fd` | Informational text/icons |
| `--info-bg` | `#dbeafe` | `rgba(59,130,246,.18)` | Informational banners |
| `--unread-bg` | `#fefce8` | `rgba(234,179,8,.16)` | Unread-lead row highlight |
| `--code-bg` / `--code-fg` | `#0f172a` / `#e2e8f0` | `#0b1120` / `#cbd5e1` | Code/monospace blocks |
| `--shadow-color` | `rgba(15,23,42,.14)` | `rgba(0,0,0,.55)` | `box-shadow` color on cards/menus |

**Status-token convention**: each status (`danger`/`success`/`warning`/`info`)
follows the same three-part shape — a text/icon color, a background tint, and
(for danger/warning) a border color. Reuse this shape for any future status
color rather than inventing a fourth part.

## Ceramony brand chrome (fixed, not theme-aware)

The site `Header`/`Footer` (`components/chrome/`) are the one surface that
stays visually constant everywhere — marketing pages, auth screens, and the
dashboard — so unlike everything above, **these do not change under dark mode
or a tenant's brand colors**. That's deliberate: it's what makes the product
read as one product rather than a per-page skin.

| Token | Value | Used for |
|---|---|---|
| `--chrome-bg` | `#0f172a` | Header/footer background |
| `--chrome-bg-blur` | `rgba(15,23,42,.82)` | Header background when blurred/sticky |
| `--chrome-fg` | `#e2e8f0` | Header/footer text |
| `--chrome-fg-muted` | `#94a3b8` | Secondary header/footer text |
| `--chrome-fg-strong` | `#f8fafc` | Emphasized header/footer text (logo wordmark) |
| `--chrome-border` | `rgba(148,163,184,.18)` | Divider inside the header/footer |
| `--chrome-hover` | `rgba(148,163,184,.14)` | Nav item hover background |
| `--chrome-active` | `rgba(56,189,248,.16)` | Active nav item background |
| `--chrome-height` | `60px` | Header height — also used to offset sticky content below it |
| `--chrome-radius` | `10px` | Corner radius for header controls (menus, buttons) |

## Accent tokens

A separate, vivid accent — distinct from `--primary` — used sparingly for
things that need to stand out against the fixed chrome specifically: the
active nav indicator, focus rings, and header CTAs.

| Token | Value | Used for |
|---|---|---|
| `--accent` | `#38bdf8` | Focus ring color (`:focus-visible`, globally), active nav accent |
| `--accent-strong` | `#0ea5e9` | Hover state of `--accent` |
| `--accent-contrast` | `#06263a` | Text color placed on top of `--accent` |
| `--accent-glow` | `rgba(56,189,248,.35)` | Soft glow/shadow behind an accented element |

## Motion tokens

| Token | Value | Used for |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Standard easing for chrome micro-interactions — a slight overshoot reads as "responsive" rather than "animated" |
| `--dur-fast` | `0.14s` | Fast transitions (hover states) |
| `--dur-base` | `0.22s` | Default transition duration |

All motion respects `prefers-reduced-motion: reduce` globally (see
`app/globals.css`) — durations collapse to near-zero for anyone who's asked
their OS for reduced motion. New animated components don't need to handle
this themselves; the global rule already covers any `animation`/`transition`.

## RTL and logical properties

Every stylesheet in this app uses CSS **logical properties**
(`margin-inline-start`, `border-inline-end`, `text-align: start`, …) instead
of physical `left`/`right`/`margin-left`, so flipping `<html dir>` mirrors the
entire layout with zero component-level RTL code. When writing new CSS:

- Never write `margin-left`/`padding-right`/`left:`/`right:` etc. — use the
  `-inline-start` / `-inline-end` equivalents.
- Numbers, emails, phone numbers, URLs, and slugs must stay left-to-right even
  inside RTL text — apply the global `.ltr` utility class (see
  `app/globals.css`) rather than inventing a new one.
- A directional icon (chevron, arrow) that should visually flip under RTL
  gets the `dirFlip` class, not a manual transform.

## Adding a new token

Ask first whether an existing token already covers it — most needs map onto
`--surface*`/`--danger`/`--success`/`--warning`/`--info` already. If a
genuinely new one is warranted:

1. Add the light-mode value to `app/globals.css`'s `:root` block, in the
   section that matches what it's for (base / semantic / chrome / accent /
   motion).
2. If it needs a dark-mode value, add the override to the
   `:global([data-theme="dark"]) .shell` block in
   `components/dashboard.module.css` — dashboard-only tokens don't need this
   if they're chrome tokens (chrome never goes dark).
3. Document it in this file, in the matching table.
