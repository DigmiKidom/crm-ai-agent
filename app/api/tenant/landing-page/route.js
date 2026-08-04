import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";

export async function PATCH(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { headline, subheadline, ctaLabel, features } = body ?? {};

  if (!headline?.trim() || !subheadline?.trim() || !ctaLabel?.trim()) {
    return NextResponse.json(
      { error: "Headline, subheadline, and CTA label are all required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(features) || features.length === 0) {
    return NextResponse.json(
      { error: "Add at least one feature." },
      { status: 400 }
    );
  }

  const cleanFeatures = [];
  for (const feature of features) {
    const title = (feature?.title || "").trim();
    const description = (feature?.description || "").trim();
    if (!title || !description) {
      return NextResponse.json(
        { error: "Every feature needs both a title and a description." },
        { status: 400 }
      );
    }
    cleanFeatures.push({ title, description });
  }

  try {
    await connectDB();

    const tenant = await Tenant.findByIdAndUpdate(
      session.user.tenantId,
      {
        $set: {
          "landingPage.headline": headline.trim(),
          "landingPage.subheadline": subheadline.trim(),
          "landingPage.ctaLabel": ctaLabel.trim(),
          "landingPage.features": cleanFeatures,
        },
      },
      { new: true }
    ).lean();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, landingPage: tenant.landingPage });
  } catch (err) {
    console.error("Updating landing page failed:", err);
    return NextResponse.json({ error: "Could not save changes." }, { status: 503 });
  }
}
