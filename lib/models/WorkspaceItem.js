import mongoose from "mongoose";

// A tenant-defined page in the sidebar — either a free-form markdown document
// or a structured table. Both live in one collection so the nav can list every
// page a tenant has with a single indexed query.
export const ITEM_TYPES = ["doc", "table"];

// Column types a table can use. Kept deliberately small: each one needs a cell
// renderer, an input, a coercion rule, and a sort comparator, so every addition
// here is real work in four places.
export const COLUMN_TYPES = ["text", "number", "date", "select", "checkbox"];

export const MAX_COLUMNS = 12;
export const MAX_TITLE = 80;
// Documents are stored inline on the item. 100k of markdown is far more than
// anyone types by hand and leaves the doc nowhere near the 16MB BSON ceiling.
export const MAX_CONTENT = 100_000;

const ColumnSchema = new mongoose.Schema(
  {
    // Stable client-generated id. Cells key off this rather than the column
    // name, so renaming a column never orphans its data.
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: COLUMN_TYPES, default: "text" },
    // Only meaningful for "select" — the allowed choices.
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const WorkspaceItemSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    type: { type: String, enum: ITEM_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: MAX_TITLE },
    // Reserved for a per-page icon picker. Nothing sets it yet — the nav falls
    // back to the item's type icon (document vs table).
    icon: { type: String, default: "" },
    // Sidebar ordering. New pages go to the end.
    order: { type: Number, default: 0 },

    // type === "doc"
    content: { type: String, default: "" },

    // type === "table" — the row data itself lives in WorkspaceRow.
    columns: {
      type: [ColumnSchema],
      default: [],
      validate: {
        validator: (v) => v.length <= MAX_COLUMNS,
        message: `At most ${MAX_COLUMNS} columns.`,
      },
    },
  },
  { timestamps: true }
);

// The sidebar lists every page on each dashboard render — keep it indexed.
WorkspaceItemSchema.index({ tenantId: 1, order: 1 });

export default mongoose.models.WorkspaceItem ||
  mongoose.model("WorkspaceItem", WorkspaceItemSchema);
