# Roadmap

> **Superseded by `CERAMONY_FUTURE_ROADMAP.md`.** This file is kept as the shipped-feature
> changelog up to that point — everything under "Shipped so far" below is still accurate
> history. For current priorities and what's next, use the new roadmap instead; several
> items below (rate limiting, team invites, custom domains, billing) are restated there
> with updated context now that localization, the CV builder, and configurable lead forms
> have shipped since this was last current.

What's already shipped, and what's next, roughly in the order it's worth tackling. See
`architecture-plan.md` for the original design and `crm-ai-agent/README.md` for what's
running today.

## Shipped so far

Signup and login with tenant-scoped sessions, a working AI onboarding flow (Gemini
generates landing page copy, picks a template, and designs a pipeline from a few
questions about the business), three landing page templates, lead capture from the
public landing page, a CRM with a leads inbox (with search/filtering), a lead detail
view with notes, a drag-and-drop pipeline board, a contacts list with inline
edit/delete and search, manual editing of the AI-generated landing page copy and
pipeline stages, and password reset + signup email verification via Resend.

Note: the AI onboarding agent originally ran on Claude (Anthropic); it was switched
to Google's Gemini API (`gemini-flash-latest`, via `@google/genai`) partway through,
so `architecture-plan.md`'s references to Claude/Anthropic for the agent are out of
date — everything else in that doc still reflects the current design.

Also shipped: a custom hand-drawn icon set and logo (`components/icons.js`,
`components/Logo.js`/`LogoMark.js` — no icon library, no stock art), a restyled
dashboard sidebar with icon + active-state nav rows, a new dashboard overview page
(`/t/[tenantSlug]`, stats + recent leads — the leads inbox moved to
`/t/[tenantSlug]/leads`), a Terms of Use page linked from signup (with a required
agree checkbox), and a richer AI onboarding form using pill/checkbox groups
(company size, tone, personality, visual style, target audience, tech positioning,
color swatches) that feed directly into the Gemini prompt for more tailored copy.

## Design & UX — shipped this pass, worth knowing about

**Custom icon set + logo.** `components/icons.js` is a small hand-authored set (not
a library) — add new icons there as new UI needs them, following the same 24x24,
stroke-based style. `components/Logo.js` renders the mark + wordmark; pass
`iconOnly` for compact spots.

**Dashboard overview page.** `/t/[tenantSlug]` is now a stats/recent-activity page
instead of the leads table. If anything else still assumes the root tenant route is
the leads inbox, it needs updating to `/t/[tenantSlug]/leads`.

**Onboarding form fields.** `personality`, `style`, `targetAudience`, and
`technology` are now collected and passed into the Gemini prompt in `lib/agent.js`,
but not yet stored as their own tenant fields (they're logged in `AgentSession` for
now). Worth revisiting if the "manual editing" screen should let a tenant tweak
these later, similar to landing page copy.

**Terms of Use content.** `app/terms/page.js` is a generic template with
placeholders (`[Company Name]`, `[Jurisdiction]`, `[support email]`) and an explicit
disclaimer — needs real legal review before this matters for real users.

## Near-term — worth doing before real users show up

**Password reset and email verification. — Shipped.** `RESEND_API_KEY` is now set.
Forgot-password flow: `/forgot-password` → emailed link → `/reset-password?token=...`,
backed by hashed, expiring, single-use tokens (`VerificationToken` model, TTL-indexed
so expired ones self-clean). Signup now sends a verification email; the link hits
`/api/auth/verify-email` and redirects to login with a status message. Unverified
users see a dismissible-by-verifying banner in the dashboard with a resend button.
Note: the sender is Resend's shared `onboarding@resend.dev` address, which only
delivers to the email on the Resend account itself — verify a domain in the Resend
dashboard and set `FROM_EMAIL` in `.env.local` before this can email real signups.

**Manual editing of what the AI generates. — Shipped.** The agent used to write the
landing page copy and pipeline stages once, with the only way to change them being a
full onboarding rerun. There's now an "Edit landing page" screen (headline,
subheadline, CTA text, features — add/remove/reorder) at `/t/[tenantSlug]/site`, and
an inline stage editor on the pipeline page for renaming, reordering, adding, and
removing pipeline stages. Renaming a stage updates every lead currently in it;
removing a stage is blocked while leads are still in it, with a message telling the
user to move them first.

**Search and filtering on leads/contacts. — Shipped.** The leads inbox now has a
name search box plus stage and date-received filters (URL-param driven, so results
are bookmarkable/shareable). The contacts list has a search box across name,
company, and email.

**Rate limiting on auth endpoints.** Signup and login are public and currently
unthrottled. Cheap to add (Upstash Redis + `@upstash/ratelimit`, as noted in the
architecture plan) and matters more the moment this is live on a public URL.
**Blocked** on Upstash credentials — nothing in `.env.local` yet.

## Mid-term — once there's more than one person using it

**Team invites.** Today every user has to sign up as their own company (owner of a
new tenant) — there's no way to invite a teammate into an existing one. This was
already scoped in the architecture plan (an invite token carrying tenantId + role);
building it is what makes this usable by an actual team rather than a solo user.

**Manual template switching + more templates.** The agent picks a template
automatically today; letting a tenant browse and switch between templates themselves
(independent of rerunning onboarding) is a natural companion to adding a 4th or 5th
template.

**Activity log per lead.** Beyond the free-text notes field that exists now, a
timestamped log of stage changes and note edits on a lead would make the detail page
noticeably more useful for anyone managing more than a handful of leads.

**Basic reporting. — Shipped, and then some.** There's now a full analytics screen at
`/t/[tenantSlug]/analytics` with a Week / Month / Year / 3-years range picker (URL-param
driven, so a view is bookmarkable). Six KPI cards with previous-period deltas and
sparklines, plus panels for: leads received over time (with the previous period overlaid
as a dashed line), cumulative growth, outcomes donut, current stage occupancy, win rate
over time, speed-to-first-response bands, unanswered backlog aging, form field completion,
lead sources, a 7x24 "when leads arrive" heatmap, day-of-week and hour-of-day bars,
contact book growth, and an auto-generated plain-language "what stands out" panel.

Two things worth knowing about how this was built:

*Everything is derived from data the CRM already stores.* There is no visitor or event
tracking on the public landing pages, so the analytics can't show page views, bounce rate,
or a true visit-to-lead conversion rate. "Form submissions" means submitted leads, and the
completion panel measures which optional fields (phone, message) visitors actually filled
in. Adding real conversion-rate reporting means adding a tracking pipeline first — a
cookieless beacon endpoint plus a daily rollup collection, since raw events over a 3-year
window don't stay cheap to query.

*Charts are hand-built SVG, no chart library* — same reasoning as `components/icons.js`.
They live in `components/charts/` (`TimeSeriesChart`, `BarChart`, `DonutChart`, `HBarList`,
`FunnelBars`, `Heatmap`, `Sparkline`) and all styling flows from `charts.module.css` off
`--primary`. Only `TimeSeriesChart` / `BarChart` / `DonutChart` are client components (they
have hover tooltips); the rest render on the server. Note that they take a `unit` **string**,
not a `format` function — the pages using them are server components and function props
can't cross that boundary.

`lib/analytics.js` does all the aggregation in one pass: it fetches a tenant's leads once,
projected down to the fields the metrics need, and computes everything in memory. That's
deliberate, since most panels need the individual documents anyway. `Lead` gained a
`{ tenantId, createdAt }` index for the range scan. If a tenant ever grows enough for the
3-year window to hurt, the fix is a pre-aggregated daily rollup collection rather than more
aggregation pipelines.

*Caveat carried in the UI:* stage occupancy is a snapshot, not a pass-through funnel — the
CRM keeps no stage-change history, so we can't say how many leads moved *through* a stage.
The activity-log item below is what would unlock true funnel and stage-velocity reporting.

## Longer-term — scaling and monetization

**Custom domains per tenant.** Letting a company point their own domain at their
landing page instead of using a subdomain/path. Vercel supports this via its Domains
API, but it's real work (DNS verification, SSL) — worth doing once there's demand for
it specifically, not before.

**Billing (Stripe).** Subscription tiers and usage limits. The `plan` field on `Tenant`
(`free` | `pro`) exists but nothing reads it yet — the analytics screen is deliberately
unlocked for everyone right now. The obvious first paywall, once there's a reason to
charge, is history depth and the advanced panels: free gets the last 30 days and the
headline counts, pro gets the year/3-year ranges, the heatmap, response-time and backlog
reporting, and CSV export. Gating that is a small change to the analytics page; Stripe
checkout is the larger separate piece.

**Landing page traffic analytics.** The single biggest gap in the reporting today: we can
show how many leads arrived but not how many people saw the page, so there's no
visit-to-lead conversion rate, no traffic sources, and no device breakdown. Needs a
cookieless tracking beacon (hashed daily fingerprint, no cookie banner), bot filtering, a
raw event collection with a TTL, and a daily rollup so the 3-year range stays cheap. Note
the public landing page is ISR-cached (`revalidate = 60`), so view counting has to happen
client-side — a server-render counter would only ever count cache misses.

**Integrations.** Webhooks or a Zapier connection so leads captured here can flow
into other tools a company already uses. Not in the original plan, but a common
next-ask once a CRM has real users.

## Suggested order

Manual editing of AI output, search/filtering, and password reset/verification are
all done. Rate limiting on auth endpoints is what's left in the near-term list, and
it's blocked on Upstash credentials — ready to build the moment those are added to
`.env.local`. Team invites once you or anyone testing this wants to add a second
person to a company. Everything under "longer-term" only once there's a reason to —
they're each a meaningful chunk of work with little payoff until the product has
real usage.
