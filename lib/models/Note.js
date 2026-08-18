import mongoose from "mongoose";

// A note in the internal scratchpad (lib/plugins.js → "notes").
//
// STRICTLY INTERNAL. This is business documentation the team writes for
// itself: nothing here is ever mailed, synced to a third-party service, or
// exposed on a public route. That constraint is the point of the tool, so it
// is enforced structurally rather than by convention — the document carries no
// recipient, no address and no external id, so there is nothing for a future
// "just send this one" feature to hang itself off without a schema change and
// the conversation that comes with it.
//
// Compare WorkspaceItem, which is a tenant-authored *page* with an ordering and
// a place in the sidebar. A note is a scrap: no order, no type, no nav row.

export const MAX_NOTE_TITLE = 160;
export const MAX_NOTE_BODY = 50_000;

const NoteSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    title: { type: String, default: "", trim: true, maxlength: MAX_NOTE_TITLE },

    // Markdown source, rendered with the app's own renderer (lib/markdown.js)
    // rather than stored as HTML — storing HTML would mean trusting whatever a
    // future editor produced, and sanitising it on every read.
    body: { type: String, default: "", maxlength: MAX_NOTE_BODY },

    // Sticks a note to the top of the list. One flag rather than folders: the
    // tool is a scratchpad, and the moment it grows a hierarchy it has become
    // the workspace pages feature that already exists.
    pinned: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// The list view: pinned first, then most recently edited.
NoteSchema.index({ tenantId: 1, pinned: -1, updatedAt: -1 });

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);
