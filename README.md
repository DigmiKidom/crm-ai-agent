# CRM AI Agent

Multi-tenant SaaS: a company signs up, gets a lead-capturing landing page and a CRM
tailored to their business. See `architecture-plan.md` (in the project root, outside
this repo) for the full design; this README covers running and deploying what's built
so far — Phase 1 and the first pass of Phase 2.

## What's included

- Sign up / log in (Auth.js, credentials provider, JWT sessions carrying tenant + role)
- Tenant-scoped middleware protecting `/t/[tenantSlug]` dashboard routes
- **AI onboarding**: a short form (industry, company size, what counts as a lead, tone,
  brand color) that calls the Claude API to generate landing page copy and a tailored
  pipeline for that business — shown at signup, and revisitable anytime via "AI Setup"
  in the dashboard sidebar
- Landing page at `/l/[tenantSlug]` rendering that generated copy, with a lead-capture form
- CRM: leads inbox with stage editing, a lead detail view (edit fields, notes, delete),
  a drag-and-drop pipeline board, and a contacts list with inline edit/delete

Not yet built (later phases): multiple landing page templates, custom domains, billing,
team invites.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI` — a MongoDB Atlas connection string (free tier is fine to start:
     https://www.mongodb.com/cloud/atlas/register)
   - `AUTH_SECRET` — generate one with `npx auth secret`
   - `ANTHROPIC_API_KEY` — from https://console.anthropic.com — needed for the AI
     onboarding step; without it, "Generate my site" will show an error but you can
     still "Skip for now" and use the app with default landing page copy.

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
   `.env.local` (`MONGODB_URI`, `AUTH_SECRET`, `ANTHROPIC_API_KEY`).
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
  /t/[tenantSlug]            → CRM dashboard (auth-gated)
    /onboarding               → AI onboarding form
    /leads/[leadId]           → lead detail view
    /pipeline                 → drag-and-drop pipeline board
    /contacts                 → contacts list
  /l/[tenantSlug]            → public tenant landing page
  /api                        → route handlers (auth, signup, leads, contacts, agent)
/components
  /templates/default          → the one landing-page template so far
/lib
  db.js                       → MongoDB connection
  agent.js                     → Claude API call + structured output schema
  models/                      → Tenant, User, Lead, Contact, Pipeline, Template, AgentSession
  slugify.js
proxy.js                        → tenant-scoped route protection (Next's middleware convention)
auth.js                         → Auth.js configuration
```
