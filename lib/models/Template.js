import mongoose from "mongoose";

const TemplateSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    industryTags: { type: [String], default: [] },
    defaultStages: { type: [String], default: ["new", "contacted", "qualified", "won", "lost"] },
  },
  { timestamps: true }
);

export default mongoose.models.Template || mongoose.model("Template", TemplateSchema);
