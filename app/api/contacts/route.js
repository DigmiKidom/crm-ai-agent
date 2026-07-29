import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Contact from "@/lib/models/Contact";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const contacts = await Contact.find({ tenantId: session.user.tenantId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ contacts });
  } catch (err) {
    console.error("Fetching contacts failed:", err);
    return NextResponse.json({ error: "Could not load contacts." }, { status: 503 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { name, company, email, phone, notes } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  try {
    await connectDB();
    const contact = await Contact.create({
      tenantId: session.user.tenantId,
      name,
      company: company || "",
      email: email || "",
      phone: phone || "",
      notes: notes || "",
      ownerId: session.user.id,
    });

    return NextResponse.json({ ok: true, contact });
  } catch (err) {
    console.error("Creating contact failed:", err);
    return NextResponse.json({ error: "Could not save contact." }, { status: 503 });
  }
}
