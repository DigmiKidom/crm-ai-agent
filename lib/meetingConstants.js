// Model-free source of truth for Meeting's enums — see lib/formFields.js for
// the same pattern. lib/models/Meeting.js imports these for its schema;
// client components (EventForm, MonthGrid, AgendaList) import them too, and
// can't import lib/models/Meeting.js directly since it pulls in mongoose.
export const MEETING_TYPES = ["meeting", "call", "demo", "follow_up", "other"];
export const MEETING_STATUSES = ["confirmed", "pending", "ai_followup", "completed", "cancelled"];
