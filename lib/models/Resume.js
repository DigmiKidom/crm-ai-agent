import mongoose from "mongoose";
import {
  MAX_BULLETS,
  MAX_EDUCATION,
  MAX_EXPERIENCE,
  MAX_SKILLS,
  MAX_SUMMARY,
} from "@/lib/resumeLimits";

// Caps live in lib/resumeLimits.js so the client-side builder can import them
// without pulling Mongoose into the browser bundle. Re-exported here for
// server-side callers that already import the model.
export { MAX_BULLETS, MAX_EDUCATION, MAX_EXPERIENCE, MAX_SKILLS, MAX_SUMMARY };

const ExperienceSchema = new mongoose.Schema(
  {
    role: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    // Free text ("Mar 2021", "2019") rather than Date: CVs routinely carry
    // partial dates, and forcing a full date makes the form harder to fill for
    // no reporting benefit — nothing queries these.
    startDate: { type: String, default: "", trim: true },
    endDate: { type: String, default: "", trim: true },
    current: { type: Boolean, default: false },
    bullets: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= MAX_BULLETS,
        message: `At most ${MAX_BULLETS} bullet points per role.`,
      },
    },
  },
  { _id: false }
);

const EducationSchema = new mongoose.Schema(
  {
    institution: { type: String, default: "", trim: true },
    degree: { type: String, default: "", trim: true },
    field: { type: String, default: "", trim: true },
    startDate: { type: String, default: "", trim: true },
    endDate: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const ResumeSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    // A CV belongs to the person who wrote it, not just the company — two users
    // in the same tenant each get their own.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, default: "My CV", trim: true },

    // Contact block at the top of the document. Seeded from the user's profile
    // on first create, then editable independently — a CV often carries a
    // personal email rather than the work one.
    fullName: { type: String, default: "", trim: true },
    headline: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },
    linkedin: { type: String, default: "", trim: true },

    summary: { type: String, default: "", maxlength: MAX_SUMMARY },

    experience: {
      type: [ExperienceSchema],
      default: [],
      validate: {
        validator: (v) => v.length <= MAX_EXPERIENCE,
        message: `At most ${MAX_EXPERIENCE} roles.`,
      },
    },
    education: {
      type: [EducationSchema],
      default: [],
      validate: {
        validator: (v) => v.length <= MAX_EDUCATION,
        message: `At most ${MAX_EDUCATION} entries.`,
      },
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= MAX_SKILLS,
        message: `At most ${MAX_SKILLS} skills.`,
      },
    },

    // The language the CV is written in, so the print output gets the right
    // dir/lang — same reasoning as the landing page. Set by the AI agent when
    // it polishes, or by the owner explicitly.
    language: {
      code: { type: String, default: "en" },
      dir: { type: String, enum: ["ltr", "rtl"], default: "ltr" },
    },

    // Off by default — a CV isn't reachable at /cv/[id] until the owner
    // explicitly opts in. The document's own _id doubles as the public
    // identifier (same pattern as /api/media/[id]: an unguessable ObjectId,
    // no separate token to generate or collide on).
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One CV per user for now; the index makes the "load mine" lookup a point read
// and leaves room to relax to multiple CVs later without a migration.
ResumeSchema.index({ tenantId: 1, userId: 1 });

export default mongoose.models.Resume || mongoose.model("Resume", ResumeSchema);
