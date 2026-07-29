# CRM AI Agent

Multi-tenant SaaS: a company signs up, gets a lead-capturing landing page and a CRM
tailored to their business. See `architecture-plan.md` (in the project root, outside
this repo) for the full design; this README covers running and deploying what's built
so far — Phase 1 of that plan.

## What's included (Phase 1)

- Sign up / log in (Auth.js, credentials provider, JWT sessions carrying tenant + role)
- Tenant-scoped middleware protecting `/t/[tenantSlug]` dashboard routes
- One landing page template at `/l/[tenantSlug]` with a lead-capture form
- Basic CRM: leads inbox (with stage editing), a simple pipeline board, contacts list

Not yet built (Phase 2+): the AI agent that generates copy/config from onboarding
answers, multiple templates, custom domains, billing.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI` — a MongoDB Atlas connection string (free tier is fine to start:
     https://www.mongodb.com/cloud/atlas/register)
   - `AUTH_SECRET` — generate one with `npx auth secret`

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000`, sign up, and you'll land on your tenant's dashboard
   at `/t/your-company-slug`. Your public landing page is at `/l/your-company-slug`.

## Deploying (GitHub + Vercel)

1. Push this repo to GitHub (see commands below if it isn't pushed yet).
2. In Vercel: **Add New Project** → import the GitHub repo.
3. In the Vercel project's Environment Variables settings, add the same variables from
   `.env.local` (`MONGODB_URI`, `AUTH_SECRET`).
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
  /l/[tenantSlug]            → public tenant landing page
  /api                        → route handlers (auth, signup, leads, contacts)
/components
  /templates/default          → the one landing-page template so far
/lib
  db.js                       → MongoDB connection
  models/                      → Tenant, User, Lead, Contact, Pipeline, Template
  slugify.js
middleware.js                  → tenant-scoped route protection
auth.js                         → Auth.js configuration
```
