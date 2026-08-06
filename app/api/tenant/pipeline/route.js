import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";
import { requireTenantRole } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

// Stages are identified by name (Lead.stage stores the raw string), so a
// rename has to be propagated onto every lead currently sitting in that
// stage, and a removal has to be blocked while leads are still there —
// otherwise those leads would silently fall out of every column.
export async function PATCH(request) {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const body = await request.json();
  const { stages, renameMap, removed } = body ?? {};

  if (!Array.isArray(stages) || stages.length === 0) {
    return NextResponse.json({ error: t("api.tenantPipeline.needOneStage") }, { status: 400 });
  }

  const cleanStages = stages.map((s) => (s || "").trim().toLowerCase());
  if (cleanStages.some((s) => !s)) {
    return NextResponse.json({ error: t("api.tenantPipeline.stageNameEmpty") }, { status: 400 });
  }
  if (new Set(cleanStages).size !== cleanStages.length) {
    return NextResponse.json({ error: t("api.tenantPipeline.stageNameDuplicate") }, { status: 400 });
  }

  try {
    await connectDB();

    const removedStages = Array.isArray(removed)
      ? removed.map((s) => (s || "").trim().toLowerCase()).filter(Boolean)
      : [];

    if (removedStages.length > 0) {
      const stuckCount = await tenantScoped(Lead, tenantId).countDocuments({
        stage: { $in: removedStages },
      });
      if (stuckCount > 0) {
        return NextResponse.json(
          { error: t("api.tenantPipeline.stageInUse", { count: stuckCount }) },
          { status: 409 }
        );
      }
    }

    const renames = renameMap && typeof renameMap === "object" ? renameMap : {};
    for (const [oldName, newName] of Object.entries(renames)) {
      const from = (oldName || "").trim().toLowerCase();
      const to = (newName || "").trim().toLowerCase();
      if (!from || !to || from === to) continue;
      await tenantScoped(Lead, tenantId).updateMany({ stage: from }, { $set: { stage: to } });
    }

    const pipeline = await tenantScoped(Pipeline, tenantId)
      .findOneAndUpdate({}, { $set: { stages: cleanStages } }, { upsert: true, new: true })
      .lean();

    return NextResponse.json({ ok: true, stages: pipeline.stages });
  } catch (err) {
    console.error("Updating pipeline stages failed:", err);
    return NextResponse.json({ error: t("api.tenantPipeline.saveFailed") }, { status: 503 });
  }
}
