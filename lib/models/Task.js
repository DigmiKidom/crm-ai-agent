import mongoose from "mongoose";
import { MAX_TASK_TITLE, TASK_PRIORITIES } from "../tasks";

// A row in the Tasks tool (lib/plugins.js → "tasks").
//
// Deliberately not a Lead, a Meeting or a WorkspaceRow: those model a customer,
// an appointment and a user-defined table. This models an internal to-do that
// belongs to the business and is done or not done. Keeping it separate is what
// lets the tool stay switch-off-able — nothing in the CRM reads from here.

// Re-exported so server-side callers can keep importing them alongside the
// model; the definitions live in lib/tasks.js, which has no Mongoose in it.
export { TASK_PRIORITIES, MAX_TASK_TITLE };

const TaskSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: MAX_TASK_TITLE },

    // Stored as a flag plus a timestamp rather than a status enum: the list has
    // exactly two states, and "when was this finished" is the one extra fact
    // worth keeping for a business that wants to see what it got through.
    done: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },

    priority: { type: String, enum: TASK_PRIORITIES, default: "normal" },

    // Date-only in intent. Stored as a Date at UTC midnight so "overdue" is a
    // plain comparison and a task due today doesn't flip to overdue because of
    // the hour someone happened to create it in.
    dueDate: { type: Date, default: null },

    // Who added it. Display only — every member of the tenant can edit any
    // task, because this is a shared list for a small team rather than an
    // assignment system with its own permission model.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// The list view: open tasks first, then by due date, then newest.
TaskSchema.index({ tenantId: 1, done: 1, dueDate: 1 });

export default mongoose.models.Task || mongoose.model("Task", TaskSchema);
