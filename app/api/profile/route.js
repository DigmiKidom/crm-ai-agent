import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Media from "@/lib/models/Media";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

// The signed-in user's own profile. Deliberately separate from
// /api/tenant/settings: that endpoint edits the company (and should eventually
// be owner/admin-only), this one edits the person, and every user may edit
// themselves regardless of role.

const MAX_NAME = 80;
const MAX_TITLE = 120;
const MAX_PHONE = 40;

function serialize(user) {
  return {
    id: user._id.toString(),
    name: user.name || "",
    email: user.email,
    title: user.title || "",
    phone: user.phone || "",
    role: user.role,
    avatarMediaId: user.avatarMediaId ? user.avatarMediaId.toString() : null,
  };
}

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t } = ctx;

  try {
    await connectDB();
    const user = await User.findById(session.user.id).lean();
    if (!user) return NextResponse.json({ error: t("api.common.userNotFound") }, { status: 404 });
    return NextResponse.json({ user: serialize(user) });
  } catch (err) {
    console.error("Loading profile failed:", err);
    return NextResponse.json({ error: t("api.profile.loadFailed") }, { status: 503 });
  }
}

export async function PATCH(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("api.common.expectedJsonBody") }, { status: 400 });
  }

  const update = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: t("api.profile.nameEmpty") }, { status: 400 });
    update.name = name.slice(0, MAX_NAME);
  }
  if (typeof body.title === "string") update.title = body.title.trim().slice(0, MAX_TITLE);
  if (typeof body.phone === "string") update.phone = body.phone.trim().slice(0, MAX_PHONE);

  if ("avatarMediaId" in body) {
    const id = body.avatarMediaId;

    if (id === null || id === "") {
      update.avatarMediaId = null;
    } else if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: t("api.profile.invalidImageReference") }, { status: 400 });
    } else {
      // Verify the media belongs to this tenant AND is actually an avatar.
      // Without this, a user could point their avatar at any Media id they can
      // guess — including another tenant's uploads.
      try {
        await connectDB();
        const media = await tenantScoped(Media, tenantId)
          .findOne({ _id: id, kind: "avatar" })
          .select("_id")
          .lean();
        if (!media) {
          return NextResponse.json({ error: t("api.profile.imageUnavailable") }, { status: 400 });
        }
        update.avatarMediaId = media._id;
      } catch (err) {
        console.error("Avatar lookup failed:", err);
        return NextResponse.json({ error: t("api.profile.saveFailed") }, { status: 503 });
      }
    }
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: t("api.common.nothingToUpdate") }, { status: 400 });
  }

  try {
    await connectDB();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!user) return NextResponse.json({ error: t("api.common.userNotFound") }, { status: 404 });
    return NextResponse.json({ ok: true, user: serialize(user) });
  } catch (err) {
    console.error("Saving profile failed:", err);
    return NextResponse.json({ error: t("api.profile.saveFailed") }, { status: 503 });
  }
}
