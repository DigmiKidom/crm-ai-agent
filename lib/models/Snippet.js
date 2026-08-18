import mongoose from "mongoose";

// A reusable message template (lib/plugins.js → "snippets").
//
// The text a business retypes twenty times a week — a quote follow-up, opening
// hours, a thank-you. Copied to the clipboard or opened in WhatsApp; this app
// never sends it, so there is no delivery state to model.

export const MAX_SNIPPET_TITLE = 120;
export const MAX_SNIPPET_BODY = 4_000;
export const MAX_SNIPPET_CATEGORY = 40;

const SnippetSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: MAX_SNIPPET_TITLE },

    // Plain text, not markdown: it is going into WhatsApp or a paste buffer,
    // where markup would arrive as literal asterisks.
    body: { type: String, default: "", maxlength: MAX_SNIPPET_BODY },

    // A free-text label rather than an enum — every trade groups these
    // differently, and a fixed list would be wrong for most of them.
    category: { type: String, default: "", trim: true, maxlength: MAX_SNIPPET_CATEGORY },

    // Cheap signal for sorting the library by what actually gets used, bumped
    // on copy and on send. Not analytics: it never leaves the tenant.
    useCount: { type: Number, default: 0, min: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

SnippetSchema.index({ tenantId: 1, useCount: -1, updatedAt: -1 });

export default mongoose.models.Snippet || mongoose.model("Snippet", SnippetSchema);
