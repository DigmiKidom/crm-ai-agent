# Ceramony (CRM AI Agent)

Multi-tenant SaaS: a company signs up, answers a handful of onboarding questions, and
gets a live, branded, lead-capturing landing page plus a working CRM in under a minute —
fully editable afterward. See `CERAMONY_FUTURE_ROADMAP.md` for the current architecture
review and forward plan (`architecture-plan.md` and `roadmap.md` are kept as historical
record and point there now).

## What's included

- Sign up / log in (Auth.js v5, credentials provider, JWT sessions carrying tenant + role)
- Password reset (`/forgot-password` → emailed link → `/reset-password`) and signup
  email verification, both via Resend — see `lib/email.js` and `lib/tokens.js`
- Tenant-scoped `proxy.js` (Next.js 16's name for what used to be `middleware.js` —
  only one of the two is allowed) protecting `/t/[tenantSlug]` dashboard routes: it
  requires a logged-in session and blocks a user from one tenant loading another
  tenant's dashboard by editing the URL's slug.
- **Rate limiting**, sharing that same `proxy.js` file, on signup, login, password
  reset, and the public lead-capture endpoint (`lib/rateLimit.js`, Upstash Redis +
  `@upstash/ratelimit`). Silently disabled until `UPSTASH_REDIS_REST_URL`/
  `UPSTASH_REDIS_REST_TOKEN` are set — see Local setup below.
- Tenant isolation via a shared scoping helper (`lib/tenantScope.js` +
  `lib/tenantSession.js`): every authenticated route resolves the session once and
  scopes its model queries to that tenant by construction, not by a hand-repeated
  `{ tenantId }` filter at each call site.
- **AI onboarding**: a short form (industry, company size, what counts as a lead, tone,
  personality, target audience, brand color) that calls the Gemini API (`lib/agent.js`)
  to generate landing-page copy, feature cards, a tailored pipeline, and the content
  language for that business — shown at signup, and rerunnable anytime via "AI Setup"
  in the dashboard sidebar. Fully hand-editable afterward without a regeneration.
- **AI-assisted CV/Resume Builder** (`/t/[tenantSlug]/cv`): a 5-step guided builder
  sharing the same AI-agent pattern (`lib/resumeAgent.js`, polish/summarize actions),
  i18n, and print-to-PDF export (the on-screen preview *is* the printed page).
- **Full i18n**: a dependency-free product-UI dictionary (English/Hebrew/Spanish, cookie-driven,
  RTL via CSS logical properties — `lib/i18n/`), independent of a *separate*
  content-language axis (9 languages) for landing-page copy and CV documents.
- Landing page at `/pages/[tenantSlug]` (ISR-cached, `revalidate = 60`) rendering the
  generated copy through a configurable lead-capture form (up to 8 fields, typed,
  required/optional — `lib/formFields.js`), across four templates (Classic, Minimal,
  Bold, Showcase). `/l/[tenantSlug]` still resolves — it's a permanent redirect to
  `/pages/[tenantSlug]`, kept for old links, not the canonical route anymore.
- CRM dashboard: an overview page (`/t/[tenantSlug]`) with stats and recent leads; an
  **analytics** screen (KPIs with period deltas, time series, stage occupancy, response
  time/backlog distributions, a day×hour heatmap, lead sources); a leads inbox
  (`/leads`) with stage editing, search, and stage/date filters; a lead detail view
  (edit fields, notes, editable custom-field answers, delete); a drag-and-drop pipeline
  board with an inline stage editor; a contacts list; and a **workspace** notebook
  (`/w/[itemId]`) of free-form docs and simple tables per tenant.
- Optional per-tenant new-lead email notification (Settings → toggle → Resend, see
  `lib/email.js`).
- Custom hand-drawn icon set, logo, charts, and markdown rendering (no icon library,
  chart library, or markdown library — `components/icons.js`, `components/Logo.js`,
  `components/charts/`), used throughout the product.
- Terms of Use page (`/terms`, template content — needs real legal review) and a cookie
  consent banner, both linked/gated at signup.

`npm run lint` and `npm test` run on every PR and push to `main` via
`.github/workflows/ci.yml` — see Testing & CI below.

Not yet built: team invites, custom domains, billing, visitor/traffic analytics on
public landing pages. See `CERAMONY_FUTURE_ROADMAP.md` for the full phased plan.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI` — a MongoDB Atlas connection string (free tier is fine to start:
     https://www.mongodb.com/cloud/atlas/register)
   - `AUTH_SECRET` — generate one with `npx auth secret`
   - `GOOGLE_API_KEY` — from https://aistudio.google.com/apikey — needed for the AI
     onboarding step and the CV assistant; without it, those actions show an error but
     you can still "Skip for now" and use the app with default landing-page copy.
   - `RESEND_API_KEY` — from https://resend.com — needed for password reset, signup
     verification, and new-lead notification emails. Without it, those emails silently
     fail to send (the rest of the app still works) — check server logs if one doesn't
     arrive. The default sender (`onboarding@resend.dev`) only delivers to the email on
     the Resend account itself; verify a domain and set `FROM_EMAIL` to send to real
     users.
   - `APP_URL` — base URL used to build links inside those emails (defaults to
     `http://localhost:3000`; set to your real deployed URL in production).
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional. From
     https://console.upstash.com (the REST API credentials, not the Redis protocol
     URL). Without these, rate limiting is disabled and those endpoints are
     unthrottled — fine for local dev, set these before taking real public traffic.

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000`, sign up, and you'll be walked through the AI
   onboarding, then land on your tenant's dashboard at `/t/your-company-slug`. Your
   public landing page is at `/pages/your-company-slug`.

## Testing & CI

```bash
npm run lint
npm test
```

`npm test` runs a handful of hand-written Node scripts (no framework, matching the
rest of this codebase's hand-built philosophy): server/client boundary checks
(`test/boundaries.test.mjs`), analytics math (`test/analytics.test.mjs`), i18n
dictionary integrity/parity (`test/i18n.test.mjs`), and the tenant-scoping helper's
"by construction" guarantee (`test/tenantScope.test.mjs`). Both commands run on every
pull request and push to `main` via `.github/workflows/ci.yml`.

## Deploying (GitHub + Vercel)

1. Push this repo to GitHub (see commands below if it isn't pushed yet).
2. In Vercel: **Add New Project** → import the GitHub repo.
3. In the Vercel project's Environment Variables settings, add the same variables from
   `.env.local` (`MONGODB_URI`, `AUTH_SECRET`, `GOOGLE_API_KEY`, `RESEND_API_KEY`,
   `APP_URL` — set this to the real deployed URL, not localhost — and
   `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` once you're ready to enforce
   rate limiting in production).
4. Deploy. Vercel will rebuild automatically on every push to `main`, with preview
   deployments for pull requests.

### First push to GitHub

```bash
git remote add origin <your-new-repo-url>
git branch -M main
git push -u origin main
```

## Project structure

```
/app
  /(marketing)-style home page at /
  /login, /signup                   → auth pages
  /forgot-password, /reset-password → password reset flow
  /terms                            → Terms of Use
  /pages/[tenantSlug]               → public tenant landing page (ISR, revalidate=60)
  /l/[tenantSlug]                   → permanent redirect shim → /pages/[tenantSlug]
  /t/[tenantSlug]                   → CRM dashboard (auth-gated by proxy.js, re-verified in layout.js)
    /                                 → overview page (stats, recent leads)
    /analytics                       → KPIs, time series, funnel/heatmap
    /leads, /leads/[leadId]          → leads inbox + lead detail view
    /pipeline                        → drag-and-drop pipeline board + stage editor
    /contacts                        → contacts list
    /onboarding                      → AI onboarding form ("AI Setup")
    /site                            → manual landing-page copy editor
    /settings                        → company profile, theme, notifications
    /profile                         → the signed-in user's own profile
    /cv                              → AI-assisted CV/Resume builder
    /w/[itemId]                      → workspace notebook (docs + simple tables)
    /tutorial                        → in-app getting-started guide
  /api                               → route handlers (auth, signup, leads, contacts,
                                        media, agent, resume, tenant, workspace, profile)
/components
  /templates/default, minimal, bold, showcase → the landing-page templates
  /charts, /resume, /i18n            → hand-built charts, CV builder UI, locale provider
  icons.js, Logo.js, LogoMark.js     → custom icon set + logo
  DashboardNav.js, DashboardShell.js → sidebar nav + dashboard chrome
/lib
  db.js                       → MongoDB connection (cached across invocations)
  agent.js                    → Gemini site-generation agent (forced function-calling)
  resumeAgent.js               → Gemini CV-polish/summarize agent, same pattern
  email.js                     → Resend wrapper (reset/verification/new-lead emails)
  tokens.js                    → hashed, expiring token helpers for reset/verification
  rateLimit.js                 → Upstash-backed per-endpoint rate limiting
  tenantSession.js             → auth-check boilerplate for tenant-scoped routes
  tenantScope.js                → wraps a Model so queries carry tenantId by construction
  formFields.js, landingCopy.js, templates.js, analytics.js, workspace.js
  i18n/                         → locale config, translator, en/he dictionaries
  models/                       → Tenant, User, Lead, Contact, Pipeline, Media,
                                   AgentSession, VerificationToken, WorkspaceItem,
                                   WorkspaceRow, Resume
proxy.js                        → dashboard auth guard + rate limiting (Next 16's
                                   middleware.js, renamed; only one file is allowed)
auth.js                         → Auth.js configuration (credentials provider, JWT)
```
