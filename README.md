# CRM AI Agent

Multi-tenant SaaS: a company signs up, gets a lead-capturing landing page and a CRM
tailored to their business. See `architecture-plan.md` (in the project root, outside
this repo) for the full design; this README covers running and deploying what's built
so far — Phase 1 and the first pass of Phase 2.

## What's included

- Sign up / log in (Auth.js, credentials provider, JWT sessions carrying tenant + role)
- Password reset (`/forgot-password` → emailed link → `/reset-password`) and signup
  email verification, both via Resend — see `lib/email.js` and `lib/tokens.js`
- Tenant-scoped middleware protecting `/t/[tenantSlug]` dashboard routes
- **AI onboarding**: a short form (industry, company size, what counts as a lead, tone,
  brand color) that calls the Gemini API (`lib/agent.js`) to generate landing page copy
  and a tailored pipeline for that business — shown at signup, and revisitable anytime
  via "AI Setup" in the dashboard sidebar
- Manual editing of the AI's output: an "Edit landing page" screen for the generated
  copy, and an inline stage editor (rename/reorder/add/remove) on the pipeline page
- Landing page at `/l/[tenantSlug]` rendering that generated copy, with a lead-capture
  form, across three templates (Classic, Minimal, Bold)
- CRM dashboard: an overview page (`/t/[tenantSlug]`) with stats and recent leads; a
  leads inbox (`/leads`) with stage editing, search, and stage/date filters; a lead
  detail view (edit fields, notes, delete); a drag-and-drop pipeline board; and a
  contacts list with inline edit/delete and search
- Custom hand-drawn icon set and logo (no icon library or stock art —
  `components/icons.js`, `components/Logo.js`), used throughout the sidebar nav and
  action buttons
- Terms of Use page (`/terms`, template content — needs real legal review), linked
  and required-checkbox-gated at signup

Not yet built: rate limiting on auth endpoints, custom domains, billing, team invites.

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
     onboarding step; without it, "Generate my site" will show an error but you can
     still "Skip for now" and use the app with default landing page copy.
   - `RESEND_API_KEY` — from https://resend.com — needed for password reset and
     signup verification emails. Without it, those emails silently fail to send (the
     rest of the app still works) — check server logs if a reset/verify email doesn't
     arrive. The default sender (`onboarding@resend.dev`) only delivers to the email
     on the Resend account itself; verify a domain and set `FROM_EMAIL` to send to
     real users.
   - `APP_URL` — base URL used to build links inside those emails (defaults to
     `http://localhost:3000`; set to your real deployed URL in production).

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000`, sign up, and you'll be walked through the AI
   onboarding, then land on your tenant's dashboard at `/t/your-company-slug`. Your
   public landing page is at `/l/your-company-slug`.

## Deploying (GitHub + Vercel)

1. Push this repo to GitHub (see commands below if it isn't pushed yet).
2. In Vercel: **Add New Project** → import the GitHub repo.
3. In the Vercel project's Environment Variables settings, add the same variables from
   `.env.local` (`MONGODB_URI`, `AUTH_SECRET`, `GOOGLE_API_KEY`, `RESEND_API_KEY`,
   `APP_URL` — set this to the real deployed URL, not localhost).
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
  /login, /signup           → auth pages
  /forgot-password, /reset-password → password reset flow
  /terms                     → Terms of Use
  /t/[tenantSlug]            → CRM dashboard (auth-gated)
    /                          → overview page (stats, recent leads)
    /leads, /leads/[leadId]    → leads inbox + lead detail view
    /onboarding               → AI onboarding form
    /site                     → manual landing page copy editor
    /pipeline                 → drag-and-drop pipeline board + stage editor
    /contacts                 → contacts list
  /l/[tenantSlug]            → public tenant landing page
  /api                        → route handlers (auth, signup, leads, contacts, agent, tenant)
/components
  /templates/default, minimal, bold → the landing-page templates
  icons.js, Logo.js, LogoMark.js → custom icon set + logo
  DashboardNav.js               → sidebar nav (active-route highlighting)
  PillGroup.js, CheckboxGroup.js, ColorSwatchGroup.js → onboarding form controls
/lib
  db.js                       → MongoDB connection
  agent.js                     → Gemini API call + structured output schema
  email.js                     → Resend wrapper (reset/verification emails)
  tokens.js                    → hashed, expiring token helpers for reset/verification
  models/                      → Tenant, User, Lead, Contact, Pipeline, Template, AgentSession, VerificationToken
  slugify.js
proxy.js                        → tenant-scoped route protection (Next's middleware convention)
auth.js                         → Auth.js configuration
```
