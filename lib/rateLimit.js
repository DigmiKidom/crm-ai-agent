import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-endpoint budgets. Each is its own sliding window so a burst against one
// endpoint (say, forgot-password) can't spend down the budget shared by an
// unrelated one.
//
// - signup / passwordReset: expensive/abusable side effects (a new tenant, an
//   email send) — kept tight.
// - login: needs enough headroom for a genuine typo-then-retry without
//   penalizing the visitor, but still bounded against credential stuffing.
// - leadCapture: public and meant to be hit by real visitors, including a
//   double-submit from a slow connection — generous, but not unbounded.
// - pageReport: public and unauthenticated, and the payload lands in a human
//   moderation queue — so the cost of abuse is a person's attention, not just
//   storage. Tight, but enough for someone reporting two or three pages.
// - admin: not public, but the highest-value surface in the product. This is
//   a brute-force ceiling on anyone who has a stolen admin password and is
//   guessing at the 6-digit second factor: a million codes at 30 requests
//   per minute is not a viable attack.
const LIMIT_CONFIG = {
  signup: { requests: 5, window: "10 m" },
  login: { requests: 10, window: "5 m" },
  passwordReset: { requests: 5, window: "10 m" },
  leadCapture: { requests: 20, window: "1 m" },
  pageReport: { requests: 5, window: "10 m" },
  admin: { requests: 30, window: "1 m" },
};

// Rate limiting is explicitly "blocked on Upstash credentials" per the
// architecture notes — this must work (i.e. never throw, never block a
// request) with those env vars unset, and start enforcing automatically the
// moment they're added, with no code change or redeploy logic needed.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis) {
  // Logged once at module load (not per-request) so it's visible in server
  // logs without spamming them.
  console.warn(
    "[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is disabled. " +
      "Public endpoints (signup, login, password reset, lead capture) are currently unthrottled."
  );
}

const limiters = new Map();

function getLimiter(bucket) {
  if (!redis) return null;
  if (limiters.has(bucket)) return limiters.get(bucket);

  const config = LIMIT_CONFIG[bucket];
  if (!config) throw new Error(`Unknown rate-limit bucket: "${bucket}"`);

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    // Distinct key prefix per bucket, so the same visitor IP has an
    // independent budget on each endpoint rather than one shared counter.
    prefix: `ceramony:ratelimit:${bucket}`,
  });
  limiters.set(bucket, limiter);
  return limiter;
}

/**
 * Checks and consumes one unit of `bucket`'s budget for `identifier` (the
 * visitor's IP). Always resolves — never rejects — so a Redis outage fails
 * open (request proceeds unthrottled) rather than taking the endpoint down.
 *
 * Returns `{ limited, retryAfterSeconds }`. `limited` is false whenever rate
 * limiting is disabled (no credentials) or unreachable.
 */
export async function checkRateLimit(bucket, identifier) {
  const limiter = getLimiter(bucket);
  if (!limiter) return { limited: false };

  try {
    const { success, reset } = await limiter.limit(`${bucket}:${identifier}`);
    if (success) return { limited: false };
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (err) {
    console.error(`[rateLimit] check failed for bucket "${bucket}":`, err);
    return { limited: false };
  }
}
