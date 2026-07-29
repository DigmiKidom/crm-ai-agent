import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { stage } = await request.json();

  try {
    await connectDB();

    // Scope the update to the caller's tenant so no one can edit another
    // tenant's lead just by guessing an id.
    const lead = await Lead.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      { stage },
      { new: true }
    );

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Updating lead stage failed:", err);
    return NextResponse.json({ error: "Could not update lead." }, { status: 503 });
  }
}
