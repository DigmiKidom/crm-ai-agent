import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Media, { MAX_MEDIA_BYTES } from "@/lib/models/Media";

const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png"];
const ALLOWED_KINDS = ["logo", "background", "gallery"];

// Uploads arrive already resized + compressed by the browser. This route is
// the trust boundary: it re-checks type, size, and tenant ownership before
// anything lands in Mongo.
export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("file");
  const kind = String(form.get("kind") || "");
  const width = Number(form.get("width") || 0);
  const height = Number(form.get("height") || 0);

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (!ALLOWED_KINDS.includes(kind)) {
    return NextResponse.json({ error: "Unknown image kind." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only WebP, JPEG, and PNG images are supported." },
      { status: 400 }
    );
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return NextResponse.json(
      { error: "That image is too large even after compression. Try a smaller one." },
      { status: 413 }
    );
  }

  try {
    await connectDB();

    const buffer = Buffer.from(await file.arrayBuffer());

    const media = await Media.create({
      tenantId: session.user.tenantId,
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
    return NextResponse.json({ error: "Could not save that image." }, { status: 503 });
  }
}

// Deleting is scoped to the caller's tenant so an id guess can't wipe someone
// else's logo.
export async function DELETE(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing image id." }, { status: 400 });
  }

  try {
    await connectDB();
    await Media.findOneAndDelete({ _id: id, tenantId: session.user.tenantId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Media delete failed:", err);
    return NextResponse.json({ error: "Could not delete that image." }, { status: 503 });
  }
}
