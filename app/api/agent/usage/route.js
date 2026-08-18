import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { readAiDesignUsage } from "@/lib/aiUsage";
import { requireTenantSession } from "@/lib/tenantSession";

// How many AI design generations this tenant has left today.
//
// Read-only on purpose. An expired counter reads as a fresh day (see
// readAiDesignUsage) but is *not* written back here — a GET that mutates would
// mean every page load raced the generate route for the same document, and the
// reset is free to compute, so there is nothing to gain by persisting it early.
// app/api/agent/generate/route.js does the reset as part of the write it was
// making anyway.

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();
    const tenant = await Tenant.findById(tenantId).select("aiDesignGenerations").lean();
    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    const usage = readAiDesignUsage(tenant.aiDesignGenerations);
    return NextResponse.json({
      ok: true,
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit,
    });
  } catch (err) {
    console.error("Loading AI design usage failed:", err);
    return NextResponse.json({ error: t("api.agentGenerate.usageFailed") }, { status: 503 });
  }
}
