# Accessibility Audit

Scope: the dashboard shell (sidebar nav, header, forms, pipeline board) and
the 4 public landing-page templates. This was a code-level review — reading
every relevant component and stylesheet, and computing color-contrast ratios
against the actual token values in `DESIGN_TOKENS.md` — not a live
screen-reader session (no VoiceOver/NVDA pass was recorded). Treat this as a
solid first pass, not a certification.

**What this codebase already did right**, worth calling out so it isn't
accidentally undone later: a real WAI-ARIA menu-button implementation
(`components/chrome/useMenu.js`) with roving arrow-key focus, `Escape`-to-close
with focus restoration, and correct `role="menuitemradio"`/`aria-checked` on
the language switcher; `aria-label` on essentially every icon-only button
already in place before this pass; global `prefers-reduced-motion` support;
logical CSS properties throughout for RTL; and `:focus-visible` (not `:focus`)
so the ring only appears for keyboard users.

## Fixed this pass

**No keyboard path to move a lead between pipeline stages.**
`PipelineBoard.js` was HTML5 drag-and-drop only (`draggable`, `onDragStart`,
`onDrop`) with zero keyboard equivalent — a WCAG 2.1.1 (Keyboard, Level A)
failure, not a nice-to-have. Fixed by adding a `<select>` per card
(`aria-label="Move {name} to stage"`) that calls the same move/PATCH logic;
drag-and-drop still works for mouse users. The lead detail page's own
`StageSelect` was already keyboard-accessible, so this was specifically a
gap in the board *view*, not the whole feature.

**No skip-to-content link.** Every page made a keyboard user tab through the
full header nav (marketing pages) or sidebar (dashboard) before reaching
actual content, on every single page load. Added `components/chrome/SkipLink.js`
— invisible until focused, first Tab stop on every page, jumps to
`id="main-content"`. Required giving both `SiteChrome` (marketing/auth pages)
and `DashboardShell` (the CRM) an actual `<main id="main-content">` landmark —
the marketing-page one didn't exist before (`SiteChrome` rendered a plain
`<div>`).

**Public landing-page templates had no `<main>` landmark.** All 4
(`default`/`bold`/`minimal`/`showcase`) wrapped their otherwise-semantic
markup (`<section>`, `<footer>`) in a plain `<div className={styles.page}>`.
Changed to `<main className={styles.page}>` in all 4 — a screen reader user
can now jump straight to page content via landmark navigation instead of
linearly reading through everything.

**Global focus ring failed contrast on light backgrounds.** `:focus-visible`
used `var(--accent)` (`#38bdf8`), which only reaches **2.14:1** against a
white/light surface — well under WCAG 1.4.11's 3:1 minimum for UI component
indicators. It was only ever validated against the fixed dark chrome header
(8.33:1 there), not the far more common light-mode surfaces underneath.
Switched to `var(--primary)`, which already theme-adapts and clears 3:1 in
every context this app renders in: light surfaces (5.17:1), dashboard dark
mode (4.92:1), and the always-dark public header, where `--primary` stays at
its light-mode value since chrome sits outside `.shell` (3.45:1). See
`DESIGN_TOKENS.md` for the token values.

**Save/error feedback wasn't announced to screen readers.** The
`.savedNote`/`.formError` pattern — a `<span>`/`<p>` that appears after a
save succeeds or fails — is used across 9 components (Settings, Team, Profile,
Lead detail, Landing-page editor, Pipeline stages, Resume builder, the
workspace page header, email verification). None of them had `aria-live`
semantics, so a screen reader user who submits a form gets no notification
that it succeeded or failed unless they happen to still be focused on the
button. Added `role="status"` to every success/confirmation instance and
`role="alert"` to every error instance (both carry implicit `aria-live`
semantics — `status` is polite, `alert` is assertive — matching the one
`role="status"` usage that already existed, in `LoginTransition.js`).

**Gallery photos had `alt=""`.** These are tenant-uploaded portfolio/work
photos — real content, not decoration — so an empty alt gave a screen reader
user zero information that a gallery even existed. There's no per-photo
caption collected from the tenant (a real gap — see below), but a numbered,
labelled alt (`"{gallery heading} — photo {n} of {total}"`) is a genuine
improvement over nothing. `HeroBackground.js`'s crossfading images were
already correctly `aria-hidden="true"` (they're a CSS background behind text,
truly decorative) — left as-is.

**Five files hardcoded `#b91c1c` for error text instead of
`var(--danger-strong)`.** Found while fixing the pattern above. This is a
dark-mode bug, not just a token-consistency one: `--danger-strong` is
`#b91c1c` in light mode but `#fca5a5` in dark mode, so these five hardcoded
instances (`OnboardingForm.js`, `LeadDetailEditor.js` ×2,
`PipelineStagesEditor.js`, `ImageUpload.js`, `LandingPageEditor.js`) rendered
a hard-to-read dark red on a dark background for any dashboard user in dark
mode. Fixed to reference the token.

**The product-UI locale toggle only ever handled English/Hebrew.** Not
strictly an accessibility bug, but found and fixed while auditing `lang`/`dir`
handling (which *does* matter for assistive tech — a mismatched `lang`
attribute makes a screen reader mispronounce a whole page): the pre-hydration
boot script in `app/layout.js` and `LocaleProvider`'s `toggleLocale` both
hardcoded a binary `en`/`he` check. Now built from `LOCALE_META` generically,
so adding Spanish (this same roadmap phase) didn't leave a broken third
option — see the i18n section of this phase's work.

## Reviewed, not changed

**`HeroBackground.js`'s auto-rotating crossfade has no pause control**
(WCAG 2.2.2, Pause/Stop/Hide, applies to auto-updating content lasting over
5 seconds). Assessed as low-risk rather than fixed: the layer is
`aria-hidden="true"` (no informational content is lost by not perceiving the
change), it's a slow 6-second interval, and the visual transition itself
already collapses to an instant cut under `prefers-reduced-motion` via the
global rule in `globals.css` — only the background-swap timer itself keeps
running. Adding a visible pause control to a decorative hero background would
be a real UX cost for a small, contested benefit; flagging it here rather
than silently ignoring it.

**`CookieBanner.js` uses `role="dialog"` without a focus trap.** It's a
persistent, non-blocking banner (not a true modal — the rest of the page
stays interactive, matching its actual behavior), so it's arguably mislabeled
as `dialog` rather than `region`/`group`, but a keyboard user can already tab
past it freely and both buttons are reachable and labeled. Out of this pass's
explicit scope (dashboard shell + landing templates); noted for a future pass.

## Known gaps, not addressed this pass

- **No per-photo alt text.** The Gallery fix above is a real improvement but
  still can't describe *what's in* a photo — that needs a schema change
  (an `alt`/caption field on `Media` or on the gallery-photo reference) plus
  editor UI to collect it from the tenant. Worth scoping as its own item.
- **No automated accessibility testing** (axe-core, Lighthouse CI, or
  similar) wired into `npm test` or CI. This audit was manual; nothing catches
  a regression automatically. Overlaps with — but is distinct from — the
  roadmap's separate "visual regression coverage" item; neither is built yet.
- **No live screen-reader pass** (VoiceOver/NVDA) was recorded for this audit.
  The menu/focus-order logic was verified by reading `useMenu.js`'s
  implementation, not by listening to it.
- Two hardcoded, untranslated English strings were noticed incidentally while
  editing nearby lines (`ImageUpload.js`'s "Replace"/"Remove", the workspace
  page header's "Saved") — an i18n completeness gap, not an accessibility one,
  so left alone here.

## Where things live, for the next pass

- Design tokens (contrast-relevant color values): `DESIGN_TOKENS.md`.
- The menu/focus-management primitive every dropdown should reuse:
  `components/chrome/useMenu.js`.
- The skip-link target convention: any new top-level page shell needs
  `id="main-content"` on its `<main>`, or `SkipLink.js` silently does nothing.
