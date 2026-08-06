# Ceramony — Architecture & Product Summary

*Prepared from a full review of the codebase. Companion to `architecture-plan.md` (original design intent) and `roadmap.md` (shipped/planned features) — this document describes what's actually built today, as a base for scaling and planning new features.*

## 1. Overview & Core Value Proposition

Ceramony (repo name `crm-ai-agent`) is a multi-tenant SaaS product aimed at small businesses that need a lead-capturing website and a CRM but don't want to hire a designer or configure generic software. A company signs up, answers a handful of questions about their business, and an AI agent (Google Gemini) generates a branded landing page and a CRM instance — including copy, a fitting template, and a tailored sales pipeline — tailored to that specific business, in under a minute.

The core value proposition is **zero-to-working funnel**: instead of "here's a blank CRM, configure it yourself" or "here's a template, write your own copy," the product does both steps for the owner and hands them something usable immediately, while remaining fully editable afterward (copy, template, pipeline stages, branding are all changeable by hand at any time).

## 2. Feature Breakdown

### Authentication & accounts
- Email/password signup and login (NextAuth/Auth.js, credentials provider, JWT sessions carrying `tenantId`, `tenantSlug`, `role`, `emailVerified`)
- Password reset and signup email verification via emailed, hashed, expiring tokens (Resend)
- Tenant-scoped route protection (`proxy.js`, Next's renamed middleware convention) plus a defense-in-depth re-check in every server-rendered dashboard route
- Terms of Use acceptance gate at signup (template legal content, not yet reviewed by counsel)

### AI onboarding
- Short form: industry, company size, what counts as a "lead," desired tone, brand personality traits, visual style, target audience, technology positioning, brand color
- A single Gemini call (forced function-calling against a JSON schema, not prose parsing) returns: best-fit template, hero headline/subheadline/CTA, exactly 3 feature cards (each with an icon), and 4–6 custom pipeline stage names
- Fully re-runnable later ("AI Setup" in the sidebar) without wiping uploaded photos or logo; every run is logged to an `AgentSession` document for audit/debugging

### Landing page builder
- 4 selectable templates (Classic, Minimal, Bold, Showcase), each with a neutral square wireframe preview in the picker (no tenant branding baked into the previews)
- Per-tenant theme: primary/accent color, font family, applied via CSS variables
- Up to 3 hero background photos with auto-crossfade and a tinted scrim overlay
- Up to 6-photo gallery with a 2/3/4-column grid option
- Up to 3 feature cards, each with optional top-strip or border accenting in either theme color
- Logo upload, manual copy editor (independent of re-running AI generation)
- Public route at `/pages/[tenantSlug]` (moved this year from `/l/[tenantSlug]`, which now redirects for backward compatibility)

### Lead capture & CRM
- Public, unauthenticated lead-capture form on every landing page → creates a `Lead` tagged to that tenant
- Leads inbox: search, stage filter, unread tracking (badge in sidebar), first-open timestamping
- Lead detail view: field editing, freeform notes, delete
- Drag-and-drop pipeline board with an inline stage editor (rename/reorder/add/remove stages)
- Contacts list with inline edit/delete, search, and tags

### Analytics
- KPI cards (new leads, win rate, avg. first response time, backlog, form completeness, new contacts), each with a period-over-period delta
- Time series (leads over time, cumulative growth, win rate trend) across week/month/year/3-year windows
- Pipeline stage distribution, response-time distribution, form-field completion rates, a day×hour arrival heatmap, lead-source breakdown, and unanswered-backlog aging
- Entirely derived from existing `Lead`/`Contact`/`Pipeline` documents — there is no separate visitor/event tracking instrumented on the public pages

### Workplace (notebook)
- Tenant-created pages of two types: markdown documents (dependency-free custom renderer, live preview) and tables (typed columns: text/number/date/select/checkbox)
- Explicit Save model (not autosave) on both editors; table saves batch-reconcile the whole row set in one request
- Listed dynamically in the sidebar under "Workplace," alongside the fixed CRM nav items

### Settings & account
- Company profile, logo, contact details, social links, branding (colors/font)
- Appearance: light/dark mode toggle (dashboard-only; landing pages and auth screens are unaffected)
- "New here?" card linking to the in-app tutorial
- A "notifications" toggle for emailing on new leads exists in the UI but isn't wired to actually send anything yet

### Onboarding & help
- Full 5-step guided tutorial (step nav + content) and a condensed 3-page "quick tour" with Next/Back navigation, both reachable from Settings

### Transactional email & trust
- Branded HTML+plain-text email templates (logo, footer) for password reset and email verification, via Resend, with configurable FROM/REPLY_TO/product name
- Site-wide cookie consent notice (essential-cookies framing, no third-party tracking to disclose today)
- Full-screen branded video plays between a successful login and the dashboard landing

### Mobile
- The dashboard shell's sidebar becomes a hamburger-triggered off-canvas drawer below 780px width; desktop layout is unchanged

## 3. UI/UX & Design Architecture

- **No UI framework or component library** — no Tailwind, no MUI/Chakra/etc. Every screen is hand-written CSS Modules, generally one module per component or page.
- **Design tokens**: a small set of CSS custom properties in `app/globals.css` (`--background`, `--foreground`, `--muted`, `--border`, `--primary`, `--primary-hover`), recently extended with a larger semantic set (`--surface`, `--surface-accent`, `--danger`/`--success`/`--warning`/`--info` variants, etc.) to support dark mode. The dark overrides are scoped to the authenticated dashboard shell specifically, so a tenant's public landing page (which uses its own brand colors via `--tenant-primary`/`--tenant-accent`) and the pre-login auth screens are unaffected by a user's dashboard theme choice.
- **No icon library** — `components/icons.js` is a hand-drawn set of ~40 stroke-style 24×24 SVG icons using `currentColor`, covering nav, actions, and status.
- **No markdown library** — `lib/markdown.js` is a small custom parser that renders directly to React elements (not `dangerouslySetInnerHTML`), with a `safeHref` allowlist to prevent `javascript:`/`data:` link injection.
- **No charting library** — `components/charts/` contains 7 hand-built SVG chart types (bar, time series, donut, funnel, heatmap, horizontal bar list, sparkline) purpose-built for the analytics engine's output shape.
- **Layout pattern**: server components (`layout.js`, `page.js`) fetch tenant-scoped data and pass it down as props to client components that own interactivity (forms, drag-and-drop, the mobile nav drawer, editors). The dashboard shell itself was recently split into a server layout (data fetching) + a client `DashboardShell` (mobile drawer state).
- **Editing model**: consistently explicit-Save across the landing page editor, Settings, and both Workplace editors — nothing commits until the user clicks Save, with dirty-state tracking driving the button's enabled/disabled state. The one exception is UI-only preferences (theme, cookie consent), which persist instantly to `localStorage`.
- **Key user flows**:
  1. Signup → AI onboarding form → generated landing page + CRM pipeline, ready immediately.
  2. Landing page visitor submits the lead form → lead appears in the owner's inbox and overview stats within the same request cycle.
  3. Owner works a lead → notes/stage changes reflected on both the leads list and the pipeline board → optionally becomes a saved Contact.
  4. Owner can loop back into "AI Setup" at any time to regenerate copy without losing uploaded media.

## 4. Technical Stack & Infrastructure

### Frontend & backend
- **Framework**: Next.js 16.2.12, App Router, Turbopack for local dev. A single codebase serves both UI and API — Next's route handlers are the entire backend, no separate server process.
- **UI**: React 19.2.4 / React DOM 19.2.4.
- **Language**: Plain JavaScript (JSX), no TypeScript — `jsconfig.json` provides the `@/*` path alias only.
- **Linting**: ESLint 9 with `eslint-config-next` (flat config). No test framework and no CI configuration are present in the repository.

### Auth
- NextAuth (Auth.js) v5 beta, Credentials provider, `bcryptjs` for password hashing, JWT session strategy.
- Route protection via `proxy.js` (Next 16's renamed middleware convention) matching `/t/:path*`, redirecting unauthenticated users to `/login` and blocking a logged-in user from loading another tenant's dashboard by editing the URL.

### Database
- **MongoDB** via Mongoose ~9.x. Connection is memoized on the global object (`lib/db.js`) to survive hot reloads and serverless re-invocations without opening a new connection per request.
- **Models**: `Tenant`, `User`, `Lead`, `Contact`, `Pipeline`, `Media`, `Template` (defined but not actually queried anywhere — the live template registry is a hardcoded object in `lib/templates.js`), `AgentSession`, `VerificationToken` (TTL-indexed for automatic expiry), `WorkspaceItem`, `WorkspaceRow`.
- **Multi-tenancy model**: every tenant-scoped query is manually filtered by `tenantId` at the call site in each route/page. There is no schema-level or middleware-level enforcement of this boundary — it's a convention, applied consistently today, across roughly 20 API route handlers.
- Useful indexes exist where they're load-bearing (`Lead` on `{tenantId, read}` for the sidebar badge and `{tenantId, createdAt}` for analytics range scans; `Media` on `{tenantId, kind, createdAt}`).

### AI integration
- **Provider**: Google Gemini (`@google/genai`, model alias `gemini-flash-latest`), called server-side only.
- **Pattern**: forced function-calling against a single JSON-schema tool definition (`generate_site_config`) rather than free-form prose parsing — the model's only job is to fill in a fixed schema and pick from the existing template list, which is what makes the output reliable enough to write straight into the database.
- Every generation call's input and output is persisted to `AgentSession` for later inspection or regeneration.

### Email
- **Resend** for password reset and verification emails. FROM must be a Resend-verified domain (a free-provider address like Gmail can't be used as FROM); REPLY_TO can be any address, including Gmail, and is used to route replies to a personal inbox without touching sender authentication.
- HTML templates are table-based with inline styles (required for Outlook/Gmail rendering); a plain-text counterpart is sent alongside every HTML email.

### Media storage
- Uploaded images are resized and compressed **client-side** before upload, then stored as raw `Buffer` bytes directly on `Media` documents in MongoDB (capped at 1.5MB server-side as a backstop) — there is no S3/Cloudflare R2/Vercel Blob or other object storage in the stack.
- Served through a same-origin API route (`/api/media/[id]`) with ETag support and a one-year immutable `Cache-Control` header, on the reasoning that a given image is fetched from Mongo once and served from the CDN edge indefinitely after.

### Deployment & hosting
- **Vercel** for hosting (the product's own domain, `ceramony.co`, was connected to a Vercel project this year), **GitHub** for source control, auto-deploying on push to `main`.
- **MongoDB Atlas** is the implied database host (per `.env.example`'s connection string format), though this isn't fixed by code — any Mongo-compatible URI works.
- Environment configuration: `MONGODB_URI`, `AUTH_SECRET`, `GOOGLE_API_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`/`REPLY_TO_EMAIL`/`PRODUCT_NAME`, `APP_URL` — all read from `.env.local` locally and Vercel project environment variables in production.

## 5. Current Usage & Workflows

1. **Signup**: company name, name, email, password → a new `Tenant` and a default 5-stage `Pipeline` are created, the user is made its `owner`, and a best-effort verification email is sent (a failure here doesn't block account creation).
2. **AI onboarding**: the new owner fills the onboarding form; Gemini returns a template pick, hero copy, 3 features, and pipeline stages, all written directly onto the tenant and logged to `AgentSession`.
3. **Dashboard**: the owner lands on `/t/<slug>` — sidebar navigation to Overview, Leads, Analytics, Pipeline, Contacts, Edit landing page, AI Setup, Settings, and any Workplace pages they've created. A full-screen branded video plays between every successful login and this screen.
4. **Publishing**: the generated landing page is already live at `/pages/<slug>`; the owner can adjust template, gallery, colors, and copy from the Site editor and Settings at any time, or re-run AI Setup to regenerate copy without losing uploaded photos.
5. **Lead flow**: a visitor to the public landing page submits the lead form → a `Lead` document is created tagged to that tenant → it shows up unread in the Leads inbox and in the dashboard's overview stats. The owner opens it (stamping first-response time for analytics), adds notes, moves it through pipeline stages (reflected on both the Leads list and the drag-and-drop board), and optionally saves it as a `Contact`.
6. **Analytics**: the owner can review this activity across week/month/year/3-year windows — volume trend, win rate, stage distribution, response-time bands, submission completeness, an arrival heatmap, lead sources, and backlog aging.
7. **Workplace**: alongside the fixed CRM screens, the owner can create their own documents or typed-column tables for anything else they want to track, each with an explicit Save step.
8. **Preferences**: dark mode and cookie-notice acknowledgment are the only two things persisted client-side (`localStorage`) rather than in the database; everything else round-trips through Mongo.

## 6. Scalability & Architectural Gaps

### Data & storage
- **Media lives inside MongoDB, not object storage.** Every logo, background, and gallery photo (up to 10 images per tenant, each up to 1.5MB) is stored as a raw `Buffer` on a `Media` document rather than in S3/R2/Vercel Blob. This is very likely the **first real bottleneck** as tenant count grows: it inflates the primary database's working set and backup size, and there's no image-optimization pipeline (no `next/image`, no responsive size variants — the same full-resolution blob ships to every viewport). The code's own comments already acknowledge this is a "fetch once, cache at the edge forever" workaround rather than a real CDN/object-storage setup.
- **Analytics computes everything in memory per request**, pulling every `Lead` in the selected window (up to 3 years) into a single query with no caching or pre-aggregation. Explicitly documented in `lib/analytics.js` as acceptable "until a tenant gets big enough for the 3-year window to hurt," at which point the fix is a pre-aggregated daily rollup collection — worth planning for before a large tenant hits this rather than after.
- **A `Template` Mongoose model/collection exists but is never queried** — the real template registry is a hardcoded JS object (`lib/templates.js`). This is dead schema surface that should either be wired up (to make template metadata data-driven) or removed to avoid confusing future engineers.

### Multi-tenancy & security
- **Tenant isolation is convention, not enforcement.** Every route manually filters by `tenantId`; there's no shared query-scoping helper, ORM-level tenant binding, or database-level row security. It's held up correctly across ~20 route handlers so far, but the risk of a single missed filter in a new endpoint (a cross-tenant data leak) grows with every new feature added without a shared safety net.
- **No rate limiting anywhere** — signup, login, password reset, and the public, unauthenticated lead-capture endpoint all accept unlimited requests. This is an open abuse surface today (credential stuffing, fake signups, spammed leads) with no per-IP throttling or CAPTCHA in front of any of it.
- **Role field is inert.** `User.role` (owner/admin/member) is stored but nothing in the codebase branches on it — there's no team-invite flow and no permission differences between roles, despite the schema modeling for multi-seat teams.
- **Billing/plan gating doesn't exist.** `Tenant.plan` (free/pro) is stored but unused; there's no Stripe (or other) integration and no feature limits enforced by plan, despite the schema already anticipating it.

### Reliability & operations
- **No automated tests, no CI pipeline.** The only automated check is `npm run lint`, run by hand. Regressions currently depend entirely on manual click-through testing before each deploy.
- **No background job/queue infrastructure.** AI generation and email sending both happen synchronously inside the request that triggers them. Fine at current volume, but there's nothing in place (queue, webhook, job runner) to build on once a slow Gemini or Resend call needs to stop blocking the response.
- **Single-provider dependency chain with no fallback**: Vercel (hosting), MongoDB Atlas (data), Google Gemini (AI generation), and Resend (email) are each hard dependencies. An outage or quota exhaustion on any one degrades a core flow — most notably Gemini, since AI onboarding has no fallback path beyond a generic error message.
- **A known dead feature**: the "email me on new leads" toggle in Settings saves a value that no code path ever reads — it's a UI element with no backing behavior.

### Documentation drift
- `README.md` describes an earlier version of the app (3 templates instead of 4, `/l/[tenantSlug]` as the live public route instead of `/pages/[tenantSlug]`, and no mention of the Workplace notebook, analytics dashboard, tutorial, dark mode, or cookie banner). It's worth a documentation pass before onboarding another engineer or contractor, since it would currently give a materially outdated picture of the product.

### Product gaps relevant to scaling
- **No per-tenant custom domains.** The platform's own marketing domain (`ceramony.co`) is connected to Vercel, but there's no infrastructure for an individual tenant to point their own domain at their landing page — they're limited to `/pages/<slug>` under the shared domain. This is a common upsell/retention feature for this product category and would need real design work (DNS verification per tenant, TLS provisioning, routing).
- **No team/multi-seat support** and **no billing** are both already anticipated in the schema (`role`, `plan`) but have zero implementation — these are natural "next" investments once the core product needs to monetize or serve larger customers.
