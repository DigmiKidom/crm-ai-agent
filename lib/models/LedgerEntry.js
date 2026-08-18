import mongoose from "mongoose";
import { LEDGER_TYPES, MAX_LEDGER_AMOUNT, MAX_LEDGER_DESCRIPTION } from "../ledger";

// One line in the income/expense ledger (lib/plugins.js → "finances").
//
// Not accounting software and not trying to be: no VAT, no categories, no
// reconciliation, no double entry. A small business logging what came in and
// what went out, so the monthly net is visible without a spreadsheet.

// Defined in lib/ledger.js, which is Mongoose-free and therefore safe for the
// client components that need the same list — see test/boundaries.test.mjs.
export { LEDGER_TYPES, MAX_LEDGER_DESCRIPTION, MAX_LEDGER_AMOUNT };

const LedgerEntrySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    // The date the money moved, not the date the row was typed — backdating is
    // the normal case here, since people log a week at a time.
    date: { type: Date, required: true },

    description: { type: String, default: "", trim: true, maxlength: MAX_LEDGER_DESCRIPTION },

    type: { type: String, enum: LEDGER_TYPES, required: true },

    // Always positive; the sign lives in `type`. Storing expenses as negative
    // amounts would mean every sum had to know which convention a given row
    // used, and one row saved by an older version would quietly corrupt a
    // total. See lib/ledger.js, which is the only place that applies the sign.
    amount: { type: Number, required: true, min: 0, max: MAX_LEDGER_AMOUNT },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// The ledger view and the monthly rollup both read a date range, newest first.
LedgerEntrySchema.index({ tenantId: 1, date: -1 });

export default mongoose.models.LedgerEntry ||
  mongoose.model("LedgerEntry", LedgerEntrySchema);
