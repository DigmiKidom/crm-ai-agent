import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Resume from "@/lib/models/Resume";
import Tenant from "@/lib/models/Tenant";
import PublicCvView from "./PublicCvView";

// Reuses the same public-route + content-language pattern already proven by
// /pages/[tenantSlug]: ISR-cached, so a shared link stays cheap to serve even
// if it gets passed around, and re-checked once a minute for edits.
export const revalidate = 60;

async function loadResume(resumeId) {
  if (!mongoose.isValidObjectId(resumeId)) return null;
  await connectDB();
  return Resume.findOne({ _id: resumeId, isPublic: true }).lean();
}

export async function generateMetadata({ params }) {
  const { resumeId } = await params;

  try {
    const resume = await loadResume(resumeId);
    if (!resume) return {};
    return {
      title: { absolute: resume.fullName ? `${resume.fullName} — CV` : "CV" },
      description: resume.headline || undefined,
    };
  } catch {
    return {};
  }
}

export default async function PublicCvPage({ params }) {
  const { resumeId } = await params;

  const resume = await loadResume(resumeId);
  if (!resume) notFound();

  const tenant = await Tenant.findById(resume.tenantId).select("name").lean();

  return (
    <PublicCvView resume={JSON.parse(JSON.stringify(resume))} tenantName={tenant?.name || ""} />
  );
}
