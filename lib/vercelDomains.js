// Thin wrapper around Vercel's REST API for attaching a tenant's own
// hostname to this project. Same "blocked on credentials, fails gracefully
// until they're set" shape as lib/rateLimit.js (Upstash) and lib/stripe.js
// (Stripe) — VERCEL_API_TOKEN/VERCEL_PROJECT_ID are genuinely optional at
// runtime, and every export here is a no-op-until-configured rather than a
// module-load-time crash.
//
// This is the one integration in the whole roadmap that code alone can't
// finish: attaching a domain here still requires the tenant to own a real
// domain and change its DNS records, and Vercel won't mark it "verified"
// until that DNS change has actually propagated. What's below is correct
// and complete against Vercel's documented API — it just can't be
// exercised end-to-end without a live Vercel project and a real domain.

const VERCEL_API = "https://api.vercel.com";

export function domainsConfigured() {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function projectPath(path) {
  const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
  return `${VERCEL_API}/v10/projects/${process.env.VERCEL_PROJECT_ID}${path}${teamQuery}`;
}

async function vercelFetch(path, options = {}) {
  if (!domainsConfigured()) {
    throw new Error("Missing VERCEL_API_TOKEN/VERCEL_PROJECT_ID environment variables");
  }

  const res = await fetch(projectPath(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Vercel API error (${res.status})`;
    throw new Error(message);
  }
  return data;
}

/**
 * Attaches `hostname` to this Vercel project. Returns whatever DNS records
 * Vercel wants configured — a CNAME for a subdomain, or an A record (plus a
 * required TXT ownership record) for an apex domain — so the tenant can be
 * shown exactly what to add at their registrar.
 */
export async function addDomainToProject(hostname) {
  const data = await vercelFetch("/domains", {
    method: "POST",
    body: JSON.stringify({ name: hostname }),
  });

  return {
    verified: Boolean(data.verified),
    verification: data.verification || null,
  };
}

/**
 * Re-checks a domain already attached to the project — Vercel only flips
 * `verified`/`misconfigured` once it's actually resolved the DNS change, so
 * this is what a "Check status" button in Settings polls.
 */
export async function checkDomainStatus(hostname) {
  const [domain, config] = await Promise.all([
    vercelFetch(`/domains/${encodeURIComponent(hostname)}`).catch(() => null),
    // /v9 on purpose — the domain-config endpoint isn't versioned under v10.
    fetch(
      `${VERCEL_API}/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${encodeURIComponent(hostname)}/config${
        process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ""
      }`,
      { headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` } }
    )
      .then((r) => r.json())
      .catch(() => null),
  ]);

  return {
    verified: Boolean(domain?.verified),
    misconfigured: Boolean(config?.misconfigured),
    verification: domain?.verification || null,
  };
}

export async function removeDomainFromProject(hostname) {
  await vercelFetch(`/domains/${encodeURIComponent(hostname)}`, { method: "DELETE" });
}
