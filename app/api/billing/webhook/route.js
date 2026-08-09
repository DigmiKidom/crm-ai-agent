import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { constructWebhookEvent } from "@/lib/stripe";

// Public — Stripe calls this directly, there's no session to check. Signature
// verification (constructWebhookEvent) is the actual trust boundary: without
// a valid signature from STRIPE_WEBHOOK_SECRET, nothing here is trusted.
//
// This is the ONLY place Tenant.plan is ever written. The Checkout redirect
// (success_url) happens client-side the instant payment completes, before
// Stripe has necessarily told us about it — relying on the redirect to grant
// "pro" would let anyone who reaches the success URL grant themselves access
// without having paid. The webhook is the one place that's actually proven
// Stripe processed the payment.
export async function POST(request) {
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    const rawBody = await request.text();
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await connectDB();

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;
        const tenantId = checkoutSession.client_reference_id;
        if (tenantId && checkoutSession.customer) {
          await Tenant.findByIdAndUpdate(tenantId, {
            $set: {
              plan: "pro",
              stripeCustomerId: checkoutSession.customer,
              stripeSubscriptionId: checkoutSession.subscription || null,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        // Active/trialing keeps "pro"; anything else (past_due after
        // retries exhaust, unpaid, incomplete_expired) drops back to free —
        // Stripe's own retry logic already gave the card every reasonable
        // chance before reaching those states.
        const isActive = ["active", "trialing"].includes(subscription.status);
        await Tenant.findOneAndUpdate(
          { stripeCustomerId: subscription.customer },
          { $set: { plan: isActive ? "pro" : "free", stripeSubscriptionId: subscription.id } }
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await Tenant.findOneAndUpdate(
          { stripeCustomerId: subscription.customer },
          { $set: { plan: "free" } }
        );
        break;
      }

      default:
        // Every other event type is intentionally ignored — this only
        // reacts to the handful that change whether a tenant is paying.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Processing Stripe webhook failed:", err);
    // 500 so Stripe retries — a transient DB hiccup shouldn't silently drop
    // a plan change.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
