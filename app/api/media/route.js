import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Media, { MAX_MEDIA_BYTES } from "@/lib/models/Media";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png"];
const ALLOWED_KINDS = ["logo", "background", "gallery", "avatar"];

// Uploads arrive already resized + compressed by the browser. This route is
// the trust boundary: it re-checks type, size, and tenant ownership before
// anything lands in Mongo.
export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: t("api.media.expectedFileUpload") }, { status: 400 });
  }

  const file = form.get("file");
  const kind = String(form.get("kind") || "");
  const width = Number(form.get("width") || 0);
  const height = Number(form.get("height") || 0);

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: t("api.media.noFileReceived") }, { status: 400 });
  }
  if (!ALLOWED_KINDS.includes(kind)) {
    return NextResponse.json({ error: t("api.media.unknownKind") }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: t("api.media.unsupportedType") },
      { status: 400 }
    );
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return NextResponse.json(
      { error: t("api.media.tooLarge") },
      { status: 413 }
    );
  }

  try {
    await connectDB();

    const buffer = Buffer.from(await file.arrayBuffer());

    const media = await tenantScoped(Media, tenantId).create({
      kind,
      contentType: file.type,
      width: Number.isFinite(width) ? width : 0,
      height: Number.isFinite(height) ? height : 0,
      size: buffer.length,
      data: buffer,
    });

    return NextResponse.json({
      ok: true,
      media: {
        id: media._id.toString(),
        url: `/api/media/${media._id.toString()}`,
        kind: media.kind,
        width: media.width,
        height: media.height,
        size: media.size,
      },
    });
  } catch (err) {
    console.error("Media upload failed:", err);
    return NextResponse.json({ error: t("api.media.saveFailed") }, { status: 503 });
  }
}

// Deleting is scoped to the caller's tenant so an id guess can't wipe someone
// else's logo.
export async function DELETE(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: t("api.media.missingId") }, { status: 400 });
  }

  try {
    await connectDB();
    await tenantScoped(Media, tenantId).findOneAndDelete({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Media delete failed:", err);
    return NextResponse.json({ error: t("api.media.deleteFailed") }, { status: 503 });
  }
}
