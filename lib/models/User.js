import mongoose from "mongoose";
import { PLATFORM_ROLES } from "@/lib/roles";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    name: { type: String, default: "" },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },

    // Platform-wide access, orthogonal to `role` above — see lib/roles.js for
    // why these are two fields and not one enum. Defaults to "none" for every
    // user ever created, including by signup: there is no code path that can
    // set this to "super_admin" from a request. It is granted out-of-band
    // (a direct database update or the seed script in scripts/), which is the
    // point — a privilege escalation bug in the app can't mint an admin.
    platformRole: { type: String, enum: PLATFORM_ROLES, default: "none" },

    // Two-factor authentication, currently required only for platform admins
    // (see lib/twoFactor.js and lib/adminSession.js).
    //
    // `secret` is select:false for the same reason passwordHash is: it's a
    // credential, and a stray .lean() that forgets to exclude it would leak
    // the ability to mint valid codes forever. `pendingSecret` holds an
    // enrolment that hasn't been confirmed with a working code yet — kept
    // apart from the live one so an abandoned enrolment can never lock
    // someone out of an account that was working a moment ago.
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, default: "", select: false },
      pendingSecret: { type: String, default: "", select: false },
      // Single-use, stored hashed — a recovery code is a password.
      recoveryCodes: { type: [String], default: [], select: false },
      enabledAt: { type: Date, default: null },
      // Guards against a stolen code being replayed inside its own 30-second
      // window: the last accepted time-step counter, which must strictly
      // increase.
      lastUsedStep: { type: Number, default: 0, select: false },
    },

    // Set when a platform admin suspends this account. A suspended user can't
    // sign in at all (see auth.js) — distinct from a suspended landing page,
    // which only takes the public page down.
    suspendedAt: { type: Date, default: null },
    suspendedReason: { type: String, default: "" },

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
