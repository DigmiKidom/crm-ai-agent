# Ceramony — Future Roadmap

*Prepared as a Senior Principal Engineer / Product Architect review. Supersedes
`roadmap.md` and `architecture-plan.md` for forward planning — both are kept as
historical record and now carry a pointer to this document. Companion to
`ARCHITECTURE_SUMMARY.md`, which remains the source of truth for what's built today.*

*Audit basis: full read of `roadmap.md`, `ARCHITECTURE_SUMMARY.md`,
`architecture-plan.md`, `README.md`, a repo-wide scan for `TODO`/`FIXME`/legacy
markers, and a direct inventory of every model, API route, and top-level component
directory in the codebase as it stands today.*

---

## 1. Executive Summary & Vision Alignment

Ceramony's proven value proposition — **zero-to-working funnel**: a small business
answers a handful of questions and gets a live, branded, lead-capturing website plus a
working CRM in under a minute, fully editable afterward — is intact and has grown more
credible with each shipped feature. What started as "AI writes some landing-page copy"
is now a materially more complete product:

- The AI agent pattern (forced function-calling against a fixed JSON schema, never
  free-form prose parsing) has proven itself twice — once for site generation
  (`lib/agent.js`) and once for CV polishing (`lib/resumeAgent.js`) — and is the
  template for every future AI surface in this roadmap.
- The product is genuinely bilingual today, not just translated: a full i18n system
  (719 dictionary keys, parity-tested in both languages) with real RTL layout support,
  and a landing-page content language that is independent of and can differ from the
  viewer's own UI language.
- The CRM's lead-capture form is no longer fixed — a tenant can now shape exactly what
  they collect (up to 8 fields, typed, required/optional, connected to CRM records) —
  which turns Ceramony from "a CRM with one hardcoded contact form" into a real
  form-builder-plus-CRM.
- A second product surface — the AI-assisted CV/Resume Builder — now exists alongside
  the core landing-page/CRM product, sharing its AI-agent pattern, i18n system, and
  print-to-PDF export model.

**Vision going forward**: Ceramison should grow from *a tool a solo founder uses to get
a working funnel fast* into *a platform that keeps working for that business as it
grows* — more languages, more automation, real conversion analytics, team seats, and
the operational hardening (rate limiting, CI, tenant-isolation guarantees) that a
product with paying, multi-person customers needs. Nothing about the hand-built,
no-framework engineering culture (custom icons, custom charts, custom markdown parser,
CSS Modules, explicit-save editing) should change — it's a deliberate choice that has
kept the codebase small and consistent, and every phase below is written to extend
that culture, not replace it with off-the-shelf frameworks.

---

## 2. Deprecated / Removed Legacy Concepts

Actions taken as part of this review, plus concepts that should not be designed
against going forward:

| # | Concept | Status | Replacement / current state |
|---|---|---|---|
| 1 | **Claude (Anthropic) as the AI agent provider** — `architecture-plan.md`'s original design | Formally retired. Already switched mid-build; this review closes the loop in the docs. | Google Gemini (`@google/genai`, `gemini-flash-latest`), forced function-calling schema, used by both `lib/agent.js` and `lib/resumeAgent.js`. |
| 2 | **`templates` MongoDB collection / `lib/models/Template.js`** — planned in the original data model | **Removed this pass.** Zero imports anywhere in the codebase; confirmed via full-repo search, and the app builds and tests clean without it. | The real template registry is, and should remain, the hardcoded object in `lib/templates.js` — data-driving it is a possible future item (see Phase 3) but is not blocked on the dead model. |
| 3 | **`/l/[tenantSlug]` as the primary public landing-page route** | Deprecated as canonical; the file stays in place *on purpose* as a permanent redirect shim (`app/l/[tenantSlug]/page.js` → `redirect('/pages/' + tenantSlug)`), not something to delete. | `/pages/[tenantSlug]`, ISR-cached (`revalidate = 60`). |
| 4 | **Numeric company-size ranges** (`"1-10"`, `"11-50"`, `"51-200"`, `"200+"`) | Deprecated as a UI/data concept. Still mapped forward via `LEGACY` in `lib/companySize.js` for old `AgentSession` records — that mapping should stay, it's not dead code. | Descriptive tiers: `solo` / `micro-startup` / `growth-smb` / `enterprise`, each with a stable slug (sent to the AI prompt) and a translated display label (shown in UI). |
| 5 | **Fixed, hardcoded 4-field lead form** (name/email/phone/message, no way to change it) | Superseded. | Configurable `landingPage.formFields` (`lib/formFields.js`): up to 8 fields, per-field type/label/required, core fields (name/email/phone/message) map onto real `Lead` columns, anything else lands in `Lead.customFields` and is editable from the lead detail page. |
| 6 | **English-only assumption anywhere in the UI or content layer** | Deprecated as a design assumption. | Full i18n: 719 parity-tested keys across English/Hebrew for the product UI (cookie-based locale, RTL via CSS logical properties), plus a *separate* content-language axis for landing pages/CV documents covering 9 languages (`lib/i18n/languages.js`), independent of the viewer's own UI locale. |
| 7 | **"AI writes it once, editing means rerunning onboarding"** | Superseded. | Every AI output is now hand-editable afterward without a regeneration: landing page copy/template/features/gallery, form fields, content language, pipeline stages, CV content. Regeneration ("AI Setup") is additive/non-destructive — it doesn't wipe uploaded media. |
| 8 | **`architecture-plan.md`'s Phase 1 → 2 → 3 build plan** | Retired as a live plan; the file now carries a "historical, superseded" banner pointing here. | This document. |

**Not deprecated, but flagged as incomplete and should not be assumed to work:**
the `notifications.emailOnNewLead` toggle persists a value that no email-sending code
path ever reads (confirmed: `lib/email.js` exports only password-reset and
verification senders), and `User.role` (`owner`/`admin`/`member`) is stored and
returned by the API but never branches any authorization logic. These are unfinished
features aligned with the current vision, not legacy ones — they're picked up in
Phase 1 and Phase 3 below rather than discarded.

---

## 3. Comprehensive Architecture & Feature Specification

### 3.1 Technical foundation (as of this review)

- **Stack**: Next.js 16.2.12 (App Router, Turbopack dev), React 19.2.4, plain
  JavaScript (no TypeScript), MongoDB via Mongoose ~9.x, NextAuth v5 beta (JWT
  sessions), Vercel hosting, GitHub auto-deploy on `main`.
- **11 Mongoose models** (post-cleanup): `Tenant`, `User`, `Lead`, `Contact`,
  `Pipeline`, `Media`, `AgentSession`, `VerificationToken`, `WorkspaceItem`,
  `WorkspaceRow`, `Resume`.
- **23 API route handlers** under `app/api/**/route.js`, all now translating their
  JSON error responses via `getServerT()` into the caller's UI locale (a gap closed
  in this same work cycle — see the parallel `api.*` dictionary namespace).
- **43 top-level components**, zero UI framework, zero component library, zero icon
  library, zero chart library, zero markdown library — all hand-built and
  intentionally so (keeps the bundle small and the visual language perfectly
  consistent; documented at length in `ARCHITECTURE_SUMMARY.md` §3).
- **Testing**: no framework — three hand-written Node scripts run via
  `npm test` (`test/boundaries.test.mjs`, `test/analytics.test.mjs`,
  `test/i18n.test.mjs`), covering server/client boundary violations, analytics math,
  and translation-dictionary integrity (parity, placeholder safety, no untranslated
  UI strings). **There is still no CI pipeline** — these only run when a human
  remembers to run them locally. See Phase 1.

### 3.2 AI Agent Workflows (current state → where this needs to grow)

**Today**: two independent agent surfaces, same underlying pattern —

- **Site generation** (`lib/agent.js`, `app/api/agent/generate/route.js`): one Gemini
  call per run, forced function-calling against a `generate_site_config` schema,
  returns template pick + hero copy + up to 3 features + pipeline stages + content
  language + form labels, all logged to `AgentSession`.
- **CV assistance** (`lib/resumeAgent.js`, `app/api/resume/agent/route.js`): stateless
  "polish" and "summarize" actions against the current draft, same schema-first
  pattern, nothing persisted until the user explicitly saves.

**The gap**: both are single-shot, request/response tools. There's no multi-step
agent workflow, no agent action that reasons over *existing CRM data* (as opposed to
onboarding answers), and no automation that runs without a user in the loop clicking
a button. Phase 2 below is built around closing exactly this gap using the same
schema-first pattern that already works.

### 3.3 Landing Page & CRM (current feature set)

4 templates (Classic/Minimal/Bold/Showcase), per-tenant theme, up to 3 hero photos,
up to 6 gallery photos, up to 3 feature cards, the new configurable form-field system,
a leads inbox with search/filter/unread tracking, a lead detail view with notes and
now editable custom-field answers, a drag-and-drop pipeline board with an inline stage
editor, and a contacts list. Explicit-Save everywhere — no autosave, no silent state.

**Known gaps** (carried forward from `ARCHITECTURE_SUMMARY.md`, still accurate): no
stage-change activity log (so no true funnel/velocity reporting), no A/B testing of
copy, no webhook/Zapier egress, `Tenant.role` and `Tenant.plan` are both stored and
both inert.

### 3.4 Resume/CV Builder (current feature set)

A 5-step guided builder (`components/resume/ResumeBuilder.js`), AI polish/summarize,
print-CSS PDF export (the on-screen preview *is* the printed page — no separate
render path), full i18n including RTL CV layouts, and the same content-language
independence pattern as landing pages. This is a genuinely separate product surface
riding on the same infrastructure (auth, i18n, AI-agent pattern) — Phase 4 is about
turning it from "a nice bundled tool" into something that actively feeds back into
the core CRM/landing-page product.

### 3.5 Localization & UI/UX Architecture

Two independent, correctly-separated localization axes:

1. **Product UI locale** (English/Hebrew only, cookie-driven, `useT()`/`getServerT()`)
   — what the *tenant's own team* sees in the dashboard.
2. **Content language** (9 languages: en/he/ar/es/fr/de/pt/it/ru) — what a landing
   page's or CV's *own text* is written in, independent of who's viewing it.

This is a strong foundation most competitors don't have. The obvious next move —
expanding axis 1 to match the breadth already supported by axis 2 — is Phase 5's
headline item.

### 3.6 Analytics & Growth Readiness

A genuinely rich analytics screen already exists (KPIs with period deltas, time
series, funnel-adjacent stage occupancy, response-time and backlog distributions, a
day×hour heatmap, lead sources), computed entirely from existing CRM documents with
no separate tracking pipeline. The single biggest and most-repeated gap across every
existing doc is the same one: **no visitor/traffic tracking on public landing pages**,
so there is no true visit-to-lead conversion rate. This is Phase 6's headline item.

### 3.7 Enterprise-Readiness Gaps

Tenant isolation is a *convention* (manual `tenantId` filtering at every call site),
not an enforced boundary — it has held up across ~23 routes so far, but every new
route added without a shared scoping helper adds risk. No rate limiting anywhere
public-facing. No RBAC enforcement despite the schema modeling for it. No billing
enforcement despite the schema modeling for it. No background job/queue
infrastructure — AI calls and email sends are synchronous in the request path. Media
is stored as raw bytes in MongoDB, not object storage. Single-provider dependency
chain (Vercel/Atlas/Gemini/Resend) with no fallback path for any of them.

---

## 4. Phased Roadmap

Numbered in priority order. Each phase lists its objective, key initiatives, and exit
criteria (how you'd know it's actually done, not just started).

### Phase 0 — Housekeeping *(completed as part of this review)*

**Objective**: remove dead weight and stop planning docs from contradicting the
codebase before adding anything new.

- Removed `lib/models/Template.js` (zero references; verified via full-repo search,
  confirmed via a clean rebuild + full test pass after deletion).
- Marked `architecture-plan.md` and `roadmap.md` as historical/superseded, pointing
  at this document.
- Produced this document as the new source of forward-looking truth.

**Exit criteria**: ✅ build and `npm test` both clean post-cleanup; done.

---

### Phase 1 — Foundation Hardening *(do before meaningfully more traffic)*

**Objective**: close the security and operability gaps that get more expensive the
longer they're left, none of which require new product surface area.

- **Rate limiting** on signup, login, password reset, and the public lead-capture
  endpoint (Upstash Redis + `@upstash/ratelimit` — already the recommended approach
  in `architecture-plan.md`; just blocked on credentials).
- **CI pipeline** (GitHub Actions): run `npm run lint` and `npm test` on every PR.
  Zero automated gate exists today beyond a human remembering to run them.
- **Shared tenant-scoping helper**: a small wrapper so every model query is scoped by
  `tenantId` by construction rather than by remembering to add the filter — reduces
  the blast radius of the next new route someone adds under time pressure.
- **Finish or remove `notifications.emailOnNewLead`**: it currently lies to the user
  (the toggle looks live, nothing sends). Either wire it to a real send via the
  existing Resend integration, or remove the UI until it's built.
- **Documentation refresh**: `README.md` still describes 3 templates and `/l/` as the
  live route — bring it in line with reality so a new engineer isn't misled on day one.

**Exit criteria**: public endpoints throttled; a red PR check on lint/test failure;
`emailOnNewLead` either works or isn't shown; `README.md` matches the running app.

---

### Phase 2 — Advanced AI Agent Workflows & Automation

**Objective**: extend the proven schema-first agent pattern from "generate once at
onboarding" into ongoing, CRM-aware automation.

- **Persist onboarding personality/style/audience/technology as real `Tenant`
  fields** (today only logged to `AgentSession`) so they're editable later, the same
  way landing-page copy already is — this is the prerequisite for every other item
  below being tunable after the fact.
- **AI-assisted lead triage**: a schema-constrained agent action that reads a
  tenant's open leads and suggests next actions (reply drafts, stage moves,
  priority) — surfaced as suggestions the owner accepts or dismisses, never
  auto-applied, matching the existing "AI proposes, human commits" pattern used
  everywhere else in the product.
- **Regeneration diffing**: before an "AI Setup" rerun overwrites landing-page copy,
  show a diff and let the tenant accept/reject per field, instead of a full
  dotted-path overwrite.
- **Lead-reply drafting**: generate a suggested first-response email/message per
  lead, in the tenant's content language, using the same forced function-calling
  approach as `lib/agent.js`.

**Exit criteria**: at least one net-new agent action live in the dashboard beyond
onboarding/regeneration; onboarding preference fields are tenant-editable without a
full regenerate.

---

### Phase 3 — High-Converting Landing Page & CRM Enhancements

**Objective**: turn the landing page from "generated once" into something a tenant
can actively optimize, and close the CRM's remaining reporting gap.

- **Lead activity log**: timestamped stage-change and note history per lead — the
  single unlock for true funnel/stage-velocity analytics (today's stage occupancy is
  a snapshot only, explicitly caveated in the analytics UI).
- **A/B testing** of headline/CTA/template variants, measured against the lead
  conversion data the CRM already has.
- **Manual template switching** independent of AI regeneration (already scoped in
  `roadmap.md`), plus a 5th/6th template.
- **Team invites + role enforcement**: `User.role` already exists in the schema;
  this is the work to make it mean something (an invite-token flow, and a
  `requireRole()` gate on tenant-level config changes).
- **Webhook/Zapier egress** for captured leads, so Ceramony fits into a tenant's
  existing tool stack rather than requiring them to fully migrate.
- **Custom form fields v2**: building on the field system shipped this cycle —
  conditional/dependent fields, and a file-upload field type backed by the existing
  `Media` pipeline.

**Exit criteria**: a lead's stage history is queryable; at least one landing-page
element is A/B testable; a second team member can be invited into an existing tenant
with a restricted role.

---

### Phase 4 — Seamless Resume/CV Builder Integration

**Objective**: stop treating the CV builder as a bundled side feature and make it
pull its weight inside the core product loop.

- **Team-profile tie-in**: let a tenant's "About us"/team section on their landing
  page optionally pull from team members' CV data, instead of being written from
  scratch twice.
- **Shareable public CV links**, reusing the same public-route + content-language
  pattern already proven by `/pages/[tenantSlug]`.
- **Job-tailoring agent action**: paste a job posting, get a tailored CV variant —
  a natural extension of the existing polish/summarize actions in `lib/resumeAgent.js`.
- **More CV templates** and multi-language CV export using the CV builder's existing
  9-language content infrastructure (already built, currently under-leveraged).

**Exit criteria**: at least one CRM/landing-page surface consumes CV data; a CV can
be shared via a public link without dashboard access.

---

### Phase 5 — Localization & Modern UI/UX Architecture

**Objective**: close the gap between "landing pages support 9 languages" and "the
product UI itself supports 2," and formalize the design system that's grown
organically so far.

- **Expand the product UI dictionary beyond English/Hebrew** toward the same
  language set already supported for content (Spanish and Arabic are the highest
  -leverage next two, given Arabic reuses the existing RTL infrastructure wholesale).
- **Formalize the design-token system**: the CSS-variable set in `app/globals.css`
  and the semantic surface/danger/success tokens added for dark mode deserve a
  short internal style-guide doc — not a framework migration, just documentation, so
  the hand-built approach stays consistent as more contributors touch it.
- **Accessibility audit**: keyboard navigation, ARIA labeling, and color-contrast
  pass across the dashboard and public landing pages — not mentioned in any existing
  doc, and a real gap for a product aiming at broader/enterprise adoption.
- **Visual regression coverage**: even a lightweight screenshot-diff check on the 4
  landing-page templates and the dashboard shell would catch the class of CSS
  regression this codebase has hit before (e.g., the sidebar flex-compression bug
  fixed this cycle).

**Exit criteria**: at least one additional content-parity UI language ships;
a written design-token reference exists; a documented accessibility pass is complete
for the dashboard shell and public templates.

---

### Phase 6 — User Growth, Analytics Dashboard & Enterprise-Ready Scaling

**Objective**: the biggest-ticket, highest-effort items — the ones worth doing once
there's real demand, not before, per the existing roadmap's own guidance.

- **Landing-page traffic analytics**: a cookieless tracking beacon (hashed daily
  fingerprint, no cookie banner needed), bot filtering, and a rollup collection —
  the single most-requested-by-its-absence feature across every prior doc. Note the
  public page is ISR-cached, so this must be client-side, not server-counted.
- **Analytics pre-aggregation**: a daily rollup collection so the 3-year analytics
  window stays cheap as tenants' lead volume grows — currently computed in-memory
  per request, explicitly called out in `lib/analytics.js` as fine "until it isn't."
- **Media → object storage**: migrate `Media` from raw MongoDB `Buffer` storage to
  S3/R2/Vercel Blob with real responsive image variants — flagged as the most likely
  first infrastructure bottleneck as tenant count grows.
- **Billing (Stripe)**: `Tenant.plan` already exists and is unused; the natural first
  gate is analytics history depth and the advanced panels (already scoped in
  `roadmap.md`).
- **Custom domains per tenant** (Vercel Domains API — DNS verification + TLS
  provisioning is the real work here, not the Vercel integration itself).
- **Enterprise groundwork**: audit logging, tenant data export/deletion tooling, and
  a formal tenant-isolation review — worth doing once RBAC (Phase 3) and the shared
  scoping helper (Phase 1) are both in place, not before.

**Exit criteria**: a tenant can see real visit-to-lead conversion; a paid plan can be
purchased and actually gates something; at least one tenant is running on a custom
domain.

---

## 5. Suggested Sequencing

Phase 1 first, unconditionally — none of it is optional once the product has real
public traffic, and none of it blocks on product decisions. Phases 2–5 can run in
parallel workstreams (agent automation, CRM/landing-page, CV builder, and
localization/UI touch mostly disjoint parts of the codebase) once Phase 1's shared
scoping helper exists, since every new route in those phases should be built against
it from day one rather than retrofitted later. Phase 6 is deliberately last — it's
the highest-effort, most infrastructure-heavy set of items, and per the existing
roadmap's own framing, each one has "little payoff until the product has real usage."
