import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Contact from "@/lib/models/Contact";

const EDITABLE_FIELDS = ["name", "company", "email", "phone", "notes", "tags"];

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  try {
    await connectDB();

    // Scope to the caller's tenant so no one can edit another tenant's
    // contact just by guessing an id.
    const contact = await Contact.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      updates,
      { new: true }
    ).lean();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, contact });
  } catch (err) {
    console.error("Updating contact failed:", err);
    return NextResponse.json({ error: "Could not update contact." }, { status: 503 });
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
    const contact = await Contact.findOneAndDelete({ _id: id, tenantId: session.user.tenantId });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting contact failed:", err);
    return NextResponse.json({ error: "Could not delete contact." }, { status: 503 });
  }
}
