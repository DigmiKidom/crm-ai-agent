import mongoose from "mongoose";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/pipelineDefaults";

const PipelineSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, unique: true },
    stages: {
      type: [String],
      default: DEFAULT_PIPELINE_STAGES,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Pipeline || mongoose.model("Pipeline", PipelineSchema);
