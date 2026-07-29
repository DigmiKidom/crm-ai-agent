import mongoose from "mongoose";

const TenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    industry: { type: String, default: "" },
    templateId: { type: String, default: "default" },
    theme: {
      primaryColor: { type: String, default: "#2563eb" },
      accentColor: { type: String, default: "#111827" },
      fontFamily: { type: String, default: "system-ui, sans-serif" },
    },
    landingPage: {
      headline: { type: String, default: "Grow your business with us" },
      subheadline: { type: String, default: "Tell your visitors why they should reach out." },
      ctaLabel: { type: String, default: "Get in touch" },
      features: {
        type: [
          {
            title: String,
            description: String,
          },
        ],
        default: [],
      },
    },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
  },
  { timestamps: true }
);

export default mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);
