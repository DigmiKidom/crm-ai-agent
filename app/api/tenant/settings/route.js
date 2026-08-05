import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Media from "@/lib/models/Media";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function str(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export async function PATCH(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const { name, profile = {}, theme = {}, logoMediaId, notifications = {} } = body;

  const companyName = str(name, 120);
  if (!companyName) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }

  const contactEmail = str(profile.contactEmail, 160);
  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return NextResponse.json({ error: "That contact email doesn't look valid." }, { status: 400 });
  }

  for (const [key, value] of [
    ["primaryColor", theme.primaryColor],
    ["accentColor", theme.accentColor],
  ]) {
    if (value && !HEX_COLOR.test(value)) {
      return NextResponse.json(
        { error: `${key} must be a 6-digit hex colour like #2563eb.` },
        { status: 400 }
      );
    }
  }

  // A logo id must be a real Media row that belongs to this tenant — otherwise
  // a tenant could point at someone else's image just by pasting an id.
  let logoId = null;
  if (logoMediaId) {
    if (!mongoose.isValidObjectId(logoMediaId)) {
      return NextResponse.json({ error: "Invalid logo reference." }, { status: 400 });
    }
    logoId = logoMediaId;
  }

  try {
    await connectDB();

    if (logoId) {
      const owned = await Media.exists({ _id: logoId, tenantId: session.user.tenantId });
      if (!owned) {
        return NextResponse.json({ error: "That logo could not be found." }, { status: 400 });
      }
    }

    const $set = {
      name: companyName,
      "profile.legalName": str(profile.legalName, 160),
      "profile.tagline": str(profile.tagline, 160),
      "profile.about": str(profile.about, 600),
      "profile.contactEmail": contactEmail,
      "profile.contactPhone": str(profile.contactPhone, 40),
      "profile.addressLine": str(profile.addressLine, 200),
      "profile.city": str(profile.city, 80),
      "profile.country": str(profile.country, 80),
      "profile.website": str(profile.website, 200),
      "profile.social.facebook": str(profile.social?.facebook, 200),
      "profile.social.instagram": str(profile.social?.instagram, 200),
      "profile.social.linkedin": str(profile.social?.linkedin, 200),
      "profile.social.x": str(profile.social?.x, 200),
      logoMediaId: logoId,
      "notifications.emailOnNewLead": Boolean(notifications.emailOnNewLead),
    };

    if (theme.primaryColor) $set["theme.primaryColor"] = theme.primaryColor;
    if (theme.accentColor) $set["theme.accentColor"] = theme.accentColor;
    if (theme.fontFamily) $set["theme.fontFamily"] = str(theme.fontFamily, 200);

    const tenant = await Tenant.findByIdAndUpdate(
      session.user.tenantId,
      { $set },
      { new: true }
    ).lean();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Updating settings failed:", err);
    return NextResponse.json({ error: "Could not save settings." }, { status: 503 });
  }
}
