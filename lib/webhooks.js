// Outbound lead webhooks.
//
// The instant-notification path that doesn't go through email: a tenant
// points this at Make/n8n/Zapier/a Slack incoming webhook and gets the lead
// pushed into their own tooling the moment it's captured.
//
// Server-only — imported by app/api/leads/route.js, never by a component.

const TIMEOUT_MS = 4000;

/**
 * HTTPS only, and no obvious internal targets.
 *
 * This URL is supplied by a tenant and fetched by our server, which is the
 * textbook shape of an SSRF: without this check a tenant could point it at
 * `http://169.254.169.254/…` (cloud metadata) or a private-range address and
 * use our infrastructure to reach something they can't. Blocking the well
 * known internal hostnames and RFC1918 literals removes the easy version of
 * that; the response body is never returned to them either way.
 */
export function isAllowedWebhookUrl(input) {
  let url;
  try {
    url = new URL(String(input || "").trim());
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
  if (host === "metadata.google.internal") return false;

  // IPv4 literals in private/loopback/link-local space.
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }

  // IPv6 loopback / unique-local / link-local.
  if (host === "::1" || host.startsWith("[::1") || /^\[?(fc|fd|fe80)/i.test(host)) return false;

  return true;
}

/**
 * Fires the new-lead webhook. Best-effort by design: a tenant's broken or
 * slow endpoint must never turn a visitor's successful submission into an
 * error, so every failure is swallowed after being logged, and the request
 * is abandoned after TIMEOUT_MS rather than holding the serverless function
 * open.
 *
 * Awaited by the caller (not fire-and-forget) for the same reason the email
 * send is: a serverless function can be frozen the instant its response is
 * sent, and an un-awaited fetch would silently never complete.
 */
export async function sendLeadWebhook(url, payload) {
  if (!isAllowedWebhookUrl(url)) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Lets a receiving endpoint route or filter on where this came from
        // without parsing the body first.
        "User-Agent": "Ceramony-Webhook/1.0",
        "X-Ceramony-Event": "lead.created",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: "manual",
    });
    return res.ok;
  } catch (err) {
    console.error("New-lead webhook failed:", err?.message || err);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
