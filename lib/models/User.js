import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    name: { type: String, default: "" },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
    emailVerified: { type: Date, default: null },

    // Points at a Media document of kind "avatar"; the image bytes never live
    // on this doc. Null means "render coloured initials" — see components/
    // chrome/Avatar.js, which is the fallback rather than a broken-image icon.
    avatarMediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },

    // Optional profile fields, surfaced on the account page. Separate from the
    // Tenant's company profile: this is the person, not the business.
    title: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
