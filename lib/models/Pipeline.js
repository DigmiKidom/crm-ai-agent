import mongoose from "mongoose";

const PipelineSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, unique: true },
    stages: {
      type: [String],
      default: ["new", "contacted", "qualified", "won", "lost"],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Pipeline || mongoose.model("Pipeline", PipelineSchema);
