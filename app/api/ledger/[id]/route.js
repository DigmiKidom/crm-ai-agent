import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LedgerEntry, {
  LEDGER_TYPES,
  MAX_LEDGER_AMOUNT,
  MAX_LEDGER_DESCRIPTION,
} from "@/lib/models/LedgerEntry";
import { dateOnly, num, str } from "@/lib/apiInput";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.ledger.notFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const update = {};

  if (body.type !== undefined) {
    if (!LEDGER_TYPES.includes(body.type)) {
      return NextResponse.json({ error: t("api.ledger.invalidType") }, { status: 400 });
    }
    update.type = body.type;
  }

  if (body.amount !== undefined) {
    const amount = num(body.amount, { min: 0, max: MAX_LEDGER_AMOUNT });
    if (amount === null) {
      return NextResponse.json({ error: t("api.ledger.invalidAmount") }, { status: 400 });
    }
    update.amount = amount;
  }

  if (body.date !== undefined) {
    const date = dateOnly(body.date);
    if (!date) {
      return NextResponse.json({ error: t("api.ledger.invalidDate") }, { status: 400 });
    }
    update.date = date;
  }

  if (body.description !== undefined) {
    update.description = str(body.description, MAX_LEDGER_DESCRIPTION);
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: t("api.common.nothingToUpdate") }, { status: 400 });
  }

  try {
    await connectDB();
    const entry = await tenantScoped(LedgerEntry, tenantId)
      .findOneAndUpdate({ _id: id }, { $set: update }, { new: true })
      .select("date description type amount createdAt")
      .lean();

    if (!entry) return NextResponse.json({ error: t("api.ledger.notFound") }, { status: 404 });
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    console.error("Updating a ledger entry failed:", err);
    return NextResponse.json({ error: t("api.ledger.saveFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.ledger.notFound") }, { status: 404 });
  }

  try {
    await connectDB();
    const deleted = await tenantScoped(LedgerEntry, tenantId).findOneAndDelete({ _id: id });
    if (!deleted) return NextResponse.json({ error: t("api.ledger.notFound") }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting a ledger entry failed:", err);
    return NextResponse.json({ error: t("api.ledger.deleteFailed") }, { status: 503 });
  }
}
