import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Tenant, { MAX_FEATURES, MAX_BACKGROUNDS } from "@/lib/models/Tenant";
import Media from "@/lib/models/Media";
import { isValidIconKey } from "@/lib/landingIcons";

const MAX_DESCRIPTION = 300;
const CARD_COLORS = ["primary", "accent"];

export async function PATCH(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const {
    headline,
    subheadline,
    ctaLabel,
    features,
    backgroundMediaIds = [],
    backgroundOverlay = 0.55,
    showLogo = true,
  } = body;

  if (!headline?.trim() || !subheadline?.trim() || !ctaLabel?.trim()) {
    return NextResponse.json(
      { error: "Headline, subheadline, and CTA label are all required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(features) || features.length === 0) {
    return NextResponse.json({ error: "Add at least one feature." }, { status: 400 });
  }

  if (features.length > MAX_FEATURES) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_FEATURES} feature cards.` },
      { status: 400 }
    );
  }

  const cleanFeatures = [];
  for (const feature of features) {
    const title = (feature?.title || "").trim();
    const description = (feature?.description || "").trim();
    const icon = (feature?.icon || "").trim();

    if (!title || !description) {
      return NextResponse.json(
        { error: "Every feature needs both a title and a description." },
        { status: 400 }
      );
    }
    if (description.length > MAX_DESCRIPTION) {
      return NextResponse.json(
        { error: `Feature descriptions are limited to ${MAX_DESCRIPTION} characters.` },
        { status: 400 }
      );
    }
    if (!isValidIconKey(icon)) {
      return NextResponse.json({ error: "Unknown icon selected." }, { status: 400 });
    }

    const accentColor = feature?.accentColor || "primary";
    if (!CARD_COLORS.includes(accentColor)) {
      return NextResponse.json({ error: "Unknown card colour selected." }, { status: 400 });
    }

    cleanFeatures.push({
      title,
      description,
      icon,
      topStrip: Boolean(feature?.topStrip),
      border: Boolean(feature?.border),
      accentColor,
    });
  }

  if (!Array.isArray(backgroundMediaIds) || backgroundMediaIds.length > MAX_BACKGROUNDS) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_BACKGROUNDS} background photos.` },
      { status: 400 }
    );
  }

  const cleanBackgroundIds = [...new Set(backgroundMediaIds.filter(Boolean).map(String))];
  if (cleanBackgroundIds.some((id) => !mongoose.isValidObjectId(id))) {
    return NextResponse.json({ error: "Invalid background image reference." }, { status: 400 });
  }

  const overlay = Number(backgroundOverlay);
  if (!Number.isFinite(overlay) || overlay < 0 || overlay > 1) {
    return NextResponse.json({ error: "Overlay must be between 0 and 1." }, { status: 400 });
  }

  try {
    await connectDB();

    // Every referenced image must belong to this tenant — otherwise a crafted
    // request could hotlink another tenant's uploads onto this landing page.
    if (cleanBackgroundIds.length) {
      const owned = await Media.countDocuments({
        _id: { $in: cleanBackgroundIds },
        tenantId: session.user.tenantId,
      });
      if (owned !== cleanBackgroundIds.length) {
        return NextResponse.json(
          { error: "One of those background images could not be found." },
          { status: 400 }
        );
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      session.user.tenantId,
      {
        $set: {
          "landingPage.headline": headline.trim(),
          "landingPage.subheadline": subheadline.trim(),
          "landingPage.ctaLabel": ctaLabel.trim(),
          "landingPage.features": cleanFeatures,
          "landingPage.backgroundMediaIds": cleanBackgroundIds,
          "landingPage.backgroundOverlay": overlay,
          "landingPage.showLogo": Boolean(showLogo),
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
