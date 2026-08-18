import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { PLUGIN_IDS, normalizeEnabledPlugins } from "@/lib/plugins";
import { requireTenantSession } from "@/lib/tenantSession";

// Which optional tools appear in *this person's* sidebar.
//
// Deliberately not under /api/tenant/*: this is a preference on the user
// document, so it needs no role check — a member tidying their own navigation
// is not an administrative act, and requiring "admin" here would mean the
// people who use the tools most can't choose which ones they see.

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, session } = ctx;

  try {
    await connectDB();
    const user = await User.findById(session.user.id).select("enabledPlugins").lean();
    return NextResponse.json({
      ok: true,
      enabledPlugins: normalizeEnabledPlugins(user?.enabledPlugins),
      available: PLUGIN_IDS,
    });
  } catch (err) {
    console.error("Loading enabled plugins failed:", err);
    return NextResponse.json({ error: t("api.plugins.loadFailed") }, { status: 503 });
  }
}

export async function PATCH(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, session } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};

  // Takes the whole desired set, not a single {id, on} toggle. Two toggles
  // flipped quickly would otherwise race — last write wins on a field neither
  // request knew the other was touching — and this way the client's optimistic
  // state and the stored state are the same shape.
  if (!Array.isArray(body.enabledPlugins)) {
    return NextResponse.json({ error: t("api.plugins.invalidSelection") }, { status: 400 });
  }

  const unknown = body.enabledPlugins.filter((id) => !PLUGIN_IDS.includes(id));
  if (unknown.length) {
    // Rejected rather than silently dropped: a client sending an id this build
    // doesn't have is out of date, and quietly storing a shorter list would
    // look to the user like their toggle didn't stick.
    return NextResponse.json({ error: t("api.plugins.unknownPlugin") }, { status: 400 });
  }

  const enabledPlugins = normalizeEnabledPlugins(body.enabledPlugins);

  try {
    await connectDB();
    await User.updateOne({ _id: session.user.id }, { $set: { enabledPlugins } });
    return NextResponse.json({ ok: true, enabledPlugins });
  } catch (err) {
    console.error("Saving enabled plugins failed:", err);
    return NextResponse.json({ error: t("api.plugins.saveFailed") }, { status: 503 });
  }
}
