import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";

// Stages are identified by name (Lead.stage stores the raw string), so a
// rename has to be propagated onto every lead currently sitting in that
// stage, and a removal has to be blocked while leads are still there —
// otherwise those leads would silently fall out of every column.
export async function PATCH(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { stages, renameMap, removed } = body ?? {};

  if (!Array.isArray(stages) || stages.length === 0) {
    return NextResponse.json({ error: "You need at least one stage." }, { status: 400 });
  }

  const cleanStages = stages.map((s) => (s || "").trim().toLowerCase());
  if (cleanStages.some((s) => !s)) {
    return NextResponse.json({ error: "Stage names can't be empty." }, { status: 400 });
  }
  if (new Set(cleanStages).size !== cleanStages.length) {
    return NextResponse.json({ error: "Stage names must be unique." }, { status: 400 });
  }

  const tenantId = session.user.tenantId;

  try {
    await connectDB();

    const removedStages = Array.isArray(removed)
      ? removed.map((s) => (s || "").trim().toLowerCase()).filter(Boolean)
      : [];

    if (removedStages.length > 0) {
      const stuckCount = await Lead.countDocuments({
        tenantId,
        stage: { $in: removedStages },
      });
      if (stuckCount > 0) {
        return NextResponse.json(
          {
            error:
              "Move every lead out of a stage before removing it. " +
              `${stuckCount} lead(s) are still in a stage you're trying to remove.`,
          },
          { status: 409 }
        );
      }
    }

    const renames = renameMap && typeof renameMap === "object" ? renameMap : {};
    for (const [oldName, newName] of Object.entries(renames)) {
      const from = (oldName || "").trim().toLowerCase();
      const to = (newName || "").trim().toLowerCase();
      if (!from || !to || from === to) continue;
      await Lead.updateMany({ tenantId, stage: from }, { $set: { stage: to } });
    }

    const pipeline = await Pipeline.findOneAndUpdate(
      { tenantId },
      { $set: { stages: cleanStages } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ ok: true, stages: pipeline.stages });
  } catch (err) {
    console.error("Updating pipeline stages failed:", err);
    return NextResponse.json({ error: "Could not save changes." }, { status: 503 });
  }
}
