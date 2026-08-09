import Stripe from "stripe";

// Lazy client, same pattern as lib/email.js's Resend client and lib/agent.js's
// Gemini client: billing is "blocked on Stripe credentials" the same way rate
// limiting was blocked on Upstash ones — this must not crash anything at
// import time with the keys unset, only when a billing action is actually
// attempted.
let client;
function getClient() {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

export function billingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/**
 * Starts (or resumes) a subscription checkout for one tenant.
 *
 * Reuses the tenant's existing Stripe customer if this isn't their first
 * attempt — otherwise Checkout creates a fresh customer per attempt, and a
 * tenant who abandoned checkout once ends up with duplicate customer records
 * for the same business.
 */
export async function createCheckoutSession({ tenant, successUrl, cancelUrl }) {
  const stripe = getClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: tenant.stripeCustomerId || undefined,
    customer_email: tenant.stripeCustomerId ? undefined : tenant.profile?.contactEmail || undefined,
    client_reference_id: tenant._id.toString(),
    // Belt-and-suspenders alongside client_reference_id: the webhook reads
    // this back off the subscription itself too, which client_reference_id
    // alone doesn't carry onto later subscription-updated/deleted events.
    subscription_data: { metadata: { tenantId: tenant._id.toString() } },
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session.url;
}

/** Lets an existing subscriber manage or cancel their own subscription. */
export async function createPortalSession({ tenant, returnUrl }) {
  const stripe = getClient();

  if (!tenant.stripeCustomerId) {
    throw new Error("Tenant has no Stripe customer yet");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/** Verifies and parses an incoming webhook payload. Throws on a bad signature. */
export function constructWebhookEvent(rawBody, signature) {
  const stripe = getClient();
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
