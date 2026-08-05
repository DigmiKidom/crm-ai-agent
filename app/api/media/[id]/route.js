import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Media from "@/lib/models/Media";

// Public on purpose: these images are rendered on public landing pages.
// A media id is an opaque ObjectId and the document holds nothing sensitive.
//
// Media rows are immutable once written (editing an image creates a new row),
// so we can hand out a one-year immutable cache. In practice a given image is
// fetched from Mongo once and then served from the CDN edge forever after.
export async function GET(request, { params }) {
  const { id } = await params;

  try {
    await connectDB();
    const media = await Media.findById(id).lean();

    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Skip re-sending the body when the browser already has this exact image.
    const etag = `"${id}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304 });
    }

    // .lean() hands back either a Node Buffer or a driver Binary depending on
    // version — normalise before handing it to the response.
    const bytes = Buffer.isBuffer(media.data)
      ? media.data
      : Buffer.from(media.data.buffer ?? media.data);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": media.contentType,
        "Content-Length": String(media.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: etag,
      },
    });
  } catch (err) {
    console.error("Serving media failed:", err);
    return NextResponse.json({ error: "Could not load image." }, { status: 503 });
  }
}
