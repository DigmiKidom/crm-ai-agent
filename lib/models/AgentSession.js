import mongoose from "mongoose";

// A log of each onboarding conversation and what the agent generated from
// it — useful for debugging and for letting a tenant regenerate/tweak later.
const AgentSessionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.AgentSession || mongoose.model("AgentSession", AgentSessionSchema);
