import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Tenant, { MAX_FEATURES, MAX_BACKGROUNDS, MAX_GALLERY, GALLERY_COLUMNS } from "@/lib/models/Tenant";
import Media from "@/lib/models/Media";
import { isValidIconKey } from "@/lib/landingIcons";
import { templateIds } from "@/lib/templates";

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
    galleryMediaIds = [],
    galleryColumns = 3,
    templateId,
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

  if (!Array.isArray(galleryMediaIds) || galleryMediaIds.length > MAX_GALLERY) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_GALLERY} gallery photos.` },
      { status: 400 }
    );
  }

  const cleanGalleryIds = [...new Set(galleryMediaIds.filter(Boolean).map(String))];
  if (cleanGalleryIds.some((id) => !mongoose.isValidObjectId(id))) {
    return NextResponse.json({ error: "Invalid gallery image reference." }, { status: 400 });
  }

  const columns = Number(galleryColumns);
  if (!GALLERY_COLUMNS.includes(columns)) {
    return NextResponse.json({ error: "Gallery columns must be 2, 3, or 4." }, { status: 400 });
  }

  if (templateId !== undefined && !templateIds().includes(templateId)) {
    return NextResponse.json({ error: "Unknown template selected." }, { status: 400 });
  }

  try {
    await connectDB();

    // Every referenced image must belong to this tenant — otherwise a crafted
    // request could hotlink another tenant's uploads onto this landing page.
    const allMediaIds = [...cleanBackgroundIds, ...cleanGalleryIds];
    if (allMediaIds.length) {
      const owned = await Media.countDocuments({
        _id: { $in: allMediaIds },
        tenantId: session.user.tenantId,
      });
      if (owned !== allMediaIds.length) {
        return NextResponse.json(
          { error: "One of those images could not be found." },
          { status: 400 }
        );
      }
    }

    const setFields = {
      "landingPage.headline": headline.trim(),
      "landingPage.subheadline": subheadline.trim(),
      "landingPage.ctaLabel": ctaLabel.trim(),
      "landingPage.features": cleanFeatures,
      "landingPage.backgroundMediaIds": cleanBackgroundIds,
      "landingPage.backgroundOverlay": overlay,
      "landingPage.showLogo": Boolean(showLogo),
      "landingPage.galleryMediaIds": cleanGalleryIds,
      "landingPage.galleryColumns": columns,
    };
    if (templateId !== undefined) setFields.templateId = templateId;

    const tenant = await Tenant.findByIdAndUpdate(
      session.user.tenantId,
      { $set: setFields },
      { new: true }
    ).lean();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, landingPage: tenant.landingPage, templateId: tenant.templateId });
  } catch (err) {
    console.error("Updating landing page failed:", err);
    return NextResponse.json({ error: "Could not save changes." }, { status: 503 });
  }
}
