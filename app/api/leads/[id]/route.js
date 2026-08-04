import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";

const EDITABLE_FIELDS = ["stage", "notes", "name", "email", "phone", "message"];

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectDB();
    const lead = await Lead.findOne({ _id: id, tenantId: session.user.tenantId }).lean();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (err) {
    console.error("Fetching lead failed:", err);
    return NextResponse.json({ error: "Could not load lead." }, { status: 503 });
  }
}

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Only ever apply fields we actually allow editing, and only the ones
  // the caller actually sent — this doubles as a safe partial-update.
  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  try {
    await connectDB();

    // Scope the update to the caller's tenant so no one can edit another
    // tenant's lead just by guessing an id.
    const lead = await Lead.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      updates,
      { new: true }
    ).lean();

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    console.error("Updating lead failed:", err);
    return NextResponse.json({ error: "Could not update lead." }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectDB();
    const lead = await Lead.findOneAndDelete({ _id: id, tenantId: session.user.tenantId });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting lead failed:", err);
    return NextResponse.json({ error: "Could not delete lead." }, { status: 503 });
  }
}
