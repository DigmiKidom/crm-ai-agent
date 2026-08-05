import mongoose from "mongoose";

// Table rows live in their own collection rather than embedded on the
// WorkspaceItem, for the same reason Media isn't embedded on Tenant: it keeps
// the item document small so the sidebar's "list every page" query stays cheap
// no matter how many rows a table accumulates, and it means a big table can be
// paged over later without restructuring anything.
const WorkspaceRowSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceItem",
      required: true,
      index: true,
    },
    order: { type: Number, default: 0 },
    // Keyed by column id, not column name — renaming a column leaves the data
    // untouched. Mixed because the value type follows the column's type
    // (string, number, ISO date string, or boolean); the API coerces on write.
    cells: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

// Every table render reads one item's rows in order.
WorkspaceRowSchema.index({ itemId: 1, order: 1 });

export default mongoose.models.WorkspaceRow ||
  mongoose.model("WorkspaceRow", WorkspaceRowSchema);
